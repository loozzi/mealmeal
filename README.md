# MealMeal

Web app giúp bạn biết một bữa ăn có bao nhiêu calories và chất dinh dưỡng. Chụp ảnh bữa ăn hoặc gõ mô tả khẩu phần, AI ước tính từng món, bạn chỉnh lại khối lượng nếu cần rồi lưu. Trang chính có lịch, mỗi ngày một vòng tròn cho biết đã ăn bao nhiêu so với mục tiêu calories (thâm hụt, giữ cân hoặc bulking). Mỗi bữa ăn có thể xuất thành ảnh để chia sẻ.

Thiết kế cho điện thoại. Có thể thêm vào màn hình chính như một ứng dụng. Cần đăng nhập bằng Google; dữ liệu theo tài khoản nên mở ở máy nào cũng xem và thêm được.

## Dữ liệu nằm ở đâu

- **Mục tiêu, hồ sơ và bữa ăn** lưu trên Firestore, dưới `users/{uid}` của tài khoản Google đang đăng nhập. Rules (`firestore.rules`) chỉ cho chính chủ đọc/ghi. Firestore giữ bản sao trên máy nên app vẫn dùng được khi mất mạng và tự đồng bộ khi có mạng lại.
- **Ảnh bữa ăn không bao giờ lên server.** Ảnh chỉ lưu trong trình duyệt của máy đã chụp (IndexedDB, bảng `photos`). Mở bữa đó ở máy khác thì thấy dòng "Ảnh chỉ có trên thiết bị đã chụp."
- Dữ liệu của bản cũ (chỉ lưu trên máy) được chuyển lên tài khoản ở lần đăng nhập đầu tiên, một lần duy nhất.
- Đăng xuất xóa bản sao Firestore trên máy; ảnh vẫn ở lại máy.
- Server chỉ kiểm token đăng nhập và chuyển ảnh/mô tả sang nhà cung cấp AI để phân tích. Server không lưu và không ghi log ảnh, mô tả, uid hay email; log chỉ có mã lỗi và thời gian xử lý.

## Chạy trên máy

Cần Node.js 20.9 trở lên.

```bash
npm install
cp .env.example .env.local
# mở .env.local và điền OPENAI_API_KEY, AI_MODEL và 4 biến Firebase (xem bảng bên dưới)
npm run dev
```

Mở http://localhost:3000. Lần đầu sẽ vào trang đăng nhập, rồi trang đặt mục tiêu.

Cần một project Firebase đã làm các bước ở mục "Cài Firebase" bên dưới, và `localhost` nằm trong Authorized domains (Firebase thêm sẵn).

## Biến môi trường

Biến AI và Upstash chỉ dùng ở server. Biến `NEXT_PUBLIC_` duy nhất được phép là 4 biến cấu hình web Firebase; chúng công khai, không phải bí mật. Không cần service account: server tự kiểm token đăng nhập bằng khóa công khai của Google.

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `OPENAI_API_KEY` | Có | API key của nhà cung cấp AI. |
| `AI_MODEL` | Có | Tên model. Phải đọc được ảnh (vision). |
| `OPENAI_BASE_URL` | Không | Endpoint của nhà cung cấp tương thích OpenAI. Bỏ trống thì dùng OpenAI. |
| `AI_JSON_MODE` | Không | `json_schema` (mặc định) hoặc `json_object` cho nhà cung cấp không hỗ trợ structured output. |
| `UPSTASH_REDIS_REST_URL` | Không, nên có trên production | URL REST của Upstash Redis, dùng để giới hạn lượt gọi. |
| `UPSTASH_REDIS_REST_TOKEN` | Không, nên có trên production | Token REST của Upstash Redis. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Có | Cấu hình web Firebase. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Có | Trên production là domain của app (`mealmeal-app.vercel.app`); local dùng `<projectId>.firebaseapp.com`. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Có | Server dùng để kiểm token. Bắt đầu bằng `demo-` thì app dùng emulator (chỉ cho test). |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Có | Cấu hình web Firebase. |

Giới hạn lượt gọi phân tích: 10 lượt/phút và 60 lượt/ngày cho mỗi địa chỉ IP. Thiếu hai biến Upstash thì app dùng bộ đếm trong bộ nhớ. Bộ đếm này không chia sẻ giữa các instance serverless, nên trên Vercel hãy cấu hình Upstash.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy local |
| `npm test` | Unit test (Vitest) |
| `npm run typecheck` | Kiểm tra kiểu (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm run build` | Build production |
| `npm run test:rules` | Test Firestore rules trên emulator |
| `npm run emulators` | Chạy Auth (9099) và Firestore (8085) emulator |
| `npm run e2e` | Test đầu cuối (Playwright, Chromium giả lập Pixel 7) |

`test:rules`, `emulators` và `e2e` dùng Firebase emulator, cần **Java 21 trở lên** (`java -version`). Test đầu cuối tự bật emulator, build và chạy app ở cổng 3100 với project `demo-mealmeal`, và chặn lời gọi `/api/analyze` bằng dữ liệu giả, nên không cần API key hay project Firebase thật. Lần đầu chạy cần tải trình duyệt:

```bash
npx playwright install chromium
```

## Cài Firebase

Chủ dự án tự làm trên Firebase console (cần tài khoản Google của mình):

1. Tạo project Firebase, không cần bật Google Analytics.
2. **Authentication → Sign-in method**: bật Google.
3. **Authentication → Settings → Authorized domains**: thêm `mealmeal-app.vercel.app` (và domain tunnel review nếu cần).
4. **Firestore Database**: tạo database ở chế độ production, vùng `asia-southeast1`.
5. Dán nội dung `firestore.rules` vào tab **Rules** rồi **Publish**. Có Firebase CLI thì chạy `firebase deploy --only firestore:rules`.
6. **Project settings → Your apps**: thêm Web app, lấy `apiKey`, `authDomain`, `projectId`, `appId` cho 4 biến `NEXT_PUBLIC_FIREBASE_*`.
7. Đăng nhập qua domain của app (`/__/auth/*` được chuyển tiếp sang `<projectId>.firebaseapp.com`): trong **Google Cloud console → APIs & Services → Credentials → OAuth client** của project, thêm `https://mealmeal-app.vercel.app/__/auth/handler` vào Authorized redirect URIs.

## Deploy lên Vercel

1. Đẩy mã lên GitHub rồi import repo vào Vercel. Không cần đổi cấu hình build.
2. Tạo database Upstash Redis (trong Vercel Marketplace hoặc ở upstash.com). Lấy **REST URL** và **REST token**.
3. Trong **Project → Settings → Environment Variables**, khai báo `OPENAI_API_KEY`, `AI_MODEL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, 4 biến `NEXT_PUBLIC_FIREBASE_*` (`AUTH_DOMAIN` = `mealmeal-app.vercel.app`), và nếu cần thì `OPENAI_BASE_URL`, `AI_JSON_MODE`.
4. Deploy lại để biến mới có hiệu lực.
5. Mở trang trên điện thoại, chụp thử một bữa ăn để kiểm tra.

**Quan trọng:** ai có tài khoản Google cũng đăng nhập và gọi được AI. Giới hạn lượt gọi chỉ hạn chế theo IP. Hãy **đặt hạn mức chi tiêu hằng tháng** (monthly budget/usage limit) trên trang quản trị của nhà cung cấp AI để không bị tính tiền ngoài dự kiến.

## Thêm vào màn hình chính

- **iPhone (Safari):** nút Chia sẻ → "Thêm vào MH chính".
- **Android (Chrome):** menu ⋮ → "Thêm vào màn hình chính" hoặc "Cài đặt ứng dụng".

## Tài liệu

- Thiết kế: `docs/superpowers/specs/2026-11-17-mealmeal-design.md`
- Kế hoạch triển khai: `docs/superpowers/plans/2026-11-17-mealmeal-v1.md`
- Kết quả nghiệm thu: `docs/superpowers/acceptance-report.md`
- Đăng nhập và đồng bộ: `docs/superpowers/specs/2026-11-17-mealmeal-sync-design.md`, `docs/superpowers/plans/2026-11-17-mealmeal-sync.md`
