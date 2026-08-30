/** Mirrors the server-side cap in PROJECT_PLAN §6: 1MB per attachment. */
export const MAX_UPLOAD_BYTES = 1024 * 1024;

export const ACCEPTED_IMAGE = 'image/png,image/jpeg,image/gif,image/webp';
export const ACCEPTED_VIDEO = 'video/mp4,video/webm';
export const ACCEPTED_DOCUMENT =
  'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';
export const ACCEPTED_ATTACHMENT = [ACCEPTED_IMAGE, ACCEPTED_VIDEO, ACCEPTED_DOCUMENT].join(',');

export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function attachmentKind(mimeType = '') {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'document';
}

/** Client-side gate; the server re-checks both size and MIME type. */
export function validateAttachment(file) {
  if (!file) return 'No file selected.';
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${formatBytes(file.size)} is over the 1MB limit.`;
  }
  if (!ACCEPTED_ATTACHMENT.split(',').includes(file.type)) {
    return 'That file type is not supported.';
  }
  return '';
}
