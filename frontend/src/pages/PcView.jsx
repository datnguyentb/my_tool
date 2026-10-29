import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { useSocketReports } from '../hooks/useSocketReports.js';
import { useFirebaseReports } from '../hooks/useFirebaseReports.js';
import QrPanel from '../components/QrPanel.jsx';
import ReportCard from '../components/ReportCard.jsx';

const DRIVER = import.meta.env.VITE_REALTIME_DRIVER || 'socket';

export default function PcView() {
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState('');

  // Chọn hook realtime theo cấu hình. Logic phía dưới không đổi.
  const useRealtime = DRIVER === 'firebase' ? useFirebaseReports : useSocketReports;
  const { reports, setReports, connected, seed } = useRealtime(sessionId);

  // 1) Mở trang -> tạo session.
  useEffect(() => {
    api.createSession()
      .then(({ sessionId }) => setSessionId(sessionId))
      .catch((e) => setError('Không tạo được session: ' + e.message));
  }, []);

  // 2) Khi có session, lấy lại danh sách báo cáo chờ (trường hợp F5 / mất kết nối).
  useEffect(() => {
    if (!sessionId) return;
    api.getStaged(sessionId)
      .then(({ reports: list }) => seed([...list].reverse()))
      .catch(() => {});
  }, [sessionId]);

  // 3) URL mà QR trỏ tới — dùng origin hiện tại (khi deploy phải là domain công khai).
  const scanUrl = useMemo(() => {
    if (!sessionId) return '';
    return `${window.location.origin}/scan?session=${sessionId}`;
  }, [sessionId]);

  const handleSaved = (reportId) => {
    // Sau khi lưu, vẫn giữ card nhưng đánh dấu; có thể ẩn đi nếu muốn:
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  if (error) return <div className="p-8 text-center text-rose-600">{error}</div>;
  if (!sessionId) return <div className="p-8 text-center text-slate-500">Đang tạo phiên...</div>;

  return (
    <div className="min-h-full max-w-6xl mx-auto p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Báo cáo vận hành — Quét ảnh từ điện thoại</h1>
        <p className="text-sm text-slate-500 mt-1">Chụp biểu mẫu trên điện thoại, dữ liệu sẽ hiện ngay tại đây sau khi AI bóc tách.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        <QrPanel sessionId={sessionId} scanUrl={scanUrl} connected={connected} />

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">
              Dữ liệu nhận được <span className="text-slate-400 font-normal">({reports.length})</span>
            </h2>
          </div>

          {reports.length === 0 && (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400">
              Chưa có dữ liệu. Hãy quét QR và gửi ảnh báo cáo từ điện thoại.
            </div>
          )}

          {reports.map((r) => (
            <ReportCard key={r.id} report={r} onSaved={handleSaved} />
          ))}
        </section>
      </div>
    </div>
  );
}
