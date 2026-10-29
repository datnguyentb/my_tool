import { Routes, Route, Navigate } from 'react-router-dom';
import PcView from './pages/PcView.jsx';
import ScanView from './pages/ScanView.jsx';

/**
 * Mở rộng tính năng sau này: thêm Route ở đây.
 * Ví dụ: /history (lịch sử báo cáo), /settings, /tools/xxx...
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PcView />} />
      <Route path="/scan" element={<ScanView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
