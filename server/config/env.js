import dotenv from 'dotenv';

dotenv.config();

const bool = (v) => Boolean(v && String(v).trim());

export const env = {
  port: Number(process.env.PORT) || 5050,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',

  mongoUri: process.env.MONGO_URI?.trim() || '',

  jwtSecret: process.env.JWT_SECRET?.trim() || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || '7d',

  clientUrl: process.env.CLIENT_URL?.trim() || 'http://localhost:5173',

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() || '',
    apiKey: process.env.CLOUDINARY_API_KEY?.trim() || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET?.trim() || '',
  },
};

/** True when real Cloudinary credentials are present; otherwise we fall back to local disk. */
export const hasCloudinary =
  bool(env.cloudinary.cloudName) && bool(env.cloudinary.apiKey) && bool(env.cloudinary.apiSecret);

/** Hard limit from PROJECT_PLAN §6: 1MB per attachment. */
export const MAX_UPLOAD_BYTES = 1024 * 1024;

if (env.isProd) {
  const missing = [];
  if (!env.mongoUri) missing.push('MONGO_URI');
  if (env.jwtSecret === 'dev-only-secret-change-me') missing.push('JWT_SECRET');
  if (missing.length) {
    throw new Error(`Missing required production env vars: ${missing.join(', ')}`);
  }
}
