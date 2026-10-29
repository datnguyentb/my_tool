import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: config.gemini.model });

/**
 * Prompt bóc tách dữ liệu báo cáo vận hành.
 * Muốn thêm loại biểu mẫu mới chỉ cần SỬA Ở ĐÂY (hoặc truyền prompt động theo formType).
 */
const EXTRACTION_PROMPT = `Bạn là trợ lý AI chuyên trích xuất dữ liệu từ các biểu mẫu báo cáo sản xuất công nghiệp viết tay và in sẵn.

Phân tích bức ảnh "Fryer Control Record" được cung cấp và chuyển đổi toàn bộ nội dung thành định dạng JSON chuẩn, sạch sẽ để lưu vào cơ sở dữ liệu MongoDB.

=== YÊU CẦU BÓC TÁCH ===

1. Thông tin chung (Header):
- formType: luôn là "Fryer Control Record"
- recordedAt: Ngày đọc từ mục Date (giữ nguyên chuỗi gốc, ví dụ: "28/10/2026")
- shift: Ca làm việc nếu có, nếu không thì null
- lineStage: Line/Stage nếu có (ví dụ: "Stax line", "Production", "Fryer..."), nếu không thì null

2. Bảng dữ liệu chính:
- Tạo mảng timeSeries, mỗi phần tử ứng với một mốc thời gian đo
- Mỗi phần tử có cấu trúc:
  {
    "time": "chuỗi thời gian ví dụ 23:00, 23:30, 0:00...",
    "metrics": [
      {"name":"tên thông số chính xác như trên biểu mẫu", "value":"giá trị đọc được", "unit":"đơn vị nếu có", "note":"ghi chú nếu có"}
    ]
  }
- Bao gồm toàn bộ thông số: Fryer oil inlet temp, Outlet Temp, Delta T, Dwell time, Oil flow, Throughput, %oil, %moisture, FFA, PV... và tất cả các chỉ số khác trong bảng

3. Ghi chú & Sự cố (Machine Downtime / Remarks):
- Tạo mảng remarks, mỗi dòng ghi chú là 1 đối tượng:
  {
    "time": "thời gian nếu có",
    "description": "nội dung mô tả/Diễn tả",
    "action": "Hành động đã thực hiện",
    "durationMinute": "thời gian dừng nếu có",
    "type": "downtime|alert|normal"
  }
- Nếu không có thì trả về mảng rỗng []

4. Thông tin cuối trang (Tổng kết):
- summary: {
    "oilMeterStart": "giá trị đọc được",
    "oilMeterFinish": "giá trị đọc được",
    "totalOilUsage": "tổng sử dụng dầu",
    "staxOperator": "tên người vận hành",
    "verifiedBy": "người xác nhận"
  }
- Nếu không có thông tin tương ứng thì để null

5. rawText:
- Ghi toàn bộ nội dung văn bản đọc được từ ảnh, giữ nguyên để đối chiếu

=== QUY TẮC BẮT BUỘC ===
- Trả về DUY NHẤT khối JSON hợp lệ, BẮT ĐẦU BẰNG { VÀ KẾT THÚC BẰNG }, KHÔNG có bất kỳ chữ nào bên trong hay bên ngoài khối JSON
- Không suy diễn, không bổ sung thông tin không có trong ảnh
- Không đọc được thì để null hoặc ""
- Giữ nguyên tên cột, tên thông số đúng như trên biểu mẫu
- Số liệu viết tay ưu tiên hơn số liệu in sẵn nếu có sự khác biệt

=== KẾT CẤU JSON ===
{
  "formType": "Fryer Control Record",
  "recordedAt": "chuỗi ngày hoặc null",
  "shift": "chuỗi hoặc null",
  "lineStage": "chuỗi hoặc null",
  "timeSeries": [],
  "remarks": [],
  "summary": {},
  "rawText": "toàn bộ nội dung văn bản ảnh"
}`;

/**
 * @param {{base64: string, mimeType: string}} input - ảnh dạng base64 (không có tiền tố data:)
 * @returns {Promise<object>} JSON đã parse
 */
export async function extractReportFromImage({ base64, mimeType }) {
  const result = await model.generateContent([
    { inlineData: { data: base64, mimeType: mimeType || 'image/jpeg' } },
    EXTRACTION_PROMPT,
  ]);
  const text = result.response.text();
  return parseJsonSafely(text);
}

// Gemini đôi khi trả JSON bọc trong ```json ... ```. Làm sạch + fallback an toàn.
function parseJsonSafely(text) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* fallthrough */
      }
    }
    return {
      parseError: true,
      formType: null,
      metrics: [],
      anomalies: [],
      rawText: text,
    };
  }
}
