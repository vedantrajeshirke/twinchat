import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronUp, Info, MessagesSquare, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useChat } from '../../context/ChatContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import { useMessages } from '../../hooks/useMessages.js';
import { Avatar } from '../ui/Avatar.jsx';
import { Button } from '../ui/Button.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { Spinner } from '../ui/Spinner.jsx';
import { MessageBubble } from './MessageBubble.jsx';
import { MessageInput } from './MessageInput.jsx';
import { TypingIndicator } from './TypingIndicator.jsx';
import { dayLabel, sameDay } from '../../utils/time.js';

export function ChatWindow({ conversation }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { isOnline } = useSocket();
  const { clearUnread } = useChat();
  const navigate = useNavigate();

  const {
    messages, loading, loadingMore, hasMore, error,
    typingUsers, send, retry, loadOlder, markRead,
  } = useMessages(conversation?._id);

  const [replyingTo, setReplyingTo] = useState(null);
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const wasAtBottom = useRef(true);

  const isGroup = conversation?.type === 'group';

  // Reading the thread clears its badge.
  useEffect(() => {
    if (!conversation?._id || loading) return;
    markRead();
    clearUnread(conversation._id);
    setReplyingTo(null);
  }, [conversation?._id, loading, markRead, clearUnread]);

  // Stick to the bottom on new messages, but don't yank the user out of history.
  useEffect(() => {
    if (wasAtBottom.current) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, typingUsers.length]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    wasAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  const emitTyping = useCallback(
    (isTyping) => {
      if (!socket || !conversation?._id) return;
      socket.emit(isTyping ? 'typing:start' : 'typing:stop', { conversationId: conversation._id });
    },
    [socket, conversation?._id]
  );

  const handleSend = useCallback(
    async ({ content, file }) => {
      emitTyping(false);
      const reply = replyingTo;
      setReplyingTo(null);
      wasAtBottom.current = true;
      await send({ content, file, replyTo: reply });
    },
    [send, replyingTo, emitTyping]
  );

  // Group consecutive messages so avatars and names only repeat when they must.
  const rows = useMemo(() => {
    return messages.map((message, i) => {
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const senderId = String(message.sender?._id);
      return {
        message,
        mine: senderId === String(user?._id),
        showDay: !prev || !sameDay(prev.createdAt, message.createdAt),
        showSender: !prev || String(prev.sender?._id) !== senderId || !sameDay(prev.createdAt, message.createdAt),
        showAvatar: !next || String(next.sender?._id) !== senderId,
      };
    });
  }, [messages, user?._id]);

  if (!conversation) {
    return (
      <section className="hidden flex-1 items-center justify-center bg-canvas md:flex">
        <EmptyState
          icon={MessagesSquare}
          title="Select a chat to start messaging"
          description="Pick a conversation from the list, or find someone new who shares your interests."
          action={<Button variant="secondary" onClick={() => navigate('/search')}>Find people</Button>}
        />
      </section>
    );
  }

  const headerLink = isGroup
    ? `/groups/${conversation.group?._id}`
    : `/user/${conversation.otherUser?.username}`;

  const online = !isGroup && isOnline(conversation.otherUser?._id);

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-canvas">
      <header className="flex items-center gap-3 border-b border-line bg-surface px-3 py-2.5 md:px-4">
        <button
          type="button"
          onClick={() => navigate('/home')}
          aria-label="Back to chats"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 md:hidden"
        >
          <ArrowLeft size={18} />
        </button>

        <Link to={headerLink} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1">
          <Avatar
            src={conversation.avatar}
            name={conversation.title}
            size="md"
            square={isGroup}
            online={isGroup ? undefined : online}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-heading">
              {conversation.title}
            </span>
            <span className="block truncate text-[12px] text-muted">
              {isGroup
                ? `${conversation.group?.memberCount ?? 0} members · ${conversation.group?.mainInterest ?? ''}`
                : online
                  ? 'Online'
                  : `@${conversation.otherUser?.username}`}
            </span>
          </span>
        </Link>

        <Link
          to={headerLink}
          aria-label={isGroup ? 'Group info' : 'View profile'}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-primary"
        >
          <Info size={18} />
        </Link>
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="tc-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-6"
      >
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={i % 2 ? 'flex justify-end' : 'flex justify-start'}>
                <Skeleton className={i % 2 ? 'h-12 w-2/5' : 'h-14 w-1/2'} rounded="rounded-xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={RefreshCw}
            title="Couldn't load these messages"
            description={error}
            action={<Button variant="secondary" onClick={() => window.location.reload()}>Try again</Button>}
          />
        ) : messages.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title={isGroup ? 'No messages in this group yet' : `Say hello to ${conversation.title.split(' ')[0]}`}
            description={
              isGroup
                ? 'Be the first to post. Everyone in the group will see it.'
                : 'You are connected. Start the conversation.'
            }
          />
        ) : (
          <>
            {hasMore && (
              <div className="mb-4 flex justify-center">
                <Button variant="secondary" size="sm" loading={loadingMore} onClick={loadOlder}>
                  {!loadingMore && <ChevronUp size={14} />} Load earlier messages
                </Button>
              </div>
            )}

            <div className="space-y-1.5">
              {rows.map(({ message, mine, showDay, showSender, showAvatar }) => (
                <div key={message._id}>
                  {showDay && (
                    <div className="my-4 flex justify-center">
                      <span className="rounded-full border border-line bg-surface-2 px-3 py-1 text-[11px] font-medium text-muted">
                        {dayLabel(message.createdAt)}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    message={message}
                    mine={mine}
                    isGroup={isGroup}
                    showSender={showSender}
                    showAvatar={showAvatar}
                    onReply={setReplyingTo}
                    onRetry={retry}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        <TypingIndicator users={typingUsers} isGroup={isGroup} />
        <div ref={bottomRef} />
      </div>

      <MessageInput
        onSend={handleSend}
        onTyping={emitTyping}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </section>
  );
}

export function ChatWindowLoading() {
  return (
    <section className="flex flex-1 items-center justify-center bg-canvas">
      <Spinner size={22} className="text-muted" />
    </section>
  );
}
