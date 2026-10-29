import { Router } from 'express';
import { sessionStore } from '../services/sessionStore.js';
import { stagedStore } from '../services/stagedStore.js';

export const sessionRouter = Router();

// PC mở trang -> tạo session mới. Mỗi lần mở là 1 session riêng.
sessionRouter.post('/session', (_req, res) => {
  const sessionId = sessionStore.createSession();
  res.json({ sessionId });
});

// PC vào lại / mất kết nối -> lấy lại danh sách báo cáo đang chờ lưu.
sessionRouter.get('/session/:id/staged', (req, res) => {
  const { id } = req.params;
  if (!sessionStore.exists(id)) return res.status(404).json({ error: 'Session không tồn tại hoặc đã hết hạn.' });
  res.json({ reports: stagedStore.get(id) });
});

// Điện thoại quét QR -> kiểm tra session còn hiệu lực trước khi cho upload.
sessionRouter.get('/session/:id', (req, res) => {
  const { id } = req.params;
  res.json({ valid: sessionStore.exists(id) });
});
