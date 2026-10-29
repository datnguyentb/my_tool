import { nanoid } from 'nanoid';
import { config } from '../config/env.js';

/**
 * Lưu Session trong bộ nhớ (in-memory). Đủ cho 1 instance.
 * Khi scale nhiều instance -> đổi sang Redis hoặc MongoDB (giữ nguyên interface bên dưới).
 */
const sessions = new Map(); // sessionId -> { createdAt, lastSeen }

export function createSession() {
  const sessionId = nanoid(10).toUpperCase(); // dễ đọc, dễ gõ tay nếu cần
  sessions.set(sessionId, { createdAt: Date.now(), lastSeen: Date.now() });
  return sessionId;
}

export function exists(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return false;
  if (Date.now() - s.createdAt > config.sessionTtlMs) {
    sessions.delete(sessionId);
    return false;
  }
  s.lastSeen = Date.now();
  return true;
}

export function touch(sessionId) {
  const s = sessions.get(sessionId);
  if (s) s.lastSeen = Date.now();
}

// Dọn session hết hạn định kỳ.
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.createdAt > config.sessionTtlMs) sessions.delete(id);
  }
}, 60 * 1000).unref();

export const sessionStore = { createSession, exists, touch };
