# MealMeal: đăng nhập Google và đồng bộ, kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bắt buộc đăng nhập Google, lưu hồ sơ, mục tiêu và bữa ăn trên Firestore để dùng ở mọi thiết bị, vẫn chạy được khi offline. Ảnh chỉ nằm trên máy đã chụp.

**Architecture:**
- **Firestore là nơi lưu chính.** Bộ nhớ offline bền của Firestore lo phần đồng bộ, hàng đợi ghi khi mất mạng và cập nhật realtime giữa các máy.
- **Dexie lên version 2 và chỉ còn hai việc:** giữ ảnh (`photos`), và giữ dữ liệu v1 cho tới khi chuyển lên tài khoản.
- **Firebase Auth đăng nhập Google.** `/api/analyze` kiểm Firebase ID token bằng `jose`, không cần service account.
- **Test chạy trên Firebase emulator.** Project id bắt đầu bằng `demo-` thì client tự nối vào emulator.

**Tech Stack:**
- Đang có: Next.js 16.4.6 (`cacheComponents`), React 19, Dexie 4, zod 4, Vitest 5, Playwright.
- Thêm: `firebase` 13.x, `jose` 6.x.
- Thêm cho dev: `firebase-tools` 15.x, `@firebase/rules-unit-testing` 6.x.

**Spec:** `docs/superpowers/specs/2026-11-17-mealmeal-sync-design.md` (ký hiệu "sync §5.4"). Đọc cùng spec v1 `docs/superpowers/specs/2026-11-17-mealmeal-design.md` ("v1 §…"). Spec quyết định hành vi; plan quyết định file, chữ ký hàm và test.

**Điều kiện trước:**
- Firebase emulator cần **Java 21 trở lên**. Máy hiện có Java 17: `firebase-tools` 15 báo "no longer supports Java version before 21".
- Chủ dự án cài trước Task 1: `sudo apt install -y openjdk-21-jre-headless`.
- Không cần project Firebase thật cho tới Task 9.

## Global Constraints

- Mọi dòng Global Constraints của plan v1 vẫn còn hiệu lực, trừ hai dòng sửa dưới đây.
- Biến `NEXT_PUBLIC_` duy nhất được phép:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
- Dexie `mealmeal` version 2, schema đúng như sync §5.3.
- Ảnh không bao giờ được ghi lên Firestore hay bất kỳ dịch vụ Firebase nào.
- Lưu, xóa, đổi mục tiêu không chờ server xác nhận (sync §5.2). Chỉ bước chuyển dữ liệu v1 (sync §5.4) là chờ.
- Không đọc toàn bộ collection `meals`. Mọi listener đều có điều kiện theo `date` hoặc theo id.
- Chỉ đụng tới Firebase trong trình duyệt. Module Firebase khởi tạo lười, gọi lúc render phía server thì báo lỗi.
- Log server không có uid, email, ảnh hay mô tả.
- Mỗi task kết thúc bằng `npm run typecheck && npm run lint && npm test` đều qua, rồi commit. Task nào đụng rules hoặc e2e thì chạy thêm `npm run test:rules` hoặc `npm run e2e`.

## Review Focus

1. **Bấm Lưu khi mất mạng:** chuyển màn hình ngay, không treo. → Task 8, e2e "offline save".
2. **Người thứ hai đăng nhập trên máy đã chuyển dữ liệu v1:** không nhận dữ liệu của người đầu. → Task 6 (`runMigration` xóa bản gốc) và e2e ở Task 8.
3. **Chuyển dữ liệu lỗi giữa chừng:** không xóa gì, thử lại được. → Task 6, test "commit fails".
4. **Đường tắt token của emulator lọt lên production:** token không ký bị từ chối khi không có `FIREBASE_AUTH_EMULATOR_HOST`. → Task 2.
5. **Trường `photo`, hoặc giá trị `undefined`, lọt vào document Firestore:** converter bỏ chúng đi và rules từ chối. → Task 1 (rules) và Task 5 (converter).

## Bản đồ file

| File | Việc |
|---|---|
| `src/lib/firebase.ts` (mới) | Khởi tạo lười app, auth và Firestore; nối emulator. |
| `firestore.rules`, `firebase.json` (mới) | Rules (sync §5.5) và cấu hình emulator. |
| `tests-rules/rules.test.ts`, `vitest.rules.config.ts` (mới) | Test rules trên emulator. |
| `src/lib/server/auth.ts` (mới) | `verifyIdToken`. |
| `src/app/api/analyze/route.ts` (sửa) | Thêm 401 và đổi khóa giới hạn sang uid. |
| `src/lib/api-client.ts` (sửa) | Gửi token, thử lại một lần khi gặp 401. |
| `src/lib/local-db.ts` (mới, thay `db.ts`) | Dexie v2: ảnh và dữ liệu v1. |
| `src/lib/store.ts` (mới) | Ghi Firestore và converter. |
| `src/lib/db-hooks.ts` (sửa) | Đọc Firestore bằng `onSnapshot`. |
| `src/lib/migrate.ts` (mới) | Chuyển dữ liệu v1. |
| `src/lib/sync-errors.ts` (mới) | Báo lỗi ghi cho giao diện. |
| `src/components/auth/*` (mới) | `AuthProvider`, `AppGate`, `SyncErrorBanner`. |
| `src/app/login/page.tsx` (mới) | Màn đăng nhập. |
| Các màn add, meal, settings, MealListItem, ShareSheet (sửa) | Lấy ảnh từ `local-db`, thêm phần tài khoản. |
| `src/lib/db.ts`, `GoalGate.tsx`, `tests/db.test.ts` | Xóa. |

---

### Task 1: Firebase client, emulator, rules

**Files:**
- Create:
  - `src/lib/firebase.ts`
  - `firebase.json`
  - `firestore.rules`
  - `vitest.rules.config.ts`
  - `tests-rules/rules.test.ts`
- Modify:
  - `package.json`
  - `.env.example`
  - `vitest.config.ts`, chỉ để chắc chắn `include` không lấy `tests-rules`.

**Interfaces:**
- Produces:
  - `getFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore }`
  - `firebaseProjectId(): string`
  - `isEmulator(): boolean`, đúng khi project id bắt đầu bằng `demo-`.

- [ ] **Step 1: Cài package.** Chạy `npm i firebase jose` và `npm i -D firebase-tools @firebase/rules-unit-testing`. Thêm hai script:
  - `"test:rules": "firebase emulators:exec --only firestore --project demo-mealmeal \"vitest run --config vitest.rules.config.ts\""`
  - `"emulators": "firebase emulators:start --only auth,firestore --project demo-mealmeal"`
- [ ] **Step 2: `firebase.json`.**
  - Emulator `auth` ở cổng 9099, `firestore` ở 8085, `ui` tắt (`enabled: false`).
  - `firestore.rules` là `"firestore.rules"`.
- [ ] **Step 3: Viết test rules trước** (`tests-rules/rules.test.ts`). Dùng `initializeTestEnvironment({ projectId: "demo-mealmeal", firestore: { rules: readFileSync("firestore.rules","utf8"), host: "127.0.0.1", port: 8085 } })`. Các ca:
  - `owner can write and read own meal`: alice ghi `users/alice/meals/m1` với bữa hợp lệ (`id: "m1"`, `date: "2026-11-17"`, `title: "Phở"`, `items: []`, `hasPhoto: false`…) → thành công, đọc lại được.
  - `other user cannot read or write`: bob đọc hoặc ghi `users/alice/...` → bị từ chối. Người chưa đăng nhập cũng bị từ chối.
  - `meal with photo field is rejected`: thêm `photo: "x"` → bị từ chối.
  - `meal id must match doc id`, `bad date rejected` (`"17/11/2026"`), `31 items rejected`, `title over 200 chars rejected`.
  - `goal targetKcal outside 800–6000 rejected` (799 và 6001), `goal doc id must equal effectiveFrom`.
  - `profile write ok, profile with photo rejected`.
  - `any other path denied`: `foo/bar`.
- [ ] **Step 4: Chạy `npm run test:rules`.** Kỳ vọng: FAIL, vì chưa có `firestore.rules`.
- [ ] **Step 5: Viết `firestore.rules`.**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function owner(uid) { return request.auth != null && request.auth.uid == uid; }
    function noPhoto() { return !('photo' in request.resource.data); }
    match /users/{uid} {
      allow read, delete: if owner(uid);
      allow create, update: if owner(uid) && noPhoto();
      match /meals/{mealId} {
        allow read, delete: if owner(uid);
        allow create, update: if owner(uid) && noPhoto() && validMeal(mealId, request.resource.data);
      }
      match /goals/{date} {
        allow read, delete: if owner(uid);
        allow create, update: if owner(uid) && validGoal(date, request.resource.data);
      }
    }
    function validMeal(id, d) {
      return d.id == id && d.date is string && d.date.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
        && d.title is string && d.title.size() <= 200 && d.items is list && d.items.size() <= 30
        && d.hasPhoto is bool;
    }
    function validGoal(date, d) {
      return d.effectiveFrom == date && d.targetKcal is number
        && d.targetKcal >= 800 && d.targetKcal <= 6000;
    }
  }
}
```

- [ ] **Step 6: Chạy `npm run test:rules`.** Kỳ vọng: PASS.
- [ ] **Step 7: Viết `src/lib/firebase.ts`.**
  - Đọc bốn biến `NEXT_PUBLIC_FIREBASE_*` bằng tên viết thẳng (`process.env.NEXT_PUBLIC_FIREBASE_API_KEY`), để Next nhúng được giá trị vào bundle.
  - `getFirebase()`:
    - Ném lỗi nếu `typeof window === "undefined"`.
    - Chỉ tạo một lần.
    - Firestore tạo bằng `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }), ignoreUndefinedProperties: true })`.
    - Khi `isEmulator()` thì gọi `connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true })` và `connectFirestoreEmulator(db, "127.0.0.1", 8085)`.
  - Kiểm tên API ở tài liệu `firebase` 13 bản hiện hành.
  - Thêm bốn biến vào `.env.example`, kèm chú thích "công khai, không phải bí mật".
- [ ] **Step 8: Chạy gate và commit.** Chạy `npm run typecheck && npm run lint && npm test && npm run test:rules`. Commit `feat: add Firebase client setup and Firestore security rules`.

### Task 2: Kiểm ID token ở server, `/api/analyze` bắt buộc đăng nhập

**Files:**
- Create:
  - `src/lib/server/auth.ts`
  - `tests/auth.test.ts`
- Modify:
  - `src/lib/types.ts`: thêm `"UNAUTHENTICATED"` vào `ApiErrorCode`.
  - `src/lib/server/analyze.ts`: `ERROR_STATUS.UNAUTHENTICATED = 401`.
  - `src/app/api/analyze/route.ts`
  - `tests/route.test.ts`

**Interfaces:**
- Produces:
  - `verifyIdToken(token: string, opts?: { projectId?: string; jwks?: JWTVerifyGetKey; emulator?: boolean }): Promise<{ uid: string }>`. Ném `AnalyzeError("UNAUTHENTICATED")` khi token sai.
  - Route đọc header `Authorization: Bearer <token>`.

- [ ] **Step 1: Viết test trước** (`tests/auth.test.ts`).
  - Dùng `generateKeyPair("RS256")`, `createLocalJWKSet`, `SignJWT` của `jose`, ký với `kid: "k1"`, `aud: "demo-p"`, `iss: "https://securetoken.google.com/demo-p"`, `sub: "u1"`.
  - Các ca:
    - token hợp lệ → `{ uid: "u1" }`;
    - sai `aud`, sai `iss`, hết hạn, `sub` rỗng, chữ ký từ khóa khác → `UNAUTHENTICATED`;
    - `unsigned token rejected unless emulator`: token `alg: "none"` → bị từ chối khi `emulator` là false, nhận khi `emulator` là true và project là `demo-p`, bị từ chối khi `emulator` là true nhưng project không bắt đầu bằng `demo-`.
- [ ] **Step 2: Chạy `npx vitest run tests/auth.test.ts`.** Kỳ vọng: FAIL, vì chưa có module.
- [ ] **Step 3: Viết `auth.ts`.**
  - JWKS mặc định là `createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"))`, tạo một lần.
  - `jwtVerify(token, jwks, { algorithms: ["RS256"], audience: projectId, issuer })`.
  - Mặc định `emulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST`.
  - Chế độ emulator chỉ nhận token không ký khi `projectId` bắt đầu bằng `demo-`. Khi đó dùng `decodeJwt` rồi tự kiểm `aud`, `iss`, `sub`.
  - Mặc định `projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID`. Không có thì mọi token đều bị từ chối.
- [ ] **Step 4: Chạy lại test.** Kỳ vọng: PASS.
- [ ] **Step 5: Thêm test vào `tests/route.test.ts`.**
  - Mock `@/lib/server/auth` để `verifyIdToken` trả `{ uid: "u1" }` với token `"good"`, còn lại ném `UNAUTHENTICATED`.
  - Các ca:
    - `401 without Authorization`: model và rate limit đều không được gọi; thông báo tiếng Việt "Phiên đăng nhập đã hết. Hãy đăng nhập lại.";
    - `401 with bad token`;
    - `rate limit keyed by uid`: `check` được gọi với `"uid:u1"`.
  - Sửa các test cũ để gửi `authorization: "Bearer good"`.
- [ ] **Step 6: Sửa route.**
  - Kiểm token trước rate limit và trước khi đọc body.
  - Bỏ `clientKey` theo IP; khóa giới hạn là `` `uid:${uid}` ``.
  - Thêm `UNAUTHENTICATED` vào `ERROR_MESSAGE`. Log vẫn là `analyze <code> <ms>`.
- [ ] **Step 7: Chạy gate và commit.** Commit `feat: require a Firebase ID token for meal analysis`.

### Task 3: Client gửi token và thử lại khi gặp 401

**Files:**
- Modify:
  - `src/lib/api-client.ts`
  - `tests/api-client.test.ts`

**Interfaces:**
- Consumes: mã lỗi `UNAUTHENTICATED` từ Task 2.
- Produces: `analyze(req, signal?, getToken?: (forceRefresh: boolean) => Promise<string | null>)`.
  - Mặc định `getToken` lấy `getFirebase().auth.currentUser?.getIdToken(force) ?? null`, import lười để test không cần Firebase.

- [ ] **Step 1: Viết test trước.**
  - `sends bearer token`: header `authorization` là `"Bearer t0"`.
  - `401 then refresh once`: lần đầu 401, `getToken(true)` trả `"t1"`, lần sau 200 → có kết quả; `fetch` được gọi đúng 2 lần.
  - `401 twice → UNAUTHENTICATED`, message "Phiên đăng nhập đã hết. Hãy đăng nhập lại.".
  - `no token → UNAUTHENTICATED without fetch`.
- [ ] **Step 2: Chạy test.** Kỳ vọng: FAIL.
- [ ] **Step 3: Sửa code.** Thêm vào `API_CODES` và `ERROR_MESSAGE`. Hủy (abort) trong lúc thử lại vẫn là `ABORTED`.
- [ ] **Step 4: Chạy test.** Kỳ vọng: PASS.
- [ ] **Step 5: Chạy gate và commit.** Commit `feat: send the sign-in token with analysis requests`.

### Task 4: Dexie version 2, ảnh tách riêng

**Files:**
- Create:
  - `src/lib/local-db.ts`
  - `tests/local-db.test.ts`
- Delete (Task 8 mới xóa thật, khi không còn chỗ nào import): `src/lib/db.ts`, `tests/db.test.ts`.
- Modify: `src/lib/types.ts`
  - Thêm `LegacyMeal` (là `Meal` v1, có `photo?: Blob`) và `LegacyGoal` (có `id?: number`).
  - `Meal`: bỏ `photo`, thêm `hasPhoto: boolean`.
  - `Goal`: bỏ `id`.

**Interfaces:**
- Produces:
  - `localDb`: Dexie v2.
  - `getPhoto(mealId): Promise<Blob | undefined>`
  - `putPhoto(mealId, blob): Promise<void>`
  - `deletePhoto(mealId): Promise<void>`
  - `usePhoto(mealId: string | null): Blob | null | undefined` (`useLiveQuery`)
  - `readLegacy(): Promise<{ meals: LegacyMeal[]; profile?: Profile; goals: LegacyGoal[] }>`
  - `clearLegacy(): Promise<void>` (xóa `meals`, `profile`, `goals`; giữ `photos`)
  - `requestPersistentStorage()` chuyển từ `db.ts` sang.

- [ ] **Step 1: Viết test trước** (dùng `fake-indexeddb/auto`).
  - `upgrade copies v1 photos`:
    - mở `new Dexie("mealmeal")` version 1 với schema v1;
    - thêm bữa `a` có `photo: new Blob(["x"])` và bữa `b` không có ảnh;
    - đóng database rồi mở `localDb`.
    - Kỳ vọng: `getPhoto("a")` có blob, `getPhoto("b")` là `undefined`, `readLegacy().meals` có 2 bữa.
  - `clearLegacy keeps photos`.
  - `put/get/delete photo`.
- [ ] **Step 2: Chạy test.** Kỳ vọng: FAIL.
- [ ] **Step 3: Viết `local-db.ts`.**
  - Khai báo `version(1)` y như cũ.
  - `version(2).stores({...sync §5.3}).upgrade(tx => …)` chép `photo` sang `photos`.
  - Không gọi `open()` ở cấp module.
- [ ] **Step 4: Chạy test.** Kỳ vọng: PASS.
- [ ] **Step 5: Commit.** Lúc này typecheck đỏ ở các chỗ còn dùng `meal.photo`. Task này chỉ cần `npx vitest run tests/local-db.test.ts` qua. Ghi ruling vào ledger và commit `feat: move photos to their own local table (Dexie v2)`. Cả gate phải xanh lại ở cuối Task 8.

### Task 5: Lớp dữ liệu Firestore

**Files:**
- Create:
  - `src/lib/store.ts`
  - `src/lib/sync-errors.ts`
  - `tests/store.test.ts`
- Modify: `src/lib/db-hooks.ts`

**Interfaces:**
- Consumes: `getFirebase()` từ Task 1; `Meal` và `Goal` mới từ Task 4.
- Produces:
  - `toMealDoc(meal: Meal): Record<string, unknown>`: bỏ mọi khóa có giá trị `undefined`, không có `photo`, cập nhật `updatedAt`.
  - `toGoalDoc(goal)`, `toProfileDoc(profile)`: tương tự.
  - `saveMeal(meal: Meal): void`: không async, không chờ server.
  - `deleteMeal(id: string): void`
  - `saveProfileAndGoal(profile, goal): void`: dùng `writeBatch`, `goals/{effectiveFrom}`.
  - Mọi hàm ghi lấy uid từ `getFirebase().auth.currentUser`; chưa đăng nhập thì ném lỗi.
  - `onSyncError(listener: (message: string) => void): () => void` và `reportSyncError(err)` (trong `sync-errors.ts`). Message: "Không đồng bộ được thay đổi. Hãy thử lại."
  - Hook giữ tên và kiểu như cũ: `useMealsByDate`, `useMealsInRange`, `useMeal`, `useGoals`, `useProfile`. Thêm `useHasGoal(): boolean | undefined`.
    - Dùng `onSnapshot` và `query(where("date", ">=", from), where("date", "<=", to))`.
    - Sắp xếp phía client như `byTime` v1.
    - Đổi tham số thì hủy listener.
    - Listener lỗi thì gọi `reportSyncError`, rồi trả mảng rỗng hoặc `null`.

- [ ] **Step 1: Viết test trước** (`tests/store.test.ts`, chỉ test hàm thuần).
  - `toMealDoc drops undefined and photo`: bữa có `description: undefined` và có thêm khóa `photo` (ép kiểu) → kết quả không có hai khóa đó, có `hasPhoto`.
  - `toMealDoc bumps updatedAt keeps createdAt`.
  - `sync errors reach listeners and unsubscribe works`.
- [ ] **Step 2: Chạy test.** Kỳ vọng: FAIL.
- [ ] **Step 3: Viết `store.ts`, `sync-errors.ts` và hook.** Mỗi lệnh ghi có dạng `setDoc(...).catch(reportSyncError)`, không `await`. Firestore đã áp thay đổi vào bộ nhớ cục bộ ngay, nên listener thấy bản mới tức thì.
- [ ] **Step 4: Chạy test.** Kỳ vọng: PASS. Commit `feat: add Firestore data layer and live hooks`.

### Task 6: Chuyển dữ liệu v1 lên tài khoản

**Files:**
- Create:
  - `src/lib/migrate.ts`
  - `tests/migrate.test.ts`

**Interfaces:**
- Consumes: `readLegacy` và `clearLegacy` (Task 4); các converter (Task 5).
- Produces:
  - `planMigration(legacy, remote: { hasProfile: boolean; goalDates: Set<string>; mealUpdatedAt: Map<string, string> }): { meals: Meal[]; goals: Goal[]; profile?: Profile }`. Hàm thuần.
    - Bữa nào đã có trên tài khoản với `updatedAt` mới hơn hoặc bằng thì bỏ qua.
    - `hasPhoto` của bữa = bữa v1 có `photo`.
    - Mục tiêu nào trùng ngày đã có thì bỏ qua.
    - Hồ sơ chỉ chuyển khi tài khoản chưa có.
  - `runMigration(deps?: { read; clear; fetchRemote; commit }): Promise<void>`. Các `deps` mặc định là Dexie và Firestore thật.
    - `commit` chia batch, mỗi batch tối đa 500 thao tác, và **chờ** từng batch.
    - Chỉ gọi `clear()` khi mọi batch đều xong.
  - `hasLegacyData(): Promise<boolean>`

- [ ] **Step 1: Viết test trước.**
  - `planMigration`:
    - bữa trên tài khoản mới hơn → bỏ qua;
    - bữa trên tài khoản cũ hơn → ghi đè;
    - mục tiêu trùng ngày → bỏ qua;
    - hồ sơ đã có → bỏ qua;
    - `hasPhoto` đúng.
  - `runMigration commits then clears`: `clear` chạy sau `commit`.
  - `commit fails → no clear and rejects`.
  - `1.201 meals → 3 batches`, kiểm qua `commit` giả.
- [ ] **Step 2: Chạy test.** Kỳ vọng: FAIL.
- [ ] **Step 3: Viết code.** `fetchRemote` mặc định dùng `getDoc(users/uid)`, `getDocs(goals)` và `getDocs(where(documentId(), "in", chunk))` theo từng nhóm 30 id để chỉ đọc các bữa cần so. Đọc phải từ server (`getDocsFromServer`), lỗi mạng thì reject.
- [ ] **Step 4: Chạy test.** Kỳ vọng: PASS. Commit `feat: move local v1 data into the signed-in account`.

### Task 7: Đăng nhập, cổng vào app, `/login`

**Files:**
- Create:
  - `src/components/auth/AuthProvider.tsx`
  - `src/components/auth/AppGate.tsx`
  - `src/components/auth/SyncErrorBanner.tsx`
  - `src/app/login/page.tsx`
  - `src/lib/auth-client.ts`
- Modify:
  - `src/app/layout.tsx`: bọc `AuthProvider` và `AppGate`, bỏ `GoalGate`.
  - `next.config.ts`
- Delete: `src/components/goal/GoalGate.tsx`

**Interfaces:**
- Produces:
  - `useAuth(): { user: User | null | undefined }` (`undefined` = chưa biết).
  - `signInWithGoogle(): Promise<void>`: dùng popup. `auth/popup-blocked` thì chuyển sang redirect. `auth/popup-closed-by-user` và `auth/cancelled-popup-request` thì không làm gì. Lỗi khác ném ra để màn hình báo.
  - `signOutAndClear(): Promise<void>`: `signOut`, `terminate`, `clearIndexedDbPersistence`, rồi `window.location.assign("/login")`.
  - `hasPendingWrites(timeoutMs = 3000): Promise<boolean>`: chạy đua giữa `waitForPendingWrites` và hẹn giờ.

- [ ] **Step 1: Viết `AppGate`** theo đúng thứ tự sync §6.2:
  1. Đang xác định trạng thái đăng nhập: hiện màn trống.
  2. Chưa đăng nhập và không ở `/login`: `replace("/login")`.
  3. Đã đăng nhập mà đang ở `/login`: về `/`.
  4. `hasLegacyData()` đúng: hiện màn chuyển dữ liệu, chạy `runMigration`. Lỗi thì hiện thông báo của sync §5.4 kèm nút "Thử lại".
  5. Chưa có mục tiêu (`useHasGoal`): `/onboarding`, giữ nguyên hành vi `GoalGate` v1.

  Thông báo "Trình duyệt đang chặn lưu dữ liệu" của v1 vẫn giữ cho trường hợp Dexie lỗi.
- [ ] **Step 2: Viết `/login`.**
  - Gồm tên app, câu "Đăng nhập để dùng MealMeal trên mọi thiết bị.", và nút "Đăng nhập bằng Google" (cao ít nhất 44px).
  - Đang đăng nhập thì nút bị khóa.
  - Lỗi thì hiện `ErrorNote` "Đăng nhập không thành công. Hãy thử lại."
- [ ] **Step 3: Rewrite và cấu hình.**
  - Trong `next.config.ts`, thêm `rewrites()`: `/__/auth/:path*` → `` `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com/__/auth/:path*` ``. Chỉ thêm khi có project id và không phải `demo-`.
  - Đọc `node_modules/next/dist/docs/` mục rewrites trước khi viết.
  - `SyncErrorBanner` nghe `onSyncError` và hiện `ErrorNote` 5 giây ở đầu màn hình.
- [ ] **Step 4: Chạy gate.** Commit chung với Task 8, vì typecheck chỉ xanh lại khi các màn hình đã đổi xong. Ghi ruling vào ledger.

### Task 8: Các màn hình dùng dữ liệu mới, và e2e trên emulator

**Files:**
- Modify:
  - `src/app/add/page.tsx`: `putPhoto(id, blob)` rồi `saveMeal({...meal, hasPhoto: !!photo})` và `router.push` ngay, không await server. Lỗi ghi ảnh cục bộ vẫn báo như v1.
  - `src/app/meal/page.tsx`: ảnh từ `usePhoto(meal.id)`. `hasPhoto` đúng mà không có ảnh thì hiện dòng "Ảnh chỉ có trên thiết bị đã chụp." (chữ nhỏ, muted). Xóa bữa thì gọi `deleteMeal` và `deletePhoto`.
  - `src/components/meal/MealListItem.tsx`: dùng `usePhoto`.
  - `src/components/share/ShareSheet.tsx`: nhận blob từ `usePhoto(meal.id)`.
  - `src/app/settings/page.tsx`: thêm mục tài khoản (ảnh đại diện, email) và nút "Đăng xuất" theo đúng hai hộp thoại ở sync §6.3.
  - `src/app/onboarding/page.tsx`, `GoalForm`: dùng `saveProfileAndGoal` mới, không await.
  - `playwright.config.ts`, `e2e/main-flow.spec.ts`
- Create:
  - `e2e/helpers.ts`
  - `e2e/sync.spec.ts`
- Delete:
  - `src/lib/db.ts`
  - `tests/db.test.ts`
  - `src/components/goal/GoalGate.tsx`

**Interfaces:**
- Produces: `signIn(page: Page, email: string): Promise<void>` trong `e2e/helpers.ts`.
  - Bấm "Đăng nhập bằng Google" và bắt `popup`.
  - Trong trang tài khoản giả của Auth emulator: "Add new account", điền email, rồi đăng nhập.
  - Dùng cùng email thì cùng uid.

- [ ] **Step 1: Cấu hình Playwright.** `webServer` thành mảng hai phần tử:
  - `npm run emulators`, chờ `http://127.0.0.1:8085`;
  - app: `npm run build && npm run start -- -p 3100`, với `env`:
    - `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-mealmeal`
    - `NEXT_PUBLIC_FIREBASE_API_KEY=demo-key`
    - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=127.0.0.1`
    - `NEXT_PUBLIC_FIREBASE_APP_ID=demo-app`
    - `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`

  Biến trong process ghi đè `.env.local`. Mỗi test dùng một email riêng để dữ liệu không lẫn nhau.
- [ ] **Step 2: Viết e2e mới trước** (`e2e/sync.spec.ts`).
  - `two devices see each other's changes`:
    - hai `browser.newContext()` cùng một email;
    - context 1 thêm bữa, context 2 thấy bữa đó trong 5 giây mà không reload;
    - context 2 xóa bữa, context 1 thấy bữa biến mất.
  - `another account sees nothing`: email khác → onboarding, không có bữa nào.
  - `offline save`:
    - `context.setOffline(true)`, thêm bữa (route `/api/analyze` được giả trả kết quả), bấm Lưu → về trang chính trong 2 giây và thấy bữa;
    - `setOffline(false)`, context thứ hai cùng email thấy bữa.
  - `v1 data moves on first sign-in and only once`:
    - trước khi đăng nhập, dùng `page.evaluate` tạo Dexie v1 có một bữa kèm ảnh và một mục tiêu;
    - đăng nhập A → thấy bữa và ảnh;
    - đăng xuất, đăng nhập B trên cùng context → không có bữa, vào onboarding.
  - `photo stays on its device`: context 1 thêm bữa có ảnh; context 2 mở bữa đó → thấy dòng "Ảnh chỉ có trên thiết bị đã chụp.", không có thẻ img ảnh bữa.
  - `sign out returns to login and clears`: đăng xuất → `/login`; mở `/` → về `/login`.
- [ ] **Step 3: Sửa `main-flow.spec.ts`** để gọi `signIn(page, email)` trước `onboard`. Các assertion cũ giữ nguyên.
- [ ] **Step 4: Chạy `npm run e2e`.** Kỳ vọng: test mới FAIL cho tới khi các màn hình đổi xong.
- [ ] **Step 5: Đổi các màn hình** như phần Files ở trên. Xóa `db.ts`, `tests/db.test.ts`, `GoalGate.tsx`.
- [ ] **Step 6: Chạy toàn bộ.** `npm run typecheck && npm run lint && npm test && npm run test:rules && npm run e2e`. Kỳ vọng: tất cả PASS, không có lỗi console trong e2e.
- [ ] **Step 7: Commit** `feat: sign in with Google and sync meals across devices`. Commit này gồm cả Task 7.

### Task 9: Tài liệu và production

**Files:**
- Modify:
  - `AGENTS.md`: sửa quy tắc `NEXT_PUBLIC_` và Dexie version như Global Constraints; thêm "Ảnh không bao giờ lên Firebase"; thêm `npm run test:rules` vào phần Lệnh.
  - `README.md`: "Dữ liệu nằm ở đâu"; bảng biến môi trường; các bước Firebase console (sync §9); Java 21 cho emulator.
  - `docs/superpowers/acceptance-report.md`: bỏ dòng cảnh báo `http://` đã lỗi thời.

- [ ] **Step 1: Sửa tài liệu.** Chạy gate, commit `docs: document sign-in, sync and Firebase setup`.
- [ ] **Step 2: Dừng và hỏi chủ dự án.** Cần 4 giá trị cấu hình web Firebase, và xác nhận đã làm các bước ở sync §9.
- [ ] **Step 3: Cấu hình.**
  - Ghi 4 biến vào `.env.local` và Vercel production (`vercel env add`).
  - Rules đã publish: chạy `firebase deploy --only firestore:rules` nếu chủ dự án đăng nhập CLI, còn không thì họ dán tay.
- [ ] **Step 4: Kiểm thử.**
  - Kiểm local với project thật: đăng nhập, thêm bữa, mở ở profile trình duyệt thứ hai.
- [ ] **Step 5: Dừng và hỏi trước khi merge, push và deploy.** Cùng lúc gửi chủ dự án danh sách tiêu chí cần tự kiểm trên điện thoại (sync §10, tiêu chí 13).
