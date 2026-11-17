import { devices, expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { PHOTO, addMeal, onboard, signIn, signOut, trackErrors, uniqueEmail } from "./helpers";

const opened: BrowserContext[] = [];
test.afterEach(async () => {
  await Promise.all(opened.splice(0).map((context) => context.close()));
});

/** A separate browser profile: its own IndexedDB, as a second phone would have. */
async function device(browser: Browser, baseURL: string | undefined): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ ...devices["Pixel 7"], baseURL });
  opened.push(context);
  return { context, page: await context.newPage() };
}

/** Signs in on a device whose account already has a goal; ends on home. */
async function signInExisting(page: Page, email: string) {
  await signIn(page, email);
  await expect(page).toHaveURL(/\/(\?.*)?$/);
}

test("two devices see each other's changes", async ({ browser, baseURL }) => {
  const email = uniqueEmail("two");
  const a = await device(browser, baseURL);
  const b = await device(browser, baseURL);
  const errorsA = trackErrors(a.page);
  const errorsB = trackErrors(b.page);

  await signIn(a.page, email);
  await onboard(a.page);
  await signInExisting(b.page, email);
  await expect(b.page.getByText("Chưa có bữa nào")).toBeVisible();

  await addMeal(a.page, "Bún chả");
  await expect(b.page.getByText("Bún chả")).toBeVisible({ timeout: 5_000 });

  await b.page.getByRole("link", { name: /Bún chả/ }).click();
  await b.page.getByRole("button", { name: "Xóa bữa ăn" }).click();
  await b.page.getByRole("dialog").getByRole("button", { name: "Xóa", exact: true }).click();
  await expect(b.page.getByText("Chưa có bữa nào")).toBeVisible();
  await expect(a.page.getByText("Bún chả")).toBeHidden({ timeout: 5_000 });

  expect([...errorsA, ...errorsB]).toEqual([]);
});

test("another account sees nothing", async ({ browser, baseURL }) => {
  const a = await device(browser, baseURL);
  await signIn(a.page, uniqueEmail("owner"));
  await onboard(a.page);
  await addMeal(a.page, "Cơm tấm");

  const b = await device(browser, baseURL);
  const errors = trackErrors(b.page);
  await signIn(b.page, uniqueEmail("stranger"));
  await expect(b.page).toHaveURL(/\/onboarding$/);
  await onboard(b.page);
  await expect(b.page.getByText("Chưa có bữa nào")).toBeVisible();
  await expect(b.page.getByText("Cơm tấm")).toHaveCount(0);

  expect(errors).toEqual([]);
});

test("offline save", async ({ browser, baseURL }) => {
  const email = uniqueEmail("offline");
  const a = await device(browser, baseURL);
  await signIn(a.page, email);
  await onboard(a.page);
  // Warm the add screen while online, as a person who used the app before would have it.
  await a.page.getByRole("link", { name: "Thêm bữa" }).click();
  await a.page.getByRole("link", { name: "Quay lại" }).click();
  await expect(a.page).toHaveURL(/\/(\?.*)?$/);

  await a.context.setOffline(true);
  await addMeal(a.page, "Bánh mì");
  await expect(a.page).toHaveURL(/\/\?d=/, { timeout: 2_000 });
  await expect(a.page.getByText("Bánh mì")).toBeVisible();

  await a.context.setOffline(false);
  const b = await device(browser, baseURL);
  await signInExisting(b.page, email);
  await expect(b.page.getByText("Bánh mì")).toBeVisible({ timeout: 10_000 });

});

test("v1 data moves on first sign-in and only once", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/login");
  // Write the database exactly as the v1 app left it (Dexie v1 = IndexedDB version 10).
  await page.evaluate(async (png) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const stamp = now.toISOString();
    const photo = new Blob([Uint8Array.from(atob(png), (c) => c.charCodeAt(0))], { type: "image/png" });
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("mealmeal", 10);
      open.onupgradeneeded = () => {
        const db = open.result;
        db.createObjectStore("meals", { keyPath: "id" }).createIndex("date", "date");
        db.createObjectStore("profile", { keyPath: "id" });
        db.createObjectStore("goals", { keyPath: "id", autoIncrement: true }).createIndex("effectiveFrom", "effectiveFrom");
      };
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction(["meals", "profile", "goals"], "readwrite");
        tx.objectStore("meals").put({
          id: "v1-meal", date: today, time: "12:00", title: "Phở bò cũ", source: "both", description: "phở",
          items: [{ id: "i1", name: "Phở bò", grams: 500, per100: { kcal: 90, carbs: 12, protein: 5, fat: 2, fiber: 0.2 } }],
          confidence: "medium", notes: "", photo, createdAt: stamp, updatedAt: stamp,
        });
        tx.objectStore("profile").put({ id: "me", sex: "male", age: 30, heightCm: 170, weightKg: 65, activity: "moderate", updatedAt: stamp });
        tx.objectStore("goals").add({ effectiveFrom: "2026-01-01", mode: "maintain", targetKcal: 2200, createdAt: stamp });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, PHOTO.buffer.toString("base64"));

  await signIn(page, uniqueEmail("v1-a"));
  await expect(page).toHaveURL(/\/(\?.*)?$/);
  const item = page.getByRole("link", { name: /Phở bò cũ/ });
  await expect(item).toBeVisible();
  await expect(item.locator("img")).toBeVisible();

  await signOut(page);
  await signIn(page, uniqueEmail("v1-b"));
  await expect(page).toHaveURL(/\/onboarding$/);
  await onboard(page);
  await expect(page.getByText("Chưa có bữa nào")).toBeVisible();

  expect(errors).toEqual([]);
});

test("photo stays on its device", async ({ browser, baseURL }) => {
  const email = uniqueEmail("photo");
  const a = await device(browser, baseURL);
  await signIn(a.page, email);
  await onboard(a.page);
  await addMeal(a.page, "Gỏi cuốn", { photo: true });
  await expect(a.page.getByRole("link", { name: /Gỏi cuốn/ }).locator("img")).toBeVisible();

  const b = await device(browser, baseURL);
  const errors = trackErrors(b.page);
  await signInExisting(b.page, email);
  const item = b.page.getByRole("link", { name: /Gỏi cuốn/ });
  await expect(item).toBeVisible();
  await expect(item.locator("img")).toHaveCount(0);
  await item.click();
  await expect(b.page.getByText("Ảnh chỉ có trên thiết bị đã chụp.")).toBeVisible();
  await expect(b.page.locator("main img")).toHaveCount(0);

  expect(errors).toEqual([]);
});

test("sign out returns to login and clears", async ({ page }) => {
  const errors = trackErrors(page);
  await signIn(page, uniqueEmail("out"));
  await onboard(page);
  await signOut(page);
  // The app itself sends a signed-out visitor back, so the first navigation is interrupted.
  await page.goto("/", { waitUntil: "commit" });
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Đăng nhập bằng Google" })).toBeVisible();
  expect(errors).toEqual([]);
});
