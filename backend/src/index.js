import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { connectMongo } from './config/mongo.js';
import { initRealtime } from './services/realtime.js';
import { sessionRouter } from './routes/session.js';
import { uploadRouter } from './routes/upload.js';
import { reportRouter } from './routes/reports.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();
const server = http.createServer(app);

// ---- Middleware ----
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '5mb' }));

// Health check đơn giản.
app.get('/api/health', (_req, res) => res.json({ ok: true, driver: config.realtime.driver }));

// ---- Routes (gắn chung tiền tố /api) ----
app.use('/api', sessionRouter);
app.use('/api', uploadRouter);
app.use('/api', reportRouter);

app.use(notFound);
app.use(errorHandler);

// ---- Khởi động ----
async function start() {
  await connectMongo(); // nếu chưa có Mongo, comment dòng này để chạy thử trước
  initRealtime(server);
  server.listen(config.port, () => {
    console.log(`[server] http://localhost:${config.port}  | realtime driver: ${config.realtime.driver}`);
  });
}

start().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
