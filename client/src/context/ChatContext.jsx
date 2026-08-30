import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, errorMessage } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';
import { useSocketEvent } from './SocketContext.jsx';

const ChatContext = createContext(null);

/**
 * Owns the conversation list and the pending-request badge for the whole shell,
 * so both stay live no matter which screen is open.
 */
export function ChatProvider({ children }) {
  const { isAuthed } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestCount, setRequestCount] = useState(0);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/conversations');
      setConversations(data.conversations);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRequestCount = useCallback(async () => {
    try {
      const { data } = await api.get('/requests');
      setRequestCount(data.incomingCount);
    } catch {
      // A failed badge refresh is not worth surfacing.
    }
  }, []);

  useEffect(() => {
    if (!isAuthed) return;
    loadConversations();
    loadRequestCount();
  }, [isAuthed, loadConversations, loadRequestCount]);

  /** Replaces or inserts a row, then re-sorts by recency. */
  const upsertConversation = useCallback((conversation) => {
    if (!conversation) return;
    setConversations((prev) => {
      const rest = prev.filter((c) => c._id !== conversation._id);
      return [conversation, ...rest].sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      );
    });
  }, []);

  const clearUnread = useCallback((conversationId) => {
    setConversations((prev) =>
      prev.map((c) => (c._id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

  const removeConversation = useCallback((conversationId) => {
    setConversations((prev) => prev.filter((c) => c._id !== conversationId));
  }, []);

  useSocketEvent('conversation:updated', ({ conversation }) => upsertConversation(conversation));
  useSocketEvent('request:new', () => setRequestCount((n) => n + 1));
  useSocketEvent('request:cancelled', () => setRequestCount((n) => Math.max(0, n - 1)));
  useSocketEvent('request:accepted', ({ conversation }) => upsertConversation(conversation));
  useSocketEvent('group:deleted', () => loadConversations());

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations]
  );

  const value = useMemo(
    () => ({
      conversations, loading, error, totalUnread,
      requestCount, setRequestCount,
      loadConversations, loadRequestCount,
      upsertConversation, clearUnread, removeConversation,
    }),
    [
      conversations, loading, error, totalUnread, requestCount,
      loadConversations, loadRequestCount, upsertConversation, clearUnread, removeConversation,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside <ChatProvider>');
  return ctx;
}
