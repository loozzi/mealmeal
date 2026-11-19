# Quick photo button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Nút máy ảnh trên màn hình chính: chụp xong tự phân tích, người dùng duyệt rồi Lưu.

**Architecture:** Màn hình chính giữ `File` trong ô nhớ module (`pending-photo.ts`) và điều hướng tới `/add?d=…&photo=<id>`; `/add` lấy ảnh trong effect và chạy phân tích với cờ hủy theo từng lần chạy.

**Tech Stack:** Next.js 16 (client components), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-19-mealmeal-quick-photo-design.md`

## Global Constraints

- Chữ giao diện tiếng Việt; vùng bấm ≥ 44×44px; tôn trọng `env(safe-area-inset-bottom)`.
- Ảnh không rời máy; chỉ ghi vào `photos` khi bấm Lưu.
- Mỗi task kết thúc bằng `npm run typecheck && npm run lint && npm test` qua, rồi commit.

## Review Focus

1. React chạy effect hai lần (dev) hoặc route bị ẩn/hiện bởi Activity: không được phân tích hai lần hay bị lượt bị hủy ghi đè state của lượt đang chạy.
2. Quay lại `/add?…&photo=<id>` sau khi đã lưu: không phân tích lại.
3. Lỗi phân tích giữ lại ảnh.

---

### Task 1: Quick photo flow

**Files:**
- Create: `src/lib/pending-photo.ts`, `tests/pending-photo.test.ts`, `e2e/quick-photo.spec.ts`
- Modify: `src/app/page.tsx`, `src/app/add/page.tsx`

**Interfaces:**
- `setPendingPhoto(file: File): string` (trả id mới, thay ảnh cũ), `peekPendingPhoto(id: string | null): File | null`, `clearPendingPhoto(id: string): void`.

- [x] Step 1: viết `tests/pending-photo.test.ts` và `e2e/quick-photo.spec.ts` theo spec §Kiểm tra; chạy, thấy FAIL.
- [x] Step 2: implement `pending-photo.ts`, nút + input ẩn ở `page.tsx`, effect tự phân tích ở `add/page.tsx`.
- [x] Step 3: `npm test`, `npx playwright test e2e/quick-photo.spec.ts e2e/main-flow.spec.ts` PASS.
- [x] Step 4: `git commit -m "feat: add quick photo button on home"`
