import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket, useSocketEvent } from '../context/SocketContext.jsx';

const PAGE_SIZE = 30;

/**
 * Message state for one conversation: history, pagination, live arrivals, and
 * optimistic sending (§8: show it immediately, reconcile on confirmation).
 */
export function useMessages(conversationId) {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);

  const typingTimers = useRef(new Map());

  // Load (or reload) the newest page whenever the open conversation changes.
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    setTypingUsers([]);

    (async () => {
      try {
        const { data } = await api.get(`/conversations/${conversationId}/messages`, {
          params: { limit: PAGE_SIZE },
        });
        if (cancelled) return;
        setMessages(data.messages);
        setHasMore(data.hasMore);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Join the room so messages arrive while this thread is open.
  useEffect(() => {
    if (!socket || !conversationId) return;
    socket.emit('conversation:join', conversationId);
    return () => socket.emit('conversation:leave', conversationId);
  }, [socket, conversationId]);

  useSocketEvent('message:new', ({ conversationId: id, message }) => {
    if (id !== conversationId) return;
    setMessages((prev) => {
      // Our own echo replaces the optimistic row rather than duplicating it.
      if (prev.some((m) => m._id === message._id)) return prev;
      if (String(message.sender?._id) === String(user?._id)) {
        const pendingIndex = prev.findIndex(
          (m) => m.status === 'sending' && m.content === message.content
        );
        if (pendingIndex !== -1) {
          const next = [...prev];
          next[pendingIndex] = message;
          return next;
        }
      }
      return [...prev, message];
    });
  });

  useSocketEvent('typing', ({ conversationId: id, user: who }) => {
    if (id !== conversationId || String(who._id) === String(user?._id)) return;

    setTypingUsers((prev) =>
      prev.some((u) => u._id === who._id) ? prev : [...prev, who]
    );

    // Self-expire in case the "stopped" event is lost.
    clearTimeout(typingTimers.current.get(who._id));
    typingTimers.current.set(
      who._id,
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u._id !== who._id));
      }, 4000)
    );
  });

  useSocketEvent('typing:stopped', ({ conversationId: id, user: who }) => {
    if (id !== conversationId) return;
    clearTimeout(typingTimers.current.get(who._id));
    setTypingUsers((prev) => prev.filter((u) => u._id !== who._id));
  });

  useSocketEvent('message:read', ({ conversationId: id, userId }) => {
    if (id !== conversationId || String(userId) === String(user?._id)) return;
    setMessages((prev) => prev.map((m) => ({ ...m, readByOthers: true })));
  });

  useEffect(() => {
    const timers = typingTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const loadOlder = useCallback(async () => {
    if (!hasMore || loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const { data } = await api.get(`/conversations/${conversationId}/messages`, {
        params: { before: messages[0].createdAt, limit: PAGE_SIZE },
      });
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, hasMore, loadingMore, messages]);

  const send = useCallback(
    async ({ content, file, replyTo }) => {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Optimistic row, visible before the round trip completes.
      const optimistic = {
        _id: tempId,
        conversation: conversationId,
        content,
        attachment: file
          ? {
              url: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
              type: file.type.startsWith('image/')
                ? 'image'
                : file.type.startsWith('video/')
                  ? 'video'
                  : 'document',
              fileName: file.name,
              mimeType: file.type,
              size: file.size,
            }
          : null,
        replyTo: replyTo ?? null,
        sender: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture,
        },
        createdAt: new Date().toISOString(),
        status: 'sending',
        _draft: { content, file, replyTo },
      };

      setMessages((prev) => [...prev, optimistic]);

      try {
        const body = new FormData();
        if (content) body.append('content', content);
        if (replyTo?._id) body.append('replyTo', replyTo._id);
        if (file) body.append('file', file);

        const { data } = await api.post(`/conversations/${conversationId}/messages`, body);

        setMessages((prev) => {
          // The socket echo may have landed first; don't insert it twice.
          const withoutTemp = prev.filter((m) => m._id !== tempId);
          if (withoutTemp.some((m) => m._id === data.message._id)) return withoutTemp;
          return [...withoutTemp, data.message];
        });
        return { ok: true };
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === tempId ? { ...m, status: 'failed', error: errorMessage(err) } : m
          )
        );
        return { ok: false, message: errorMessage(err) };
      }
    },
    [conversationId, user]
  );

  const retry = useCallback(
    (failed) => {
      setMessages((prev) => prev.filter((m) => m._id !== failed._id));
      return send(failed._draft ?? { content: failed.content });
    },
    [send]
  );

  const markRead = useCallback(async () => {
    if (!conversationId) return;
    try {
      await api.post(`/conversations/${conversationId}/read`);
    } catch {
      // Non-critical; the count corrects itself on the next load.
    }
  }, [conversationId]);

  return {
    messages, loading, loadingMore, hasMore, error, typingUsers,
    send, retry, loadOlder, markRead,
  };
}
