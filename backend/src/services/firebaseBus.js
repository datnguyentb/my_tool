import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import { config } from '../config/env.js';

/**
 * Driver Realtime thay thế bằng Firebase Realtime Database.
 * Bật bằng cách đặt REALTIME_DRIVER=firebase trong .env.
 *
 * Cách hoạt động:
 *  - Backend viết (push) vào ref sessions/{sessionId}/reports mỗi khi có dữ liệu mới.
 *  - PC (frontend) dùng Firebase JS SDK lắng nghe onChildAdded tại ref đó.
 * File hook tương ứng: frontend/src/hooks/useFirebaseReports.js
 */
let db = null;

function ensureInit() {
  if (db) return db;
  const serviceAccount = JSON.parse(
    readFileSync(config.realtime.firebase.serviceAccountPath, 'utf8')
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: config.realtime.firebase.databaseURL,
  });
  db = admin.database();
  console.log('[firebase] RTDB initialized');
  return db;
}

export const firebaseBus = {
  async publish(sessionId, event, payload) {
    const ref = ensureInit().ref(`sessions/${sessionId}/reports`).push();
    await ref.set({ event, payload, serverAt: Date.now() });
  },
};
