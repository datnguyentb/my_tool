import { QRCodeSVG } from 'qrcode.react';

/**
 * Panel hiển thị QR + link quét. QR chứa URL đầy đủ của trang mobile.
 * Lưu ý: khi dev localhost, điện thoại không truy cập được localhost —
 * dùng tunnel (cloudflared / ngrok) hoặc deploy để có domain công khai.
 */
export default function QrPanel({ sessionId, scanUrl, connected }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Quét mã để gửi báo cáo</h2>
      <p className="text-sm text-slate-500 mb-4">
        Dùng camera điện thoại quét mã QR bên dưới.
      </p>

      <div className="p-3 bg-white border-2 border-brand-500 rounded-xl">
        <QRCodeSVG value={scanUrl} size={200} level="M" includeMargin={false} />
      </div>

      <div className="mt-4 w-full">
        <div className="text-xs text-slate-400 uppercase tracking-wide">Session ID</div>
        <div className="font-mono text-xl font-bold text-brand-600 tracking-widest">{sessionId}</div>
      </div>

      <a
        href={scanUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 text-xs text-brand-500 hover:underline break-all max-w-full"
      >
        {scanUrl}
      </a>

      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
        <span className={connected ? 'text-emerald-600' : 'text-amber-600'}>
          {connected ? 'Đang chờ dữ liệu thời gian thực...' : 'Đang kết nối realtime...'}
        </span>
      </div>
    </div>
  );
}
