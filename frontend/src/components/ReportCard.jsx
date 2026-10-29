import { useState } from 'react';
import { api, copyText, reportToText } from '../lib/api.js';

/**
 * Hiển thị 1 báo cáo đã bóc tách: bảng chỉ số có thể sửa trực tiếp,
 * danh sách bất thường, raw text thu gọn, và 3 nút tiện ích.
 */
export default function ReportCard({ report, onSaved }) {
  const [data, setData] = useState(report.data || {});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const metrics = Array.isArray(data.metrics) ? data.metrics : [];
  const anomalies = Array.isArray(data.anomalies) ? data.anomalies : [];

  const updateMetric = (idx, field, value) => {
    setData((d) => {
      const next = { ...d, metrics: [...(d.metrics || [])] };
      next.metrics[idx] = { ...next.metrics[idx], [field]: value };
      return next;
    });
  };

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  const handleCopyJson = async () => {
    await copyText(JSON.stringify(data, null, 2));
    flash('Đã copy JSON');
  };
  const handleCopyText = async () => {
    await copyText(reportToText({ data }));
    flash('Đã copy dạng văn bản');
  };
  const handleSave = async () => {
    setBusy(true);
    try {
      await api.saveReport({ sessionId: report.sessionId, reportId: report.id, data, fileName: report.fileName });
      setSaved(true);
      flash('Đã lưu vào MongoDB');
      onSaved?.(report.id);
    } catch (e) {
      flash('Lỗi: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <span className="text-xs text-slate-400">Nhận lúc {new Date(report.receivedAt).toLocaleTimeString('vi-VN')}</span>
          {data.formType && <div className="font-semibold text-slate-800">{data.formType}</div>}
          <div className="text-xs text-slate-500">
            {[data.machineId && `Máy: ${data.machineId}`, data.shift && `Ca: ${data.shift}`, data.operator && `NV: ${data.operator}`]
              .filter(Boolean).join(' · ')}
          </div>
        </div>
        {toast && <span className="text-xs text-emerald-600 font-medium">{toast}</span>}
      </div>

      {/* Bảng chỉ số — sửa trực tiếp được */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Chỉ số</th>
              <th className="text-left px-3 py-2 font-medium">Giá trị</th>
              <th className="text-left px-3 py-2 font-medium">Đơn vị</th>
              <th className="text-left px-3 py-2 font-medium">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {metrics.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400">Không đọc được chỉ số nào.</td></tr>
            )}
            {metrics.map((m, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-2 py-1"><input className="w-full px-1 py-1 rounded bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-brand-500 outline-none" value={m.name || ''} onChange={(e) => updateMetric(i, 'name', e.target.value)} /></td>
                <td className="px-2 py-1"><input className="w-full px-1 py-1 rounded bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-brand-500 outline-none font-medium" value={m.value ?? ''} onChange={(e) => updateMetric(i, 'value', e.target.value)} /></td>
                <td className="px-2 py-1"><input className="w-full px-1 py-1 rounded bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-brand-500 outline-none" value={m.unit || ''} onChange={(e) => updateMetric(i, 'unit', e.target.value)} /></td>
                <td className="px-2 py-1"><input className="w-full px-1 py-1 rounded bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-brand-500 outline-none" value={m.note || ''} onChange={(e) => updateMetric(i, 'note', e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {anomalies.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold text-rose-600 uppercase mb-1">Bất thường / Lỗi</div>
          <div className="flex flex-wrap gap-2">
            {anomalies.map((a, i) => (
              <span key={i} className="text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-full px-3 py-1">{a}</span>
            ))}
          </div>
        </div>
      )}

      {data.rawText && (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-slate-400 hover:text-slate-600">Xem văn bản thô (raw OCR)</summary>
          <pre className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3 whitespace-pre-wrap text-slate-600">{data.rawText}</pre>
        </details>
      )}

      {/* Nút tiện ích */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={handleCopyJson} className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700">Copy JSON</button>
        <button onClick={handleCopyText} className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700">Copy văn bản</button>
        <button
          onClick={handleSave}
          disabled={busy || saved}
          className={`px-3 py-1.5 text-sm rounded-lg text-white font-medium ${saved ? 'bg-emerald-500' : 'bg-brand-500 hover:bg-brand-600'} disabled:opacity-60`}
        >
          {busy ? 'Đang lưu...' : saved ? 'Đã lưu vào MongoDB' : 'Lưu vào MongoDB'}
        </button>
      </div>
    </div>
  );
}
