import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { extractReportFromImage } from '../services/gemini.js';
import { sessionStore } from '../services/sessionStore.js';
import { stagedStore } from '../services/stagedStore.js';
import { realtimeBus } from '../services/realtime.js';

const upload = multer({
  storage: multer.memoryStorage(), // ảnh chỉ tồn tại trong RAM, không ghi đĩa
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const uploadRouter = Router();

/**
 * Điện thoại gọi: POST /api/upload?session=ABC123  (field name: "photo")
 * Luồng: validate session -> gọi Gemini bóc tách -> lưu vào staged -> đẩy realtime về PC.
 */
uploadRouter.post('/upload', upload.single('photo'), async (req, res, next) => {
  try {
    const sessionId = String(req.query.session || req.body?.session || '').trim();
    if (!sessionId || !sessionStore.exists(sessionId)) {
      return res.status(400).json({ error: 'Session không hợp lệ hoặc đã hết hạn. Hãy quét lại QR trên PC.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Thiếu file ảnh (field name phải là "photo").' });
    }

    const base64 = req.file.buffer.toString('base64');
    const extracted = await extractReportFromImage({
      base64,
      mimeType: req.file.mimetype,
    });

    const report = {
      id: randomUUID(),
      sessionId,
      fileName: req.file.originalname,
      receivedAt: new Date().toISOString(),
      data: extracted,
    };

    stagedStore.add(sessionId, report);
    await realtimeBus.publish(sessionId, 'report:extracted', report);

    res.json({
      ok: true,
      reportId: report.id,
      summary: {
        formType: extracted.formType || null,
        metricsCount: Array.isArray(extracted.metrics) ? extracted.metrics.length : 0,
        anomaliesCount: Array.isArray(extracted.anomalies) ? extracted.anomalies.length : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});
