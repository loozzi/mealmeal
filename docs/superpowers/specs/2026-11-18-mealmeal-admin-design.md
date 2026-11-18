# MealMeal: trang quản trị xem người dùng, token và chi phí AI

- Ngày: 18/11/2026
- Trạng thái: chờ chủ dự án duyệt
- Dựa trên: spec v1 `docs/superpowers/specs/2026-11-17-mealmeal-design.md` và spec đồng bộ `docs/superpowers/specs/2026-11-17-mealmeal-sync-design.md`. Spec này chỉ ghi những gì thêm hoặc đổi. Phần nào không nhắc tới thì giữ nguyên.

## 1. Mục đích

Chủ dự án muốn một trang chỉ mình xem được để:

1. **Theo dõi chi phí AI**: mỗi ngày và trong một khoảng thời gian, app đã dùng bao nhiêu token và tốn khoảng bao nhiêu tiền.
2. **Biết app có ai dùng không**: có bao nhiêu tài khoản và bao nhiêu người thực sự dùng trong khoảng thời gian.
3. **Biết ai dùng bao nhiêu**: số liệu theo từng người (email, số lần phân tích, token, chi phí ước tính, số bữa ăn, lần dùng gần nhất).

Chi phí vận hành vẫn là **0 đồng**: chỉ dùng Firebase gói Spark và Vercel gói Hobby đang có. Không thêm dịch vụ mới.

## 2. Mục tiêu, ngoài phạm vi, điều phải tránh

### 2.1 Mục tiêu

1. Server ghi lại số lần gọi AI và số token của **mọi** lần gọi AI có phản hồi, theo từng người, theo từng ngày (giờ Việt Nam). Gồm cả lần thử lại khi model trả sai định dạng, và cả lần kết luận "không phải món ăn".
2. Trang `/admin` hiện số tổng và bảng theo từng người cho ba khoảng: **Hôm nay**, **7 ngày**, **30 ngày**.
3. Chỉ những email trong biến môi trường `ADMIN_EMAILS` xem được số liệu. Việc chặn nằm ở server, không chỉ ở giao diện.
4. Việc ghi số liệu không làm chậm hay làm hỏng phân tích. Ghi lỗi thì người dùng vẫn nhận kết quả bình thường.

### 2.2 Ngoài phạm vi

- Sửa, chặn, xóa người dùng; đổi hạn mức của từng người.
- Số liệu trước ngày triển khai. Token các lần gọi trước đây không được ghi ở đâu nên không khôi phục được.
- Xuất CSV, gửi email báo cáo, cảnh báo khi vượt ngân sách.
- Biểu đồ dùng thư viện. Phần "Theo ngày" dùng thanh ngang bằng CSS.
- Khoảng thời gian tùy chọn (chọn từ ngày nào đến ngày nào).
- Nhiều cấp quyền admin. Ai là admin thì xem được tất cả.

### 2.3 Điều phải tránh

- Người không phải admin đọc được số liệu, qua API hoặc trực tiếp từ Firestore.
- Server lưu email, ảnh, mô tả hay nội dung bữa ăn vào bảng số liệu. Email chỉ được đọc từ Firebase Auth lúc admin mở trang, không ghi lại ở đâu.
- Ghi số liệu làm `/api/analyze` chậm hơn đáng kể, hoặc trả lỗi cho người dùng.
- Đếm sai: một lần phân tích bị cộng hai lần, hoặc lần thử lại không được tính token.
- Service account key lộ ra trình duyệt hoặc bị commit vào git.
- Mở trang admin tốn số lượt đọc Firestore vượt xa gói free (50.000 lượt đọc/ngày).

## 3. Ràng buộc

- Mọi ràng buộc ở `AGENTS.md` vẫn áp dụng: chữ giao diện tiếng Việt, số kiểu Việt Nam, `tabular-nums`, cột `max-w-[480px]`, vùng bấm ≥ 44px, đọc tài liệu bản hiện hành trước khi dùng API mới (Next.js, `firebase-admin`).
- Quy tắc riêng tư được nới như sau (sửa AGENTS.md, xem §11): **server được lưu uid kèm số đếm** (số lần gọi, số token, ngày). Server vẫn **không lưu và không log** ảnh, mô tả, email hay nội dung bữa ăn. Log vẫn chỉ có mã kết quả và thời gian xử lý, không có uid.
- Không thêm biến `NEXT_PUBLIC_` nào.
- Gói Spark của Firebase dùng được Admin SDK. Không cần nâng gói.

## 4. Các hướng đã cân nhắc

| Hướng | Mô tả | Kết luận |
|---|---|---|
| **A. Firestore + Firebase Admin SDK** | Server ghi số đếm vào Firestore bằng Admin SDK sau mỗi lần phân tích. API admin đọc số liệu và lấy email từ Firebase Auth. | **Chủ dự án chọn.** Dùng đúng Firebase đã có, miễn phí, số liệu do server ghi nên đáng tin. |
| B. Upstash Redis + Admin SDK | Đếm trong Redis, vẫn cần Admin SDK để lấy email. | Bỏ: thêm một dịch vụ mà không được gì hơn A. Upstash hiện cũng chưa cài trên production. |
| C. Trình duyệt tự ghi số token | Client ghi vào `users/{uid}`. | Bỏ: người dùng sửa được số liệu, và chỉ server biết số token thật. |

## 5. Dữ liệu

### 5.1 Ngày theo giờ Việt Nam

Server chạy theo UTC, nên ngày của số liệu **không** lấy theo giờ máy chủ. Hàm `vnDateKey(now: Date): DateKey` trả `"YYYY-MM-DD"` của giờ Việt Nam (UTC+7, không có giờ mùa hè): cộng 7 giờ vào `now.getTime()` rồi lấy `getUTCFullYear()/getUTCMonth()/getUTCDate()`. Không dùng `Intl` và không dùng `toISOString()`.

Ví dụ: `2026-11-17T16:59:59Z` → `"2026-11-17"`; `2026-11-17T17:00:00Z` → `"2026-11-18"`.

Khoảng thời gian (tính theo `vnDateKey(now)` = `today`):

| Khoảng | Mã | Từ | Đến |
|---|---|---|---|
| Hôm nay | `today` | `today` | `today` |
| 7 ngày | `7d` | `today` − 6 ngày | `today` |
| 30 ngày | `30d` | `today` − 29 ngày | `today` |

### 5.2 Cấu trúc Firestore

Thêm hai collection ở gốc, ngoài `users/`. **Chỉ server ghi và đọc** (qua Admin SDK, vốn bỏ qua Security Rules).

**`usageDaily/{date}_{uid}`**: số liệu của một người trong một ngày. Ví dụ id: `2026-11-18_abc123`.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `date` | string `YYYY-MM-DD` | Ngày giờ Việt Nam. |
| `uid` | string | uid Firebase. |
| `requests` | number | Số request `/api/analyze` đã qua bước đăng nhập (mọi kết quả, kể cả `RATE_LIMITED`, `INVALID_INPUT`). |
| `ok` | number | Số request trả kết quả thành công. |
| `notFood` | number | Số request kết thúc bằng `NOT_FOOD`. |
| `failed` | number | Số request kết thúc bằng `AI_ERROR` hoặc `TIMEOUT`. |
| `rateLimited` | number | Số request bị `RATE_LIMITED`. |
| `aiCalls` | number | Số lần gọi model có phản hồi (một request có thể gọi 2 lần khi thử lại). |
| `inputTokens` | number | Tổng `usage.prompt_tokens` của các lần gọi đó. |
| `outputTokens` | number | Tổng `usage.completion_tokens` của các lần gọi đó. |
| `missingUsage` | number | Số lần gọi model có phản hồi mà không kèm `usage` (proxy không trả). Token của các lần này coi là 0. |
| `updatedAt` | Timestamp | Thời điểm ghi gần nhất (server time). |

**`usageTotals/{uid}`**: tổng mọi thời gian của một người. Cùng các trường đếm như trên (trừ `date`), và thay `updatedAt` bằng:

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `lastAt` | Timestamp | Lần gần nhất có request (server time). |

Không có trường "lần đầu dùng": nếu muốn có thì phải đọc trước khi ghi, tốn thêm một lượt đọc mỗi request. Trang admin hiện "Ngày tạo tài khoản" lấy từ Firebase Auth (`metadata.creationTime`) thay cho nó.

`INVALID_INPUT` chỉ cộng vào `requests`, không có trường riêng.

Kết quả của một request (`UsageOutcome`) và trường được cộng thêm 1:

| Kết quả route | `UsageOutcome` | Trường +1 (ngoài `requests`) |
|---|---|---|
| 200 | `ok` | `ok` |
| `NOT_FOOD` | `notFood` | `notFood` |
| `AI_ERROR`, `TIMEOUT` | `failed` | `failed` |
| `RATE_LIMITED` | `rateLimited` | `rateLimited` |
| `INVALID_INPUT` | `invalid` | (không) |
| `UNAUTHENTICATED` | (không ghi) | (không) |
| Lỗi không lường trước (500) | `failed` | `failed` |

### 5.3 Cách ghi

- Sau khi `/api/analyze` đã có kết quả (thành công hay lỗi) **và** đã xác định được uid, route gọi `recordUsage(uid, tally, outcome, now)`.
- `UNAUTHENTICATED` không ghi gì, vì không có uid.
- Chữ ký: `recordUsage(uid: string, outcome: UsageOutcome, tally: UsageTally, now: Date): Promise<void>`. `UsageTally = { aiCalls: number; inputTokens: number; outputTokens: number; missingUsage: number }`, tạo mới với toàn số 0 cho mỗi request.
- `recordUsage` dùng **một** `WriteBatch` gồm hai lệnh `set(..., { merge: true })`. Mỗi lệnh đặt `uid` (và `date` cho `usageDaily`) bằng giá trị thường, `FieldValue.increment(n)` cho **mọi** trường đếm (kể cả khi `n = 0`, để tài liệu luôn đủ trường), và `FieldValue.serverTimestamp()` cho `updatedAt`/`lastAt`. Như vậy mỗi request tốn đúng 2 lượt ghi và không có lượt đọc. Các request đồng thời của cùng một người được cộng đúng, không bị ghi đè.
- Việc ghi chạy trong `after()` của `next/server`, để không làm chậm response. Lỗi ghi được bắt lại, chỉ log đúng một dòng `usage write failed <code>`. `<code>` là mã lỗi Firestore (ví dụ `permission-denied`, `unavailable`) hoặc `unknown`. Không log uid.
- Thiếu service account (§7) thì `recordUsage` không làm gì và không log mỗi lần. Chỉ log `usage disabled: missing FIREBASE_SERVICE_ACCOUNT_B64` **một lần** cho mỗi lần khởi động server.

### 5.4 Đếm token trong `analyzeMeal`

- `analyzeMeal(input, config, tally?)` nhận thêm tham số tùy chọn `tally: UsageTally` (object có thể sửa). Với **mỗi** lần `chat.completions.create` trả về (kể cả khi nội dung không dùng được và phải thử lại): `tally.aiCalls += 1`; nếu `completion.usage` có `prompt_tokens` và `completion_tokens` là số thì cộng vào `inputTokens`/`outputTokens`, ngược lại `tally.missingUsage += 1`.
- Lần gọi ném lỗi (mạng, timeout, 5xx) **không** tính `aiCalls`, vì không có phản hồi và không có `usage`.
- Kiểu `ChatClient` trong `ai-config.ts` thêm trường tùy chọn `usage?: { prompt_tokens?: number; completion_tokens?: number } | null` trong kết quả của `create`.
- Kết quả trả về và lỗi ném ra của `analyzeMeal` giữ nguyên như hiện tại. `tally` được sửa trước khi hàm trả về hoặc ném lỗi, nên route vẫn đọc được token khi kết quả là `NOT_FOOD` hay `AI_ERROR`.

### 5.5 Firestore Security Rules

Thêm vào `firestore.rules`, trong `match /databases/{database}/documents`:

```
match /usageDaily/{id} { allow read, write: if false; }
match /usageTotals/{uid} { allow read, write: if false; }
```

Rules mặc định đã chặn, nhưng ghi rõ để người đọc sau hiểu ý định, và để test rules khóa lại hành vi này.

## 6. Quyền admin

- Danh sách admin **chỉ** nằm trong biến môi trường server `ADMIN_EMAILS`: email cách nhau bằng dấu phẩy, ví dụ `a@gmail.com,b@gmail.com`. Biến không có, hoặc chỉ gồm khoảng trắng và dấu phẩy: không ai là admin.
- **Không** ghi email admin thật vào code, test, tài liệu hay `.env.example`, vì repo là public. Test và e2e dùng email giả (`admin@example.com`). Chủ dự án yêu cầu.
- So sánh sau khi `trim()` và đổi về chữ thường, ở cả hai phía.
- `verifyIdToken` (trong `src/lib/server/auth.ts`) trả thêm `email?: string` và `emailVerified: boolean`, đọc từ claim `email` và `email_verified` của token. Các kiểm tra hiện có giữ nguyên.
- Một người là admin khi **cả hai**: `emailVerified === true` và email (chữ thường) có trong danh sách admin đang áp dụng. Tài khoản Google luôn có email đã xác minh.
- Hàm thuần `isAdmin(claims: { email?: string; emailVerified: boolean }, adminEmails: string | undefined): boolean` để test được. Tham số thứ hai là giá trị thô của `process.env.ADMIN_EMAILS`.

### 6.1 Admin vẫn là người dùng bình thường

Tài khoản admin dùng app y như mọi tài khoản khác. Quyền admin **chỉ thêm** việc xem `/admin` và gọi `/api/admin/stats`, không đổi gì khác:

- Vẫn qua `AppGate`, onboarding, mục tiêu, ghi bữa, đồng bộ, xóa dữ liệu như thường. Dữ liệu bữa ăn nằm ở `users/{uid}` của chính admin, theo cùng Firestore Rules.
- `/api/analyze` xử lý admin như mọi người: cùng giới hạn lượt, cùng cách ghi số liệu. Lượt dùng của admin có trong thống kê và trong bảng người dùng.
- Không có giao diện nào khác đi khi là admin (không có link, huy hiệu hay mục cài đặt riêng).

## 7. Firebase Admin SDK

- Thêm dependency `firebase-admin` (bản hiện hành; đọc tài liệu trước khi dùng). Chỉ import trong `src/lib/server/**` và route handler. Không bao giờ import từ file có `"use client"`.
- Biến môi trường `FIREBASE_SERVICE_ACCOUNT_B64`: nội dung file JSON service account, mã hóa base64 (một dòng, tránh lỗi xuống dòng trong khóa riêng). Server giải mã, `JSON.parse`, rồi `initializeApp({ credential: cert(json), projectId })`.
- `getAdmin(): { db: Firestore; auth: Auth } | null` trong `src/lib/server/firebase-admin.ts`, khởi tạo một lần rồi dùng lại (kiểm `getApps()`).
  - **Chế độ emulator**: khi có `FIRESTORE_EMULATOR_HOST` và project id bắt đầu bằng `demo-`, khởi tạo **không** cần credential (`initializeApp({ projectId })`). Admin SDK tự nối emulator qua `FIRESTORE_EMULATOR_HOST` và `FIREBASE_AUTH_EMULATOR_HOST`.
  - Không phải emulator mà thiếu hoặc hỏng `FIREBASE_SERVICE_ACCOUNT_B64`: trả `null`.
  - `projectId`: lấy `project_id` trong JSON service account; ở chế độ emulator lấy `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (đã là `demo-mealmeal` khi chạy e2e).
- `firebase-admin` phải chạy như package ngoài bundle của server. Kiểm trong `node_modules/next/dist/docs/` xem nó đã có trong danh sách `serverExternalPackages` mặc định của Next 16 chưa; chưa có thì thêm vào `next.config.ts`.
- Server **không** dùng Admin SDK để kiểm token của `/api/analyze`. Giữ cách kiểm bằng `jose` hiện có.

## 8. API quản trị

### 8.1 `GET /api/admin/stats?range=today|7d|30d`

- Header `Authorization: Bearer <Firebase ID token>`, giống `/api/analyze`.
- Thứ tự xử lý:
  1. Không có token hoặc token sai → `401 UNAUTHENTICATED`.
  2. Không phải admin (§6) → `403 FORBIDDEN`.
  3. `range` không phải một trong ba giá trị → `400 INVALID_INPUT`. Không có `range` thì mặc định `7d`.
  4. `getAdmin()` trả `null` → `503 ADMIN_UNAVAILABLE`.
  5. Đọc số liệu (§8.2). Lỗi Firestore/Auth → `502 ADMIN_ERROR`.
- Lỗi có dạng giống `/api/analyze`: `{ error: { code, message } }`. Message tiếng Việt:

| Mã | HTTP | Message |
|---|---|---|
| `UNAUTHENTICATED` | 401 | Phiên đăng nhập đã hết. Hãy đăng nhập lại. |
| `FORBIDDEN` | 403 | Bạn không có quyền xem trang này. |
| `INVALID_INPUT` | 400 | Khoảng thời gian không hợp lệ. |
| `ADMIN_UNAVAILABLE` | 503 | Chưa cấu hình quyền đọc số liệu trên server. |
| `ADMIN_ERROR` | 502 | Không tải được số liệu. Hãy thử lại. |

- Response không được cache: route là dynamic (đọc header `Authorization`), trả header `Cache-Control: no-store`. Kiểm lại trong `node_modules/next/dist/docs/` cách Next 16 (với `cacheComponents`) xử lý route handler `GET` để chắc chắn không bị prerender hay cache.
- Log một dòng `admin stats <OK|mã lỗi> <ms>ms`. Không log email hay uid.
- Mã lỗi admin là kiểu riêng `AdminErrorCode`, không thêm vào `ApiErrorCode` của `/api/analyze`.

### 8.2 Đọc gì

1. **Người dùng**: `auth.listUsers(1000, pageToken)` lặp tới hết. Mỗi người lấy `uid`, `email`, `metadata.creationTime`, `metadata.lastSignInTime`.
2. **Số liệu trong khoảng**: `usageDaily` với `where("date", ">=", from).where("date", "<=", to)`. Một điều kiện khoảng trên một trường không cần index tổng hợp.
3. **Tổng mọi thời gian**: toàn bộ `usageTotals` (để lấy `lastAt`).
4. **Số bữa ăn trong khoảng**: với mỗi người dùng, aggregation `count()` trên `users/{uid}/meals` với `where("date", ">=", from).where("date", "<=", to)`. Chạy song song, tối đa 10 truy vấn cùng lúc. Mỗi truy vấn count tính 1 lượt đọc cho mỗi 1.000 bản ghi khớp.

Ước lượng lượt đọc cho một lần mở trang với N người dùng: khoảng `N` (usageTotals) + `N` (count) + số cặp (người, ngày) có dùng trong khoảng (tối đa `30 × N`). Với 100 người và khoảng 30 ngày: tối đa khoảng 3.200 lượt. Gói free có 50.000 lượt mỗi ngày, đủ. Ghi con số ước lượng này vào README.

### 8.3 Cấu trúc response thành công

Hàm thuần `buildStats(input): AdminStats` gom dữ liệu thô thành response. Route chỉ đọc dữ liệu rồi gọi nó.

```ts
type Range = "today" | "7d" | "30d";

type UsageCounts = {
  requests: number; ok: number; notFood: number; failed: number; rateLimited: number;
  aiCalls: number; inputTokens: number; outputTokens: number; missingUsage: number;
};

type AdminStats = {
  range: Range;
  from: DateKey;            // ngày đầu, giờ Việt Nam
  to: DateKey;              // hôm nay, giờ Việt Nam
  generatedAt: string;      // ISO thời điểm tạo
  price: { inputPer1M: number; outputPer1M: number } | null; // null khi chưa đặt giá
  totals: UsageCounts & {
    accounts: number;       // tổng tài khoản trong Firebase Auth (mọi thời gian)
    newAccounts: number;    // tài khoản tạo trong khoảng (theo giờ Việt Nam)
    activeUsers: number;    // số người có requests > 0 HOẶC có ít nhất 1 bữa ăn trong khoảng
    meals: number;          // tổng số bữa trong khoảng
    costUsd: number | null; // null khi price null
  };
  days: Array<UsageCounts & { date: DateKey; activeUsers: number; costUsd: number | null }>;
  // đủ mọi ngày từ from tới to, kể cả ngày không có số liệu (đếm 0), sắp tăng dần theo ngày
  users: Array<UsageCounts & {
    uid: string;
    email: string | null;
    createdAt: string | null;     // ISO, từ Firebase Auth
    lastSignInAt: string | null;  // ISO, từ Firebase Auth
    lastUsedAt: string | null;    // ISO, usageTotals.lastAt
    meals: number;                // số bữa trong khoảng
    costUsd: number | null;
  }>;
  // mọi tài khoản trong Auth, cộng thêm uid có số liệu mà không còn trong Auth (email null)
};
```

- `activeUsers` của một ngày trong `days` chỉ dựa vào `usageDaily` (người có `requests > 0` ngày đó), vì không đếm bữa ăn theo từng ngày.
- Thứ tự `users`: `costUsd` giảm dần (khi giá null thì theo `inputTokens + outputTokens` giảm dần), rồi `meals` giảm dần, rồi `email` tăng dần (null xếp cuối).

### 8.4 Giá và chi phí

- Hai biến môi trường server: `AI_PRICE_INPUT_PER_1M_USD`, `AI_PRICE_OUTPUT_PER_1M_USD`. Là số thập phân dùng dấu chấm, ví dụ `0.10` và `0.40`.
- Cả hai đều là số hữu hạn ≥ 0 thì `price` có giá trị. Thiếu hoặc sai bất kỳ biến nào thì `price = null` và mọi `costUsd = null`.
- `costUsd = inputTokens / 1_000_000 × inputPer1M + outputTokens / 1_000_000 × outputPer1M`. Không làm tròn ở server.
- Chi phí được **tính lúc xem** từ số token. Đổi giá thì số liệu cũ cũng tính theo giá mới. Trang admin ghi rõ điều này (§9).

## 9. Trang `/admin`

### 9.1 Truy cập

- Route `/admin`, nằm sau `AppGate` như các trang khác (phải đăng nhập; chưa có mục tiêu thì `AppGate` vẫn đưa về onboarding như hiện tại).
- Không có link tới `/admin` ở đâu trong app. Chủ dự án mở bằng địa chỉ trực tiếp hoặc bookmark. (Quyết định của spec: để biết có hiện link hay không thì phải gọi thêm API, không đáng cho một người dùng.)
- Không có thanh điều hướng dưới. Đầu trang có link "Quay lại" về `/settings`, theo đúng kiểu nút quay lại của trang `/meal`.
- Trang dùng `useSearchParams` để giữ khoảng đang chọn (`/admin?range=30d`) thì phải bọc `<Suspense>`.

### 9.2 Bố cục (cột 480px, cuộn dọc)

```
‹ Quay lại
Quản trị
[ Hôm nay | 7 ngày | 30 ngày ]            ← segmented, mặc định 7 ngày
11/11/2026 – 17/11/2026 · cập nhật 21:04   ← khoảng và thời điểm tải

┌───────────────┬───────────────┐
│ Chi phí ước tính │ Token          │
│ $0,1234        │ 1.234.567      │
│                │ vào 1.100.000 · ra 134.567 │
├───────────────┼───────────────┤
│ Người dùng hoạt động │ Lượt phân tích │
│ 12 / 40 tài khoản │ 230 (OK 210)   │
│ +3 tài khoản mới │ 15 không phải món ăn · 5 lỗi · 2 bị giới hạn │
└───────────────┴───────────────┘
Bữa ăn đã ghi: 340

Theo ngày
11/11  ▇▇▇▇▇▇      $0,0123 · 25 lượt · 5 người
12/11  ▇▇▇         $0,0061 · 12 lượt · 3 người
...                                  ← thanh dài theo chi phí (hoặc token khi chưa có giá)

Người dùng (40)
a@gmail.com                       $0,0456
  85 lượt · 456.789 token · 60 bữa
  Dùng gần nhất 17/11 20:31 · Tạo 01/11/2026
b@gmail.com                       $0,0000
  0 lượt · 0 token · 12 bữa
  Chưa dùng AI · Tạo 12/11/2026
...
Chi phí tính theo giá hiện tại: vào $0,10 / ra $0,40 cho 1 triệu token.
```

- Khi chưa đặt giá: ô chi phí hiện "Chưa đặt giá", dòng cuối trang hiện "Đặt AI_PRICE_INPUT_PER_1M_USD và AI_PRICE_OUTPUT_PER_1M_USD để xem chi phí." Thanh theo ngày dùng tổng token.
- Khi có `missingUsage > 0` trong khoảng: dưới ô Token hiện "Có N lượt gọi không kèm số token, chưa được tính."
- Chọn "Hôm nay" thì bỏ phần "Theo ngày".
- Người dùng có email null (đã bị xóa khỏi Auth) hiện "Tài khoản đã xóa" kèm 6 ký tự đầu của uid.
- Bảng người dùng: mỗi người một khối thẻ như trên, không dùng bảng ngang (màn hình 360px). Danh sách dài thì hiện 50 người đầu, kèm nút "Xem thêm" mỗi lần thêm 50.

### 9.3 Định dạng

Thêm vào `src/lib/format.ts` (chỉ làm tròn khi hiển thị):

- `formatUsd(n: number): string`: `$` + số có phần thập phân dấu phẩy, nhóm nghìn dấu chấm. `n < 1` thì 4 chữ số thập phân (`0.01234` → `$0,0123`); `n ≥ 1` thì 2 chữ số (`1234.5` → `$1.234,50`). Số âm không xảy ra.
- `formatDateTime(iso: string): string`: `dd/MM HH:mm` theo **giờ máy** của người xem (dùng `getDate()/getHours()`…), ví dụ `17/11 20:31`.
- Token và số lượt dùng `formatInt`. Ngày dùng `formatDate` có sẵn hoặc `dd/MM` cho dòng theo ngày.

### 9.4 Trạng thái

| Trạng thái | Hiển thị |
|---|---|
| Đang tải lần đầu | Khung xám (skeleton) cho 4 ô và 3 dòng người dùng. |
| Đổi khoảng | Giữ số cũ, làm mờ (`opacity-60`), tới khi có số mới. |
| `403 FORBIDDEN` | Chỉ một dòng "Bạn không có quyền xem trang này." và link "Về trang chính". Không hiện khung số liệu. |
| `503 ADMIN_UNAVAILABLE` | `ErrorNote` với message của API. |
| Lỗi khác hoặc mất mạng | `ErrorNote` "Không tải được số liệu. Hãy thử lại." và nút "Thử lại". |
| `401` | Gọi lại một lần với token mới (`getIdToken(true)`); vẫn 401 thì hiện như lỗi khác. |

- Có nút "Làm mới" (biểu tượng xoay, 44×44px) cạnh tiêu đề để tải lại.
- Không tự tải lại định kỳ.

## 10. Biến môi trường mới

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_B64` | Có, để ghi và xem số liệu | Base64 của file JSON service account. **Bí mật.** Trên Vercel đặt loại Sensitive. Không có thì app vẫn chạy, chỉ không ghi số liệu và trang admin báo chưa cấu hình. |
| `ADMIN_EMAILS` | Có, để vào trang admin | Danh sách email admin, cách nhau bằng dấu phẩy. Không có thì không ai vào được `/admin`. Trong `.env.example` để trống. |
| `AI_PRICE_INPUT_PER_1M_USD` | Không | Giá 1 triệu token vào, USD. |
| `AI_PRICE_OUTPUT_PER_1M_USD` | Không | Giá 1 triệu token ra, USD. |

- Thêm cả bốn vào `.env.example` với giá trị trống và chú thích.
- Thêm vào `.gitignore`: `*firebase-adminsdk*.json` và `service-account*.json`, để file khóa tải về không lỡ bị commit.
- Playwright (`playwright.config.ts`) đặt cho app test: `FIRESTORE_EMULATOR_HOST=127.0.0.1:8085`, `ADMIN_EMAILS=admin@example.com`, `AI_PRICE_INPUT_PER_1M_USD=0.10`, `AI_PRICE_OUTPUT_PER_1M_USD=0.40`.

## 11. Việc chủ dự án làm

1. Firebase console → **Project settings → Service accounts** → **Generate new private key**. Tải file JSON về, **không** để trong thư mục dự án.
2. Mã hóa base64 một dòng: `base64 -w0 <file>.json` (Linux) hoặc `base64 -i <file>.json` (macOS). Đưa kết quả vào `FIREBASE_SERVICE_ACCOUNT_B64` trong `.env.local` và trên Vercel production (Sensitive). Sau đó có thể xóa file JSON.
3. Đặt `ADMIN_EMAILS` (các email Google của chủ dự án) ở `.env.local` và Vercel production.
4. Tra giá model đang dùng ở nhà cung cấp (hoặc proxy), đặt hai biến giá. Có thể để trống và đặt sau.
5. Publish lại `firestore.rules` (thêm hai khối ở §5.5).

## 12. Tiêu chí nghiệm thu

1. Một lần phân tích thành công làm `usageDaily/{hôm nay}_{uid}` và `usageTotals/{uid}` tăng `requests` 1, `ok` 1, `aiCalls` 1, token đúng bằng `usage` model trả.
2. Model trả sai định dạng lần đầu, đúng lần hai: `aiCalls` tăng 2, token là tổng hai lần, `ok` tăng 1.
3. `NOT_FOOD`: `notFood` tăng 1, token vẫn được cộng.
4. Model lỗi mạng cả hai lần: `failed` tăng 1, `aiCalls` không tăng.
5. Bị giới hạn lượt: `rateLimited` tăng 1, không có token.
6. Không đăng nhập: không ghi gì.
7. Phản hồi không có `usage`: `missingUsage` tăng, token không đổi, trang admin hiện dòng cảnh báo.
8. Ghi số liệu lỗi (Firestore không với tới): người dùng vẫn nhận kết quả phân tích bình thường, log chỉ có `usage write failed <code>`.
9. Hai request cùng lúc của một người: số đếm tăng đủ 2.
10. Lúc 23:30 giờ Việt Nam (16:30 UTC) và 00:30 giờ Việt Nam (17:30 UTC hôm trước), số liệu rơi đúng ngày Việt Nam.
11. Người đăng nhập không phải admin gọi `/api/admin/stats` → 403; mở `/admin` → "Bạn không có quyền xem trang này."
11a. `ADMIN_EMAILS=a@example.com,b@example.com`: đăng nhập `a@example.com` hoặc `B@Example.com` vào được `/admin`; email khác thì không. Không đặt `ADMIN_EMAILS`: không ai vào được. Trong repo không có email admin thật nào (kiểm bằng `git grep`).
11b. Tài khoản admin chụp, ghi bữa, xem lịch sử, đồng bộ như tài khoản thường; lượt phân tích của admin có trong thống kê.
12. Client SDK (người đã đăng nhập, kể cả admin) đọc hoặc ghi `usageDaily`, `usageTotals` → bị Rules từ chối.
13. Admin mở `/admin`: thấy đủ tài khoản (kể cả người chưa dùng AI, 0 lượt), số bữa ăn đúng theo khoảng, chi phí đúng công thức §8.4, đổi khoảng thì số đổi theo.
14. Không đặt giá: trang hiện "Chưa đặt giá", không lỗi.
15. Thiếu `FIREBASE_SERVICE_ACCOUNT_B64` trên production: `/api/analyze` vẫn chạy bình thường; trang admin báo "Chưa cấu hình quyền đọc số liệu trên server."
16. Không có khóa service account hay `firebase-admin` nào trong bundle trình duyệt (kiểm bằng cách tìm `private_key` và `firebase-admin` trong `.next/static` sau khi build).
17. Log server không có uid, email, ảnh hay mô tả.

## 13. Kiểm thử

- **Unit (Vitest)**:
  - `vnDateKey` ở hai mốc tiêu chí 10; `rangeDates("today"|"7d"|"30d", now)`.
  - `analyzeMeal` với client giả: đếm `aiCalls`/token khi thành công, thử lại, `NOT_FOOD`, lỗi mạng, thiếu `usage` (tiêu chí 1–4, 7).
  - `isAdmin`: biến không có hoặc trống thì không ai là admin; nhiều email; chữ hoa, khoảng trắng; `emailVerified=false`; thiếu email.
  - `parsePrice` và `costUsd`.
  - `buildStats`: đủ ngày kể cả ngày trống, `activeUsers`, `newAccounts`, thứ tự `users`, uid không còn trong Auth, giá null.
  - `formatUsd`, `formatDateTime`.
  - Route `/api/analyze` với `recordUsage` giả: được gọi đúng một lần với outcome và tally đúng ở mỗi kết quả; không gọi khi `UNAUTHENTICATED`; `recordUsage` ném lỗi thì response vẫn 200 (tiêu chí 8). Thiết kế để route nhận `recordUsage` qua một module có thể mock (`vi.mock`), không cần Firestore thật. `after()` của `next/server` không chạy được ngoài request thật, nên trong test mock nó thành hàm gọi callback ngay rồi `await` kết quả.
  - Route `/api/admin/stats`: 401, 403, 400, 503 với `getAdmin` giả.
- **Rules (`npm run test:rules`)**: tiêu chí 12, cho cả người dùng thường và admin.
- **Tích hợp trên emulator**: `recordUsage` thật ghi vào Firestore emulator, hai lần gọi đồng thời cộng đủ (tiêu chí 9). Chạy trong `test:rules` hoặc một script `emulators:exec` tương tự; builder chọn.
- **E2E (Playwright, emulator)**:
  - Đăng nhập `admin@example.com`, seed dữ liệu `usageDaily`/`usageTotals` qua REST của Firestore emulator với header `Authorization: Bearer owner` (bỏ qua Rules), thêm một bữa ăn qua giao diện. Mở `/admin`: thấy đúng số lượt, token, chi phí (`$...` theo giá test), tài khoản, bữa ăn; đổi sang "Hôm nay" và "30 ngày" thì số đổi đúng.
  - Đăng nhập email khác → `/admin` hiện "Bạn không có quyền xem trang này."
  - Không có lỗi console.

## 14. Phần để builder tự quyết

- Chia file trong `src/lib/server/` (gợi ý: `firebase-admin.ts`, `usage.ts`, `admin-stats.ts`, `admin-auth.ts`) và component trong `src/components/admin/`.
- Cách chạy song song có giới hạn cho các truy vấn `count()`.
- Màu và độ dài thanh "Theo ngày", miễn theo bảng màu hiện có của app.
- Cách mock `firebase-admin` trong unit test.

## 15. Thay đổi tài liệu đi kèm

- `AGENTS.md`:
  - Sửa dòng riêng tư thành: "Server không lưu và không log ảnh, mô tả bữa ăn hay email. Server chỉ lưu uid kèm số đếm sử dụng (`usageDaily`, `usageTotals`). Log chỉ có mã kết quả và thời gian xử lý, không có uid."
  - Thêm: "`firebase-admin` chỉ dùng ở server (`src/lib/server/**`, route handler). Ngày của số liệu sử dụng tính theo giờ Việt Nam bằng `vnDateKey`, không theo giờ máy chủ."
  - Trỏ tới spec này và plan đi kèm.
- `README.md`: mục "Dữ liệu nằm ở đâu" thêm số liệu sử dụng; bảng biến môi trường thêm 4 biến; mục mới "Trang quản trị" gồm các bước §11 và ước lượng lượt đọc §8.2.
