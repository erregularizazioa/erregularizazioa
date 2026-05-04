const { test, expect } = require("@playwright/test");
const path = require("path");
const { pathToFileURL } = require("url");

const APP_URL = pathToFileURL(path.join(__dirname, "..", "..", "index.html")).href;

async function openApp(page) {
  await page.addInitScript(() => {
    window.REGULARIZAZIOA_SUPABASE_CONFIG = {
      captchaProvider: "turnstile",
      captchaSiteKey: "test-site-key",
      submitFunctionUrl: "https://example.test/public-submit"
    };
    window.turnstile = {
      render: (_el, options) => {
        setTimeout(() => options.callback("test-captcha-token"), 0);
        return "widget-id";
      },
      reset: () => {}
    };
    window.__submittedBody = null;
    window.fetch = async (_url, options) => {
      window.__submittedBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({ ok: true, payload: window.__submittedBody.payload })
      };
    };
  });

  await page.goto(APP_URL);
}

test("submits a lightweight public intake payload", async ({ page }) => {
  await openApp(page);

  await page.locator("#case-name").fill("Persona E2E");
  await page.locator("#case-phone").fill("612345678");
  await page.locator("#case-locality").fill("Bergara");
  await page.locator("#nationality").fill("Marruecos");
  await page.locator("#before-2026").check();
  await page.locator("#work").check();
  await page.locator("#case-notes").fill("Necesito que me llamen por la tarde.");
  await page.locator("#privacy-consent").check();
  await page.getByRole("button", { name: /enviar solicitud/i }).click();

  await expect(page.locator("#storage-message")).toContainText(/Solicitud PUB-|enviada/i);
  await expect(page.locator("#case-id-preview")).toContainText("PUB-");

  const submitted = await page.evaluate(() => window.__submittedBody);
  expect(submitted.captchaToken).toBe("test-captcha-token");
  expect(submitted.payload.caseName).toBe("Persona E2E");
  expect(submitted.payload.phone).toBe("612345678");
  expect(submitted.payload.locality).toBe("Bergara");
  expect(submitted.payload.nationality).toBe("Marruecos");
  expect(submitted.payload.answers.beforeJan2026).toBe("yes");
  expect(submitted.payload.answers.irregularOptions).toContain("work");
  expect(submitted.payload.privacyConsent).toBe(true);
});

test("requires phone or email and consent", async ({ page }) => {
  await openApp(page);

  await page.locator("#case-name").fill("Persona sin contacto");
  await page.getByRole("button", { name: /enviar solicitud/i }).click();
  await expect(page.locator("#storage-message")).toContainText(/teléfono|email/i);

  await page.locator("#case-phone").fill("612345678");
  await page.getByRole("button", { name: /enviar solicitud/i }).click();
  await expect(page.locator("#storage-message")).toContainText(/autorización/i);
});

test("invalid phone shows inline error", async ({ page }) => {
  await openApp(page);

  await page.locator("#case-name").fill("Persona Telefono");
  await page.locator("#case-phone").fill("123");
  await page.locator("#privacy-consent").check();
  await page.getByRole("button", { name: /enviar solicitud/i }).click();

  await expect(page.locator("#phone-error")).toBeVisible();
  await expect(page.locator("#storage-message")).toContainText(/teléfono|email/i);
});

test("language toggle switches public intake labels", async ({ page }) => {
  await openApp(page);

  await page.locator("#lang-fr").click();
  await expect(page.locator("h1")).toContainText(/aide/i);
  await expect(page.locator("#save-case-button")).toContainText(/Envoyer/i);
});
