import { Reply, AlertCircle, Check, CheckCheck } from 'lucide-react';
import { Avatar } from '../ui/Avatar.jsx';
import { Attachment } from './Attachment.jsx';
import { bubbleTimestamp } from '../../utils/time.js';
import { cn } from '../../utils/cn.js';

/** Quoted snippet rendered inside a reply (§5.4C). */
function QuotedMessage({ message, mine }) {
  if (!message) return null;
  const label = message.sender?.firstName ?? 'Someone';
  const text =
    message.content ||
    ({ image: 'Photo', video: 'Video', document: 'Document' }[message.attachment?.type] ?? 'Attachment');

  return (
    <div
      className={cn(
        'mb-1.5 rounded-md border-l-[3px] px-2.5 py-1.5 text-[12px]',
        mine ? 'border-white/60 bg-white/12' : 'border-primary bg-primary/8'
      )}
    >
      <span className={cn('block font-medium', mine ? 'text-on-primary' : 'text-primary')}>
        {label}
      </span>
      <span className={cn('block truncate', mine ? 'text-on-primary/80' : 'text-muted')}>{text}</span>
    </div>
  );
}

export function MessageBubble({
  message,
  mine,
  showSender,
  showAvatar,
  isGroup,
  onReply,
  onRetry,
}) {
  const failed = message.status === 'failed';
  const pending = message.status === 'sending';

  return (
    <div className={cn('group flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}>
      {/* Avatar gutter keeps consecutive messages from the same person aligned. */}
      {!mine && isGroup && (
        <span className="w-7 shrink-0">
          {showAvatar && (
            <Avatar
              src={message.sender?.profilePicture}
              name={`${message.sender?.firstName ?? ''} ${message.sender?.lastName ?? ''}`}
              size={28}
            />
          )}
        </span>
      )}

      <div className={cn('flex max-w-[min(78%,32rem)] flex-col', mine ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'relative rounded-xl px-3 py-2 text-sm break-words',
            mine
              ? 'rounded-br-sm bg-primary-bubble text-on-primary'
              : 'rounded-bl-sm border border-line bg-surface-2 text-body',
            failed && 'opacity-70 ring-1 ring-danger',
            pending && 'opacity-70'
          )}
        >
          {showSender && !mine && isGroup && (
            <span className="mb-0.5 block text-[12px] font-semibold text-primary">
              {message.sender?.firstName} {message.sender?.lastName}
            </span>
          )}

          <QuotedMessage message={message.replyTo} mine={mine} />

          {message.attachment && (
            <div className={cn(message.content && 'mb-1.5')}>
              <Attachment attachment={message.attachment} mine={mine} />
            </div>
          )}

          {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}

          <span
            className={cn(
              'mt-1 flex items-center justify-end gap-1 text-[10px]',
              mine ? 'text-on-primary/70' : 'text-muted'
            )}
          >
            {bubbleTimestamp(message.createdAt)}
            {mine && !pending && !failed && (
              message.readByOthers ? <CheckCheck size={12} /> : <Check size={12} />
            )}
          </span>
        </div>

        {failed ? (
          <button
            type="button"
            onClick={() => onRetry?.(message)}
            className="mt-1 inline-flex items-center gap-1 text-[11px] text-danger hover:underline"
          >
            <AlertCircle size={11} /> Not sent. Tap to retry
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onReply?.(message)}
            aria-label="Reply to this message"
            className={cn(
              'mt-1 inline-flex items-center gap-1 text-[11px] text-muted opacity-0 transition-opacity',
              'group-hover:opacity-100 focus-visible:opacity-100 hover:text-primary'
            )}
          >
            <Reply size={11} /> Reply
          </button>
        )}
      </div>
    </div>
  );
}
