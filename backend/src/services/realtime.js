import { Server } from 'socket.io';
import { config } from '../config/env.js';
import { firebaseBus } from './firebaseBus.js';

/**
 * Lớp trừu tượng hóa kênh realtime. Code route chỉ gọi `realtimeBus.publish(...)`
 * mà không cần biết bên dưới là Socket.io hay Firebase. Muốn đổi driver chỉ sửa .env.
 */
let io = null;

const socketBus = {
  publish(sessionId, event, payload) {
    if (!io) return;
    io.to(sessionId).emit(event, payload);
  },
};

export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.clientOrigin, methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    const sessionId = socket.handshake.query.session;
    if (sessionId && typeof sessionId === 'string') {
      socket.join(sessionId); // mỗi PC join vào "phòng" session của nó
      console.log('[socket] join session:', sessionId);
    }
    socket.on('disconnect', () => console.log('[socket] disconnect', socket.id));
  });

  return io;
}

// Chọn driver theo .env. Mặc định socket (không cần cấu hình ngoài).
export const realtimeBus =
  config.realtime.driver === 'firebase' ? firebaseBus : socketBus;
