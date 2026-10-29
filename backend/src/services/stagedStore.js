/**
 * "Bãi đỗ" các báo cáo vừa được Gemini bóc tách, chờ người dùng trên PC
 * xem xét và bấm "Lưu vào MongoDB". Nếu PC mất kết nối rồi vào lại,
 * vẫn lấy lại được danh sách này qua GET /api/session/:id/staged.
 *
 * In-memory — production nên chuyển sang Redis hoặc collection `staged_reports` trong Mongo.
 */
const staged = new Map(); // sessionId -> Report[] (mới nhất ở cuối)
const MAX_PER_SESSION = 50;

export function addStaged(sessionId, report) {
  const list = staged.get(sessionId) || [];
  list.push(report);
  if (list.length > MAX_PER_SESSION) list.shift();
  staged.set(sessionId, list);
  return report;
}

export function getStaged(sessionId) {
  return staged.get(sessionId) || [];
}

export function removeStaged(sessionId, reportId) {
  const list = staged.get(sessionId) || [];
  staged.set(
    sessionId,
    list.filter((r) => r.id !== reportId)
  );
}

export const stagedStore = { add: addStaged, get: getStaged, remove: removeStaged };
