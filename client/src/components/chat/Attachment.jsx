import { useState } from 'react';
import { FileText, Download, X, Play } from 'lucide-react';
import { formatBytes } from '../../utils/files.js';
import { cn } from '../../utils/cn.js';

/** Renders an attachment inside a bubble: media inline, documents as a card (§5.4C). */
export function Attachment({ attachment, mine }) {
  const [expanded, setExpanded] = useState(false);
  if (!attachment) return null;

  if (attachment.type === 'image') {
    return (
      <>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="block overflow-hidden rounded-lg"
          aria-label={`Open ${attachment.fileName || 'image'}`}
        >
          <img
            src={attachment.url}
            alt={attachment.fileName || ''}
            loading="lazy"
            className="max-h-72 w-auto max-w-full object-cover"
          />
        </button>
        {expanded && <Lightbox attachment={attachment} onClose={() => setExpanded(false)} />}
      </>
    );
  }

  if (attachment.type === 'video') {
    return (
      <video
        src={attachment.url}
        controls
        preload="metadata"
        className="max-h-72 w-full max-w-sm rounded-lg"
      >
        <track kind="captions" />
      </video>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      download={attachment.fileName}
      className={cn(
        'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
        mine
          ? 'border-white/25 bg-white/10 hover:bg-white/20'
          : 'border-line bg-surface hover:bg-canvas'
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          mine ? 'bg-white/20 text-on-primary' : 'bg-primary/10 text-primary'
        )}
      >
        <FileText size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">
          {attachment.fileName || 'Document'}
        </span>
        <span className={cn('block text-[11px]', mine ? 'text-on-primary/70' : 'text-muted')}>
          {formatBytes(attachment.size)}
        </span>
      </span>
      <Download size={15} className="shrink-0 opacity-70" />
    </a>
  );
}

function Lightbox({ attachment, onClose }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={attachment.fileName || 'Image'}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X size={20} />
      </button>
      <img
        src={attachment.url}
        alt={attachment.fileName || ''}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-lg object-contain"
      />
    </div>
  );
}

/** The chip shown above the input after picking a file, before sending. */
export function PendingAttachment({ file, previewUrl, onRemove }) {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 p-2.5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary">
        {isImage && previewUrl ? (
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : isVideo ? (
          <Play size={17} />
        ) : (
          <FileText size={17} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-heading">{file.name}</span>
        <span className="block text-[11px] text-muted">{formatBytes(file.size)}</span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove attachment"
        className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-danger"
      >
        <X size={15} />
      </button>
    </div>
  );
}
