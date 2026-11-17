# MealMeal

Web app chụp ảnh hoặc mô tả bữa ăn để AI ước tính dinh dưỡng và theo dõi theo ngày. Đăng nhập Google (Firebase Auth) là bắt buộc; dữ liệu đồng bộ qua Firestore, ảnh chỉ ở trên máy đã chụp.

- Spec (quyết định hành vi): `docs/superpowers/specs/2026-11-17-mealmeal-design.md`
- Plan (tên file, chữ ký hàm, test): `docs/superpowers/plans/2026-11-17-mealmeal-v1.md`
- Spec đồng bộ: `docs/superpowers/specs/2026-11-17-mealmeal-sync-design.md`; plan: `docs/superpowers/plans/2026-11-17-mealmeal-sync.md`

## Lệnh

- `npm run dev` — chạy local
- `npm test` — unit test (Vitest)
- `npm run test:rules` — test Firestore rules trên emulator (cần Java 21+)
- `npm run e2e` — Playwright, tự chạy Auth/Firestore emulator
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint
- `npm run build` — build production

## Ràng buộc chung

- Toàn bộ chữ trên giao diện là tiếng Việt. Tên biến, tên hàm, commit message bằng tiếng Anh.
- API key chỉ ở server. Biến `NEXT_PUBLIC_` duy nhất được phép là 4 biến cấu hình web Firebase: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`.
- Ảnh không bao giờ lên Firebase (Firestore hay bất kỳ dịch vụ nào). Ảnh chỉ nằm trong bảng `photos` của Dexie trên máy đã chụp.
- Server không lưu và không log ảnh, mô tả bữa ăn, uid hay email. Chỉ log mã lỗi và thời gian xử lý.
- `DateKey` (`"YYYY-MM-DD"`) luôn tạo từ `getFullYear()/getMonth()/getDate()` của giờ máy. Cấm dùng `toISOString()` để lấy ngày.
- Tổng dinh dưỡng không bao giờ lưu vào database; luôn tính bằng các hàm trong `src/lib/nutrition.ts`.
- Chỉ làm tròn lúc hiển thị, qua các hàm trong `src/lib/format.ts`.
- Không truy cập `window`, `navigator`, `indexedDB` lúc render phía server. Trang nào dùng `useSearchParams` phải bọc trong `<Suspense>`.
- Thiết kế cho chiều rộng 360–430px; trên desktop nội dung nằm trong cột giữa `max-w-[480px]`. Vùng bấm tối thiểu 44×44px. Tôn trọng `env(safe-area-inset-bottom)`.
- Số hiển thị kiểu Việt Nam (`1.450`, `0,5`), dùng `tabular-nums`.
- Tuần bắt đầu từ thứ Hai.
- Database Dexie tên `mealmeal`, version 2, schema đúng như sync spec §5.3 (bảng v1 chỉ còn để chuyển dữ liệu, cộng bảng `photos`). Dữ liệu đồng bộ nằm ở Firestore `users/{uid}`; không đổi cấu trúc ngoài những gì plan mô tả.
- Trước khi dùng API của Next.js, Dexie, OpenAI SDK, Upstash, html-to-image: kiểm tra tài liệu bản hiện hành. Nếu API thực tế khác với plan, làm theo tài liệu và giữ nguyên hành vi.
- Mỗi task kết thúc bằng: `npm run typecheck && npm run lint && npm test` đều qua, rồi commit.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
