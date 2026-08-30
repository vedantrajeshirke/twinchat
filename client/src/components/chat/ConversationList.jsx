import { useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Search, MessageSquarePlus, Paperclip } from 'lucide-react';
import { useChat } from '../../context/ChatContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { Input } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { ConversationSkeleton } from '../ui/Skeleton.jsx';
import { listTimestamp } from '../../utils/time.js';
import { cn } from '../../utils/cn.js';

function preview(conversation) {
  const last = conversation.lastMessage;
  if (!last) return 'No messages yet';
  if (last.attachment && !last.content) {
    return { image: 'Photo', video: 'Video', document: 'Document' }[last.attachment.type] ?? 'Attachment';
  }
  return last.content;
}

function Row({ conversation }) {
  const { isOnline } = useSocket();
  const hasAttachment = Boolean(conversation.lastMessage?.attachment);

  return (
    <NavLink
      to={`/home/${conversation._id}`}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
          isActive ? 'bg-primary text-on-primary' : 'hover:bg-surface-2'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Avatar
            src={conversation.avatar}
            name={conversation.title}
            size="md"
            square={conversation.type === 'group'}
            online={conversation.type === 'direct' ? isOnline(conversation.otherUser?._id) : undefined}
          />

          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className={cn('truncate text-sm font-medium', isActive ? 'text-on-primary' : 'text-heading')}>
                {conversation.title}
              </span>
              <span className={cn('shrink-0 text-[11px]', isActive ? 'text-on-primary/75' : 'text-muted')}>
                {listTimestamp(conversation.updatedAt)}
              </span>
            </span>

            <span className="mt-0.5 flex items-center justify-between gap-2">
              <span
                className={cn(
                  'flex min-w-0 items-center gap-1 truncate text-[13px]',
                  isActive ? 'text-on-primary/85' : 'text-muted'
                )}
              >
                {hasAttachment && <Paperclip size={11} className="shrink-0" />}
                <span className="truncate">{preview(conversation)}</span>
              </span>

              {conversation.unreadCount > 0 && (
                <span
                  className={cn(
                    'flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold',
                    isActive ? 'bg-white/25 text-on-primary' : 'bg-primary text-on-primary'
                  )}
                >
                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                </span>
              )}
            </span>
          </span>
        </>
      )}
    </NavLink>
  );
}

/** Middle column. Filters the threads you already have (§5.4B). */
export function ConversationList() {
  const { conversations, loading } = useChat();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  return (
    <aside className="flex w-full flex-col border-r border-line bg-surface md:w-[340px] md:shrink-0">
      <header className="border-b border-line px-4 py-3.5">
        <h1 className="mb-3 text-[17px]">Chats</h1>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2 text-muted" />
          <Input
            rounded="pill"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your chats"
            aria-label="Search your chats"
            className="pl-9"
          />
        </div>
      </header>

      <div className="tc-scroll min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <ConversationSkeleton />
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessageSquarePlus}
            title="No conversations yet"
            description="Connect with someone who shares your interests, or join a group, and your chats will show up here."
            action={<Button onClick={() => navigate('/search')}>Find people to chat with</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No chats match that"
            description={`Nothing here called "${query}".`}
            action={
              <Button variant="secondary" onClick={() => setQuery('')}>
                Clear search
              </Button>
            }
          />
        ) : (
          <div className="space-y-0.5">
            {filtered.map((c) => (
              <Row key={c._id} conversation={c} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
