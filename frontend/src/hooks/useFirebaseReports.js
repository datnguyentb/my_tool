import { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onChildAdded } from 'firebase/database';

/**
 * Hook thay thế khi backend dùng REALTIME_DRIVER=firebase.
 * PC lắng nghe trực tiếp node `sessions/{sessionId}/reports` trên RTDB.
 * Cần đặt các biến VITE_FIREBASE_* trong .env (xem .env.example).
 */
let app = null;
function getApp() {
  if (app) return app;
  app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  });
  return app;
}

export function useFirebaseReports(sessionId) {
  const [reports, setReports] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const db = getDatabase(getApp());
    const reportsRef = ref(db, `sessions/${sessionId}/reports`);
    setConnected(true);

    const off = onChildAdded(reportsRef, (snap) => {
      const val = snap.val();
      const report = val?.payload; // backend ghi { event, payload, serverAt }
      if (report) setReports((prev) => [report, ...prev.filter((r) => r.id !== report.id)]);
    });

    return () => {
      off();
      setConnected(false);
    };
  }, [sessionId]);

  return { reports, setReports, connected, seed: (list) => setReports((p) => (p.length ? p : list)) };
}
