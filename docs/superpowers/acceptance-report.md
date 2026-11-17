# Báo cáo nghiệm thu MealMeal v1

Đối chiếu với 37 tiêu chí ở mục 11 của spec (`docs/superpowers/specs/2026-11-17-mealmeal-design.md`).

- Ngày kiểm: 17/11/2026, nhánh `feat/v1`.
- Cách kiểm:
  - Unit test (Vitest, 77 test).
  - Test đầu cuối `npm run e2e`: Playwright, Chromium giả lập Pixel 7.
  - Một lượt kiểm thủ công bằng script Playwright trên bản build production (`next start`), giả lập điện thoại.
- Lượt kiểm thủ công và e2e chặn `/api/analyze` bằng dữ liệu giả để kết quả cố định.
- Tiêu chí 1–4 kiểm thêm với **model thật**: endpoint tương thích OpenAI do chủ dự án cung cấp, model `gemini-3.1-flash-live-preview`, `AI_JSON_MODE=json_schema`. Ảnh thử là ảnh cơm tấm `Com-Tam-2008.jpg` trên Wikimedia Commons.

Kết quả: **34 đạt**, **0 không đạt**, **3 chưa kiểm được** (cần điện thoại thật). Phần cuối liệt kê những gì chủ dự án cần tự kiểm.

| # | Tiêu chí | Kết quả | Bằng chứng / lý do |
|---|---|---|---|
| 1 | Gửi ảnh → tên bữa và món đủ chỉ số | Đạt | Model thật, qua giao diện, chỉ có ảnh: "Cơm tấm sườn bì chả trứng", 8 món, mỗi món có khối lượng, kcal, carb, protein, fat, xơ; tổng 800 kcal; mất khoảng 4,9 giây. |
| 2 | Chỉ mô tả chữ → kết quả tương tự | Đạt | Model thật: "một bát phở bò tái khoảng 500g và một cốc trà đá" → "Phở bò tái và trà đá", 2 món đủ chỉ số, phở 500g; mất khoảng 2 giây. |
| 3 | Ảnh + "200g cơm" → dùng khối lượng trong mô tả | Đạt | Model thật, cùng ảnh: chỉ ảnh thì model đoán 200g cơm; thêm "350g cơm, 1 miếng sườn" thì món cơm thành 350g (455 kcal); thêm "200g cơm" qua giao diện thì cơm 200g. |
| 4 | Ảnh không phải đồ ăn → `NOT_FOOD`, giữ ảnh và mô tả | Đạt | Model thật với ảnh logo MealMeal: server trả `NOT_FOOD`, giao diện hiện "Không nhận ra món ăn. Hãy chụp rõ hơn hoặc thêm mô tả.", ảnh vẫn còn. Với API giả: mô tả cũng còn (kiểm thủ công, e2e test 2). |
| 5 | API lỗi / mất mạng → thông báo tiếng Việt, giữ dữ liệu, thử lại được | Đạt | 502 → "Hệ thống phân tích đang gặp sự cố. Hãy thử lại."; mất mạng → "Không có kết nối mạng.". Cả hai lần ảnh và mô tả đều còn, bấm Phân tích lần nữa ra kết quả. Mã 504/429 có test ở `tests/api-client.test.ts`. |
| 6 | Hủy khi đang phân tích | Đạt | Màn "Đang ước tính dinh dưỡng…" → Hủy → về màn nhập, còn ảnh và mô tả, không có thông báo lỗi. Phản hồi đến muộn sau khi hủy không làm đổi màn hình. |
| 7 | Ảnh HEIC, ảnh dọc từ iPhone | Chưa kiểm được | Cần iPhone thật. Trên Chromium, ảnh JPEG dọc 900×1200 được thu về 768×1024 và giữ đúng chiều dọc. Chưa thử HEIC và EXIF xoay. |
| 8 | 200g → 100g: món giảm một nửa, tổng cập nhật | Đạt | Cơm trắng 260 → 130 kcal; tổng 500 → 370 kcal; carb tổng 57 → 29g, các macro khác cũng giảm theo. e2e kiểm tổng 370. |
| 9 | 200 → 100 → 200 trở về như cũ | Đạt | Tổng trở lại "500 kcal, Carb 57g · Protein 50g · Fat 6,5g · Xơ 0,6g". Lưu theo per-100g nên không sai số tích lũy (`tests/nutrition.test.ts`). |
| 10 | Lưu, tải lại: còn bữa, còn ảnh | Đạt | Sau reload, ảnh nhỏ ở trang chính và ảnh ở trang chi tiết đều tải được (naturalWidth 768). e2e kiểm bữa còn sau reload. |
| 11 | Sửa, xóa; xóa có hỏi | Đạt | Đổi tên → trang chính hiện tên mới. Xóa → hộp "Xóa bữa ăn này? Không thể hoàn tác."; Hủy giữ bữa, Xóa thì xóa. |
| 12 | Không lưu được bữa không còn món | Đạt | Xóa hết món thì nút "Lưu bữa ăn" bị vô hiệu. |
| 13 | Ngày trống: vòng xám rỗng | Đạt | Ô ngày chỉ có viền `stroke-line`, nhãn "chưa ghi". |
| 14 | 1.500/2.000: tô đỏ 3/4 | Đạt | Hình quạt `fill-brand` có path `M 16 16 L 16 2 A 14 14 0 1 1 2 16 Z`, tức 270°. Hình học có test ở `tests/geometry.test.ts`. |
| 15 | 2.000/2.000: tô đỏ kín | Đạt | Vòng tròn `fill-brand` kín; chi tiết ngày ghi "Đã đạt mục tiêu". |
| 16 | Cut 2.300/2.000 cảnh báo; bulk thì không | Đạt | Cut: `fill-warn` kín, chữ "vượt 300 kcal" màu cảnh báo. Bulk: `fill-brand` kín, "Đã đạt mục tiêu", không có cảnh báo. Ngưỡng có test ở `tests/day-status.test.ts`. |
| 17 | Thêm bữa vào ngày đã qua | Đạt | Từ ngày 8/11: giờ mặc định 12:00, sau khi lưu quay về `?d=2026-11-08`, ô ngày đổi từ "chưa ghi" sang "500 trên 2.000 kcal". |
| 18 | Ngày tương lai không chọn được | Đạt | Các ô 18–22/11 và nút "Tuần sau" bị vô hiệu; `?d=` ngày mai được đưa về hôm nay. |
| 19 | Tuần/tháng, lùi/tiến, tuần bắt đầu thứ Hai | Đạt | Tiêu đề cột T2 … CN. Tuần trước/sau và tháng trước hoạt động; xem tháng có 30 ô, về xem tuần có 7 ô. |
| 20 | Bữa 23:30 đúng ngày theo giờ máy | Đạt | Bữa 23:30 nằm ở ngày của nó. `DateKey` lấy từ giờ máy; `toISOString()` chỉ dùng cho `createdAt`/`updatedAt` (`tests/dates.test.ts`). |
| 21 | Tổng ngày bằng tổng các bữa | Đạt | Hai bữa 1.000 + 500 → ngày 1.500; macro ngày là tổng (Carb 150g …). Có test ở `tests/nutrition.test.ts`. |
| 22 | Lần đầu → onboarding, chưa xong không vào được | Đạt | Khi chưa có mục tiêu, `/`, `/add`, `/settings`, `/meal?id=…` đều chuyển sang `/onboarding`. Đã có mục tiêu thì `/onboarding` chuyển về `/`. |
| 23 | Nam 25t 175cm 70kg vận động vừa → 2.100 / 2.600 / 2.850 | Đạt | `tests/tdee.test.ts`; e2e kiểm ô mục tiêu cut hiện 2100. |
| 24 | Sửa được số gợi ý; ngoài 800–6.000 bị từ chối | Đạt | 799 và 6001 bị từ chối, hiện "Nhập số từ 800 đến 6.000", ô nhập có `aria-invalid`. 800 và 6000 được nhận. e2e sửa 2100 → 2000 và lưu. |
| 25 | Lối tắt "Tôi đã biết con số của mình" | Đạt | Sang bước 2 ngay, không cần nhập chỉ số cơ thể; lưu được. |
| 26 | Đổi mục tiêu: hôm nay dùng số mới, ngày trước giữ số cũ | Đạt | Sau khi đổi 2.000 → 2.500: hôm nay "1.000 trên 2.500 kcal", hôm qua vẫn "1.000 trên 2.000 kcal". |
| 27 | Card có ảnh: PNG 1080×1350 đủ nội dung | Đạt (Chromium) | Đã kiểm ở task 11: PNG đúng 1080×1350, có ảnh, tên, ngày, kcal, ba macro, danh sách món, chữ ký. e2e tải được file `mealmeal-YYYY-MM-DD.png`. |
| 28 | Card không ảnh: nền gradient, không có ô ảnh trống | Đạt (Chromium) | Đã kiểm ở task 11 và ảnh chụp màn hình lần này. |
| 29 | Web Share mở bảng chia sẻ; Tải ảnh luôn chạy | Chưa kiểm được | Tải ảnh: đạt (e2e). Nút Chia sẻ chỉ hiện khi `navigator.canShare` nhận file; Chromium trên máy kiểm không hỗ trợ nên không thử được bảng chia sẻ thật. |
| 30 | Safari iOS / Chrome Android không trắng ảnh, sai font, vỡ bố cục | Chưa kiểm được | Cần điện thoại thật. |
| 31 | Bundle không chứa API key; không có `NEXT_PUBLIC_` | Đạt | `grep -rE "OPENAI_API_KEY\|sk-[A-Za-z0-9]{10}" .next/static` không có kết quả. Chuỗi `sk-` trần chỉ khớp `mask-image`/`mask-type` trong CSS. `grep -rn NEXT_PUBLIC_ src` không có kết quả. |
| 32 | Quá 10 lần/phút → 429 | Đạt (unit) | `tests/rate-limit.test.ts`, `tests/route.test.ts`. Chưa thử với Upstash thật. |
| 33 | Body sai hoặc ảnh quá lớn → 400, không gọi model | Đạt | `tests/route.test.ts`: `{}`, không phải JSON, body quá lớn → 400 `INVALID_INPUT`, model không được gọi. |
| 34 | JSON sai schema → thử lại một lần rồi 502 | Đạt | `tests/analyze.test.ts` (thử lại một lần, sai hai lần → `AI_ERROR`); `tests/route.test.ts` (502). |
| 35 | tsc, lint, test, build đều qua | Đạt | `npm run typecheck && npm run lint && npm test && npm run build && npm run e2e` đều qua. |
| 36 | 360px và 430px: không cuộn ngang, không cắt chữ, nút nổi không che | Đạt | Kiểm các màn: onboarding bước 1 và 2, trang chính (tuần, tháng), thêm bữa, đang phân tích, kết quả, chi tiết bữa, chia sẻ, xác nhận xóa, settings. Không màn nào có cuộn ngang. Khi cuộn hết trang, nút "Thêm bữa" nằm dưới bữa cuối 41px. Tên dài được rút gọn bằng "…" một cách có chủ đích. |
| 37 | Không lỗi hydration hay lỗi đỏ trong console | Đạt | Không có lỗi trong e2e và ở mọi luồng kiểm thủ công. Ngoại lệ duy nhất là các dòng "Failed to load resource" (422/502/mất mạng) do Chromium tự in khi cố ý giả lập lỗi API ở tiêu chí 4–5; code của app không ghi lỗi nào. |

## Việc chủ dự án cần tự kiểm

1. **iPhone (7, 29, 30):** chụp ảnh HEIC dọc; thêm vào màn hình chính; bấm Chia sẻ và Tải ảnh; xem card có trắng ảnh hay sai font không.
2. **Android Chrome (29, 30):** bấm Chia sẻ và Tải ảnh, xem card.
3. **Upstash (32):** sau khi deploy, gọi `/api/analyze` 11 lần trong một phút, lần thứ 11 phải nhận 429.

Log server trong lượt kiểm với model thật chỉ có các dòng dạng `analyze OK 4553ms`, `analyze NOT_FOOD 2639ms`: không có ảnh hay mô tả.

Lưu ý: endpoint thử dùng `http://` không mã hóa. Trên production nên dùng `https://` để API key và ảnh không đi qua mạng dưới dạng chữ thường.
