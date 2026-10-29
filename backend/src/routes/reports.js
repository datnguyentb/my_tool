import { Router } from 'express';
import { Report } from '../models/Report.js';
import { stagedStore } from '../services/stagedStore.js';

export const reportRouter = Router();

// PC bấm "Lưu vào MongoDB" -> gọi đây. `data` là JSON (có thể đã được sửa trên PC).
reportRouter.post('/reports', async (req, res, next) => {
  try {
    const { sessionId, reportId, data, fileName } = req.body || {};
    if (!sessionId || !data) {
      return res.status(400).json({ error: 'Thiếu sessionId hoặc data.' });
    }
    const saved = await Report.create({ sessionId, data, fileName, source: 'pc-save' });
    if (reportId) stagedStore.remove(sessionId, reportId); // đã lưu thì bỏ khỏi danh sách chờ
    res.json({ ok: true, id: saved._id });
  } catch (err) {
    next(err);
  }
});

// Liệt kê báo cáo đã lưu (phục vụ trang lịch sử sau này).
reportRouter.get('/reports', async (req, res, next) => {
  try {
    const { sessionId, limit = 50 } = req.query;
    const filter = sessionId ? { sessionId } : {};
    const docs = await Report.find(filter).sort({ createdAt: -1 }).limit(Number(limit));
    res.json({ reports: docs });
  } catch (err) {
    next(err);
  }
});
