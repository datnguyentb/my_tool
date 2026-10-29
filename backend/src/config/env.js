import 'dotenv/config';

function required(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') {
    throw new Error(`[env] Thiếu biến môi trường bắt buộc: ${name}. Xem .env.example`);
  }
  return v;
}

export const config = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  gemini: {
    apiKey: required('GEMINI_API_KEY'),
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  },

  mongo: {
    uri: required('MONGO_URI', 'mongodb://127.0.0.1:27017/ops_reports'),
  },

  realtime: {
    driver: (process.env.REALTIME_DRIVER || 'socket').toLowerCase(), // 'socket' | 'firebase'
    firebase: {
      serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './service-account.json',
      databaseURL: process.env.FIREBASE_DATABASE_URL || '',
    },
  },

  // Session hết hạn sau bao lâu (ms). Dọn dẹp bộ nhớ định kỳ.
  sessionTtlMs: Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 4), // 4h
};
