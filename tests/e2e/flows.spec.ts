import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string, password = "E2eTestPass123", expectSuccess = true) {
  await page.goto("/admin/login");
  await page.getByLabel("البريد الإلكتروني").fill(email);
  await page.getByLabel("كلمة المرور").fill(password);
  await page.getByRole("button", { name: "دخول" }).click();
  if (expectSuccess) await page.waitForURL(/\/admin$/);
}

test("public site shows honest empty states and localized routing", async ({ page }) => {
  const res = await page.goto("/");
  expect(page.url()).toMatch(/\/ar$/);
  expect(res?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByText("لا توجد مشاريع منشورة حالياً")).toBeVisible();
  await page.getByRole("link", { name: "English" }).first().click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect((await page.goto("/ar/does-not-exist"))?.status()).toBe(404);
});

test("admin APIs and pages are protected server-side", async ({ page, request }) => {
  expect((await request.get("/api/admin/leads/export")).status()).toBe(401);
  expect((await request.get("/api/admin/media")).status()).toBe(401);
  await page.goto("/admin/projects");
  await expect(page).toHaveURL(/\/admin\/login/);
  // A forged session cookie is not accepted.
  await page.context().addCookies([{ name: "aljafil_session", value: "forged", url: "http://localhost:3200" }]);
  await page.goto("/admin/projects");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("wrong password is rejected", async ({ page }) => {
  await login(page, "super@e2e.test", "WrongPass999", false);
  await expect(page.getByText("بيانات الدخول غير صحيحة")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("roles: sales agent cannot reach users, projects, financing or export", async ({ page }) => {
  await login(page, "sales@e2e.test");
  for (const p of ["/admin/users", "/admin/projects", "/admin/financing"]) {
    await page.goto(p);
    await expect(page).toHaveURL(/\/admin\/forbidden/);
  }
  expect((await page.request.get("/api/admin/leads/export")).status()).toBe(403);
  await expect(page.getByRole("link", { name: "المستخدمون والصلاحيات" })).toHaveCount(0);
});

test("full flow: create project + unit, publish, view, inquire, apply for financing", async ({ page, browser }) => {
  await login(page, "super@e2e.test");
  await page.goto("/admin/projects/new");
  await page.getByLabel("اسم المشروع (عربي)").fill("أدوار النرجس التجريبي");
  await page.getByLabel("اسم المشروع (إنجليزي)").fill("Narjis Test Floors");
  await page.getByLabel("المدينة (عربي)").fill("الرياض");
  await page.getByLabel("الحي (عربي)").fill("النرجس");
  await page.getByLabel("نوع العقار").selectOption({ label: "أدوار" });
  await page.getByLabel("حالة البيع").selectOption("AVAILABLE");
  await page.getByLabel("حالة النشر").selectOption("PUBLISHED");
  await page.getByLabel("مشروع مميز").check();
  await page.getByRole("button", { name: "إنشاء المشروع" }).click();
  await expect(page).toHaveURL(/\/admin\/projects\/[^/]+\?created=1/);

  // Validation: reversed manual range is rejected server-side.
  await page.getByLabel("مصدر النطاقات المعروضة").selectOption("MANUAL");
  await page.getByLabel("أقل سعر (ريال)").fill("2000000");
  await page.getByLabel("أعلى سعر (ريال)").fill("1000000");
  await page.getByRole("button", { name: "حفظ التعديلات" }).click();
  await expect(page.getByText("الحد الأعلى أقل من الأدنى")).toBeVisible();
  await page.getByLabel("مصدر النطاقات المعروضة").selectOption("AUTO_FROM_UNITS");
  await page.getByRole("button", { name: "حفظ التعديلات" }).click();
  await expect(page.getByText("تم الحفظ بنجاح")).toBeVisible();

  await page.getByRole("link", { name: "إدارة الوحدات" }).click();
  await page.locator('input[name="reference"]').fill("A1");
  await page.locator('input[name="area"]').fill("318");
  await page.locator('input[name="price"]').fill("1350000");
  await page.locator('input[name="bedrooms"]').fill("3");
  await page.getByRole("button", { name: "إضافة الوحدة" }).click();
  await expect(page.getByRole("cell", { name: "A1", exact: true })).toBeVisible();

  // Public pages read straight from the database.
  await page.goto("/ar/projects");
  await page.getByRole("link", { name: "أدوار النرجس التجريبي" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("أدوار النرجس التجريبي");
  await expect(page.getByText("الوحدة #A1")).toBeVisible();
  await expect(page.getByText("1,350,000 ريال").first()).toBeVisible();
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.join()).toContain('"lowPrice":1350000');

  // Lead without consent is refused, with consent stored.
  const form = page.locator("#inquiry");
  await form.getByLabel("الاسم").fill("عميل تجريبي");
  await form.getByLabel("رقم الجوال").fill("0570800002");
  await form.getByRole("button", { name: "اطلب تفاصيل المشروع" }).click();
  await expect(form.getByText("يجب الموافقة على سياسة الخصوصية")).toBeVisible();
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "اطلب تفاصيل المشروع" }).click();
  await expect(form.getByRole("status")).toContainText("تم استلام طلبك");

  // Financing application.
  await page.goto("/ar/financing");
  await page.getByLabel("الاسم الكامل").fill("عميل تمويل");
  await page.getByLabel("رقم الجوال").fill("0570900002");
  await page.getByLabel("جهة العمل").selectOption("GOVERNMENT");
  await page.getByLabel("الراتب الشهري").fill("15000");
  await page.getByLabel("بنك إيداع الراتب").selectOption({ index: 1 });
  await page.getByLabel("الالتزامات الشهرية").fill("0");
  await page.getByLabel("العمر").fill("40");
  await page.getByRole("button", { name: "إرسال الطلب" }).click();
  await expect(page.getByText("حدد إن كان لديك قرض عقاري")).toBeVisible();
  await page.getByLabel("لا", { exact: true }).check();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "إرسال الطلب" }).click();
  await expect(page).toHaveURL(/thank-you\?ref=FIN-/);

  // The lead is in the CRM with its project.
  await page.goto("/admin/leads");
  await expect(page.getByRole("link", { name: "عميل تجريبي" })).toBeVisible();
  await page.getByRole("link", { name: "عميل تجريبي" }).click();
  await page.getByLabel("الحالة").selectOption("CONTACTED");
  await page.getByRole("button", { name: "تحديث الحالة" }).click();
  await expect(page.getByText("تم التواصل").first()).toBeVisible();

  // Content editor can manage projects but must not see financing applications.
  const ctx = await browser.newContext();
  const editor = await ctx.newPage();
  await login(editor, "editor@e2e.test");
  await editor.goto("/admin/financing/whatever");
  await expect(editor).toHaveURL(/\/admin\/forbidden/);
  await ctx.close();

  // Sitemap lists the published project.
  const sm = await (await page.request.get("/sitemap.xml")).text();
  expect(sm).toContain("/en/projects/narjis-test-floors");
});

test("assistant: guided flow finds the published unit without an AI key", async ({ page }) => {
  await page.goto("/ar");
  await page.getByRole("button", { name: "المساعد العقاري" }).click();
  const panel = page.getByRole("dialog", { name: "المساعد العقاري" });
  await panel.getByRole("button", { name: "أدوار" }).click();
  await panel.getByRole("button", { name: "أي موقع" }).click();
  await panel.getByRole("button", { name: "حتى 1.8 مليون" }).click();
  await panel.getByRole("button", { name: "3", exact: true }).click();
  await panel.getByRole("button", { name: "تخطي" }).click();
  await expect(panel.getByRole("link", { name: "أدوار النرجس التجريبي" })).toBeVisible();
  await expect(panel.getByText("#A1")).toBeVisible();
});
