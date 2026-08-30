import multer from 'multer';
import { MAX_UPLOAD_BYTES } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Server-side upload guard (PROJECT_PLAN §9): the 1MB cap and the MIME
 * whitelist are enforced here, not just in the browser.
 */
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm'];
const DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export const ALLOWED_MIME_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES, ...DOC_TYPES];

const makeUploader = (allowed) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    fileFilter: (req, file, cb) => {
      if (!allowed.includes(file.mimetype)) {
        return cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
      }
      cb(null, true);
    },
  });

/** Any attachment type: used for chat messages. */
export const uploadAttachment = makeUploader(ALLOWED_MIME_TYPES).single('file');

/** Images only: used for avatars and group pictures. */
export const uploadImage = makeUploader(IMAGE_TYPES).single('file');

/**
 * Multer only sees the *streamed* size; this double-checks the buffer that
 * actually landed, so a spoofed Content-Length cannot slip past.
 */
export function verifySize(req, res, next) {
  if (req.file && req.file.size > MAX_UPLOAD_BYTES) {
    return next(ApiError.tooLarge('File is too large. Maximum size is 1MB.'));
  }
  next();
}
