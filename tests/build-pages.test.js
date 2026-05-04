const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "dist", "pages");

test("build-pages generates public submit form", () => {
  execFileSync("node", [path.join(ROOT, "scripts", "build-pages.js")], {
    cwd: ROOT,
    stdio: "pipe"
  });

  const publicHtml = fs.readFileSync(path.join(OUTPUT, "index.html"), "utf8");
  const simulatorHtml = fs.readFileSync(path.join(OUTPUT, "simulador.html"), "utf8");
  const configJs = fs.readFileSync(path.join(OUTPUT, "config.js"), "utf8");
  const logoPath = path.join(OUTPUT, "assets", "sindicato-socialista-vivienda.png");

  assert.match(publicHtml, /id="case-form"/);
  assert.match(publicHtml, /challenges\.cloudflare\.com\/turnstile/);
  assert.match(publicHtml, /id="submit-captcha"/);
  assert.match(publicHtml, /id="privacy-consent"/);
  assert.match(publicHtml, /simulador\.html/);
  assert.doesNotMatch(publicHtml, /logic\.js/);
  assert.doesNotMatch(publicHtml, /public-landing/);
  assert.match(simulatorHtml, /id="case-form"/);
  assert.match(simulatorHtml, /id="analysis-fieldset"/);
  assert.match(simulatorHtml, /id="guidance-preview"/);
  assert.match(simulatorHtml, /logic\.js/);
  assert.match(simulatorHtml, /simulator-app\.js/);
  assert.match(simulatorHtml, /simulator-styles\.css/);
  assert.doesNotMatch(simulatorHtml, /submit-captcha/);
  assert.doesNotMatch(simulatorHtml, /id="case-name"/);
  assert.doesNotMatch(simulatorHtml, /presentation\.legend/);
  assert.doesNotMatch(simulatorHtml, /case-presentation/);
  assert.doesNotMatch(simulatorHtml, /save-case-button/);
  assert.match(configJs, /captchaSiteKey/);
  assert.match(configJs, /0x4AAAAAADIwsa3zmnhOfgGb/);
  assert.match(configJs, /submitFunctionUrl/);
  assert.match(configJs, /REGULARIZAZIOA_SUPABASE_CONFIG/);
  assert.equal(fs.existsSync(logoPath), true);
  assert.equal(fs.existsSync(path.join(OUTPUT, "private.html")), false);
});
