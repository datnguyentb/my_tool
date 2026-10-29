const BASE = import.meta.env.VITE_API_BASE || '';

async function handle(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

export const api = {
  createSession: () => fetch(`${BASE}/api/session`, { method: 'POST' }).then(handle),

  getStaged: (sessionId) => fetch(`${BASE}/api/session/${sessionId}/staged`).then(handle),

  checkSession: (sessionId) => fetch(`${BASE}/api/session/${sessionId}`).then(handle),

  uploadPhoto: (sessionId, file, onProgress) =>
    new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('photo', file);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}/api/upload?session=${encodeURIComponent(sessionId)}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(json);
          else reject(new Error(json.error || `HTTP ${xhr.status}`));
        } catch {
          reject(new Error('Phản hồi server không hợp lệ.'));
        }
      };
      xhr.onerror = () => reject(new Error('Lỗi mạng. Kiểm tra kết nối.'));
      xhr.send(form);
    }),

  saveReport: (payload) =>
    fetch(`${BASE}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(handle),
};

// ---- Tiện ích copy ----
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback cho trình duyệt cũ / không có clipboard API
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    return true;
  }
}

// Chuyển JSON báo cáo thành văn bản dễ đọc (để paste vào Excel/Word/Zalo...).
export function reportToText(report) {
  const d = report.data || {};
  const lines = [];
  lines.push(`=== BÁO CÁO VẬN HÀNH ===`);
  if (d.formType) lines.push(`Loại biểu mẫu: ${d.formType}`);
  if (d.machineId) lines.push(`Mã máy: ${d.machineId}`);
  if (d.shift) lines.push(`Ca: ${d.shift}`);
  if (d.operator) lines.push(`Người ghi: ${d.operator}`);
  if (d.recordedAt) lines.push(`Thời gian: ${d.recordedAt}`);
  lines.push('');
  lines.push('--- Chỉ số ---');
  (d.metrics || []).forEach((m) => {
    lines.push(`${m.name || ''}: ${m.value ?? ''} ${m.unit || ''}${m.note ? ` (${m.note})` : ''}`.trim());
  });
  if (d.anomalies?.length) {
    lines.push('');
    lines.push('--- Bất thường / Lỗi ---');
    d.anomalies.forEach((a) => lines.push(`- ${a}`));
  }
  return lines.join('\n');
}
