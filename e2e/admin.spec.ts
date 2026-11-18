import { expect, test, type APIRequestContext } from "@playwright/test";
import { addMeal, onboard, signIn, trackErrors, uniqueEmail } from "./helpers";

test.use({ timezoneId: "Asia/Ho_Chi_Minh" });

const PROJECT = "demo-mealmeal";
const OWNER = { Authorization: "Bearer owner" };
const FIRESTORE = `http://127.0.0.1:8085/v1/projects/${PROJECT}/databases/(default)/documents`;

// Computed here on purpose: the test must not share code with what it checks (src/lib/server).
const pad = (n: number) => String(n).padStart(2, "0");
function vnDate(offsetDays: number): string {
  const d = new Date(Date.now() + 7 * 3600_000 + offsetDays * 86_400_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

async function uidOf(request: APIRequestContext, email: string): Promise<string> {
  const res = await request.post(
    `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`,
    { headers: OWNER, data: { email: [email] } },
  );
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { users?: { localId: string }[] };
  return body.users![0].localId;
}

const int = (n: number) => ({ integerValue: String(n) });

async function seedDay(request: APIRequestContext, uid: string, date: string, counts: Record<string, number>) {
  const fields: Record<string, unknown> = { date: { stringValue: date }, uid: { stringValue: uid } };
  for (const [k, v] of Object.entries(counts)) fields[k] = int(v);
  const res = await request.patch(`${FIRESTORE}/usageDaily/${date}_${uid}`, { headers: OWNER, data: { fields } });
  expect(res.ok()).toBe(true);
}

test("admin sees per-user cost for each range", async ({ page, request }) => {
  const errors = trackErrors(page);
  const email = "admin@example.com";
  await signIn(page, email);
  await onboard(page);
  await addMeal(page, "Phở bò");

  const uid = await uidOf(request, email);
  await seedDay(request, uid, vnDate(0), { requests: 3, ok: 3, aiCalls: 3, inputTokens: 1_000_000, outputTokens: 500_000 });
  await seedDay(request, uid, vnDate(-3), { requests: 1, ok: 1, aiCalls: 1, inputTokens: 2_000_000 });
  await seedDay(request, uid, vnDate(-20), { requests: 1, ok: 1, aiCalls: 1, outputTokens: 1_000_000 });
  const totals = await request.patch(`${FIRESTORE}/usageTotals/${uid}`, {
    headers: OWNER,
    data: { fields: { requests: int(5), lastAt: { timestampValue: new Date().toISOString() } } },
  });
  expect(totals.ok()).toBe(true);

  await page.goto("/admin");
  const card = page.getByRole("listitem").filter({ hasText: email });
  await expect(page.getByRole("button", { name: "7 ngày" })).toHaveAttribute("aria-pressed", "true");
  await expect(card).toContainText("$0,5000");
  await expect(card).toContainText("1 bữa");
  await expect(page.getByRole("heading", { name: "Theo ngày" })).toBeVisible();

  await page.getByRole("button", { name: "Hôm nay" }).click();
  await expect(card).toContainText("$0,3000");
  await expect(page.getByRole("heading", { name: "Theo ngày" })).toHaveCount(0);

  await page.getByRole("button", { name: "30 ngày" }).click();
  await expect(card).toContainText("$0,9000");
  await expect(page).toHaveURL(/[?&]range=30d/);

  expect(errors).toEqual([]);
});

test("a normal user is told they have no access", async ({ page }) => {
  const errors = trackErrors(page);
  await signIn(page, uniqueEmail("user"));
  await onboard(page);
  await page.goto("/admin");
  await expect(page.getByText("Bạn không có quyền xem trang này.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Về trang chính" })).toBeVisible();
  // The browser logs the expected 403 as a failed resource load.
  expect(errors.filter((e) => !/403/.test(e))).toEqual([]);
});
