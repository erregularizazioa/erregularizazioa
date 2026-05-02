/**
 * App integration tests — run with: node --test tests/app.test.js
 *
 * These tests use jsdom to simulate the browser DOM and load app.js exactly
 * as the browser would. They are designed to expose real bugs in the UI layer.
 */

const test    = require("node:test");
const assert  = require("node:assert/strict");
const { JSDOM, ResourceLoader } = require("jsdom");
const fs      = require("fs");
const path    = require("path");

const ROOT = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal JSDOM environment that mirrors the real browser setup:
 *  - index.html parsed as DOM
 *  - translations.js  → window.TRANSLATIONS
 *  - logic.js         → window.RegularizacionLogic
 *  - electronAPI stub → window.electronAPI
 *  - app.js           loaded last (same order as <script> tags)
 *
 * Returns the { window, document } so tests can interact with the DOM.
 */
async function buildDOM(options = {}) {
  const html         = fs.readFileSync(path.join(ROOT, "index.html"),      "utf8");
  const translationsJs = fs.readFileSync(path.join(ROOT, "translations.js"), "utf8");
  const logicJs      = fs.readFileSync(path.join(ROOT, "logic.js"),        "utf8");
  const appJs        = fs.readFileSync(path.join(ROOT, "app.js"),          "utf8");

  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    url: "http://localhost/"
  });

  const { window } = dom;

  // jsdom doesn't implement layout APIs — stub them so focusField() doesn't throw
  window.HTMLElement.prototype.scrollIntoView = function() {};

  window.__copiedText = "";
  window.navigator.clipboard = {
    writeText: async (text) => {
      window.__copiedText = text;
    }
  };

  if (options.withElectronAPI !== false) {
    // Stub electronAPI (no real Electron in tests)
    window.electronAPI = {
      getCases:    async () => options.cases || [],
      saveCase:    async (c) => ({ ...c, id: c.id || "REG-2026-00001" }),
      getNextId:   async () => "REG-2026-00001",
      exportExcel: async () => ({ ok: true }),
      backupDatabase: async () => ({ ok: true, path: "/tmp/regularizazioa-backup.db" }),
      restoreDatabase: async () => ({ ok: true, path: "/tmp/regularizazioa-backup.db", cases: options.cases || [] })
    };
  }

  // Inject scripts in order (translations → logic → app)
  window.eval(translationsJs);
  window.eval(logicJs);

  // app.js requires window.RegularizacionLogic and window.electronAPI to be ready
  // Wrapping in try/catch to capture load-time crashes
  let appLoadError = null;
  try {
    window.eval(appJs);
  } catch (err) {
    appLoadError = err;
  }

  // Wait for initialize() (async) to settle
  await new Promise((resolve) => setTimeout(resolve, 50));

  return { window, document: window.document, appLoadError };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("app.js loads without throwing a ReferenceError", async () => {
  const { appLoadError } = await buildDOM();
  // BUG: casePhoneConfirmField / caseEmailConfirmField are referenced but removed
  // from HTML. If this throws, the form submit handler is never registered.
  assert.equal(
    appLoadError,
    null,
    `app.js crashed on load: ${appLoadError && appLoadError.message}`
  );
});

test("app.js also loads in static mode without Electron", async () => {
  const { appLoadError, document } = await buildDOM({ withElectronAPI: false });

  assert.equal(
    appLoadError,
    null,
    `app.js crashed in static mode: ${appLoadError && appLoadError.message}`
  );
  assert.ok(
    !document.getElementById("runtime-mode-message").classList.contains("hidden"),
    "Static banner should be visible when Electron is unavailable"
  );
  assert.ok(
    document.getElementById("cases-panel").classList.contains("hidden"),
    "Cases panel should be hidden in static mode"
  );
});

test("static mode blocks save and keeps the page read-only", async () => {
  const { window, document, appLoadError } = await buildDOM({ withElectronAPI: false });

  if (appLoadError) {
    throw new Error("Skipped because app.js failed to load: " + appLoadError.message);
  }

  document.getElementById("case-name").value = "Consulta publica";
  document.getElementById("case-form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 50));

  assert.equal(document.getElementById("case-id-preview").textContent.trim(), "");
  assert.ok(
    document.getElementById("storage-message").textContent.match(/solo de consulta|lecture seule/i),
    "Static mode should explain that saving is disabled"
  );
});

test("form submit with only a name saves the case and shows the ID", async () => {
  const { window, document, appLoadError } = await buildDOM();

  // If app.js crashed, this test is meaningless — skip with a clear message
  if (appLoadError) {
    throw new Error("Skipped because app.js failed to load: " + appLoadError.message);
  }

  const nameField = document.getElementById("case-name");
  nameField.value = "Test Persona";

  // Simulate form submit
  const form = document.getElementById("case-form");
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

  // Give async save a tick
  await new Promise((r) => setTimeout(r, 100));

  const idPreview = document.getElementById("case-id-preview");
  // ID badge should now show the generated ID, not the placeholder
  assert.notEqual(
    idPreview.textContent,
    "Se generara al guardar",
    "ID badge should update after save"
  );
  assert.match(
    idPreview.textContent,
    /REG-2026/,
    "ID badge should contain the generated ID"
  );
});

test("phone validation shows inline error for bad format while typing", async () => {
  const { window, document, appLoadError } = await buildDOM();

  if (appLoadError) {
    throw new Error("Skipped: app.js failed to load: " + appLoadError.message);
  }

  const phoneField = document.getElementById("case-phone");
  const phoneError = document.getElementById("phone-error");

  // Initially hidden
  assert.ok(phoneError.classList.contains("hidden"), "phone-error should be hidden at start");

  // Type a bad number and trigger input event
  phoneField.value = "12345";
  phoneField.dispatchEvent(new window.Event("input", { bubbles: true }));

  assert.ok(
    !phoneError.classList.contains("hidden"),
    "phone-error should be visible after typing an invalid number"
  );

  // Correct the number
  phoneField.value = "612345678";
  phoneField.dispatchEvent(new window.Event("input", { bubbles: true }));

  assert.ok(
    phoneError.classList.contains("hidden"),
    "phone-error should be hidden again after valid number"
  );
});

test("email validation shows inline error for bad format while typing", async () => {
  const { window, document, appLoadError } = await buildDOM();

  if (appLoadError) {
    throw new Error("Skipped: app.js failed to load: " + appLoadError.message);
  }

  const emailField = document.getElementById("case-email");
  const emailError = document.getElementById("email-error");

  assert.ok(emailError.classList.contains("hidden"), "email-error should be hidden at start");

  emailField.value = "notanemail";
  emailField.dispatchEvent(new window.Event("input", { bubbles: true }));

  assert.ok(
    !emailError.classList.contains("hidden"),
    "email-error should be visible after typing an invalid email"
  );

  emailField.value = "valid@example.com";
  emailField.dispatchEvent(new window.Event("input", { bubbles: true }));

  assert.ok(
    emailError.classList.contains("hidden"),
    "email-error should be hidden again after valid email"
  );
});

test("save blocked and error shown when phone format is invalid", async () => {
  const { window, document, appLoadError } = await buildDOM();

  if (appLoadError) {
    throw new Error("Skipped: app.js failed to load: " + appLoadError.message);
  }

  document.getElementById("case-name").value  = "Test";
  document.getElementById("case-phone").value = "12345"; // invalid

  const form = document.getElementById("case-form");
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 50));

  const msg = document.getElementById("storage-message");
  assert.ok(
    !msg.classList.contains("hidden") && msg.classList.contains("error"),
    "An error message should be shown when phone format is invalid"
  );

  const idPreview = document.getElementById("case-id-preview");
  const placeholders = ["Se generara al guardar", "Sera généré à la sauvegarde"];
  assert.ok(
    placeholders.some((p) => idPreview.textContent.includes(p)) ||
    !idPreview.textContent.match(/REG-2026/),
    "Case should NOT be saved when phone is invalid"
  );
});

test("getRadioValue does not throw when no radio is checked", async () => {
  const { window, document, appLoadError } = await buildDOM();

  if (appLoadError) {
    throw new Error("Skipped: app.js failed to load: " + appLoadError.message);
  }

  // Uncheck all caseStatus radios by force
  document.querySelectorAll('input[name="caseStatus"]').forEach((r) => {
    r.checked = false;
  });

  // collectCaseFormData calls getRadioValue("caseStatus") — should not throw
  let threw = false;
  try {
    const form = document.getElementById("case-form");
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 50));
  } catch (err) {
    threw = true;
  }
  assert.ok(!threw, "getRadioValue should not throw when no radio is checked");
});

test("clear form resets ID badge to placeholder", async () => {
  const { window, document, appLoadError } = await buildDOM();

  if (appLoadError) {
    throw new Error("Skipped: app.js failed to load: " + appLoadError.message);
  }

  // First save a case to populate the ID
  document.getElementById("case-name").value = "Alguien";
  const form = document.getElementById("case-form");
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 100));

  // Now clear
  document.getElementById("clear-case-button").click();

  const idPreview = document.getElementById("case-id-preview");
  assert.ok(
    !idPreview.textContent.match(/REG-2026/),
    "ID badge should be reset to placeholder after clearing the form"
  );
});

test("language toggle switches UI text to French", async () => {
  const { window, document, appLoadError } = await buildDOM();

  if (appLoadError) {
    throw new Error("Skipped: app.js failed to load: " + appLoadError.message);
  }

  document.getElementById("lang-fr").click();
  await new Promise((r) => setTimeout(r, 20));

  const h1 = document.querySelector("h1");
  // French translation of hero.h1
  assert.ok(
    h1.textContent.includes("Dossier unique"),
    `h1 should be in French, got: "${h1.textContent}"`
  );
});

// ---------------------------------------------------------------------------
// Regression: French checklist steps must show translated text, not raw keys
// ---------------------------------------------------------------------------

/**
 * Set radio/checkbox answers in the DOM and fire change events so
 * renderGuidance re-runs. Skips silently if element not found.
 */
function setAnswers(document, answers) {
  Object.entries(answers).forEach(function([name, value]) {
    var el = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (el) {
      el.checked = true;
      el.dispatchEvent(new el.ownerDocument.defaultView.Event("change", { bubbles: true }));
    }
  });
}

test("French: Otra-via (valid-permit) steps show translated text not raw keys", async () => {
  const { window, document, appLoadError } = await buildDOM();
  if (appLoadError) throw new Error("app.js failed: " + appLoadError.message);

  document.getElementById("lang-fr").click();
  await new Promise((r) => setTimeout(r, 20));

  // validPermit=yes triggers "valid-permit" result → routeLabel "Otra via"
  setAnswers(document, { validPermit: "yes" });
  await new Promise((r) => setTimeout(r, 20));

  const text = document.getElementById("guidance-steps").textContent;
  assert.ok(
    !text.includes("step-other-"),
    'Steps must not contain raw keys. Got: "' + text.slice(0, 200) + '"'
  );
  assert.ok(text.trim().length > 10, "Steps should have meaningful French text");
});

test("French: no-presence steps show translated text not raw keys", async () => {
  const { window, document, appLoadError } = await buildDOM();
  if (appLoadError) throw new Error("app.js failed: " + appLoadError.message);

  document.getElementById("lang-fr").click();
  await new Promise((r) => setTimeout(r, 20));

  // beforeJan2026=no triggers "no-presence" → routeLabel "Otra via"
  setAnswers(document, { validPermit: "no", beforeJan2026: "no" });
  await new Promise((r) => setTimeout(r, 20));

  const text = document.getElementById("guidance-steps").textContent;
  assert.ok(
    !text.includes("step-other-"),
    'Steps must not contain raw keys. Got: "' + text.slice(0, 200) + '"'
  );
});

test("French: excluded (ukraine) steps show translated text not raw keys", async () => {
  const { window, document, appLoadError } = await buildDOM();
  if (appLoadError) throw new Error("app.js failed: " + appLoadError.message);

  document.getElementById("lang-fr").click();
  await new Promise((r) => setTimeout(r, 20));

  // ukraineProtection=yes triggers "excluded" → routeLabel "Otra via"
  setAnswers(document, { validPermit: "no", ukraineProtection: "yes" });
  await new Promise((r) => setTimeout(r, 20));

  const text = document.getElementById("guidance-steps").textContent;
  assert.ok(
    !text.includes("step-other-"),
    'Steps must not contain raw keys. Got: "' + text.slice(0, 200) + '"'
  );
});

test("Spanish: Otra-via steps still show meaningful text (no regression)", async () => {
  const { window, document, appLoadError } = await buildDOM();
  if (appLoadError) throw new Error("app.js failed: " + appLoadError.message);

  setAnswers(document, { validPermit: "yes" });
  await new Promise((r) => setTimeout(r, 20));

  const text = document.getElementById("guidance-steps").textContent;
  assert.ok(
    !text.includes("step-other-"),
    'Spanish steps must not show raw keys. Got: "' + text.slice(0, 200) + '"'
  );
  assert.ok(text.trim().length > 20, "Spanish steps should have meaningful text");
});

// ---------------------------------------------------------------------------
// Regression: autosave, ID badge, date hint, step help texts
// ---------------------------------------------------------------------------

test("autosave: case saved automatically after name field loses focus", async () => {
  const { window, document, appLoadError } = await buildDOM();
  if (appLoadError) throw new Error("app.js failed: " + appLoadError.message);

  const nameField = document.getElementById("case-name");
  nameField.value = "Autosave Persona";
  // Fire focusout (blur) — should trigger autosave
  nameField.dispatchEvent(new window.FocusEvent("focusout", { bubbles: true }));

  // Give debounce + async save time to settle (debounce=1500ms + async)
  await new Promise((r) => setTimeout(r, 2000));

  const idPreview = document.getElementById("case-id-preview");
  assert.ok(
    idPreview.textContent.match(/REG-2026/),
    "ID badge should show generated ID after autosave, got: " + idPreview.textContent
  );
});

test("Ctrl+S triggers save", async () => {
  const { window, document, appLoadError } = await buildDOM();
  if (appLoadError) throw new Error("app.js failed: " + appLoadError.message);

  document.getElementById("case-name").value = "Ctrl Save Persona";

  document.dispatchEvent(new window.KeyboardEvent("keydown", {
    key: "s", ctrlKey: true, bubbles: true, cancelable: true
  }));

  await new Promise((r) => setTimeout(r, 300));

  const idPreview = document.getElementById("case-id-preview");
  assert.ok(
    idPreview.textContent.match(/REG-2026/),
    "Ctrl+S should save the case, got: " + idPreview.textContent
  );
});

test("ID badge is hidden when form is empty (no confusing placeholder text visible)", async () => {
  const { window, document, appLoadError } = await buildDOM();
  if (appLoadError) throw new Error("app.js failed: " + appLoadError.message);

  const idPreview = document.getElementById("case-id-preview");
  // Should be hidden or empty — not showing a long placeholder string
  const isHiddenOrEmpty =
    idPreview.classList.contains("hidden") ||
    idPreview.textContent.trim() === "" ||
    idPreview.style.display === "none";
  assert.ok(
    isHiddenOrEmpty,
    'ID badge should be hidden when no case is loaded, got: "' + idPreview.textContent.trim() + '"'
  );
});

test("Step 2 now asks the hard gate about presence before 2026", async () => {
  const { window, document, appLoadError } = await buildDOM();
  if (appLoadError) throw new Error("app.js failed: " + appLoadError.message);

  const step2 = document.querySelector('[data-step="2"]');
  assert.ok(step2, "Step 2 element must exist");
  assert.match(step2.textContent, /1 de enero de 2026|5 meses/i);
});

test("Each analysis step (2-6) has at least one help block", async () => {
  const { window, document, appLoadError } = await buildDOM();
  if (appLoadError) throw new Error("app.js failed: " + appLoadError.message);

  for (let step = 2; step <= 6; step++) {
    const stepEl = document.querySelector('[data-step="' + step + '"]');
    assert.ok(stepEl, "Step " + step + " element must exist");
    const helpBlock = stepEl.querySelector("details.step-help");
    assert.ok(
      helpBlock,
      "Step " + step + " should have at least one <details class='step-help'> help block"
    );
  }
});

test("wizard stops early on the presence hard gate", async () => {
  const { window, document, appLoadError } = await buildDOM();
  if (appLoadError) throw new Error("app.js failed: " + appLoadError.message);

  document.getElementById("step-next").click();
  await new Promise((r) => setTimeout(r, 20));

  const activeBefore = document.querySelector(".analysis-step.active");
  assert.equal(activeBefore.dataset.step, "2");
  assert.match(document.getElementById("step-next").textContent, /Ver diagnostico/i);

  document.getElementById("step-next").click();
  await new Promise((r) => setTimeout(r, 20));

  const activeAfter = document.querySelector(".analysis-step.active");
  assert.equal(activeAfter.dataset.step, "2");
});

test("wizard asks minor-specific follow-up questions instead of stopping at step 1", async () => {
  const { window, document, appLoadError } = await buildDOM();
  if (appLoadError) throw new Error("app.js failed: " + appLoadError.message);

  const minorRadio = document.querySelector('input[name="personType"][value="minor"]');
  minorRadio.checked = true;
  minorRadio.dispatchEvent(new window.Event("change", { bubbles: true }));

  document.getElementById("step-next").click();
  await new Promise((r) => setTimeout(r, 20));

  const activeStep = document.querySelector(".analysis-step.active");
  assert.notEqual(activeStep.dataset.step, "1", "Minor flow should continue after step 1");
  assert.ok(
    document.querySelectorAll('input[name="minorBirthPlace"]').length >= 2,
    "Minor flow should ask whether the child was born in Spain or abroad"
  );
  assert.ok(
    document.querySelectorAll('input[name="minorGuardianStatus"]').length >= 2,
    "Minor flow should ask whether the parent or tutor is in a regular or irregular situation"
  );
});

test("wizard reaches valid-permit only after passing the presence gate", async () => {
  const { window, document, appLoadError } = await buildDOM();
  if (appLoadError) throw new Error("app.js failed: " + appLoadError.message);

  document.getElementById("step-next").click();
  setAnswers(document, { beforeJan2026: "yes", fiveMonths: "yes" });
  await new Promise((r) => setTimeout(r, 20));

  document.getElementById("step-next").click();
  await new Promise((r) => setTimeout(r, 20));

  const activeStep = document.querySelector(".analysis-step.active");
  assert.equal(activeStep.dataset.step, "3");
  assert.match(activeStep.textContent, /autorizacion de residencia en vigor/i);
});

test("step 4 exposes advanced exclusion questions beyond Ukraine and statelessness", async () => {
  const { window, document, appLoadError } = await buildDOM();
  if (appLoadError) throw new Error("app.js failed: " + appLoadError.message);

  document.getElementById("step-next").click();
  setAnswers(document, { beforeJan2026: "yes", fiveMonths: "yes" });
  await new Promise((r) => setTimeout(r, 20));
  document.getElementById("step-next").click();
  await new Promise((r) => setTimeout(r, 20));
  document.getElementById("step-next").click();
  await new Promise((r) => setTimeout(r, 20));

  const activeStep = document.querySelector(".analysis-step.active");
  assert.equal(activeStep.dataset.step, "4");
  assert.ok(
    document.querySelectorAll('input[name="rejectableRecord"]').length >= 2,
    "Step 4 should ask whether the person appears as rejectable"
  );
  assert.ok(
    document.querySelectorAll('input[name="nonReturnCommitment"]').length >= 2,
    "Step 4 should ask about an active non-return commitment"
  );
});

test("Date field has a hint explaining what to write", async () => {
  const { window, document, appLoadError } = await buildDOM();
  if (appLoadError) throw new Error("app.js failed: " + appLoadError.message);

  const dateField = document.getElementById("case-next-date");
  const dateContainer = dateField.closest(".field");
  const hint = dateContainer.querySelector(".field-hint");
  assert.ok(
    hint,
    "Date field should have a .field-hint element below it"
  );
  assert.ok(hint.textContent.trim().length > 5, "Date hint should have meaningful text");
});

test("copy summary button exists in the main actions", async () => {
  const { document, appLoadError } = await buildDOM();
  if (appLoadError) throw new Error("app.js failed: " + appLoadError.message);

  const button = document.getElementById("copy-summary-button");
  assert.ok(button, "Copy summary button should exist");
});

test("copy summary copies a compact follow-up text to clipboard", async () => {
  const { window, document, appLoadError } = await buildDOM();
  if (appLoadError) throw new Error("app.js failed: " + appLoadError.message);

  document.getElementById("case-name").value = "Persona Seguimiento";
  document.getElementById("case-volunteer").value = "Ane";
  document.getElementById("case-next-date").value = "2026-05-03";

  document.getElementById("case-form").dispatchEvent(
    new window.Event("submit", { bubbles: true, cancelable: true })
  );

  await new Promise((r) => setTimeout(r, 100));

  document.getElementById("copy-summary-button").click();
  await new Promise((r) => setTimeout(r, 50));

  assert.match(window.__copiedText, /REG-2026-00001/, "Copied summary should include the case ID");
  assert.match(window.__copiedText, /Persona Seguimiento/, "Copied summary should include the name");
  assert.match(window.__copiedText, /Proximo paso recomendado:/, "Copied summary should include next-step label");
  assert.match(window.__copiedText, /Persona voluntaria: Ane/, "Copied summary should include volunteer");
});

test("duplicate warning appears when phone matches an existing case", async () => {
  const existingCases = [{
    id: "REG-2026-00077",
    caseName: "Amina",
    phone: "612345678",
    email: "",
    locality: "Bergara"
  }];
  const { window, document, appLoadError } = await buildDOM({ cases: existingCases });
  if (appLoadError) throw new Error("app.js failed: " + appLoadError.message);

  const phoneField = document.getElementById("case-phone");
  phoneField.value = "612345678";
  phoneField.dispatchEvent(new window.Event("input", { bubbles: true }));

  const warning = document.getElementById("duplicate-warning");
  assert.ok(!warning.classList.contains("hidden"), "Duplicate warning should be visible");
  assert.match(warning.textContent, /REG-2026-00077/, "Warning should mention the existing case ID");
});

test("duplicate warning hides again when the duplicate value is removed", async () => {
  const existingCases = [{
    id: "REG-2026-00077",
    caseName: "Amina",
    phone: "612345678",
    email: "",
    locality: "Bergara"
  }];
  const { window, document, appLoadError } = await buildDOM({ cases: existingCases });
  if (appLoadError) throw new Error("app.js failed: " + appLoadError.message);

  const phoneField = document.getElementById("case-phone");
  const warning = document.getElementById("duplicate-warning");

  phoneField.value = "612345678";
  phoneField.dispatchEvent(new window.Event("input", { bubbles: true }));
  assert.ok(!warning.classList.contains("hidden"), "Duplicate warning should first become visible");

  phoneField.value = "699999999";
  phoneField.dispatchEvent(new window.Event("input", { bubbles: true }));
  assert.ok(warning.classList.contains("hidden"), "Duplicate warning should hide when the match disappears");
});
