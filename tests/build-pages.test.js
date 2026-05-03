const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "dist", "pages");

test("build-pages generates public, simulator, and private web entries", () => {
  execFileSync("node", [path.join(ROOT, "scripts", "build-pages.js")], {
    cwd: ROOT,
    stdio: "pipe"
  });

  const publicHtml = fs.readFileSync(path.join(OUTPUT, "index.html"), "utf8");
  const simulatorHtml = fs.readFileSync(path.join(OUTPUT, "simulador.html"), "utf8");
  const privateHtml = fs.readFileSync(path.join(OUTPUT, "private.html"), "utf8");
  const configJs = fs.readFileSync(path.join(OUTPUT, "config.js"), "utf8");
  const logoPath = path.join(OUTPUT, "assets", "sindicato-socialista-vivienda.png");

  assert.match(publicHtml, /Probar orientaci[oó]n p[uú]blica/);
  assert.match(publicHtml, /simulador\.html/);
  assert.match(publicHtml, /assets\/sindicato-socialista-vivienda\.png/);
  assert.match(simulatorHtml, /id="case-form"/);
  assert.match(privateHtml, /id="auth-shell"/);
  assert.match(privateHtml, /supabase-web\.js/);
  assert.match(privateHtml, /assets\/sindicato-socialista-vivienda\.png/);
  assert.match(configJs, /REGULARIZAZIOA_SUPABASE_CONFIG/);
  assert.equal(fs.existsSync(logoPath), true);
});
