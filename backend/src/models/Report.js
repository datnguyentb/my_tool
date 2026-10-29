import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Báo cáo vận hành đã được xác nhận lưu (nút "Lưu vào MongoDB" trên PC).
 * `data` để Mixed vì cấu trúc JSON do Gemini trả về có thể thay đổi theo loại biểu mẫu —
 * muốn chặt chẽ hơn thì tách thành collection riêng theo formType.
 */
const reportSchema = new Schema(
  {
    sessionId: { type: String, index: true, required: true },
    status: { type: String, enum: ['confirmed'], default: 'confirmed' },
    source: { type: String, default: 'pc-save' }, // để sau này phân biệt nguồn
    fileName: String,
    data: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const Report = mongoose.model('Report', reportSchema);
