# MealMeal: nút chụp nhanh trên màn hình chính

Ngày: 2026-11-19. Thay đổi nhỏ, chủ dự án đã duyệt.

## Mục đích

Log một bữa bằng ảnh với ít thao tác nhất. Hiện phải bấm: Thêm bữa → Chụp ảnh → (chụp) → Phân tích → Lưu bữa ăn. Sau thay đổi: nút máy ảnh → (chụp) → Lưu bữa ăn.

- Mục tiêu: mở camera ngay từ màn hình chính; chụp xong tự phân tích.
- Không làm: lưu tự động. Kết quả AI có thể sai nên người dùng **luôn xem lại và tự bấm Lưu** (chủ dự án yêu cầu).
- Không đổi: luồng "Thêm bữa" hiện có, ảnh chỉ nằm trên máy (bảng `photos` của Dexie, chỉ ghi khi bấm Lưu).

## Phương án

| Phương án | Đánh đổi | Kết quả |
|---|---|---|
| A. Nút trên màn hình chính mở `<input capture>` ngay, chụp xong chuyển sang `/add` và tự phân tích | Phải chuyển `File` qua lần điều hướng (giữ trong bộ nhớ của tab) | **Chọn** |
| B. Nút dẫn sang `/add` rồi tự bấm "Chụp ảnh" | Trình duyệt chỉ mở hộp chọn file trong thao tác bấm của người dùng; bấm bằng code sau điều hướng bị chặn | Loại |
| C. Chụp xong lưu luôn | Ít bấm nhất, nhưng AI sai thì phải vào sửa sau | Loại (chủ dự án muốn duyệt lại) |

## Hành vi

1. Màn hình chính: một nút tròn 48×48px, biểu tượng máy ảnh, `aria-label="Chụp bữa ăn"`, nằm bên trái nút "+ Thêm bữa" ở góc dưới (cùng hàng, cách 8px). Nền trắng (`bg-card`), viền `border-line`, có bóng giống nút Thêm bữa.
2. Bấm nút: mở `<input type="file" accept="image/*" capture="environment">` ẩn. Điện thoại mở camera sau; máy tính mở hộp chọn file.
3. Người dùng hủy chụp: không có gì xảy ra.
4. Có ảnh: giữ `File` trong một ô nhớ của tab (`src/lib/pending-photo.ts`), kèm một id ngẫu nhiên; `router.push("/add?d=<ngày đang chọn>&photo=<id>")`.
5. `/add` thấy `photo=<id>` khớp ô nhớ: vào ngay màn hình "Đang ước tính dinh dưỡng…" (có nút Hủy), xử lý ảnh bằng `prepareImage`, rồi gọi `analyze` chỉ với ảnh. Giờ ăn mặc định như luồng thường.
6. Thành công: màn hình "Kết quả" như luồng thường. Người dùng sửa nếu cần và bấm "Lưu bữa ăn". "Phân tích lại" về form với ảnh còn nguyên để thêm mô tả.
7. Lỗi:
   - Ảnh không đọc được: về form Thêm bữa (không ảnh), hiện "Không đọc được ảnh này. Hãy thử ảnh khác.".
   - Lỗi phân tích: về form Thêm bữa **có sẵn ảnh**, hiện thông báo lỗi như luồng thường (`ERROR_MESSAGE[code]`).
   - Bấm Hủy khi đang phân tích: về form có sẵn ảnh, không báo lỗi.
8. Ô nhớ được xóa khi lượt tự phân tích kết thúc (thành công, lỗi, hoặc hủy bằng nút Hủy), nên quay lại/tiến tới hay mở lại URL đó không phân tích lần hai. URL có `photo=` mà ô nhớ trống (vd tải lại trang): form Thêm bữa bình thường.
9. Hủy do rời trang hoặc do React chạy effect hai lần ở dev: không đổi state, không xóa ô nhớ; lần chạy sau dùng lại ảnh.

## Kiểm tra

- Unit `tests/pending-photo.test.ts`: lưu rồi đọc đúng id; id sai → `null`; `clearPendingPhoto(id)` chỉ xóa khi id khớp.
- E2E `e2e/quick-photo.spec.ts`: bấm "Chụp bữa ăn" trên màn hình chính, đưa ảnh qua `filechooser`, thấy màn hình Kết quả với tên "Cơm gà áp chảo", bấm Lưu, về màn hình chính thấy bữa. Request `/api/analyze` có `image` và không có `text`. Lỗi AI (500) → form có ảnh ("Bỏ ảnh" hiện) và thông báo lỗi. `trackErrors` rỗng (trừ dòng console của response 500 dự kiến).
- Test e2e cũ vẫn qua.
