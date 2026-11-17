# MealMeal

Web app giúp bạn biết một bữa ăn có bao nhiêu calories và chất dinh dưỡng. Chụp ảnh bữa ăn hoặc gõ mô tả khẩu phần, AI ước tính từng món, bạn chỉnh lại khối lượng nếu cần rồi lưu. Trang chính có lịch, mỗi ngày một vòng tròn cho biết đã ăn bao nhiêu so với mục tiêu calories (thâm hụt, giữ cân hoặc bulking). Mỗi bữa ăn có thể xuất thành ảnh để chia sẻ.

Thiết kế cho điện thoại. Có thể thêm vào màn hình chính như một ứng dụng.

## Dữ liệu nằm ở đâu

- Mục tiêu, bữa ăn và ảnh **chỉ lưu trong trình duyệt của người dùng** (IndexedDB). Không có tài khoản, không có database phía server.
- Xóa dữ liệu trang web, dùng chế độ ẩn danh hoặc đổi trình duyệt/thiết bị thì dữ liệu cũ không còn. Không có đồng bộ giữa các máy.
- Server chỉ chuyển ảnh/mô tả sang nhà cung cấp AI để phân tích. Server không lưu và không ghi log ảnh hay mô tả; log chỉ có mã lỗi và thời gian xử lý.

## Chạy trên máy

Cần Node.js 20.9 trở lên.

```bash
npm install
cp .env.example .env.local
# mở .env.local và điền OPENAI_API_KEY, AI_MODEL (xem bảng bên dưới)
npm run dev
```

Mở http://localhost:3000. Lần đầu sẽ vào trang đặt mục tiêu.

## Biến môi trường

Tất cả biến chỉ dùng ở server. Không đặt biến nào có tiền tố `NEXT_PUBLIC_`.

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `OPENAI_API_KEY` | Có | API key của nhà cung cấp AI. |
| `AI_MODEL` | Có | Tên model. Phải đọc được ảnh (vision). |
| `OPENAI_BASE_URL` | Không | Endpoint của nhà cung cấp tương thích OpenAI. Bỏ trống thì dùng OpenAI. |
| `AI_JSON_MODE` | Không | `json_schema` (mặc định) hoặc `json_object` cho nhà cung cấp không hỗ trợ structured output. |
| `UPSTASH_REDIS_REST_URL` | Không, nên có trên production | URL REST của Upstash Redis, dùng để giới hạn lượt gọi. |
| `UPSTASH_REDIS_REST_TOKEN` | Không, nên có trên production | Token REST của Upstash Redis. |

Giới hạn lượt gọi phân tích: 10 lượt/phút và 60 lượt/ngày cho mỗi địa chỉ IP. Thiếu hai biến Upstash thì app dùng bộ đếm trong bộ nhớ. Bộ đếm này không chia sẻ giữa các instance serverless, nên trên Vercel hãy cấu hình Upstash.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy local |
| `npm test` | Unit test (Vitest) |
| `npm run typecheck` | Kiểm tra kiểu (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm run build` | Build production |
| `npm run e2e` | Test đầu cuối (Playwright, Chromium giả lập Pixel 7) |

Test đầu cuối tự build và chạy app ở cổng 3100, và chặn lời gọi `/api/analyze` bằng dữ liệu giả, nên không cần API key. Lần đầu chạy cần tải trình duyệt:

```bash
npx playwright install chromium
```

## Deploy lên Vercel

1. Đẩy mã lên GitHub rồi import repo vào Vercel. Không cần đổi cấu hình build.
2. Tạo database Upstash Redis (trong Vercel Marketplace hoặc ở upstash.com). Lấy **REST URL** và **REST token**.
3. Trong **Project → Settings → Environment Variables**, khai báo `OPENAI_API_KEY`, `AI_MODEL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, và nếu cần thì `OPENAI_BASE_URL`, `AI_JSON_MODE`.
4. Deploy lại để biến mới có hiệu lực.
5. Mở trang trên điện thoại, chụp thử một bữa ăn để kiểm tra.

**Quan trọng:** app không có đăng nhập, ai có đường dẫn cũng gọi được AI. Giới hạn lượt gọi chỉ hạn chế theo IP. Hãy **đặt hạn mức chi tiêu hằng tháng** (monthly budget/usage limit) trên trang quản trị của nhà cung cấp AI để không bị tính tiền ngoài dự kiến.

## Thêm vào màn hình chính

- **iPhone (Safari):** nút Chia sẻ → "Thêm vào MH chính".
- **Android (Chrome):** menu ⋮ → "Thêm vào màn hình chính" hoặc "Cài đặt ứng dụng".

## Tài liệu

- Thiết kế: `docs/superpowers/specs/2026-11-17-mealmeal-design.md`
- Kế hoạch triển khai: `docs/superpowers/plans/2026-11-17-mealmeal-v1.md`
- Kết quả nghiệm thu: `docs/superpowers/acceptance-report.md`
