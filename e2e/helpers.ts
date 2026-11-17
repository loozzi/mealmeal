import { expect, type Page } from "@playwright/test";

export const ANALYSIS = {
  result: {
    title: "Cơm gà áp chảo",
    confidence: "medium",
    notes: "",
    items: [
      { name: "Cơm trắng", grams: 200, kcal: 260, carbs_g: 57, protein_g: 5, fat_g: 0.5, fiber_g: 0.6 },
      { name: "Gà áp chảo", grams: 150, kcal: 240, carbs_g: 0, protein_g: 45, fat_g: 6, fiber_g: 0 },
    ],
  },
};

/** A 16×16 PNG, enough for the photo picker to accept. */
export const PHOTO = {
  name: "meal.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR4nGO4kGBAEmIY1TCqYfhqAADCpWAQ04+bkAAAAABJRU5ErkJggg==",
    "base64",
  ),
};

/** A fresh address per call, so tests never see each other's data. */
export function uniqueEmail(tag: string): string {
  return `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** Collects console errors and uncaught page errors for the whole test. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/**
 * Signs in through the Auth emulator's fake Google page. The same email always gets the same uid.
 * Leaves the page wherever the app sends a signed-in user (home or onboarding).
 */
export async function signIn(page: Page, email: string): Promise<void> {
  if (!page.url().endsWith("/login")) await page.goto("/login");
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "Đăng nhập bằng Google" }).click(),
  ]);
  await popup.waitForLoadState();
  // Accounts already in the emulator are listed; otherwise create one. Autogen fills random
  // values (email included), so the email is typed after it.
  const existing = popup.locator(".js-reuse-account", { hasText: email });
  if ((await existing.count()) > 0) {
    await existing.first().click();
  } else {
    await popup.locator("#add-account-button").click();
    await popup.locator("#autogen-button").click();
    await popup.locator("#email-input").fill(email);
    await popup.locator("#sign-in").click();
  }
  await popup.waitForEvent("close");
  await expect(page).not.toHaveURL(/\/login$/);
}

/** Fills onboarding with fixed numbers (target 2.000 kcal) and lands on home. */
export async function onboard(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.getByRole("button", { name: "Thâm hụt calo (giảm mỡ)" }).click();
  await page.getByRole("button", { name: "Nam", exact: true }).click();
  await page.getByLabel("Tuổi").fill("25");
  await page.getByLabel("Chiều cao (cm)").fill("175");
  await page.getByLabel("Cân nặng (kg)").fill("70");
  await page.getByRole("button", { name: /^Vận động vừa/ }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  const target = page.getByLabel("Mục tiêu calories mỗi ngày (kcal)");
  await expect(target).toHaveValue("2100");
  await target.fill("2000");
  await page.getByRole("button", { name: "Bắt đầu" }).click();
  await expect(page).toHaveURL(/\/$/);
}

/** Adds a meal from a text description (and a photo if asked), with `/api/analyze` faked. */
export async function addMeal(page: Page, title: string, opts: { photo?: boolean } = {}): Promise<void> {
  await page.route("**/api/analyze", (route) =>
    route.fulfill({ status: 200, json: { result: { ...ANALYSIS.result, title } } }),
  );
  await page.getByRole("link", { name: "Thêm bữa" }).click();
  if (opts.photo) {
    await page.locator('input[type="file"]:not([capture])').setInputFiles(PHOTO);
    await expect(page.getByRole("button", { name: "Phân tích" })).toBeEnabled();
  }
  await page.getByLabel("Mô tả").fill(title);
  await page.getByRole("button", { name: "Phân tích" }).click();
  await expect(page.getByLabel("Tên bữa")).toHaveValue(title);
  await page.getByRole("button", { name: "Lưu bữa ăn" }).click();
  await expect(page.getByText(title)).toBeVisible();
}

/** Settings → Đăng xuất → confirm; ends on /login. */
export async function signOut(page: Page): Promise<void> {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/login$/);
}
