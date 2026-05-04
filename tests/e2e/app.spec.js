const { test, expect } = require("@playwright/test");
const path = require("path");
const { pathToFileURL } = require("url");

const APP_URL = pathToFileURL(path.join(__dirname, "..", "..", "index.html")).href;

async function openApp(page, options = {}) {
  await page.addInitScript((initOptions) => {
    const cases = [...(initOptions.cases || [])];
    const representatives = [...(initOptions.representatives || [])];

    window.__copiedText = "";
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__copiedText = text;
        }
      }
    });

    window.electronAPI = {
      getCases: async () => cases.map((c) => ({ ...c })),
      getRepresentatives: async () => representatives.map((r) => ({ ...r })),
      saveRepresentative: async (representative) => {
        const saved = { ...representative, id: representative.id || "REP-00001" };
        const index = representatives.findIndex((item) => item.id === saved.id);
        if (index >= 0) representatives[index] = saved;
        else representatives.push(saved);
        return saved;
      },
      saveCase: async (c) => {
        const saved = { ...c, id: c.id || "REG-2026-00001" };
        const index = cases.findIndex((item) => item.id === saved.id);
        if (index >= 0) cases[index] = saved;
        else cases.push(saved);
        return saved;
      },
      getNextId: async () => "REG-2026-00001"
    };
  }, options);

  await page.goto(APP_URL);
}

async function openStaticApp(page) {
  await page.goto(APP_URL);
}

test("saves a case and shows the generated ID", async ({ page }) => {
  await openApp(page);

  await page.locator("#case-name").fill("Persona E2E");
  await page.getByRole("button", { name: /enviar solicitud/i }).click();

  await expect(page.locator("#case-id-preview")).toContainText("REG-2026-00001");
  await expect(page.locator("#storage-message")).toContainText("REG-2026-00001");
});

test("loads a read-only static mode when Electron is unavailable", async ({ page }) => {
  await openStaticApp(page);

  await expect(page.locator("#runtime-mode-message")).toBeVisible();
  await expect(page.locator("#cases-panel")).toHaveCount(0);
  await expect(page.locator("#save-case-button")).toBeHidden();

  await page.locator("#case-name").fill("Consulta publica");
  await page.locator("#case-form").evaluate((form) => form.requestSubmit());

  await expect(page.locator("#storage-message")).toContainText(/no guarda datos|n.enregistre pas/i);
  await expect(page.locator("#case-id-preview")).toHaveText("");
});

test("shows duplicate warning when phone matches an existing case", async ({ page }) => {
  await openApp(page, {
    cases: [{ id: "REG-2026-00077", caseName: "Amina", phone: "612345678", locality: "Bergara" }]
  });

  await page.locator("#case-phone").fill("612345678");

  await expect(page.locator("#duplicate-warning")).toContainText("REG-2026-00077");
});

test("invalid phone blocks save and shows inline error", async ({ page }) => {
  await openApp(page);

  await page.locator("#case-name").fill("Persona Telefono");
  await page.locator("#case-phone").fill("12345");
  await page.getByRole("button", { name: /enviar solicitud/i }).click();

  await expect(page.locator("#phone-error")).toBeVisible();
  await expect(page.locator("#storage-message")).toContainText(/telefono|email/i);
  await expect(page.locator("#case-id-preview")).toHaveText("");
});

test("French route guidance does not show raw dynamic step keys", async ({ page }) => {
  await openApp(page);

  await page.locator("#lang-fr").click();
  await page.locator("#step-next").click();
  await page.locator('input[name="beforeJan2026"][value="yes"]').check();
  await page.locator('input[name="fiveMonths"][value="yes"]').check();
  await page.locator("#step-next").click();
  await page.locator('input[name="validPermit"][value="yes"]').check();

  await expect(page.locator("#guidance-steps")).not.toContainText("step-other-1");
  await expect(page.locator("#guidance-steps")).toContainText(/Reviser|demande/i);
});

test("wizard stops after the first hard gate when presence cannot be proven", async ({ page }) => {
  await openApp(page);

  await page.locator("#step-next").click();
  await expect(page.locator("#step-progress-label")).toContainText(/Paso 2|Étape 2/);
  await expect(page.locator("#step-next")).toContainText(/Ver diagn[oó]stico/i);

  await page.locator("#step-next").click();

  await expect(page.locator('.analysis-step.active[data-step="2"]')).toBeVisible();
  await expect(page.locator("#guidance-preview")).toContainText(/no parece que encaje|ne semble pas correspondre/i);
});

test("copy summary copies follow-up text to clipboard stub", async ({ page }) => {
  await openApp(page);

  await page.locator("#case-name").fill("Persona Seguimiento");
  await page.getByRole("button", { name: /enviar solicitud/i }).click();
  await page.locator("#copy-summary-button").click();

  await expect(page.locator("#storage-message")).toContainText(/Resumen copiado|copie/i);
  const copiedText = await page.evaluate(() => window.__copiedText);
  expect(copiedText).toContain("Persona Seguimiento");
  expect(copiedText).toContain("REG-2026-00001");
});

test("autosave persists the case after leaving the name field", async ({ page }) => {
  await openApp(page);

  await page.locator("#case-name").fill("Persona Autosave E2E");
  await page.locator("#case-phone").click();

  await expect(page.locator("#case-id-preview")).toContainText("REG-2026-00001", { timeout: 3000 });
});
