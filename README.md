# Ops Report Scanner — Fullstack (Node.js + Express + React)

Ứng dụng tiện ích cá nhân: **chụp ảnh báo cáo vận hành trên điện thoại → AI (Gemini) bóc tách dữ liệu → hiện ngay trên PC theo thời gian thực → lưu vào MongoDB**.

Kiến trúc được tách lớp rõ ràng để sau này thêm tính năng mới chỉ cần thêm route / page / service.

```
┌──────────┐   quét QR    ┌─────────────┐
│  ĐT thoại│ ───────────▶ │  /scan page │ (chụp ảnh → POST /api/upload)
└──────────┘              └──────┬──────┘
                                 ▼
                       ┌──────────────────┐
                       │  Express Server  │──▶ Gemini API (vision) → JSON
                       └──────┬───────────┘
                              │ Socket.io / Firebase RTDB (theo session)
                              ▼
                       ┌──────────────┐    nút "Lưu"     ┌──────────┐
                       │   PC View    │ ───────────────▶ │ MongoDB  │
                       └──────────────┘                  └──────────┘
```

---

## 0. Yêu cầu

- Node.js ≥ 18
- MongoDB (local hoặc [MongoDB Atlas](https://www.mongodb.com/atlas) miễn phí)
- API key Google Gemini: lấy tại https://aistudio.google.com/apikey

---

## 1. Cấu trúc thư mục

```
ops-report-scanner/
├── backend/                  # Node.js + Express
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── index.js          # entry: Express + Socket.io + mount routes
│       ├── config/           # env, mongo
│       ├── models/           # Mongoose schema (Report)
│       ├── services/         # gemini, sessionStore, stagedStore, realtime, firebaseBus
│       ├── routes/           # session, upload, reports
│       └── middleware/       # errorHandler
└── frontend/                 # Vite + React + Tailwind
    ├── .env.example
    ├── vite.config.js        # proxy /api & /socket.io → :4000
    └── src/
        ├── App.jsx           # router: / (PC)  &  /scan (mobile)
        ├── pages/            # PcView, ScanView
        ├── components/       # QrPanel, ReportCard (bảng sửa được + 3 nút)
        ├── hooks/            # useSocketReports, useFirebaseReports
        └── lib/api.js        # fetch wrapper + copy + reportToText
```

---

## 2. Chạy Backend

```bash
cd backend
cp .env.example .env          # rồi điền GEMINI_API_KEY, MONGO_URI...
npm install
npm run dev                   # http://localhost:4000
```

Kiểm tra: `curl http://localhost:4000/api/health` → `{"ok":true,"driver":"socket"}`.

> Nếu chưa có MongoDB, tạm comment dòng `await connectMongo()` trong `src/index.js` để chạy thử; chức năng "Lưu vào MongoDB" sẽ cần Mongo.

---

## 3. Chạy Frontend

```bash
cd frontend
cp .env.example .env          # để mặc định là dùng Socket.io + Vite proxy
npm install
npm run dev                   # http://localhost:5173
```

Mở PC tại `http://localhost:5173` → hiện QR + Session ID.

---

## 4. Test luồng đầy đủ (dev)

**Lưu ý quan trọng:** QR chứa `http://localhost:5173/scan?session=...` — điện thoại **không truy cập được localhost** của PC. Có 2 cách:

- **Cách nhanh (khuyến nghị khi dev):** dùng tunnel công khai. Cài [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) rồi chạy:
  ```bash
  cloudflared tunnel --url http://localhost:5173
  ```
  Nó trả về 1 domain `https://xxx.trycloudflare.com`. Mở PC bằng **domain đó** (không phải localhost) → QR sẽ chứa domain công khai → điện thoại quét được. Đồng thời proxy `/api` và `/socket.io` vẫn trỏ về backend local.
- **Cách 2:** PC và điện thoại cùng mạng Wi-Fi, chạy Vite với `--host`, dùng IP LAN. (WebSocket qua IP LAN vẫn được.)

Sau đó:
1. PC mở trang → QR hiện ra.
2. Điện thoại mở camera quét QR → trang `/scan` mở ra.
3. Bấm "Chọn ảnh" (trên điện thoại sẽ hỏi chụp mới hay chọn từ thư viện) → **Gửi ảnh**.
4. Điện thoại thấy "Gửi thành công" + tóm tắt. PC lập tức hiện bảng chỉ số (sửa được), chip bất thường, raw text.
5. Trên PC bấm **Copy JSON / Copy văn bản / Lưu vào MongoDB**.

---

## 5. Chuyển sang dùng Firebase Realtime Database (thay Socket.io)

Mặc định dùng **Socket.io** (không cần cấu hình gì thêm). Muốn dùng Firebase:

**Backend:**
1. Firebase Console → Project settings → Service accounts → Generate new private key → lưu file `service-account.json` vào `backend/`.
2. Trong `backend/.env`:
   ```
   REALTIME_DRIVER=firebase
   FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json
   FIREBASE_DATABASE_URL=https://<project>-default-rtdb.asia-southeast1.firebasedatabase.app
   ```
3. Restart backend. Code route **không đổi** vì đã qua lớp `realtimeBus` (`backend/src/services/realtime.js`).

**Frontend:**
1. Firebase Console → Project settings → Your apps → thêm Web app → copy config.
2. Trong `frontend/.env`:
   ```
   VITE_REALTIME_DRIVER=firebase
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_DATABASE_URL=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
3. `PcView.jsx` tự động chuyển sang `useFirebaseReports` (hook có sẵn).

**Quy tắc bảo mật RTDB (Rules):** khuyến nghị chỉ cho đọc theo `sessionId` ngẫu nhiên, không cho ghi từ client (backend dùng admin SDK ghi):
```json
{ "rules": { "sessions": { "$sid": { ".read": true, ".write": false } } } }
```

---

## 6. Tùy chỉnh prompt bóc tách dữ liệu

Toàn bộ logic "đọc bảng" nằm gọn trong **`backend/src/services/gemini.js`** (hằng `EXTRACTION_PROMPT` + cấu trúc JSON trả về). Để thêm loại biểu mẫu mới:

- Sửa prompt để mô tả thêm trường / loại chỉ số.
- Hoặc truyền prompt động: thêm field `formType` lên từ frontend, trong route `upload` chọn prompt tương ứng.
- Cấu trúc JSON mở (`data: Mixed` trong Mongoose) nên schema thay đổi không cần migration.

---

## 7. Mở rộng thêm tính năng (đã thiết kế sẵn)

| Tính năng mới | Thêm vào đâu |
|---|---|
| Trang lịch sử báo cáo | Route `GET /api/reports` đã có sẵn → thêm page `/history` trong `App.jsx` |
| Xác thực người dùng | Thêm middleware trong `backend/src/middleware/`, gắn vào router |
| Lưu ảnh gốc | Trong `upload.js`, đổi `multer.memoryStorage()` → `diskStorage`/S3, lưu `imageUrl` vào report |
| Xuất Excel | Thêm route `/api/reports/export` dùng `exceljs` |
| Session bền vững (nhiều instance) | Đổi `sessionStore` / `stagedStore` sang Redis hoặc MongoDB, giữ nguyên interface |
| Tính năng tiện ích khác | Thêm route `/api/tools/xxx` + page `/tools/xxx` — app là "khung" chung |

---

## 8. Deploy nhanh gọn

- **Backend:** Render / Railway / Fly.io / VPS (Node ≥ 18). Set các biến `.env`. `CLIENT_ORIGIN` trỏ về domain frontend.
- **Frontend:** Vercel / Netlify / Cloudflare Pages. Set `VITE_API_BASE=https://api.domain.com` và `VITE_REALTIME_DRIVER`.
- **MongoDB:** Atlas free tier.
- **Lưu ý:** QR chứa `window.location.origin` của trang PC — khi deploy, PC phải được mở bằng **domain công khai có HTTPS** thì điện thoại mới truy cập và dùng camera được (trình duyệt mobile chỉ cho `capture` / camera trên HTTPS hoặc localhost).

---

## 9. API tóm tắt

| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/session` | Tạo session mới (PC) |
| GET | `/api/session/:id` | Kiểm tra session hợp lệ (điện thoại) |
| GET | `/api/session/:id/staged` | Lấy danh sách báo cáo chờ lưu (PC F5) |
| POST | `/api/upload?session=ID` | Upload ảnh (field `photo`) → Gemini → đẩy realtime |
| POST | `/api/reports` | Lưu báo cáo (đã xác nhận) vào MongoDB |
| GET | `/api/reports?sessionId=ID&limit=50` | Liệt kê báo cáo đã lưu |

Realtime event (Socket.io): `report:extracted` gửi tới room `sessionId`.
