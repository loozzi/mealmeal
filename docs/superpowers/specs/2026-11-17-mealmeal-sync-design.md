# MealMeal: đăng nhập Google và đồng bộ nhiều thiết bị

- Ngày: 17/11/2026
- Trạng thái: chờ chủ dự án duyệt
- Dựa trên: `docs/superpowers/specs/2026-11-17-mealmeal-design.md` (spec v1). Spec này chỉ ghi những gì thay đổi so với v1. Phần nào không nhắc tới thì giữ nguyên như v1.

## 1. Mục đích

Ở v1, dữ liệu chỉ nằm trong trình duyệt của một máy. Chủ dự án muốn người dùng **đăng nhập rồi dùng ở thiết bị nào cũng xem và thêm được** thông tin của mình: hồ sơ, mục tiêu và bữa ăn. Chi phí là **0 đồng**: chỉ dùng gói free của Firebase (Spark) và Vercel (Hobby).

## 2. Mục tiêu, ngoài phạm vi, điều phải tránh

### 2.1 Mục tiêu

1. Đăng nhập bằng Google, và đây là cách đăng nhập duy nhất. **Phải đăng nhập mới dùng được app.**
2. Hồ sơ, lịch sử mục tiêu và bữa ăn đồng bộ giữa mọi thiết bị đăng nhập cùng tài khoản. Thay đổi trên máy này hiện ở máy kia trong vài giây khi cả hai đang online, không cần tải lại trang.
3. Không có mạng vẫn xem, thêm, sửa và xóa được (trừ bước phân tích AI, vốn cần mạng). Có mạng lại thì tự đồng bộ.
4. Lần đầu đăng nhập trên một máy đã dùng v1, dữ liệu có sẵn trong trình duyệt được đưa lên tài khoản, không mất gì.
5. Có đăng xuất. Sau khi đăng xuất, người khác dùng chung máy không thấy dữ liệu của mình.
6. `/api/analyze` chỉ phục vụ người đã đăng nhập.

### 2.2 Ngoài phạm vi

- **Ảnh không lên server**, kể cả Firebase Storage. Ảnh chỉ nằm trong trình duyệt của máy đã chụp.
- Tài khoản admin và trang quản trị.
- Đăng nhập bằng email/mật khẩu, Apple, Facebook.
- Xóa tài khoản trong app.
- Chia sẻ dữ liệu giữa các tài khoản.
- Chế độ dùng không đăng nhập.

### 2.3 Điều phải tránh

- Người này đọc hoặc ghi được dữ liệu của người khác. Việc này phải bị chặn bằng **Firestore Security Rules**, không chỉ ở giao diện.
- Ảnh hoặc mô tả bữa ăn bị gửi lên Firebase hoặc bị server lưu hay ghi log. Riêng mô tả chữ của bữa (`description`) **có** được đồng bộ, vì đó là dữ liệu của chính người dùng. Server phân tích vẫn không lưu hay ghi log mô tả.
- Mất dữ liệu v1 khi chuyển lên tài khoản, hoặc dữ liệu v1 của người A bị đẩy vào tài khoản của người B dùng chung máy.
- Bấm "Lưu bữa ăn" khi mất mạng mà app treo, quay mãi hoặc báo lỗi. Bản lưu cục bộ là đủ để coi như đã lưu.
- Vượt gói free do thiết kế đọc ghi phung phí, ví dụ tải lại toàn bộ bữa ăn mỗi lần mở trang.
- API key AI lộ ra trình duyệt.

## 3. Ràng buộc

- Mọi ràng buộc v1 vẫn còn hiệu lực (AGENTS.md), trừ hai chỗ sửa dưới đây.
- **Sửa quy tắc `NEXT_PUBLIC_`:** chỉ được phép dùng bốn biến cấu hình web Firebase ở mục 7. Chúng là định danh công khai: Firebase thiết kế để chúng nằm trong bundle, và bảo vệ dữ liệu bằng Security Rules. Mọi biến khác vẫn cấm tiền tố này. `OPENAI_API_KEY` vẫn chỉ ở server.
- **Sửa quy tắc Dexie "version 1":** database `mealmeal` lên version 2 như mục 5.3. Version 1 phải còn đọc được để chuyển dữ liệu.
- Firebase gói Spark:
  - Firestore: 1 GiB lưu trữ, 50.000 lượt đọc, 20.000 lượt ghi và 20.000 lượt xóa mỗi ngày.
  - Không cần thẻ thanh toán. Không dùng Cloud Functions, vì tính năng này đòi gói Blaze.
- Deploy vẫn trên Vercel, ở `mealmeal-app.vercel.app`.

## 4. Các hướng đã cân nhắc

| Hướng | Ưu | Nhược | Kết quả |
|---|---|---|---|
| **A. Firebase Auth + Firestore** | Firestore có sẵn bộ nhớ offline, hàng đợi ghi khi mất mạng và cập nhật realtime giữa các máy, nên gần như không phải tự viết phần đồng bộ. Gói free không bị tạm dừng. | Dữ liệu dạng document, không phải SQL. Làm admin sau này thì truy vấn kém linh hoạt hơn. | **Chọn.** Đúng nhu cầu đồng bộ nhiều máy và ít code nhất. |
| B. Supabase Auth + Postgres | SQL, dễ cho admin sau này. | Phải tự viết đồng bộ: hàng đợi offline, kéo thay đổi, xử lý bữa đã xóa. Project free bị tạm dừng sau 7 ngày không dùng. | Loại. |
| C. Firebase Auth + Supabase DB | | Như B, lại thêm việc nối hai dịch vụ. | Loại. |

Trong hướng A, **Firestore thay Dexie làm nơi chứa dữ liệu chính**. Dexie chỉ còn giữ ảnh và đọc dữ liệu v1 để chuyển lên tài khoản. Hướng "giữ Dexie làm chính rồi tự đồng bộ lên Firestore" bị loại vì lặp lại đúng phần khó của B.

## 5. Dữ liệu

### 5.1 Cấu trúc Firestore

```
users/{uid}                  hồ sơ (một document)
users/{uid}/goals/{date}     mỗi mục tiêu một document, id = effectiveFrom ("YYYY-MM-DD")
users/{uid}/meals/{mealId}   mỗi bữa một document, id = Meal.id (UUID như v1)
```

- **`users/{uid}`:** các trường của `Profile` v1 trừ `id`: `sex`, `age`, `heightCm`, `weightKg`, `bodyFatPct`, `activity`, `updatedAt`. Trường nào không có thì bỏ hẳn, không ghi `null`.
- **`goals/{date}`:** `effectiveFrom`, `mode`, `targetKcal`, `suggestedKcal?`, `createdAt`.
  - Lấy id document bằng ngày nên quy tắc v1 "cùng ngày thì thay, khác ngày thì thêm" trở thành một lệnh `setDoc`.
  - `Goal.id` kiểu số không còn dùng.
- **`meals/{id}`:** các trường của `Meal` v1 **trừ `photo`**, thêm `hasPhoto: boolean`.
  - `hasPhoto` cho máy khác biết bữa này từng có ảnh, để hiển thị đúng như mục 6.4.
  - Món ăn (`items`) nằm luôn trong document bữa, dạng mảng, như v1.
  - Tổng dinh dưỡng vẫn không lưu.

Kiểu TypeScript: `Meal.photo` bỏ khỏi `Meal`. Ảnh đi riêng (mục 5.3). `Goal.id` bỏ. Builder có thể tách kiểu "dữ liệu lưu" và "dữ liệu hiển thị" nếu thấy cần.

### 5.2 Firestore trên trình duyệt

- Bật bộ nhớ offline bền: `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })`. Kiểm tra tên API ở tài liệu bản hiện hành của SDK `firebase` (hiện là 13.x).
- **Đọc** bằng listener realtime (`onSnapshot`), giới hạn đúng phạm vi đang xem:
  - bữa của một ngày;
  - bữa trong khoảng ngày của lịch đang hiển thị (tuần hoặc tháng), lọc theo `date` (chuỗi `YYYY-MM-DD` so sánh được theo thứ tự);
  - một bữa theo id;
  - hồ sơ;
  - toàn bộ mục tiêu (rất ít).
  - Cấm tải toàn bộ bữa ăn.
- Listener phải thay thế được các hook trong `src/lib/db-hooks.ts`, giữ nguyên hình dạng: `undefined` khi đang tải, rồi ra dữ liệu. Nhờ vậy các màn hình gần như không đổi.
- **Ghi:** Firestore áp thay đổi vào bộ nhớ cục bộ ngay, còn promise của `setDoc`/`deleteDoc` chỉ xong khi server xác nhận. Vì vậy:
  - Lưu, xóa và đổi mục tiêu **không chờ** promise đó. Ghi xong cục bộ là chuyển màn hình luôn, như v1.
  - Promise lỗi (ví dụ bị Security Rules từ chối) thì hiện thông báo tiếng Việt "Không đồng bộ được thay đổi. Hãy thử lại." và ghi lỗi ra console. Không được làm sập trang.
- Hai máy sửa cùng một bữa: lần ghi đến server sau cùng thắng (hành vi mặc định của Firestore), trên cả document.
- Giờ `createdAt`/`updatedAt` vẫn là chuỗi ISO từ máy, như v1. Không cần `serverTimestamp`.

### 5.3 Dexie version 2

```
version(2).stores({
  meals: "id, date",       // giữ để đọc dữ liệu v1 khi chuyển; không ghi bữa mới vào đây
  profile: "id",
  goals: "++id, effectiveFrom",
  photos: "mealId",         // mới: { mealId: string, blob: Blob }
})
```

- Lúc nâng từ v1 lên v2 (`upgrade`), mọi `meals[].photo` được chép sang `photos` với `mealId` tương ứng. Bản ghi v1 giữ nguyên để bước chuyển dữ liệu (mục 5.4) đọc.
- Ảnh mới chỉ ghi vào `photos`. Xóa bữa thì xóa cả ảnh của bữa đó trên máy hiện tại.
- Ảnh gắn theo `mealId` (UUID), không theo tài khoản. Người khác đăng nhập trên cùng máy không bao giờ thấy ảnh này, vì họ không có bữa nào mang id đó.

### 5.4 Chuyển dữ liệu v1 lên tài khoản

Chạy ngay sau khi đăng nhập, trước khi vào trang chính, **khi trong Dexie còn bữa, hồ sơ hoặc mục tiêu v1**:

1. Hiện màn "Đang chuyển dữ liệu lên tài khoản…".
2. Đọc tài khoản trên server một lần để biết đã có hồ sơ và những mục tiêu nào.
3. Ghi lên tài khoản theo quy tắc sau, dùng `writeBatch` (tối đa 500 thao tác một batch; nhiều hơn thì chia batch):
   - Mỗi bữa ghi bằng id cũ. Nếu đã có bữa cùng id thì giữ bản có `updatedAt` mới hơn.
   - Mỗi mục tiêu chỉ ghi khi tài khoản chưa có mục tiêu cùng ngày.
   - Hồ sơ chỉ ghi khi tài khoản chưa có hồ sơ.
4. **Chờ server xác nhận.** Đây là chỗ duy nhất phải chờ server, vì bước sau xóa bản gốc.
   - Thành công: xóa bản ghi trong `meals`, `profile` và `goals` của Dexie, giữ `photos`.
   - Lỗi hoặc mất mạng: hiện "Chưa chuyển được dữ liệu. Hãy kiểm tra mạng và thử lại." kèm nút "Thử lại". Không xóa gì. Người dùng chưa vào được app cho đến khi chuyển xong, vì chuyển lỡ dở rồi xóa sẽ mất dữ liệu.

Chạy lại bước này nhiều lần vẫn cho cùng một kết quả, vì ghi theo id và có điều kiện. Xóa bản gốc ngay sau khi chuyển là để người thứ hai đăng nhập trên cùng máy không nhận nhầm dữ liệu v1 của người đầu.

### 5.5 Firestore Security Rules

File `firestore.rules` nằm ở gốc repo.

- Chỉ `request.auth.uid == uid` mới đọc và ghi được `users/{uid}` và mọi thứ bên dưới. Mọi đường dẫn khác bị chặn.
- Kiểm dữ liệu ghi ở mức vừa đủ để chặn rác:
  - bữa: `date` khớp `^\d{4}-\d{2}-\d{2}$`, `items` là list dài tối đa 30, `title` là chuỗi dài tối đa 200;
  - mục tiêu: `targetKcal` trong khoảng 800–6000;
  - không có trường `photo`.
- Có unit test cho rules bằng Firestore emulator (`@firebase/rules-unit-testing`) nếu máy chạy được emulator (cần Java). Không có thì builder ghi rõ là chưa test được, và chủ dự án kiểm bằng Rules Playground trên Firebase console.

## 6. Màn hình và luồng

### 6.1 Route

| Route | Mới/Đổi | Nội dung |
|---|---|---|
| `/login` | Mới | Tên app, một câu giới thiệu, nút "Đăng nhập bằng Google". |
| `/` `/add` `/meal` `/onboarding` `/settings` | Đổi | Thêm cổng đăng nhập (mục 6.2). |

### 6.2 Cổng đăng nhập

Thứ tự kiểm khi mở bất kỳ trang nào trừ `/login`:

1. Đang xác định trạng thái đăng nhập (`onAuthStateChanged` chưa trả lần đầu): hiện màn chờ trống như cổng mục tiêu v1. Không nháy sang `/login`.
2. Chưa đăng nhập: chuyển sang `/login`.
3. Đã đăng nhập và còn dữ liệu v1 cần chuyển: chạy mục 5.4.
4. Chưa có mục tiêu: chuyển sang `/onboarding`, như v1.
5. Vào trang.

Ở `/login`, nếu đã đăng nhập rồi thì chuyển về `/`. Cổng này thay hoặc bọc ngoài `GoalGate` hiện có. Mọi truy cập Firebase chỉ chạy ở trình duyệt, không chạy lúc render phía server.

### 6.3 Đăng nhập và đăng xuất

- **Đăng nhập:** dùng `signInWithPopup` với `GoogleAuthProvider`.
  - Người dùng đóng popup thì không báo lỗi.
  - Lỗi khác thì hiện "Đăng nhập không thành công. Hãy thử lại."
  - Popup bị chặn (`auth/popup-blocked`) thì chuyển sang `signInWithRedirect`.
- **Để redirect chạy được trên Safari** (Safari chặn bộ nhớ bên thứ ba):
  - `authDomain` là domain của chính app.
  - `next.config` thêm rewrite `/__/auth/:path*` → `https://<projectId>.firebaseapp.com/__/auth/:path*`. Đây là cách "proxy auth requests" trong tài liệu Firebase "redirect best practices"; kiểm lại tài liệu bản hiện hành.
- **Settings** thêm một mục: email và ảnh đại diện Google của tài khoản đang đăng nhập, cùng nút "Đăng xuất".
- **Khi bấm Đăng xuất:**
  1. Hỏi "Đăng xuất khỏi tài khoản này? Dữ liệu vẫn được lưu trên tài khoản." với hai nút Hủy và Đăng xuất.
  2. Nếu còn thay đổi chưa lên server (`waitForPendingWrites` chưa xong sau 3 giây), hỏi thêm "Còn thay đổi chưa đồng bộ. Đăng xuất bây giờ sẽ mất các thay đổi này." với hai nút Hủy và Vẫn đăng xuất.
  3. Gọi `signOut`, rồi `terminate` và `clearIndexedDbPersistence` để xóa bản sao dữ liệu Firestore trên máy.
  4. Chuyển sang `/login`. Ảnh trong Dexie vẫn giữ lại.

### 6.4 Bữa không có ảnh trên máy này

Bữa có `hasPhoto: true` nhưng máy hiện tại không có ảnh trong `photos`:

- Trang chính hiện ô ảnh nhỏ như bữa nhập bằng chữ ở v1.
- Trang chi tiết không hiện ô ảnh và có một dòng chữ nhỏ màu muted: "Ảnh chỉ có trên thiết bị đã chụp."
- Card chia sẻ dùng bố cục không ảnh (nền gradient), như v1.

Bữa sửa trên máy không có ảnh vẫn giữ `hasPhoto: true`.

### 6.5 Lỗi đồng bộ và mất mạng

- Không có chỉ báo online/offline thường trực. Giữ giao diện gọn như v1.
- Lỗi ghi: thông báo như mục 5.2.
- Phân tích AI khi mất mạng: giữ như v1 ("Không có kết nối mạng.").

## 7. Biến môi trường

| Biến | Nơi dùng | Ghi chú |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | trình duyệt | Cấu hình web Firebase, công khai. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | trình duyệt | Domain của app (mục 6.3). Local dùng `<projectId>.firebaseapp.com`. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | trình duyệt và server | Server dùng để kiểm `aud` và `iss` của token. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | trình duyệt | |

Các biến AI và Upstash giữ như v1. Không cần service account: server kiểm token mà không dùng Firebase Admin SDK.

## 8. API phân tích

- Client gửi kèm header `Authorization: Bearer <Firebase ID token>`, lấy bằng `user.getIdToken()` (SDK tự làm mới token).
- Server kiểm token trước mọi việc khác, kể cả trước khi đọc body:
  - Dùng thư viện `jose`: `createRemoteJWKSet` với `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com` (bản JWK của bộ khóa công khai Firebase).
  - Kiểm `alg` là RS256, `aud` là projectId, `iss` là `https://securetoken.google.com/<projectId>`, `sub` không rỗng, `exp` và `iat` hợp lệ.
  - Token thiếu hoặc sai: trả `401` với mã lỗi mới `UNAUTHENTICATED`, không gọi model.
- Client nhận `UNAUTHENTICATED` thì làm mới token và thử lại đúng một lần. Vẫn lỗi thì hiện "Phiên đăng nhập đã hết. Hãy đăng nhập lại." và giữ ảnh cùng mô tả như các lỗi khác.
- Giới hạn lượt gọi tính theo **uid** thay vì IP, giữ con số v1: 10 lượt/phút và 60 lượt/ngày.
- Log server vẫn chỉ có mã kết quả và thời gian. Không ghi uid, email, ảnh hay mô tả.

## 9. Việc chủ dự án làm trên Firebase console

Builder ghi các bước này vào README. Chủ dự án tự làm vì cần đăng nhập tài khoản Google của họ:

1. Tạo project Firebase, không cần bật Google Analytics.
2. Authentication → Sign-in method → bật Google.
3. Authentication → Settings → Authorized domains: thêm `mealmeal-app.vercel.app`, và nếu cần thì thêm domain tunnel review.
4. Firestore Database → tạo database ở chế độ production, vùng `asia-southeast1`.
5. Dán `firestore.rules` vào tab Rules rồi Publish. Có Firebase CLI thì chạy `firebase deploy --only firestore:rules`.
6. Project settings → thêm Web app, lấy 4 giá trị cấu hình ở mục 7.
7. Nếu dùng redirect qua domain riêng: trong Google Cloud console → OAuth client của project, thêm `https://mealmeal-app.vercel.app/__/auth/handler` vào Authorized redirect URIs.

## 10. Tiêu chí nghiệm thu

1. Chưa đăng nhập: mở bất kỳ trang nào cũng về `/login`. Đăng nhập Google xong: người mới thì vào onboarding, người cũ thì vào trang chính.
2. Hai trình duyệt (hoặc hai profile) cùng một tài khoản:
   - thêm bữa ở máy 1, máy 2 thấy bữa đó trong ≤ 5 giây mà không cần tải lại trang;
   - sửa hoặc xóa ở máy 2 thì máy 1 cập nhật theo;
   - đổi mục tiêu cũng đồng bộ.
3. Tài khoản khác: không thấy dữ liệu của tài khoản đầu. Gọi Firestore trực tiếp vào `users/<uid khác>` bị từ chối.
4. Mất mạng (DevTools offline): thêm, sửa, xóa vẫn chạy, nút Lưu không treo. Có mạng lại thì máy kia nhận được.
5. Tải lại trang khi đang offline: vẫn thấy dữ liệu đã đồng bộ trước đó.
6. Máy có dữ liệu v1 (có ảnh), đăng nhập lần đầu:
   - toàn bộ bữa, mục tiêu và hồ sơ lên tài khoản;
   - ảnh vẫn hiện trên máy đó;
   - bản ghi v1 trong Dexie bị xóa, `photos` còn.
   - Mất mạng giữa chừng thì không mất gì và thử lại được.
7. Đăng nhập tài khoản B sau khi A đã chuyển dữ liệu v1 trên cùng máy: B không nhận dữ liệu của A.
8. Bữa có ảnh, mở ở máy khác: không có ảnh, có dòng "Ảnh chỉ có trên thiết bị đã chụp.", card chia sẻ dùng nền gradient.
9. Đăng xuất: về `/login`. IndexedDB của Firestore trên máy bị xóa. Đăng nhập lại thì dữ liệu trở lại, và ảnh trên máy này cũng hiện lại.
10. `/api/analyze`:
    - không có token hoặc token giả → 401 `UNAUTHENTICATED`, model không được gọi;
    - token thật → chạy như v1;
    - giới hạn đếm theo uid.
11. Bundle không chứa `OPENAI_API_KEY`. Các biến `NEXT_PUBLIC_` duy nhất là bốn biến Firebase ở mục 7.
12. Mọi tiêu chí v1 không liên quan tới nơi lưu dữ liệu vẫn đạt. `npm run typecheck && npm run lint && npm test && npm run build && npm run e2e` đều qua.
13. Đăng nhập chạy được trên Safari iOS (cả khi đã thêm vào màn hình chính) và Chrome Android. Tiêu chí này cần điện thoại thật, chủ dự án tự kiểm.

## 11. Kiểm thử

- **Unit test:**
  - kiểm token (dùng khóa tự sinh và JWKS giả);
  - route trả 401 khi không có token;
  - quy tắc gộp của bước chuyển dữ liệu (mục 5.4) với kho dữ liệu giả;
  - nâng Dexie v1 → v2 chép ảnh đúng (dùng `fake-indexeddb` như v1).
- **Rules test:** dùng emulator như mục 5.5.
- **E2e:** chạy với Firebase Auth emulator và Firestore emulator nếu máy có Java. Nếu không có, builder chọn cách thay lớp dữ liệu bằng bản giả trong e2e, ghi lại lựa chọn đó, và để tiêu chí 2–9 cho lượt kiểm thủ công với project Firebase thật.

## 12. Phần để builder tự quyết

- Cách tổ chức file của lớp dữ liệu, miễn các màn hình gọi qua một chỗ như `src/lib/db.ts` và `db-hooks.ts` hiện tại.
- Giao diện `/login` theo định hướng giao diện v1 (mục 6.8 spec v1).
- Dùng emulator hay lớp dữ liệu giả cho e2e (mục 11).
- Cách gộp listener cho lịch tuần/tháng, miễn không đọc toàn bộ bữa.

## 13. Thay đổi tài liệu đi kèm

- **AGENTS.md:** sửa hai quy tắc ở mục 3, thêm quy tắc "Ảnh không bao giờ lên Firebase".
- **README:**
  - thay mục "Dữ liệu nằm ở đâu";
  - thêm các bước Firebase ở mục 9;
  - thêm biến môi trường mới.
