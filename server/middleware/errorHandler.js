import { ZodError } from 'zod';
import multer from 'multer';
import { env, MAX_UPLOAD_BYTES } from '../config/env.js';

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity
export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong';
  let details;

  if (err instanceof ZodError) {
    status = 400;
    message = 'Validation failed';
    details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  } else if (err instanceof multer.MulterError) {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File is too large. Maximum size is ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.`
        : err.message;
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Malformed id';
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'value';
    message = `That ${field} is already taken`;
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.details) {
    details = err.details;
  }

  if (status >= 500) console.error('✖', err);

  res.status(status).json({
    message,
    ...(details ? { details } : {}),
    ...(env.isProd ? {} : { stack: status >= 500 ? err.stack : undefined }),
  });
}
