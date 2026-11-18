# MealMeal Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ghi số lượt gọi AI và token theo từng người, từng ngày (giờ Việt Nam) vào Firestore, và trang `/admin` chỉ admin xem được để theo dõi người dùng, token và chi phí.

**Architecture:** `analyzeMeal` đếm token vào một `UsageTally`. Route `/api/analyze` ghi số đếm bằng `firebase-admin` trong `after()`: 2 lượt ghi `FieldValue.increment`. Route `GET /api/admin/stats` kiểm quyền admin bằng claim email của ID token. Nó đọc `usageDaily`, `usageTotals`, Auth `listUsers` và `count()` số bữa ăn, rồi gom lại bằng hàm thuần `buildStats`. Trang client `/admin` gọi route này.

**Tech Stack:** Next 16.4.6 (cacheComponents), React 19.3, `firebase-admin` 14.x (đã nằm trong `serverExternalPackages` mặc định của Next), Vitest, `@firebase/rules-unit-testing`, Playwright với Auth/Firestore emulator.

**Spec:** `docs/superpowers/specs/2026-11-18-mealmeal-admin-design.md`

## Global Constraints

- Chữ giao diện tiếng Việt; tên biến, tên hàm và commit bằng tiếng Anh.
- Không thêm biến `NEXT_PUBLIC_`. `firebase-admin` chỉ import từ `src/lib/server/**` và route handler.
- Không ghi email admin thật vào code, test, tài liệu hay `.env.example`. Test dùng `@example.com`.
- Server không lưu và không log ảnh, mô tả hay email. Log không có uid.
- Ngày của số liệu: `vnDateKey` (UTC+7), không dùng `Intl`, không dùng `toISOString()` để lấy ngày.
- Số hiển thị kiểu Việt Nam, qua `src/lib/format.ts`, có `tabular-nums`. Vùng bấm ≥ 44px. Trang dùng `useSearchParams` thì bọc `<Suspense>`.
- Mỗi task kết thúc bằng `npm run typecheck && npm run lint && npm test` đều qua, rồi commit.

## Review Focus

1. Ghi số liệu ném lỗi hoặc treo thì `/api/analyze` vẫn phải trả kết quả đúng: Task 3 có test `recordUsage` reject → 200.
2. Lượt thử lại và `NOT_FOOD` vẫn phải cộng token: Task 1 có test.
3. Email viết hoa hoặc có khoảng trắng trong `ADMIN_EMAILS`, và token có `email_verified=false`: Task 2 có test.
4. Người dùng có số liệu nhưng đã bị xóa khỏi Auth thì không được làm hỏng trang, mà hiện "Tài khoản đã xóa": Task 4 (`buildStats`) và Task 5 (UI) có test.
5. Ranh giới ngày 17:00 UTC: Task 2 có test.

---

### Task 1: Count tokens in `analyzeMeal`

**Files:**
- Create: `src/lib/server/usage.ts`
- Modify: `src/lib/server/ai-config.ts` (`ChatClient`), `src/lib/server/analyze.ts`
- Test: `tests/analyze.test.ts`, `tests/usage.test.ts`

**Interfaces:**
- Produces, in `src/lib/server/usage.ts` (pure, không import firebase):
  - `type UsageTally = { aiCalls: number; inputTokens: number; outputTokens: number; missingUsage: number }`
  - `newTally(): UsageTally`
  - `type UsageOutcome = "ok" | "notFood" | "failed" | "rateLimited" | "invalid"`
  - `outcomeFor(code: ApiErrorCode | "OK"): UsageOutcome | null`, theo bảng ở spec §5.2: `UNAUTHENTICATED` → `null`; `AI_ERROR`, `TIMEOUT` → `failed`.
  - `type UsageCounts = { requests; ok; notFood; failed; rateLimited; aiCalls; inputTokens; outputTokens; missingUsage }`, tất cả là `number`. Export từ `src/lib/admin-types.ts` (tạo ở task này), để client dùng được.
  - `usageIncrements(outcome: UsageOutcome, tally: UsageTally): UsageCounts`: `requests: 1`, đặt 1 cho đúng trường của outcome, còn lại là 0, cộng thêm tally.
- `analyzeMeal(input, config, tally?: UsageTally): Promise<MealAnalysis>`

- [ ] **Step 1: Write failing tests**
  - `analyze.test.ts`, khi `reply()` có thêm `usage`:
    - thành công với `{prompt_tokens: 100, completion_tokens: 20}` → tally `{aiCalls:1, inputTokens:100, outputTokens:20, missingUsage:0}`;
    - lần đầu trả rác (`usage` 50/5), lần hai đúng (100/20) → `{2,150,25,0}`;
    - `NOT_FOOD` (30/3) → tally `{1,30,3,0}` và vẫn reject `NOT_FOOD`;
    - `create` reject hai lần (lỗi mạng) → `aiCalls` 0;
    - phản hồi không có `usage` → `missingUsage:1`, token 0;
    - `usage` có `prompt_tokens: "x"` → tính là thiếu.
  - `usage.test.ts`:
    - `outcomeFor` cho đủ 7 mã;
    - `usageIncrements("notFood", {aiCalls:1,inputTokens:30,outputTokens:3,missingUsage:0})` → `{requests:1, ok:0, notFood:1, failed:0, rateLimited:0, aiCalls:1, inputTokens:30, outputTokens:3, missingUsage:0}`;
    - `usageIncrements("invalid", newTally())` → chỉ `requests:1`.
- [ ] **Step 2:** `npx vitest run tests/analyze.test.ts tests/usage.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**
  - `ChatClient.create` trả thêm `usage?: { prompt_tokens?: number; completion_tokens?: number } | null`.
  - Trong vòng lặp của `analyzeMeal`, ngay sau khi `create` trả về (trước khi parse), cộng vào `tally` nếu có. Token chỉ được cộng khi cả hai giá trị là số hữu hạn; ngược lại `missingUsage += 1`.
- [ ] **Step 4:** chạy lại. Expected: PASS. Rồi `npm run typecheck && npm run lint && npm test`.
- [ ] **Step 5:** `git commit -m "feat: count AI calls and tokens per analysis"`

### Task 2: Server helpers: VN date, ranges, admin check, prices, formatters

**Files:**
- Create: `src/lib/server/vn-date.ts`, `src/lib/server/admin-auth.ts`, `src/lib/server/pricing.ts`
- Modify: `src/lib/server/auth.ts`, `src/lib/format.ts`, `src/lib/admin-types.ts`
- Test: `tests/vn-date.test.ts`, `tests/admin-auth.test.ts`, `tests/pricing.test.ts`, `tests/auth.test.ts`, `tests/format.test.ts`

**Interfaces:**
- `src/lib/admin-types.ts`: `type StatsRange = "today" | "7d" | "30d"`, `STATS_RANGES: readonly StatsRange[]`.
- `vnDateKey(now: Date): DateKey`: cộng 7 giờ rồi lấy phần UTC.
- `rangeDates(range: StatsRange, now: Date): { from: DateKey; to: DateKey }`: dùng `addDays` của `src/lib/dates.ts`.
- `verifyIdToken` trả `{ uid: string; email?: string; emailVerified: boolean }`. `email` chỉ có khi claim là chuỗi; `emailVerified = payload.email_verified === true`.
- `isAdmin(claims: { email?: string; emailVerified: boolean }, adminEmails: string | undefined): boolean`
- `parsePrice(env: { input?: string; output?: string }): { inputPer1M: number; outputPer1M: number } | null`: cả hai phải khớp `^\d+(\.\d+)?$`.
- `costUsd(c: { inputTokens: number; outputTokens: number }, price: Price | null): number | null`
- `formatUsd(n: number): string`; `formatDateTime(iso: string): string` (`dd/MM HH:mm`, giờ máy)

- [ ] **Step 1: Write failing tests**
  - `vnDateKey(new Date("2026-11-17T16:59:59Z"))` = `"2026-11-17"`; `...T17:00:00Z` = `"2026-11-18"`; `2026-12-31T17:00:00Z` → `"2027-01-01"`.
  - `rangeDates` lúc `2026-11-18T03:00:00Z`: today = `2026-11-18`..`2026-11-18`, 7d = `2026-11-12`..`2026-11-18`, 30d = `2026-10-20`..`2026-11-18`.
  - `isAdmin`:
    - `("A@Example.com", " a@example.com , b@example.com ")` → true;
    - `emailVerified:false` → false;
    - không có email → false;
    - biến `undefined`, `""` hoặc `" , "` → false;
    - email khác → false.
  - `auth.test.ts` (emulator mode, token unsigned): claims có `email` và `email_verified:true` → trả đúng; không có các claim đó → `emailVerified:false`, `email` undefined.
  - `parsePrice({input:"0.10", output:"0.40"})` → `{0.1,0.4}`. Các giá trị `"", "abc", "-1", "1,5"` hoặc thiếu một biến → null.
  - `costUsd({inputTokens:1_000_000, outputTokens:500_000}, {0.1,0.4})` = 0.3 (`toBeCloseTo`); price null → null.
  - `formatUsd`: `0.01234` → `"$0,0123"`, `0` → `"$0,0000"`, `0.3` → `"$0,3000"`, `1234.5` → `"$1.234,50"`, `1` → `"$1,00"`.
  - `formatDateTime(new Date(2026,10,17,20,31).toISOString())` → `"17/11 20:31"`.
- [ ] **Step 2:** run them. Expected: FAIL.
- [ ] **Step 3:** implement. `formatUsd` ghép chuỗi bằng tay như `formatInt` (không dùng Intl): làm tròn tới số chữ số thập phân, dùng phần nguyên `formatInt`, nối `,` và phần thập phân.
- [ ] **Step 4:** PASS, rồi chạy bộ kiểm tra đầy đủ.
- [ ] **Step 5:** `git commit -m "feat: add VN dates, admin check, pricing and money formatting"`

### Task 3: Record usage from `/api/analyze`

**Files:**
- Create: `src/lib/server/firebase-admin.ts`, `src/lib/server/usage-store.ts`, `tests-rules/usage-store.test.ts`
- Modify: `src/app/api/analyze/route.ts`, `firestore.rules`, `tests-rules/rules.test.ts`, `tests/route.test.ts`, `.gitignore`, `.env.example`, `package.json` (thêm `firebase-admin`), `vitest.rules.config.ts` (alias `@`)

**Interfaces:**
- `getAdmin(): { db: Firestore; auth: Auth } | null`, đúng spec §7. Emulator mode: có `FIRESTORE_EMULATOR_HOST` và `NEXT_PUBLIC_FIREBASE_PROJECT_ID` bắt đầu bằng `demo-` → `initializeApp({ projectId })`. Ngược lại giải mã `FIREBASE_SERVICE_ACCOUNT_B64` (base64 → JSON); lỗi thì trả `null`. Khi ở production mà thiếu biến, `console.warn` đúng một lần dòng `usage disabled: missing FIREBASE_SERVICE_ACCOUNT_B64`.
- `recordUsage(uid: string, outcome: UsageOutcome, tally: UsageTally, now: Date, db?: Firestore): Promise<void>`. `db` mặc định là `getAdmin()?.db`; không có thì return. Batch 2 lệnh `set(merge)`:
  - `usageDaily/${vnDateKey(now)}_${uid}`: `{date, uid, ...increments, updatedAt: serverTimestamp()}`;
  - `usageTotals/${uid}`: `{uid, ...increments, lastAt: serverTimestamp()}`.
- Route: `const tally = newTally()`. Chỉ đặt `uid` sau khi `authenticate` thành công. Sau khi có response: `const o = outcomeFor(outcome)`; nếu `uid && o` thì `after(() => recordUsage(uid, o, tally, new Date()).catch(err => console.warn(\`usage write failed ${code(err)}\`)))`. `code(err)` = `err.code` khi là chuỗi hoặc số, ngược lại `"unknown"`.

- [ ] **Step 1: Write failing tests**
  - `tests/route.test.ts`: thêm `vi.mock("@/lib/server/usage-store", () => ({ recordUsage: mocks.record }))` và `vi.mock("next/server", () => ({ after: (fn) => { mocks.afterRuns.push(Promise.resolve().then(fn)); } }))`. Sau mỗi `post` thì `await Promise.all(mocks.afterRuns)`. Các test:
    - OK: `record` được gọi 1 lần với `("u1", "ok", {aiCalls:1, ...}, expect.any(Date))`, khi `create` trả `usage` 100/20;
    - NOT_FOOD → `"notFood"`;
    - rác hai lần → `"failed"`, `aiCalls:2`;
    - rate limited → `"rateLimited"`, tally `newTally()`;
    - `{}` → `"invalid"`;
    - 401 → không gọi `record`;
    - `record` reject `{code:"unavailable"}` → response 200, `console.warn` được gọi với `"usage write failed unavailable"`, và không dòng log nào chứa `u1`.
  - `tests-rules/rules.test.ts`: alice (và một context có `email: "admin@example.com"`) đọc hoặc ghi `usageDaily/2026-11-18_alice`, `usageTotals/alice` → `assertFails`; guest cũng vậy.
  - `tests-rules/usage-store.test.ts` (chạy trên emulator qua `test:rules`):
    - Trong `beforeAll` đặt `process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "demo-mealmeal"`. `FIRESTORE_EMULATOR_HOST` do `emulators:exec` đặt sẵn.
    - Gọi `recordUsage("u1","ok",{1,100,20,0}, new Date("2026-11-17T17:30:00Z"))` hai lần **đồng thời** (`Promise.all`), rồi đọc bằng `getAdmin().db`: `usageDaily/2026-11-18_u1` có `requests:2, ok:2, inputTokens:200, outputTokens:40, date:"2026-11-18", uid:"u1"`; `usageTotals/u1.requests` = 2.
    - Dọn bằng `env.clearFirestore()`, hoặc xóa trực tiếp các tài liệu đó.
- [ ] **Step 2:** `npx vitest run tests/route.test.ts` FAIL. `npm run test:rules` FAIL.
- [ ] **Step 3: Implement**
  - `npm install firebase-admin@^14`.
  - Viết `firebase-admin.ts`, `usage-store.ts`, và nối vào route.
  - Thêm vào rules hai khối `allow read, write: if false;`.
  - `.gitignore`: thêm `*firebase-adminsdk*.json` và `service-account*.json`.
  - `.env.example`: thêm 4 biến của spec §10, kèm chú thích tiếng Việt, giá trị để trống.
- [ ] **Step 4:** chạy `npm test` và `npm run test:rules`. Expected: PASS.
- [ ] **Step 5:** `git commit -m "feat: record per-user AI usage in Firestore"`

### Task 4: `GET /api/admin/stats`

**Files:**
- Create: `src/lib/server/admin-stats.ts` (pure), `src/lib/server/admin-data.ts` (I/O), `src/app/api/admin/stats/route.ts`
- Modify: `src/lib/admin-types.ts`
- Test: `tests/admin-stats.test.ts`, `tests/admin-route.test.ts`

**Interfaces:**
- `src/lib/admin-types.ts`: `AdminStats` đúng như spec §8.3; `AdminErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "INVALID_INPUT" | "ADMIN_UNAVAILABLE" | "ADMIN_ERROR"`; `ADMIN_ERROR_MESSAGE: Record<AdminErrorCode, string>` với message đúng như bảng ở spec §8.1.
- `type RawStats = { accounts: { uid; email: string | null; createdAt: string | null; lastSignInAt: string | null }[]; daily: (UsageCounts & { date: DateKey; uid: string })[]; totals: { uid: string; lastAt: string | null }[]; meals: Record<string, number> }`
- `buildStats(raw: RawStats, opts: { range: StatsRange; now: Date; price: Price | null }): AdminStats`
- `loadRawStats(admin: { db; auth }, from: DateKey, to: DateKey): Promise<RawStats>`:
  - `listUsers(1000, token)` lặp tới hết;
  - query `usageDaily` theo `date` trong `[from, to]`;
  - lấy toàn bộ `usageTotals`;
  - với mỗi uid trong `accounts`, `count()` số tài liệu `users/{uid}/meals` có `date` trong khoảng, chạy theo lô 10 cái;
  - `lastAt` là Timestamp → `toDate().toISOString()`. Trường thiếu thì đọc thành 0.
- Route `GET`: thứ tự 401 → 403 → 400 (range lạ; không có thì mặc định `7d`) → 503 → 502, đúng spec §8.1. Header `Cache-Control: no-store`, log `admin stats <OK|code> <ms>ms`. Đọc header `authorization` từ `req.headers` (việc này làm route thành dynamic).

- [ ] **Step 1: Write failing tests**
  - `admin-stats.test.ts`, với `now = 2026-11-18T03:00:00Z`, range `7d`, giá `{0.1,0.4}`. Dữ liệu thô:
    - account A: tạo `2026-11-15T10:00:00Z`;
    - account B: tạo `2026-10-01T00:00:00Z`, không có số liệu, `meals:{B:2}`;
    - daily: A có `2026-11-18` (`requests:3, ok:2, notFood:1, aiCalls:4, inputTokens:1_000_000, outputTokens:500_000`) và `2026-11-12` (`inputTokens:2_000_000`); uid `ghost` không có trong Auth có `2026-11-17` (`requests:1, outputTokens:1_000_000`).
  - Kỳ vọng:
    - `days.length === 7`, ngày đầu `2026-11-12`, ngày cuối `2026-11-18`; ngày `2026-11-13` toàn số 0;
    - `totals.costUsd ≈ 0.3 + 0.2 + 0.4 = 0.9`;
    - `totals.accounts === 2`, `newAccounts === 1`;
    - `activeUsers === 3` (A, ghost, và B nhờ có bữa ăn);
    - `totals.meals === 2`;
    - thứ tự `users` là `[A (0.5), ghost (0.4), B (0)]`; ghost có `email: null`;
    - với `price: null`, mọi `costUsd` là null và thứ tự theo token.
  - `admin-route.test.ts`: mock `@/lib/server/auth`, `@/lib/server/firebase-admin` và `@/lib/server/admin-data`. Các trường hợp:
    - không có header → 401;
    - email không phải admin → 403 với message "Bạn không có quyền xem trang này.";
    - `ADMIN_EMAILS=admin@example.com` và `range=1y` → 400;
    - `getAdmin` trả null → 503;
    - `loadRawStats` reject → 502;
    - OK → 200, có `Cache-Control: no-store`, body có `range:"7d"`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** implement.
- [ ] **Step 4:** PASS, rồi chạy bộ kiểm tra đầy đủ.
- [ ] **Step 5:** `git commit -m "feat: add admin stats API"`

### Task 5: `/admin` page

**Files:**
- Create: `src/lib/admin-client.ts`, `src/app/admin/page.tsx`, `src/components/admin/AdminDashboard.tsx` (và các component con nếu cần), `e2e/admin.spec.ts`
- Modify: `playwright.config.ts`
- Test: `tests/admin-client.test.ts`, `e2e/admin.spec.ts`

**Interfaces:**
- `class AdminClientError { code: AdminErrorCode | "NETWORK" }`
- `fetchAdminStats(range: StatsRange, getToken: TokenGetter = currentUserToken): Promise<AdminStats>`: dùng `TokenGetter` của `src/lib/api-client.ts` (export `currentUserToken` nếu cần). Gặp 401 thì gọi lại một lần với `forceRefresh=true`. Mã lạ → `ADMIN_ERROR`; fetch lỗi → `NETWORK`.
- Trang: `"use client"`, `<Suspense>` bọc component đọc `?range=` (sai hoặc thiếu → `7d`). Đổi khoảng thì `router.replace("/admin?range=…")`. Header dùng `PageHeader title="Quản trị" backHref="/settings"`, prop `right` là nút "Làm mới" (`aria-label="Làm mới"`, `size-11`). Bố cục, chữ và các trạng thái đúng spec §9.2 và §9.4: segmented 3 nút `aria-pressed`, 4 ô số, phần "Theo ngày" (ẩn khi `today`), danh sách người dùng 50 người một lần với nút "Xem thêm", dòng giá cuối trang.

- [ ] **Step 1: Write failing tests**
  - `admin-client.test.ts`, với `fetch` giả:
    - 200 → trả body;
    - 401 rồi 200 → token được lấy lại với `true`;
    - 403 → `FORBIDDEN`;
    - fetch reject → `NETWORK`;
    - body `{error:{code:"XYZ"}}` → `ADMIN_ERROR`.
  - `e2e/admin.spec.ts` (`test.use({ timezoneId: "Asia/Ho_Chi_Minh" })`):
    - Admin: `signIn(page, "admin@example.com")`, `onboard`, `addMeal(page, "Phở bò")`. Lấy uid bằng `POST http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-mealmeal/accounts:lookup`, gửi `{ email: ["admin@example.com"] }` với header `Authorization: Bearer owner`. Nếu emulator không hỗ trợ dạng này thì đọc uid từ `page.evaluate` trên IndexedDB `firebaseLocalStorageDb`.
    - Seed bằng REST của Firestore emulator (`PATCH /v1/projects/demo-mealmeal/databases/(default)/documents/usageDaily/{id}`, `Authorization: Bearer owner`). Ngày tính bằng `vnDateKey(new Date())` và `addDays`:
      - hôm nay: `requests 3, ok 3, aiCalls 3, inputTokens 1000000, outputTokens 500000`;
      - hôm nay − 3: `requests 1, ok 1, aiCalls 1, inputTokens 2000000`;
      - hôm nay − 20: `requests 1, ok 1, aiCalls 1, outputTokens 1000000`;
      - cộng `usageTotals/{uid}` với `lastAt`.
    - `goto("/admin")`, mặc định 7 ngày: khối của `admin@example.com` hiện `$0,5000` và `1 bữa`. Bấm "Hôm nay" → `$0,3000`, và không còn tiêu đề "Theo ngày". Bấm "30 ngày" → `$0,9000`. URL có `range=30d`.
    - Người thường: `signIn` với `uniqueEmail("user")` rồi `onboard`, `goto("/admin")` → thấy "Bạn không có quyền xem trang này.".
    - `trackErrors` rỗng ở cả hai test. Riêng test người thường thì lọc bỏ dòng console của response 403, vì đó là lỗi tải tài nguyên được dự kiến.
    - Seed và ngày đều tính trong file spec e2e, không import code `src/lib/server`.
  - `playwright.config.ts`: thêm vào `env` của app `FIRESTORE_EMULATOR_HOST: "127.0.0.1:8085"`, `ADMIN_EMAILS: "admin@example.com"`, `AI_PRICE_INPUT_PER_1M_USD: "0.10"`, `AI_PRICE_OUTPUT_PER_1M_USD: "0.40"`.
- [ ] **Step 2:** `npx vitest run tests/admin-client.test.ts` FAIL.
- [ ] **Step 3:** implement client và trang.
- [ ] **Step 4:** `npm test` PASS; `npm run e2e` PASS (cả spec cũ); `npm run build` rồi `grep -rl "private_key\|firebase-admin" .next/static` không ra gì.
- [ ] **Step 5:** `git commit -m "feat: add admin dashboard page"`

### Task 6: Docs

**Files:** `AGENTS.md`, `README.md`

- [ ] **Step 1:** `AGENTS.md`: sửa dòng riêng tư và thêm hai dòng đúng như spec §15. Thêm vào danh sách tài liệu ở đầu file: spec admin và plan này.
- [ ] **Step 2:** `README.md`:
  - mục dữ liệu: thêm `usageDaily` và `usageTotals`;
  - bảng biến môi trường: thêm 4 biến;
  - mục mới "Trang quản trị": các bước ở spec §11 và ước lượng lượt đọc ở spec §8.2.
  - Không có email thật.
- [ ] **Step 3:** `npm run typecheck && npm run lint && npm test`; `git grep -n "@gmail.com"` ra 0 dòng.
- [ ] **Step 4:** `git commit -m "docs: document admin dashboard and usage tracking"`
