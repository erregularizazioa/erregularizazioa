const { test, expect } = require("@playwright/test");
const path = require("path");
const { pathToFileURL } = require("url");

const APP_URL = pathToFileURL(path.join(__dirname, "..", "..", "index.html")).href;

async function openApp(page, options = {}) {
  await page.addInitScript((initOptions) => {
    const cases = [...(initOptions.cases || [])];
    const restoredCases = [...(initOptions.restoreCases || [])];
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
      getNextId: async () => "REG-2026-00001",
      exportExcel: async () => ({ ok: true }),
      backupDatabase: async () => ({ ok: true, path: "/tmp/regularizazioa-backup.db" }),
      restoreDatabase: async () => {
        cases.splice(0, cases.length, ...restoredCases);
        return { ok: true, path: "/tmp/regularizazioa-backup.db", cases: restoredCases };
      }
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
  await page.getByRole("button", { name: /guardar caso/i }).click();

  await expect(page.locator("#case-id-preview")).toContainText("REG-2026-00001");
  await expect(page.locator("#case-table-body")).toContainText("Persona E2E");
});

test("saved representatives can be reused in another case", async ({ page }) => {
  await openApp(page);

  await page.locator("#representative-directory-panel summary").click();
  await page.locator("#representative-directory-name").fill("Entidad amiga");
  await page.locator("#representative-directory-phone").fill("600111222");
  await page.locator("#representative-directory-email").fill("entidad@ejemplo.org");
  await page.getByRole("button", { name: /guardar ficha|guardar representante/i }).click();

  await expect(page.locator("#representative-directory-select")).toHaveValue("REP-00001");
  await page.locator("#clear-case-button").click();
  await page.locator("#case-representative-profile").selectOption("REP-00001");

  await expect(page.locator("#case-representative-name")).toHaveValue("Entidad amiga");
  await expect(page.locator("#case-representative-phone")).toHaveValue("600111222");
  await expect(page.locator("#case-representative-email")).toHaveValue("entidad@ejemplo.org");
  await expect(page.locator("#case-representative-name")).toHaveJSProperty("readOnly", true);
});

test("loads a read-only static mode when Electron is unavailable", async ({ page }) => {
  await openStaticApp(page);

  await expect(page.locator("#runtime-mode-message")).toBeVisible();
  await expect(page.locator("#cases-panel")).toBeHidden();
  await expect(page.locator("#save-case-button")).toBeHidden();

  await page.locator("#case-name").fill("Consulta publica");
  await page.locator("#case-form").evaluate((form) => form.requestSubmit());

  await expect(page.locator("#storage-message")).toContainText(/solo de consulta|lecture seule/i);
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
  await page.getByRole("button", { name: /guardar caso/i }).click();

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
  await page.getByRole("button", { name: /guardar caso/i }).click();
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
  await expect(page.locator("#case-table-body")).toContainText("Persona Autosave E2E");
});

test("summary row renders as compact pills", async ({ page }) => {
  await openApp(page, {
    cases: [{ id: "REG-2026-00001", caseName: "Persona", caseStatus: "Nuevo", nextAction: "Llamar", locality: "Bergara" }]
  });

  await expect(page.locator(".summary-pill")).toHaveCount(6);
  await expect(page.locator(".summary-card")).toHaveCount(0);
});

test("backup button shows success message", async ({ page }) => {
  await openApp(page);

  await page.locator("#backup-button").click();
  await expect(page.locator("#storage-message")).toContainText(/Copia de seguridad guardada/i);
});

test("restore button reloads the restored cases", async ({ page }) => {
  await openApp(page, {
    cases: [{ id: "REG-2026-00001", caseName: "Antes", caseStatus: "Nuevo", locality: "Bergara" }],
    restoreCases: [{ id: "REG-2026-00002", caseName: "Despues", caseStatus: "Nuevo", locality: "Bilbao" }]
  });

  await expect(page.locator("#case-table-body")).toContainText("Antes");
  await page.locator("#restore-button").click();

  await expect(page.locator("#storage-message")).toContainText(/Base de datos restaurada/i);
  await expect(page.locator("#case-table-body")).toContainText("Despues");
  await expect(page.locator("#case-table-body")).not.toContainText("Antes");
});

test("urgent filter keeps only overdue cases in the table", async ({ page }) => {
  await openApp(page, {
    cases: [
      { id: "REG-2026-00001", caseName: "Vencido", caseStatus: "Nuevo", nextDate: "2026-04-01", nextAction: "Llamar hoy", locality: "Bergara" },
      { id: "REG-2026-00002", caseName: "Pendiente", caseStatus: "Nuevo", nextDate: "2026-05-10", nextAction: "Esperar cita", locality: "Bergara" }
    ]
  });

  await expect(page.locator("#case-table-body tr")).toHaveCount(2);
  await page.locator("#urgent-filter-button").click();

  await expect(page.locator("#case-table-body tr")).toHaveCount(1);
  await expect(page.locator("#case-table-body")).toContainText("Vencido");
  await expect(page.locator("#case-table-body")).not.toContainText("Pendiente");
});

test("editing a saved case loads its data back into the form", async ({ page }) => {
  await openApp(page, {
    cases: [
      {
        id: "REG-2026-00033",
        caseName: "Caso Editar",
        phone: "612345678",
        email: "editar@example.org",
        locality: "Bergara",
        volunteer: "Ane",
        caseStatus: "Reuniendo documentos",
        nextDate: "2026-05-01",
        nextAction: "Pedir certificado",
        notes: "Caso de prueba",
        route: "Situacion administrativa irregular",
        answers: { personType: "adult", validPermit: "no", ukraineProtection: "no", stateless: "no", pendingApplication: "no", beforeJan2026: "yes", fiveMonths: "yes", identityDocument: "yes", criminalRecord: "yes", piBefore2026: "no", irregularOptions: ["work"] },
        checks: {}
      }
    ]
  });

  await page.getByRole("button", { name: /editar/i }).click();

  await expect(page.locator("#case-id-preview")).toContainText("REG-2026-00033");
  await expect(page.locator("#case-name")).toHaveValue("Caso Editar");
  await expect(page.locator("#case-next-action")).toHaveValue("Pedir certificado");
});
