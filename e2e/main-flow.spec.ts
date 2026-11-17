import { expect, test } from "@playwright/test";
import { ANALYSIS, onboard, signIn, trackErrors, uniqueEmail } from "./helpers";

test("onboarding, add, edit, share and delete a meal", async ({ page }) => {
  const errors = trackErrors(page);
  await page.route("**/api/analyze", (route) => route.fulfill({ status: 200, json: ANALYSIS }));

  // 1–2. Sign in, then onboarding.
  await signIn(page, uniqueEmail("main"));
  await onboard(page);

  // 3. Empty day.
  await expect(page.getByText("Chưa có bữa nào")).toBeVisible();

  // 4. Analyze a description.
  await page.getByRole("link", { name: "Thêm bữa" }).click();
  await page.getByLabel("Mô tả").fill("cơm gà");
  await page.getByRole("button", { name: "Phân tích" }).click();
  await expect(page.getByLabel("Tên bữa")).toHaveValue("Cơm gà áp chảo");
  await expect(page.getByText("Tổng 500 kcal")).toBeVisible();

  // 5. Change a weight and change it back.
  const rice = page.getByLabel("Khối lượng Cơm trắng (gam)");
  await rice.fill("100");
  await expect(page.getByText("Tổng 370 kcal")).toBeVisible();
  await rice.fill("200");
  await expect(page.getByText("Tổng 500 kcal")).toBeVisible();

  // 6. Save and return home.
  await page.getByRole("button", { name: "Lưu bữa ăn" }).click();
  await expect(page).toHaveURL(/\/\?d=\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByText("Cơm gà áp chảo")).toBeVisible();
  await expect(page.getByText("còn 1.500 kcal")).toBeVisible();

  // 7. Today's circle.
  // Today is the selected day, so its cell is the pressed one.
  await expect(page.getByRole("button", { pressed: true, name: /500 trên 2\.000 kcal/ })).toBeVisible();

  // 8. Survives a reload.
  await page.reload();
  await expect(page.getByText("Cơm gà áp chảo")).toBeVisible();

  // 9. Share card download.
  await page.getByRole("link", { name: /Cơm gà áp chảo/ }).click();
  await expect(page.getByLabel("Tên bữa")).toHaveValue("Cơm gà áp chảo");
  await page.getByRole("button", { name: "Chia sẻ" }).click();
  const sheet = page.getByRole("dialog", { name: "Chia sẻ bữa ăn" });
  const download = sheet.getByRole("button", { name: "Tải ảnh" });
  await expect(download).toBeEnabled({ timeout: 15_000 });
  const [file] = await Promise.all([page.waitForEvent("download"), download.click()]);
  expect(file.suggestedFilename()).toMatch(/^mealmeal-\d{4}-\d{2}-\d{2}\.png$/);

  // 10. Close the sheet, delete the meal.
  await page.getByRole("button", { name: "Đóng" }).click({ position: { x: 20, y: 20 } });
  await expect(sheet).toBeHidden();
  await page.getByRole("button", { name: "Xóa bữa ăn" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xóa", exact: true }).click();
  await expect(page.getByText("Chưa có bữa nào")).toBeVisible();

  // 11. No errors along the way.
  expect(errors).toEqual([]);
});

test("each visit to the add, meal and settings screens starts fresh", async ({ page }) => {
  const errors = trackErrors(page);
  let call = 0;
  await page.route("**/api/analyze", (route) => {
    call += 1;
    const title = call === 1 ? "Bữa một" : "Bữa hai";
    return route.fulfill({ status: 200, json: { result: { ...ANALYSIS.result, title } } });
  });
  await signIn(page, uniqueEmail("fresh"));
  await onboard(page);
  const addPage = async (text: string) => {
    await page.getByRole("link", { name: "Thêm bữa" }).click();
    await expect(page.getByLabel("Mô tả")).toHaveValue("");
    await page.getByLabel("Mô tả").fill(text);
    await page.getByRole("button", { name: "Phân tích" }).click();
    await expect(page.getByRole("button", { name: "Lưu bữa ăn" })).toBeVisible();
  };

  // Save one meal, then "Thêm bữa" again shows an empty form, not the last result.
  await addPage("bữa một");
  await page.getByRole("button", { name: "Lưu bữa ăn" }).click();
  await expect(page.getByText("Bữa một")).toBeVisible();

  // Discard a result, then "Thêm bữa" again is empty too.
  await addPage("bữa hai");
  await page.getByRole("button", { name: "Quay lại" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Bỏ" }).click();
  await expect(page).toHaveURL(/\/\?d=/);
  await page.getByRole("link", { name: "Thêm bữa" }).click();
  await expect(page.getByLabel("Mô tả")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Phân tích" })).toBeDisabled();

  // Save a second meal, then open each meal in turn: the detail shows the one opened.
  await page.getByLabel("Mô tả").fill("bữa hai");
  await page.getByRole("button", { name: "Phân tích" }).click();
  await page.getByRole("button", { name: "Lưu bữa ăn" }).click();
  await page.getByRole("link", { name: /Bữa một/ }).click();
  await expect(page.getByLabel("Tên bữa")).toHaveValue("Bữa một");
  await page.getByLabel("Tên bữa").fill("Bữa một chưa lưu");
  await page.goBack();
  await page.getByRole("link", { name: /Bữa hai/ }).click();
  await expect(page.getByLabel("Tên bữa")).toHaveValue("Bữa hai");
  await page.goBack();
  await page.getByRole("link", { name: /Bữa một/ }).click();
  await expect(page.getByLabel("Tên bữa")).toHaveValue("Bữa một");

  // Settings: a change that was not saved is gone on the next visit.
  await page.goto("/");
  await page.getByRole("link", { name: "Mục tiêu" }).click();
  await page.getByRole("button", { name: "Tôi đã biết con số của mình" }).click();
  await page.getByLabel("Mục tiêu calories mỗi ngày (kcal)").fill("3000");
  await page.goBack();
  await page.getByRole("link", { name: "Mục tiêu" }).click();
  await expect(page.getByRole("button", { name: "Tôi đã biết con số của mình" })).toBeVisible();

  expect(errors).toEqual([]);
});

test("a photo or text that is not food keeps what was typed", async ({ page }) => {
  await page.route("**/api/analyze", (route) =>
    route.fulfill({ status: 422, json: { error: { code: "NOT_FOOD" } } }),
  );
  await signIn(page, uniqueEmail("notfood"));
  await onboard(page);

  await page.getByRole("link", { name: "Thêm bữa" }).click();
  await page.getByLabel("Mô tả").fill("cái bàn gỗ");
  await page.getByRole("button", { name: "Phân tích" }).click();
  await expect(page.getByText("Không nhận ra món ăn")).toBeVisible();
  await expect(page.getByLabel("Mô tả")).toHaveValue("cái bàn gỗ");
});
