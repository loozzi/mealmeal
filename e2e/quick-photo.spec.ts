import { expect, test } from "@playwright/test";
import { ANALYSIS, PHOTO, onboard, signIn, trackErrors, uniqueEmail } from "./helpers";

async function snap(page: import("@playwright/test").Page) {
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Chụp bữa ăn" }).click(),
  ]);
  await chooser.setFiles(PHOTO);
}

test("camera button on home analyzes the photo and waits for review", async ({ page }) => {
  const errors = trackErrors(page);
  const bodies: Record<string, unknown>[] = [];
  await page.route("**/api/analyze", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, json: ANALYSIS });
  });

  await signIn(page, uniqueEmail("quick"));
  await onboard(page);
  await snap(page);

  await expect(page).toHaveURL(/\/add\?/);
  await expect(page.getByLabel("Tên bữa")).toHaveValue("Cơm gà áp chảo");
  expect(bodies).toHaveLength(1);
  expect(typeof bodies[0].image).toBe("string");
  expect(bodies[0].text).toBeUndefined();

  await page.getByRole("button", { name: "Lưu bữa ăn" }).click();
  await expect(page).toHaveURL(/\/\?d=\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByText("Cơm gà áp chảo")).toBeVisible();

  expect(errors).toEqual([]);
});

test("a failed quick analysis keeps the photo on the form", async ({ page }) => {
  const errors = trackErrors(page);
  await page.route("**/api/analyze", (route) =>
    route.fulfill({ status: 500, json: { error: { code: "AI_ERROR", message: "x" } } }),
  );

  await signIn(page, uniqueEmail("quickfail"));
  await onboard(page);
  await snap(page);

  await expect(page.getByRole("button", { name: "Phân tích" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bỏ ảnh" })).toBeVisible();
  await expect(page.getByText("Hệ thống phân tích đang gặp sự cố. Hãy thử lại.")).toBeVisible();
  expect(errors.filter((e) => !e.includes("500"))).toEqual([]);
});
