import { useEffect, useRef, useState } from 'react';
import { Paperclip, SendHorizontal, X } from 'lucide-react';
import { PendingAttachment } from './Attachment.jsx';
import { ACCEPTED_ATTACHMENT, validateAttachment } from '../../utils/files.js';
import { cn } from '../../utils/cn.js';

/** Input bar: attach + text + send. Enter sends, Shift+Enter breaks a line (§5.4C). */
export function MessageInput({ onSend, onTyping, replyingTo, onCancelReply, disabled, disabledReason }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Focus the box when the user starts a reply.
  useEffect(() => {
    if (replyingTo) textRef.current?.focus();
  }, [replyingTo]);

  // Grow with the content, up to a ceiling.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  function pickFile(e) {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;

    const problem = validateAttachment(picked);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setFile(picked);
  }

  function submit(e) {
    e?.preventDefault();
    if (disabled) return;
    const content = text.trim();
    if (!content && !file) return;

    onSend({ content, file });
    setText('');
    setFile(null);
    setError('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  if (disabled) {
    return (
      <div className="border-t border-line bg-surface px-4 py-4 text-center text-[13px] text-muted">
        {disabledReason}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border-t border-line bg-surface px-3 py-3">
      {replyingTo && (
        <div className="mb-2 flex items-start gap-2 rounded-lg border-l-[3px] border-primary bg-surface-2 px-3 py-2">
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-medium text-primary">
              Replying to {replyingTo.sender?.firstName ?? 'message'}
            </span>
            <span className="block truncate text-[12px] text-muted">
              {replyingTo.content ||
                ({ image: 'Photo', video: 'Video', document: 'Document' }[
                  replyingTo.attachment?.type
                ] ?? 'Attachment')}
            </span>
          </span>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Cancel reply"
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:text-danger"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {file && (
        <div className="mb-2">
          <PendingAttachment file={file} previewUrl={previewUrl} onRemove={() => setFile(null)} />
        </div>
      )}

      {error && <p className="mb-2 px-1 text-[12px] text-danger">{error}</p>}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Attach a file"
          title="Attach a file (max 1MB)"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-primary"
        >
          <Paperclip size={19} />
        </button>

        <textarea
          ref={textRef}
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping?.(e.target.value.length > 0);
          }}
          onBlur={() => onTyping?.(false)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          aria-label="Message"
          className={cn(
            'tc-scroll max-h-36 min-h-10 flex-1 resize-none rounded-2xl border border-line bg-surface-2',
            'px-4 py-2.5 text-sm text-body placeholder:text-muted'
          )}
        />

        <button
          type="submit"
          disabled={!text.trim() && !file}
          aria-label="Send message"
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
            'bg-primary text-on-primary hover:bg-primary-dark',
            'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary'
          )}
        >
          <SendHorizontal size={18} />
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_ATTACHMENT}
        onChange={pickFile}
        className="hidden"
      />
    </form>
  );
}
