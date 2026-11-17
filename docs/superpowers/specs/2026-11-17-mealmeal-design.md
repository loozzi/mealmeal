# MealMeal — Tài liệu thiết kế (v1)

- Ngày: 2026-11-17
- Trạng thái: chờ chủ dự án duyệt
- Người đọc: người/agent sẽ lập kế hoạch và viết code (Opus), và người review sản phẩm cuối (Codex)
- Repo hiện trống hoàn toàn (chỉ có `.git`). Mọi thứ được tạo mới.

Quy ước trong tài liệu:

- **[Chủ dự án]**: điều chủ dự án đã quyết định trong buổi trao đổi. Không được thay đổi.
- **[Đề xuất]**: lựa chọn của người viết thiết kế, chủ dự án đã thấy và không phản đối. Làm đúng như vậy trừ khi có lý do kỹ thuật buộc phải đổi; nếu đổi phải ghi lại lý do.
- **[Builder]**: để người viết code tự quyết.

---

## 1. Mục đích

MealMeal là web app giúp người dùng biết một bữa ăn chứa bao nhiêu calories và chất dinh dưỡng, bằng cách chụp ảnh bữa ăn hoặc gõ mô tả khẩu phần. AI ước tính, người dùng chỉnh lại nếu cần, lưu lại, và theo dõi tổng theo từng ngày so với mục tiêu calories của mình.

Lý do tồn tại: ghi lại bữa ăn bằng cách tra bảng thực phẩm thủ công rất mất công. Chụp một tấm ảnh là xong thì người dùng mới duy trì được việc log.

Ưu tiên số một của bản v1 là **ship nhanh** với phạm vi tối giản. [Chủ dự án]

## 2. Mục tiêu, ngoài phạm vi, điều phải tránh

### 2.1 Mục tiêu (v1 phải có)

1. Phân tích bữa ăn từ ảnh, từ mô tả chữ, hoặc cả hai, trả về danh sách món với khối lượng, calories, carb, protein, fat, chất xơ. [Chủ dự án]
2. Người dùng chỉnh được khối lượng từng món trước và sau khi lưu. [Đề xuất]
3. Lưu bữa ăn trên máy người dùng, không cần đăng nhập. [Chủ dự án]
4. Tổng hợp theo ngày: tổng calories và macro của từng ngày. [Chủ dự án]
5. Widget lịch: mỗi ngày một vòng tròn, tô theo tỉ lệ calories đã ăn so với mục tiêu; ngày chưa log là vòng xám rỗng. [Chủ dự án]
6. Log được vào ngày bất kỳ (hôm nay hoặc ngày đã qua). [Chủ dự án]
7. Đặt mục tiêu: người dùng chọn chế độ (thâm hụt calo / giữ cân / bulking), app tính con số gợi ý từ chỉ số cơ thể, người dùng chốt con số cuối. [Chủ dự án; chế độ "giữ cân" là Đề xuất]
8. Card chia sẻ: tạo ảnh đẹp từ một bữa ăn để người dùng lưu về và đăng. [Chủ dự án]

### 2.2 Ngoài phạm vi (v1 không làm)

- Đăng nhập, tài khoản, đồng bộ giữa các thiết bị, database phía server.
- Phân tích hành vi ăn uống, lên kế hoạch ăn, gợi ý món. [Chủ dự án]
- Phân tích ảnh chụp cơ thể bằng AI. [Đề xuất: hoãn; chỉ có ô nhập tỉ lệ mỡ tùy chọn]
- Mục tiêu riêng cho từng macro (carb/protein/fat). Chỉ có mục tiêu calories.
- Card chia sẻ tổng kết ngày/tuần. Chỉ có card một bữa ăn.
- Nhãn bữa sáng/trưa/tối. Mỗi bữa chỉ lưu thời điểm.
- Database thực phẩm, quét mã vạch.
- App native, đưa lên store.
- Chế độ offline đầy đủ (service worker cache). Xem dữ liệu đã lưu khi offline hoạt động tự nhiên nếu trang đã tải; không cần làm gì thêm.
- Dark mode, đa ngôn ngữ. Giao diện chỉ có tiếng Việt.
- Xuất/nhập dữ liệu.

### 2.3 Điều phải tránh (làm sai những điều này là thất bại dù app chạy được)

- **Lộ API key ra trình duyệt.** Key chỉ tồn tại ở server.
- **Mất dữ liệu người dùng** do lỗi code: ghi đè, xóa nhầm, đổi schema không có migration.
- **Sai ngày do múi giờ.** Bữa ăn log lúc 23:30 ngày 17 theo giờ máy phải nằm ở ngày 17, không được nhảy sang ngày 16 hay 18.
- **Con số bịa mà trông như chắc chắn.** Luôn thể hiện đây là ước tính, và hiển thị mức độ tin cậy AI trả về.
- **Mất dữ liệu đang nhập khi lỗi.** Gọi AI thất bại thì ảnh và mô tả người dùng vừa nhập phải còn nguyên để thử lại.
- **Giao diện xấu hoặc vỡ trên điện thoại.** Đây là app dùng trên điện thoại là chính; card chia sẻ phải đủ đẹp để người dùng muốn đăng.
- **Lời khuyên y tế.** App không đưa lời khuyên sức khỏe, chỉ đưa con số ước tính.

## 3. Ràng buộc

- Gọi AI qua OpenAI SDK (`openai` trên npm). Nhà cung cấp có thể là OpenAI hoặc dịch vụ tương thích OpenAI, đổi qua biến môi trường mà không sửa code. [Chủ dự án]
- Dữ liệu người dùng nằm hoàn toàn trên máy họ. Server không lưu ảnh, không lưu bữa ăn, không log nội dung request. [Chủ dự án + Đề xuất]
- Một codebase, một lần deploy (Vercel). [Chủ dự án chọn hướng A]
- Thiết kế cho màn hình điện thoại trước (rộng 360–430px). Trên desktop, nội dung nằm trong cột giữa rộng tối đa 480px.
- Phải chạy đúng trên Safari iOS và Chrome Android bản hiện hành.

## 4. Các hướng đã cân nhắc

| | A. Next.js một khối | B. React SPA + backend riêng | C. App native (Expo) |
|---|---|---|---|
| Cấu trúc | Một project: giao diện + API route gọi AI | Vite React + server nhỏ (Hono/Express) | React Native + backend riêng |
| Deploy | Một lần, Vercel | Hai nơi, cấu hình CORS | Build + chờ duyệt store |
| Tốc độ ship | Nhanh nhất | Chậm hơn một chút | Chậm nhất |

**Chủ dự án chọn A.** Lý do: một codebase, một lần deploy, API key nằm ở server, web mobile-first cài được lên màn hình chính nên dùng gần giống app. Phần API và logic tính toán dùng lại được nếu sau này làm app native.

## 5. Công nghệ

| Phần | Lựa chọn | Ghi chú |
|---|---|---|
| Framework | Next.js bản stable mới nhất, App Router, TypeScript `strict` | [Chủ dự án: hướng A] |
| Giao diện | Tailwind CSS | [Đề xuất] |
| Lưu trữ | IndexedDB qua `dexie` + `dexie-react-hooks` (`useLiveQuery`) | [Đề xuất] Không dùng localStorage cho bữa ăn vì giới hạn ~5MB |
| AI | package `openai`, Chat Completions API, đầu ra JSON có schema | [Chủ dự án + Đề xuất] |
| Validate | `zod` | Dùng chung schema cho server và client |
| Giới hạn lượt gọi | `@upstash/ratelimit` + `@upstash/redis` khi có biến môi trường; không có thì dùng bộ đếm trong bộ nhớ | [Đề xuất] |
| Card chia sẻ | Render DOM thành PNG ngay trên trình duyệt | Thư viện: [Builder], gợi ý `html-to-image` |
| Font | Be Vietnam Pro qua `next/font/google` | Hỗ trợ dấu tiếng Việt đầy đủ |
| Test | Vitest cho logic thuần và API route | Playwright cho 1 luồng chính: [Builder], nên có |
| Package manager | [Builder] | |

Trước khi dùng API của thư viện nào, builder kiểm tra tài liệu bản hiện hành (Next.js, Dexie, OpenAI SDK) thay vì dựa vào trí nhớ.

Tất cả màn hình là client component vì dữ liệu nằm trong IndexedDB. Không truy cập `indexedDB`, `window`, `navigator` lúc render phía server.

## 6. Màn hình và luồng sử dụng

Toàn bộ chữ trên giao diện là tiếng Việt.

### 6.1 Danh sách route

| Route | Màn hình |
|---|---|
| `/` | Trang chính: lịch + chi tiết ngày đang chọn |
| `/onboarding` | Thiết lập mục tiêu lần đầu |
| `/settings` | Sửa chỉ số cơ thể và mục tiêu (dùng lại form của onboarding) |
| `/add?d=YYYY-MM-DD` | Thêm bữa ăn vào ngày `d` |
| `/meal?id=<uuid>` | Chi tiết một bữa ăn: xem, sửa, xóa, chia sẻ |
| `POST /api/analyze` | API phân tích bữa ăn |

Dùng query string thay cho dynamic segment vì dữ liệu chỉ có ở client.

Lần đầu mở app (chưa có bản ghi nào trong bảng `goals`): mọi route trừ `/onboarding` chuyển hướng sang `/onboarding`.

### 6.2 Trang chính `/`

```
┌──────────────────────────────────┐
│ MealMeal                     ⚙   │
│                                  │
│  ‹   Tháng 11/2026   ›    [▾]    │   [▾] đổi giữa xem tuần và xem tháng
│  T2   T3   T4   T5   T6   T7  CN │
│  ◕    ●    ○    ◑    ●    ◔   ○  │
│  10   11   12   13   14   15  16 │
│                                  │
│  Thứ Ba, 17/11                   │
│        ╭───────╮                 │
│        │ 1.450 │   / 2.000 kcal  │   vòng tiến độ lớn của ngày đang chọn
│        ╰───────╯   còn 550 kcal  │
│  Carb 180g · Protein 90g · Fat 45g · Xơ 12g
│                                  │
│  07:30  Phở bò            420 kcal│
│  12:15  Cơm gà áp chảo    545 kcal│
│  19:00  Bún chả           485 kcal│
│                                  │
│                    [ + Thêm bữa ]│
└──────────────────────────────────┘
```

- Ngày đang chọn lưu trong URL: `/?d=YYYY-MM-DD`. Không có `d` thì là hôm nay.
- **Lịch** có hai chế độ: tuần (mặc định, một hàng 7 ngày, tuần chứa ngày đang chọn) và tháng (lưới đầy đủ). Nút `‹ ›` lùi/tiến một tuần hoặc một tháng theo chế độ. Tuần bắt đầu từ thứ Hai.
- Bấm vào một ngày: chọn ngày đó, phần dưới hiển thị dữ liệu ngày đó.
- Ngày tương lai: hiển thị mờ, không bấm được. Ngày hôm nay có dấu nhấn riêng (ví dụ số ngày in đậm hoặc có chấm).
- **Danh sách bữa** của ngày đang chọn, sắp theo giờ tăng dần. Mỗi dòng: ảnh thu nhỏ (nếu có), giờ, tên bữa, calories. Bấm vào mở `/meal?id=`.
- Ngày chưa có bữa nào: hiển thị trạng thái trống với lời mời log bữa đầu tiên.
- Nút **Thêm bữa** nổi cố định ở đáy màn hình, mở `/add?d=<ngày đang chọn>`.
- Dòng dưới vòng tiến độ: "còn N kcal" khi chưa đạt; "vượt N kcal" khi vượt; với bulking chưa đạt thì ghi "cần thêm N kcal".

### 6.3 Vòng tròn ngày (quy tắc hiển thị)

Đây là phần chủ dự án mô tả cụ thể, phải làm đúng.

Với mỗi ngày: `consumed` = tổng calories các bữa trong ngày; `target` = mục tiêu calories áp dụng cho ngày đó (mục 8.3); `r = consumed / target`.

| Trạng thái | Điều kiện | Hiển thị |
|---|---|---|
| `empty` | Ngày không có bữa nào | Vòng tròn rỗng, viền xám |
| `progress` | Có bữa, `r < 1` | Hình tròn viền xám, tô đỏ kiểu hình quạt bắt đầu từ vị trí 12 giờ theo chiều kim đồng hồ, diện tích tô = `r`. Ví dụ 1500/2000 tô 3/4. Tô tối thiểu 5% để phân biệt với `empty` |
| `hit` | `r ≥ 1` và không rơi vào `over` | Tô đỏ kín hình tròn |
| `over` | Chế độ cutting: `r > 1.05`. Chế độ giữ cân: `r > 1.10`. Chế độ bulking: không bao giờ | Tô kín bằng màu cảnh báo (cam hổ phách), khác hẳn màu đỏ |

- Số ngày nằm dưới vòng tròn, không nằm đè lên phần tô.
- Vòng tiến độ lớn của ngày đang chọn dùng cùng hàm tính trạng thái, vẽ dạng vành cung thay vì hình quạt, số calories nằm giữa.
- Logic tính trạng thái là một hàm thuần, có unit test (mục 12).
- Vẽ bằng SVG. Mỗi vòng tròn có `aria-label` dạng "17 tháng 11: 1.500 trên 2.000 kcal".

### 6.4 Onboarding `/onboarding` và Cài đặt `/settings`

Hai bước trên cùng một trang hoặc hai trang con: [Builder].

**Bước 1 — Chỉ số và mục tiêu**

- Chế độ: `Thâm hụt calo (giảm mỡ)` / `Giữ cân` / `Bulking (tăng cơ)`. Bắt buộc.
- Giới tính: Nam / Nữ. Bắt buộc (công thức cần).
- Tuổi: số nguyên 13–100.
- Chiều cao: 100–250 cm.
- Cân nặng: 30–300 kg, cho phép một chữ số thập phân.
- Mức vận động: 5 lựa chọn có mô tả ngắn (bảng ở mục 8.1).
- Tỉ lệ mỡ cơ thể (%): tùy chọn, 3–60.
- Có lối tắt "Tôi đã biết con số của mình": bỏ qua các ô chỉ số, vẫn phải chọn chế độ, rồi sang thẳng bước 2 với ô nhập trống.

**Bước 2 — Chốt con số**

- Hiển thị: TDEE ước tính, con số gợi ý theo chế độ, một dòng giải thích cách tính (ví dụ "TDEE 2.400 − 20%").
- Ô nhập mục tiêu calories/ngày, điền sẵn con số gợi ý, người dùng sửa được. Giới hạn 800–6.000.
- Nếu con số gợi ý bị nâng lên mức sàn (mục 8.2), hiển thị ghi chú giải thích.
- Nút "Bắt đầu" (onboarding) hoặc "Lưu" (settings): lưu `profile` và thêm một bản ghi `goals`, rồi về `/`.

`/settings` mở lại đúng form này với dữ liệu đã lưu. Lưu ở settings tạo bản ghi `goals` mới có hiệu lực từ hôm nay; các ngày trước giữ mục tiêu cũ (mục 8.3).

### 6.5 Thêm bữa `/add?d=YYYY-MM-DD`

Ba trạng thái trên cùng một màn hình:

**(a) Nhập**

```
┌──────────────────────────────────┐
│ ‹  Thêm bữa · Thứ Ba 17/11       │
│                                  │
│  ┌────────────┐ ┌────────────┐   │
│  │ 📷 Chụp ảnh│ │ 🖼 Chọn ảnh │   │
│  └────────────┘ └────────────┘   │
│  (ảnh đã chọn hiển thị ở đây, có nút bỏ ảnh)
│                                  │
│  Mô tả (không bắt buộc nếu có ảnh)│
│  ┌──────────────────────────────┐│
│  │ vd: 1 bát cơm, 150g ức gà... ││
│  └──────────────────────────────┘│
│                                  │
│  Giờ ăn: [12:15]                 │
│                                  │
│  [        Phân tích        ]     │
└──────────────────────────────────┘
```

- Cần ít nhất ảnh hoặc mô tả. Nút "Phân tích" bị khóa khi cả hai đều trống.
- "Chụp ảnh": `<input type="file" accept="image/*" capture="environment">`. "Chọn ảnh": `<input type="file" accept="image/*">`.
- Mô tả tối đa 1.000 ký tự.
- Giờ ăn: mặc định là giờ hiện tại nếu `d` là hôm nay, `12:00` nếu là ngày đã qua. Người dùng sửa được.
- `d` không hợp lệ hoặc là ngày tương lai: dùng hôm nay.
- Xử lý ảnh trước khi gửi (ở client): đọc file, xoay đúng theo EXIF, thu nhỏ để cạnh dài tối đa 1024px, mã hóa JPEG chất lượng 0.8. Kết quả này vừa được gửi lên API vừa là ảnh được lưu. Ảnh HEIC từ iPhone phải hoạt động (Safari tự giải mã khi vẽ lên canvas).

**(b) Đang phân tích**

- Hiển thị trạng thái chờ rõ ràng (ảnh mờ + chỉ báo đang chạy + dòng chữ như "Đang ước tính dinh dưỡng…"). Thời gian chờ thực tế 5–20 giây.
- Có nút Hủy: hủy request (`AbortController`), quay về (a) với dữ liệu còn nguyên.
- Lỗi: quay về (a), dữ liệu còn nguyên, hiển thị thông báo theo mã lỗi (mục 7.4) và cho thử lại.

**(c) Kết quả, chỉnh sửa, lưu**

```
┌──────────────────────────────────┐
│ ‹  Kết quả                       │
│  (ảnh)                           │
│  Cơm gà áp chảo            [sửa tên]
│  Độ tin cậy: Trung bình          │
│  "Không thấy rõ lượng dầu..."    │   ghi chú của AI, nếu có
│                                  │
│  Cơm trắng      [200] g  260 kcal ✕
│  Gà áp chảo     [150] g  250 kcal ✕
│  Rau luộc       [100] g   35 kcal ✕
│  ────────────────────────────────│
│  Tổng 545 kcal                   │
│  Carb 60g · Protein 45g · Fat 12g · Xơ 4g
│                                  │
│  Chưa đúng? Bổ sung mô tả rồi phân tích lại
│  [ Phân tích lại ]               │
│  [          Lưu bữa ăn         ] │
└──────────────────────────────────┘
```

- Sửa khối lượng một món: calories và macro của món đó và tổng cập nhật ngay, tính theo mật độ dinh dưỡng trên 100g (mục 9.2). Khối lượng hợp lệ: 1–5.000 g.
- `✕` xóa một món khỏi bữa. Không cho lưu khi không còn món nào.
- Sửa được tên bữa.
- "Phân tích lại": quay về (a) với ảnh và mô tả còn nguyên để người dùng bổ sung mô tả rồi gửi lại.
- "Lưu bữa ăn": ghi vào IndexedDB, chuyển về `/?d=<ngày>`.
- Luôn có dòng nhỏ: "Số liệu là ước tính của AI, có thể sai lệch."
- Rời màn hình khi chưa lưu ở trạng thái (c): hỏi xác nhận.

### 6.6 Chi tiết bữa ăn `/meal?id=`

- Hiển thị giống trạng thái (c) ở trên: ảnh, tên, danh sách món, tổng.
- Sửa được: tên bữa, khối lượng từng món, xóa món, ngày và giờ ăn. Thay đổi được lưu khi bấm "Lưu thay đổi".
- "Xóa bữa ăn": hỏi xác nhận, xóa, về `/?d=<ngày của bữa>`.
- "Chia sẻ": mở card chia sẻ (mục 6.7).
- `id` không tồn tại: hiển thị "Không tìm thấy bữa ăn" và nút về trang chính.

### 6.7 Card chia sẻ

Mở dạng bảng trượt từ dưới lên hoặc trang phủ: [Builder].

- Ảnh xuất ra: PNG 1080×1350 px (tỉ lệ 4:5, hợp Instagram/Facebook).
- Nội dung card:
  - Ảnh bữa ăn chiếm nửa trên, cắt kiểu cover. Bữa không có ảnh: nền gradient thương hiệu với tên bữa cỡ lớn.
  - Tên bữa, ngày (dạng `17/11/2026`).
  - Con số calories thật lớn, là điểm nhấn chính.
  - Ba chỉ số Carb / Protein / Fat, mỗi cái có số gam và thanh tỉ lệ theo phần trăm calories (carb ×4, protein ×4, fat ×9).
  - Tối đa 4 món đầu tiên kèm khối lượng; nhiều hơn thì thêm dòng "+N món khác".
  - Chữ ký `MealMeal` nhỏ ở góc.
- Màn hình hiển thị bản xem trước thu nhỏ vừa chiều ngang, bên dưới có:
  - "Chia sẻ": dùng Web Share API kèm file nếu `navigator.canShare({ files })` trả về true. Trên iPhone, bảng chia sẻ này có sẵn mục lưu ảnh.
  - "Tải ảnh": tải file `mealmeal-YYYY-MM-DD.png`. Luôn hiển thị.
- Yêu cầu chất lượng: ảnh xuất ra trên Safari iOS và Chrome Android phải có đủ ảnh bữa ăn, đúng font, không bị trắng hay vỡ bố cục. Ảnh bữa ăn phải được nhúng dạng data URL trước khi render để tránh lỗi ảnh trắng trên Safari. Chờ font tải xong (`document.fonts.ready`) trước khi xuất.
- Card là thứ người dùng mang đi khoe, nên phải được đầu tư thiết kế: bố cục chắc, chữ số to rõ, khoảng trắng hợp lý. Không dùng bố cục kiểu bảng số liệu khô.

### 6.8 Định hướng giao diện

- Nền sáng ấm (trắng ngà), chữ xám đậm gần đen, màu nhấn chính là đỏ (cùng màu tô vòng tròn), màu cảnh báo là cam hổ phách. Giá trị màu cụ thể: [Builder], khai báo thành token trong cấu hình Tailwind và dùng thống nhất.
- Thẻ bo góc lớn, khoảng cách rộng rãi, vùng bấm tối thiểu 44×44px.
- Số liệu dùng chữ số cùng độ rộng (`tabular-nums`). Định dạng số kiểu Việt Nam: `1.450 kcal`.
- Mọi thao tác bất đồng bộ có trạng thái chờ; mọi danh sách có trạng thái trống; mọi lỗi có thông báo bằng tiếng Việt và cách đi tiếp.
- Tôn trọng `safe-area-inset` trên iPhone (nút nổi ở đáy không bị che).
- Có `manifest.webmanifest` và icon để cài lên màn hình chính (`display: standalone`). Không cần service worker.

## 7. API phân tích bữa ăn

### 7.1 Request

`POST /api/analyze`, `Content-Type: application/json`

```json
{
  "image": "data:image/jpeg;base64,...",
  "text": "1 bát cơm, 150g ức gà áp chảo, rau luộc"
}
```

- `image`: tùy chọn. Data URL, loại `image/jpeg`, `image/png` hoặc `image/webp`. Độ dài chuỗi tối đa 4.000.000 ký tự.
- `text`: tùy chọn. Sau khi cắt khoảng trắng, dài 1–1.000 ký tự.
- Phải có ít nhất một trong hai.

### 7.2 Response thành công

`200`

```json
{
  "result": {
    "title": "Cơm gà áp chảo",
    "items": [
      { "name": "Cơm trắng", "grams": 200, "kcal": 260, "carbs_g": 57, "protein_g": 5, "fat_g": 0.5, "fiber_g": 0.6 }
    ],
    "confidence": "medium",
    "notes": "Không thấy rõ lượng dầu dùng khi áp chảo."
  }
}
```

Schema `MealAnalysis` (khai báo bằng zod, dùng chung server và client):

| Trường | Kiểu | Ràng buộc |
|---|---|---|
| `is_food` | boolean | Chỉ có trong đầu ra của model, không trả về client |
| `title` | string | 1–80 ký tự, tiếng Việt |
| `items` | mảng | 1–20 phần tử khi `is_food` là true |
| `items[].name` | string | 1–60 ký tự, tiếng Việt |
| `items[].grams` | number | > 0, ≤ 5.000 |
| `items[].kcal` | number | ≥ 0, ≤ 10.000 |
| `items[].carbs_g`, `protein_g`, `fat_g`, `fiber_g` | number | ≥ 0, ≤ 1.000 |
| `confidence` | `"low" \| "medium" \| "high"` | |
| `notes` | string | 0–300 ký tự, có thể rỗng |

Server không tính tổng. Tổng được tính ở client từ danh sách món bằng một hàm duy nhất.

### 7.3 Xử lý phía server

Route chạy runtime Node.js, `maxDuration = 60`.

Thứ tự xử lý:

1. Kiểm tra giới hạn lượt gọi theo IP (mục 7.5). Vượt thì trả `429`.
2. Validate body bằng zod. Sai thì trả `400`.
3. Gọi model qua OpenAI SDK:
   - Client khởi tạo với `apiKey = OPENAI_API_KEY`, `baseURL = OPENAI_BASE_URL` (nếu có), `timeout` 45 giây, `maxRetries` 1.
   - `chat.completions.create` với `model = AI_MODEL`.
   - Message `system`: prompt ở mục 7.6.
   - Message `user`: mảng content gồm phần text (mô tả của người dùng, hoặc câu mặc định "Hãy phân tích bữa ăn trong ảnh." nếu không có mô tả) và phần `image_url` chứa data URL nếu có ảnh.
   - `response_format`: khi `AI_JSON_MODE=json_schema` (mặc định) dùng `{ type: "json_schema", json_schema: { name: "meal_analysis", strict: true, schema } }`. Khi `AI_JSON_MODE=json_object` dùng `{ type: "json_object" }`; trường hợp này schema đã được mô tả trong prompt. Chế độ thứ hai dành cho nhà cung cấp không hỗ trợ `json_schema`.
   - Không truyền `temperature` (một số model không nhận tham số này).
4. Parse nội dung trả về thành JSON và validate bằng zod. Nếu parse hoặc validate thất bại: gọi lại model đúng một lần. Vẫn thất bại thì trả `502`.
5. Nếu `is_food` là false hoặc `items` rỗng: trả `422` mã `NOT_FOOD`.
6. Trả `200` với `result` (đã bỏ `is_food`).

Server không ghi ảnh hay nội dung mô tả ra log. Chỉ log mã lỗi và thời gian xử lý.

### 7.4 Lỗi

Mọi lỗi có dạng `{ "error": { "code": "...", "message": "..." } }`.

| HTTP | `code` | Khi nào | Thông báo hiển thị cho người dùng |
|---|---|---|---|
| 400 | `INVALID_INPUT` | Body sai định dạng, thiếu cả ảnh lẫn mô tả, ảnh quá lớn | "Dữ liệu gửi lên không hợp lệ. Hãy thử lại với ảnh khác." |
| 422 | `NOT_FOOD` | Model không nhận ra đồ ăn | "Không nhận ra món ăn. Hãy chụp rõ hơn hoặc thêm mô tả." |
| 429 | `RATE_LIMITED` | Vượt giới hạn lượt gọi | "Bạn đã dùng hết lượt phân tích. Hãy thử lại sau." |
| 502 | `AI_ERROR` | Nhà cung cấp AI lỗi hoặc trả dữ liệu sai sau khi đã thử lại | "Hệ thống phân tích đang gặp sự cố. Hãy thử lại." |
| 504 | `TIMEOUT` | Quá thời gian chờ model | "Phân tích mất quá nhiều thời gian. Hãy thử lại." |

Client tự hiển thị "Không có kết nối mạng." khi request không tới được server.

### 7.5 Giới hạn lượt gọi

Mục đích: app không có đăng nhập, nên phải chặn việc người lạ gọi API hàng loạt bằng tiền của chủ dự án.

- Giới hạn theo IP (lấy từ header `x-forwarded-for`, phần tử đầu tiên): 10 lượt mỗi phút và 60 lượt mỗi ngày.
- Khi có `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN`: dùng `@upstash/ratelimit`. Đây là cấu hình cho production.
- Khi không có: dùng bộ đếm trong bộ nhớ của tiến trình. Chỉ đủ cho chạy local, vì môi trường serverless không giữ bộ nhớ giữa các lần gọi.
- Hai cách nằm sau cùng một interface để route không cần biết đang dùng cách nào.
- Việc ngoài code chủ dự án cần làm: đặt hạn mức chi tiêu hằng tháng trên trang quản trị của nhà cung cấp AI. Ghi việc này trong README.

### 7.6 Prompt hệ thống

Dùng nguyên văn bản dưới đây làm điểm khởi đầu. Builder được chỉnh câu chữ nếu thử nghiệm cho thấy kết quả tốt hơn, nhưng phải giữ đủ các quy tắc.

```
Bạn là chuyên gia dinh dưỡng, ước tính thành phần dinh dưỡng của một bữa ăn từ ảnh chụp và/hoặc mô tả bằng chữ của người dùng. Bạn am hiểu món ăn Việt Nam và các món phổ biến trên thế giới.

Quy tắc:
1. Tách bữa ăn thành từng món hoặc thành phần riêng (ví dụ: cơm trắng, thịt kho, rau luộc, nước chấm). Tối đa 20 món.
2. Với mỗi món, ước tính khối lượng phần ăn được, tính bằng gam, ở trạng thái đã nấu chín. Dựa vào kích thước bát, đĩa, đũa, thìa trong ảnh để ước lượng.
3. Với mỗi món, ước tính calories (kcal), carbohydrate, protein, chất béo và chất xơ (gam) cho đúng khối lượng đó.
4. Tính cả dầu mỡ, nước sốt, nước chấm, đường và topping dùng khi chế biến, kể cả khi không nhìn thấy rõ. Với món chiên xào, cộng lượng dầu hợp lý vào chính món đó.
5. Nếu người dùng có mô tả bằng chữ, mô tả đó được ưu tiên hơn những gì bạn suy đoán từ ảnh, nhất là về khối lượng và cách chế biến.
6. Tên bữa ăn (title) và tên từng món (name) viết bằng tiếng Việt, ngắn gọn.
7. confidence: "high" khi món rõ ràng và khẩu phần dễ ước lượng; "medium" khi phải suy đoán một phần; "low" khi ảnh mờ, bị che, hoặc mô tả quá sơ sài.
8. notes: tối đa hai câu tiếng Việt nêu giả định quan trọng nhất hoặc điều không chắc chắn. Để chuỗi rỗng nếu không có gì đáng nói.
9. Nếu ảnh hoặc mô tả không phải đồ ăn hay thức uống, đặt is_food là false và items là mảng rỗng.
10. Không đưa lời khuyên sức khỏe. Chỉ trả về số liệu ước tính.

Chỉ trả về JSON đúng theo schema được yêu cầu.
```

Khi `AI_JSON_MODE=json_object`, nối thêm vào cuối prompt một đoạn mô tả schema (tên trường, kiểu, đơn vị) kèm một ví dụ JSON.

### 7.7 Biến môi trường

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `OPENAI_API_KEY` | Có | API key của nhà cung cấp |
| `OPENAI_BASE_URL` | Không | Địa chỉ API nếu dùng nhà cung cấp tương thích OpenAI khác |
| `AI_MODEL` | Có | Tên model. Phải là model nhận được ảnh đầu vào |
| `AI_JSON_MODE` | Không | `json_schema` (mặc định) hoặc `json_object` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Không (cần cho production) | Lưu bộ đếm giới hạn lượt gọi |

Thiếu `OPENAI_API_KEY` hoặc `AI_MODEL`: API trả `502` và server log thông báo cấu hình thiếu. Có file `.env.example` liệt kê đủ các biến. Không biến nào có tiền tố `NEXT_PUBLIC_`.

## 8. Tính mục tiêu calories

Toàn bộ là hàm thuần trong một module, có unit test.

### 8.1 BMR và TDEE

- Có tỉ lệ mỡ (Katch-McArdle): `BMR = 370 + 21.6 × cân nặng × (1 − tỉ lệ mỡ / 100)`
- Không có tỉ lệ mỡ (Mifflin-St Jeor):
  - Nam: `BMR = 10 × cân nặng + 6.25 × chiều cao − 5 × tuổi + 5`
  - Nữ: `BMR = 10 × cân nặng + 6.25 × chiều cao − 5 × tuổi − 161`
- `TDEE = BMR × hệ số vận động`

Đơn vị: cân nặng kg, chiều cao cm, tuổi năm.

| Mã | Nhãn hiển thị | Mô tả | Hệ số |
|---|---|---|---|
| `sedentary` | Ít vận động | Ngồi nhiều, hầu như không tập | 1.2 |
| `light` | Vận động nhẹ | Tập 1–3 buổi/tuần | 1.375 |
| `moderate` | Vận động vừa | Tập 3–5 buổi/tuần | 1.55 |
| `active` | Vận động nhiều | Tập 6–7 buổi/tuần | 1.725 |
| `very_active` | Vận động rất nhiều | Lao động nặng hoặc tập 2 buổi/ngày | 1.9 |

### 8.2 Con số gợi ý

| Chế độ | Mã | Công thức |
|---|---|---|
| Thâm hụt calo | `cut` | `TDEE × 0.80` |
| Giữ cân | `maintain` | `TDEE × 1.00` |
| Bulking | `bulk` | `TDEE × 1.10` |

- Làm tròn kết quả đến bội số gần nhất của 50.
- Mức sàn cho gợi ý: 1.500 kcal với nam, 1.200 kcal với nữ. Nếu kết quả thấp hơn thì gợi ý mức sàn và hiển thị ghi chú "Đã nâng lên mức tối thiểu khuyến nghị".
- Người dùng luôn sửa được con số cuối trong khoảng 800–6.000.

Ví dụ kiểm tra: nam, 25 tuổi, 175 cm, 70 kg, vận động vừa, không có tỉ lệ mỡ. BMR = 700 + 1093.75 − 125 + 5 = 1673.75. TDEE = 2594.3. Cut = 2075.4 → 2.100. Maintain → 2.600. Bulk = 2853.7 → 2.850.

### 8.3 Mục tiêu áp dụng cho từng ngày

Mỗi lần lưu ở onboarding hoặc settings thêm một bản ghi vào `goals` với `effectiveFrom` = ngày hôm nay. Nếu đã có bản ghi cùng `effectiveFrom` thì ghi đè bản ghi đó.

Mục tiêu của ngày `D` = bản ghi có `effectiveFrom` lớn nhất mà `≤ D`. Nếu `D` sớm hơn mọi bản ghi thì dùng bản ghi sớm nhất. Nhờ vậy đổi mục tiêu không làm thay đổi vòng tròn của những ngày đã qua.

## 9. Dữ liệu lưu trên máy

### 9.1 Database

Dexie, tên database `mealmeal`, version 1.

| Bảng | Khóa và index | Nội dung |
|---|---|---|
| `meals` | `id, date` | Các bữa ăn |
| `profile` | `id` | Một bản ghi duy nhất, `id = "me"` |
| `goals` | `++id, effectiveFrom` | Lịch sử mục tiêu |

```ts
type DateKey = string; // "YYYY-MM-DD" theo giờ máy người dùng

interface MealItem {
  id: string;            // uuid
  name: string;
  grams: number;         // khối lượng hiện tại, người dùng sửa được
  per100: {              // mật độ trên 100g, tính một lần từ kết quả AI, không làm tròn
    kcal: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
  };
}

interface Meal {
  id: string;            // crypto.randomUUID()
  date: DateKey;         // ngày của bữa ăn
  time: string;          // "HH:mm", giờ ăn theo giờ máy
  title: string;
  source: "photo" | "text" | "both";
  description?: string;  // mô tả người dùng đã gõ
  photo?: Blob;          // JPEG đã thu nhỏ, cạnh dài tối đa 1024px
  items: MealItem[];
  confidence: "low" | "medium" | "high";
  notes: string;
  createdAt: string;     // ISO
  updatedAt: string;     // ISO
}

interface Profile {
  id: "me";
  sex?: "male" | "female";
  age?: number;
  heightCm?: number;
  weightKg?: number;
  bodyFatPct?: number;
  activity?: "sedentary" | "light" | "moderate" | "active" | "very_active";
  updatedAt: string;
}

interface Goal {
  id?: number;
  effectiveFrom: DateKey;
  mode: "cut" | "maintain" | "bulk";
  targetKcal: number;
  suggestedKcal?: number; // không có khi người dùng tự nhập
  createdAt: string;
}
```

Các trường chỉ số trong `Profile` là tùy chọn vì người dùng có thể đi lối tắt "Tôi đã biết con số của mình".

### 9.2 Quy tắc tính toán

- Khi nhận kết quả AI, mỗi món được đổi sang `per100`: `per100.kcal = kcal / grams × 100`, tương tự cho các chất khác.
- Giá trị của một món = `per100 × grams / 100`. Sửa khối lượng chỉ thay `grams`, nên sửa nhiều lần không tích lũy sai số làm tròn.
- Tổng của bữa = tổng các món. Tổng của ngày = tổng các bữa có `date` bằng ngày đó. Không lưu tổng vào database; luôn tính từ danh sách món bằng một hàm duy nhất.
- Chỉ làm tròn lúc hiển thị: calories là số nguyên, gam chất dinh dưỡng hiển thị số nguyên (dưới 10g thì một chữ số thập phân).

### 9.3 Ngày giờ

- `DateKey` luôn tạo từ `getFullYear()`, `getMonth()`, `getDate()` của giờ máy. Không dùng `toISOString()` để lấy ngày.
- Mọi phép tính ngày (tuần chứa ngày X, lưới tháng, ngày trước/sau, so sánh với hôm nay) nằm trong một module riêng, có unit test.

### 9.4 Độ bền dữ liệu

- Khi lưu bữa ăn đầu tiên, gọi `navigator.storage.persist()` nếu trình duyệt hỗ trợ để giảm khả năng dữ liệu bị dọn.
- Ghi IndexedDB thất bại (hết dung lượng, chế độ riêng tư): báo lỗi rõ cho người dùng, không im lặng bỏ qua.
- Sau v1, mọi thay đổi cấu trúc dữ liệu phải tăng version của Dexie và có hàm nâng cấp.
- Rủi ro đã biết và chấp nhận ở v1: dữ liệu chỉ nằm trên một trình duyệt của một máy. Xóa dữ liệu trình duyệt là mất. Safari iOS có thể tự dọn dữ liệu của trang không được mở trong thời gian dài nếu chưa cài lên màn hình chính. Đồng bộ và xuất dữ liệu được hoãn sang sau.

## 10. Cấu trúc mã nguồn gợi ý

[Builder] được đổi tên và sắp xếp lại, miễn giữ được sự tách bạch: logic thuần không phụ thuộc React hay IndexedDB.

```
src/
  app/
    layout.tsx, globals.css, manifest.ts
    page.tsx                  trang chính
    onboarding/page.tsx
    settings/page.tsx
    add/page.tsx
    meal/page.tsx
    api/analyze/route.ts
  components/
    calendar/                 Calendar, DayCircle
    meal/                     MealEditor, MealListItem, PhotoPicker
    goal/                     GoalForm
    share/                    ShareCard, ShareSheet
    ui/                       nút, ô nhập, bảng trượt, thông báo
  lib/
    nutrition.ts              per100, tổng món / bữa / ngày        (thuần)
    tdee.ts                   BMR, TDEE, con số gợi ý              (thuần)
    day-status.ts             trạng thái vòng tròn ngày            (thuần)
    goals.ts                  mục tiêu áp dụng cho một ngày        (thuần)
    dates.ts                  DateKey, tuần, tháng                 (thuần)
    format.ts                 định dạng số, ngày kiểu Việt Nam     (thuần)
    schema.ts                 zod schema dùng chung
    image.ts                  thu nhỏ và mã hóa ảnh
    db.ts                     Dexie và các hàm đọc ghi
    api-client.ts             gọi /api/analyze, ánh xạ mã lỗi
    server/
      analyze.ts              gọi model, parse, thử lại
      prompt.ts               prompt hệ thống
      rate-limit.ts           interface + hai cách cài đặt
```

## 11. Tiêu chí nghiệm thu

Reviewer dùng danh sách này để đánh giá. Mỗi dòng phải kiểm chứng được.

**Phân tích bữa ăn**

1. Gửi một ảnh bữa ăn: nhận về tên bữa và ít nhất một món có khối lượng, calories, carb, protein, fat, chất xơ.
2. Gửi chỉ mô tả chữ (không ảnh): nhận về kết quả tương tự.
3. Gửi ảnh kèm mô tả có khối lượng cụ thể ("200g cơm"): kết quả dùng khối lượng trong mô tả.
4. Gửi ảnh không phải đồ ăn: hiển thị thông báo `NOT_FOOD`, ảnh và mô tả vẫn còn trên màn hình.
5. Khi API lỗi hoặc mất mạng: hiển thị thông báo tiếng Việt tương ứng, dữ liệu đã nhập còn nguyên, thử lại được.
6. Bấm Hủy khi đang phân tích: request bị hủy, quay về màn nhập với dữ liệu còn nguyên.
7. Ảnh chụp từ iPhone (HEIC, ảnh dọc) hiển thị đúng chiều và phân tích được.

**Chỉnh sửa và lưu**

8. Đổi khối lượng một món từ 200g thành 100g: calories và macro của món đó giảm một nửa, tổng cập nhật ngay.
9. Đổi 200g → 100g → 200g: giá trị trở về đúng như ban đầu.
10. Lưu bữa ăn, tải lại trang: bữa ăn vẫn còn, kể cả ảnh.
11. Sửa và xóa bữa ăn đã lưu hoạt động; xóa có hỏi xác nhận.
12. Không lưu được bữa ăn không còn món nào.

**Lịch và theo dõi ngày**

13. Ngày không có bữa nào: vòng xám rỗng.
14. Ngày ăn 1.500/2.000 kcal: vòng tròn tô đỏ đúng 3/4.
15. Ngày ăn 2.000/2.000: tô đỏ kín.
16. Chế độ cutting, ăn 2.300/2.000: tô kín màu cảnh báo, chi tiết ngày ghi "vượt 300 kcal". Chế độ bulking, ăn 2.300/2.000: tô đỏ kín, không cảnh báo.
17. Chọn một ngày đã qua và thêm bữa: bữa nằm đúng ngày đó, vòng tròn ngày đó cập nhật.
18. Ngày tương lai không chọn được.
19. Chuyển giữa xem tuần và xem tháng, lùi và tiến tuần/tháng hoạt động; tuần bắt đầu từ thứ Hai.
20. Bữa ăn log lúc 23:30 nằm ở đúng ngày theo giờ máy.
21. Tổng calories và macro của ngày bằng tổng các bữa trong ngày.

**Mục tiêu**

22. Lần đầu mở app: được đưa tới onboarding; chưa hoàn thành thì không vào được trang chính.
23. Nhập nam, 25 tuổi, 175 cm, 70 kg, vận động vừa: gợi ý 2.100 (cut), 2.600 (giữ cân), 2.850 (bulk).
24. Sửa được con số gợi ý trước khi lưu; giá trị ngoài 800–6.000 bị từ chối.
25. Lối tắt "Tôi đã biết con số của mình" hoạt động mà không cần nhập chỉ số cơ thể.
26. Đổi mục tiêu ở settings: vòng tròn hôm nay dùng mục tiêu mới, vòng tròn các ngày trước không đổi.

**Card chia sẻ**

27. Từ một bữa có ảnh: xuất được PNG 1080×1350 có ảnh bữa ăn, tên, ngày, calories, ba macro, danh sách món, chữ ký MealMeal.
28. Từ một bữa không có ảnh: xuất được card nền gradient, không có ô ảnh trống.
29. Trên điện thoại hỗ trợ Web Share: nút Chia sẻ mở bảng chia sẻ của hệ điều hành kèm file ảnh. Nút Tải ảnh luôn hoạt động.
30. Card xuất ra trên Safari iOS và Chrome Android không bị trắng ảnh, sai font hay vỡ bố cục.

**An toàn và chất lượng**

31. Tìm trong bundle gửi xuống trình duyệt không thấy API key; không có biến `NEXT_PUBLIC_` nào chứa bí mật.
32. Gọi API quá 10 lần trong một phút từ một IP: nhận `429`.
33. Gửi body sai định dạng hoặc ảnh quá lớn: nhận `400`, server không gọi model.
34. Model trả JSON sai schema: server thử lại một lần rồi trả `502`, không trả dữ liệu sai cho client.
35. `tsc --noEmit`, lint, và toàn bộ test đều qua. Build production thành công.
36. Ở chiều rộng 360px và 430px: không có thanh cuộn ngang, không có chữ bị cắt, nút nổi không che nội dung cuối trang.
37. Không có lỗi hydration hay lỗi đỏ trong console khi đi hết các luồng chính.

## 12. Kiểm thử

Bắt buộc có unit test (Vitest) cho:

- `tdee.ts`: cả hai công thức BMR, năm hệ số vận động, ba chế độ, làm tròn 50, mức sàn; có ví dụ ở mục 8.2.
- `day-status.ts`: đủ bốn trạng thái, các ngưỡng 1.05 và 1.10 theo từng chế độ, mức tô tối thiểu 5%.
- `goals.ts`: ngày trước bản ghi đầu tiên, ngày giữa hai bản ghi, ngày đúng `effectiveFrom`, ghi đè cùng ngày.
- `nutrition.ts`: đổi sang `per100`, sửa khối lượng qua lại không lệch, tổng bữa và tổng ngày.
- `dates.ts`: tuần bắt đầu thứ Hai, lưới tháng, chuyển tháng và chuyển năm, năm nhuận, tạo `DateKey` lúc 23:59 và 00:00.
- `schema.ts`: chấp nhận dữ liệu đúng, từ chối số âm, thiếu trường, quá giới hạn.
- `api/analyze`: với OpenAI client được giả lập, kiểm tra các nhánh thành công, `INVALID_INPUT`, `NOT_FOOD`, thử lại rồi `AI_ERROR`, `TIMEOUT`, `RATE_LIMITED`.
- Bộ giới hạn lượt gọi trong bộ nhớ: đúng ngưỡng theo phút và theo ngày.

Nên có một test Playwright cho luồng chính với `/api/analyze` được giả lập: onboarding → thêm bữa bằng mô tả → sửa khối lượng → lưu → thấy vòng tròn hôm nay được tô → mở bữa ăn → mở card chia sẻ.

Không viết test gọi model thật trong bộ test tự động.

## 13. Phần để builder tự quyết

- Package manager, cấu hình lint và format.
- Thư viện render card thành ảnh, miễn đạt tiêu chí 27–30.
- Giá trị màu cụ thể, icon, hiệu ứng chuyển động, chi tiết bố cục trong khung đã mô tả.
- Onboarding là một trang hai bước hay hai trang.
- Cách tổ chức component và state (không cần thư viện quản lý state; `useLiveQuery` và state cục bộ là đủ).
- Có dùng thư viện component hay tự viết.
- Câu chữ cụ thể trên giao diện, miễn là tiếng Việt tự nhiên và giữ đúng ý.

## 14. Thứ tự xây dựng đề xuất

Kế hoạch triển khai chi tiết là một tài liệu riêng, viết sau khi thiết kế này được duyệt. Thứ tự tổng quát:

1. Khung dự án, cấu hình, token giao diện, font.
2. Các module logic thuần và unit test (`dates`, `nutrition`, `tdee`, `goals`, `day-status`, `schema`).
3. Database Dexie và các hàm đọc ghi.
4. API `/api/analyze` với giới hạn lượt gọi và test.
5. Onboarding và settings.
6. Luồng thêm bữa: nhập, phân tích, chỉnh sửa, lưu.
7. Trang chính: lịch, vòng tròn ngày, chi tiết ngày.
8. Chi tiết bữa ăn: sửa, xóa.
9. Card chia sẻ.
10. Manifest, icon, rà soát trên điện thoại thật, README, deploy.
