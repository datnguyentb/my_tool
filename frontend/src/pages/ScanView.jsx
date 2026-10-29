import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';

/**
 * Trang điện thoại: mở bằng cách quét QR.
 * - Đọc session từ ?session=XXX
 * - Cho chụp/tải ảnh (capture="environment" mở camera sau trên mobile)
 * - Gửi lên server, hiển thị kết quả tóm tắt.
 */
export default function ScanView() {
  const [params] = useSearchParams();
  const sessionId = params.get('session');

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [message, setMessage] = useState('');
  const [summary, setSummary] = useState(null);
  const [sessionOk, setSessionOk] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!sessionId) {
      setSessionOk(false);
      return;
    }
    api.checkSession(sessionId).catch(() => setSessionOk(false));
  }, [sessionId]);

  const pickFile = (f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStatus('idle');
    setMessage('');
    setSummary(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !sessionId) return;
    setStatus('sending');
    setMessage('Đang gửi ảnh và phân tích...');
    try {
      const res = await api.uploadPhoto(sessionId, file, (pct) => {
        setMessage(`Đang tải lên... ${pct}%`);
      });
      setSummary(res.summary);
      setStatus('done');
      setMessage('Gửi thành công! Dữ liệu đã hiện trên màn hình PC.');
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  if (!sessionOk) {
    return (
      <div className="min-h-full flex items-center justify-center p-6 text-center">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 max-w-sm">
          <p className="text-rose-600 font-medium">Liên kết không hợp lệ hoặc đã hết hạn.</p>
          <p className="text-sm text-slate-500 mt-2">Hãy mở lại trang trên PC và quét mã QR mới.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-800">Gửi báo cáo vận hành</h1>
          <p className="text-xs text-slate-400 mt-1">Session: <span className="font-mono font-semibold text-brand-600">{sessionId}</span></p>
        </div>

        {preview && (
          <img src={preview} alt="preview" className="w-full rounded-xl border border-slate-200 object-contain max-h-72" />
        )}

        <label className="block">
          <span className="sr-only">Chọn ảnh</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => pickFile(e.target.files?.[0])}
            className="block w-full text-sm text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-500 file:text-white hover:file:bg-brand-600 cursor-pointer"
          />
        </label>

        <button
          type="submit"
          disabled={!file || status === 'sending'}
          className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white font-semibold transition"
        >
          {status === 'sending' ? 'Đang xử lý...' : 'Gửi ảnh'}
        </button>

        {message && (
          <p className={`text-sm text-center ${status === 'error' ? 'text-rose-600' : status === 'done' ? 'text-emerald-600' : 'text-slate-500'}`}>
            {message}
          </p>
        )}

        {summary && (
          <div className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-600 space-y-1">
            <div>Loại biểu mẫu: <b>{summary.formType || '—'}</b></div>
            <div>Số chỉ số đọc được: <b>{summary.metricsCount}</b></div>
            <div>Số bất thường: <b>{summary.anomaliesCount}</b></div>
          </div>
        )}

        {status === 'done' && (
          <button type="button" onClick={() => { setStatus('idle'); setMessage(''); setSummary(null); }} className="w-full text-sm text-brand-500 hover:underline">
            Gửi ảnh khác
          </button>
        )}
      </form>
    </div>
  );
}
