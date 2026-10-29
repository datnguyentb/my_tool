import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * Kết nối realtime qua Socket.io, lắng nghe event 'report:extracted' của 1 session.
 * Trả về { reports, connected }. Mới nhất ở đầu mảng.
 */
export function useSocketReports(sessionId) {
  const [reports, setReports] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const socket = io(import.meta.env.VITE_API_BASE || undefined, {
      query: { session: sessionId },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('report:extracted', (report) => {
      setReports((prev) => [report, ...prev.filter((r) => r.id !== report.id)]);
    });

    return () => socket.close();
  }, [sessionId]);

  // Cho phép PcView "tiêm" danh sách staged ban đầu (lấy từ REST khi vào lại).
  const seed = (list) => setReports((prev) => (prev.length ? prev : list));

  return { reports, setReports, connected, seed };
}
