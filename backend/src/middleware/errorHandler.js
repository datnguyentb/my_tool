// Middleware lỗi tập trung: mọi route dùng next(err) sẽ về đây.
export function errorHandler(err, _req, res, _next) {
  console.error('[error]', err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    // Để debug khi dev; production nên bỏ stack.
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

export function notFound(_req, res) {
  res.status(404).json({ error: 'Không tìm thấy endpoint.' });
}
