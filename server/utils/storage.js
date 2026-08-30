import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { cloudinary, hasCloudinary } from '../config/cloudinary.js';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

/** Maps a MIME type to the attachment category used by the Message model. */
export function categorise(mimeType = '') {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'document';
}

/**
 * Stores a buffer and returns `{ url, publicId }`.
 * Uses Cloudinary when configured, otherwise writes to server/uploads/ and
 * serves it from the API origin, so the app is fully usable without keys.
 */
export async function storeFile(file, folder = 'twinchat') {
  const kind = categorise(file.mimetype);

  if (hasCloudinary) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          // Cloudinary calls anything non-image/video "raw".
          resource_type: kind === 'document' ? 'raw' : kind,
          // Keep the original name recognisable for documents.
          use_filename: kind === 'document',
          unique_filename: true,
        },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(file.buffer);
    });
    return { url: result.secure_url, publicId: result.public_id };
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(file.originalname) || '';
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), file.buffer);

  const origin = env.isProd ? '' : `http://localhost:${env.port}`;
  return { url: `${origin}/uploads/${name}`, publicId: `local:${name}` };
}

export async function deleteFile(publicId) {
  if (!publicId) return;
  try {
    if (publicId.startsWith('local:')) {
      await fs.unlink(path.join(UPLOAD_DIR, publicId.slice(6)));
    } else if (hasCloudinary) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch {
    // A missing file is not worth failing the request over.
  }
}
