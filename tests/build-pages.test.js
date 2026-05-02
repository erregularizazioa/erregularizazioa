const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "dist", "pages");

test("build-pages generates public and private web entries", () => {
  execFileSync("node", [path.join(ROOT, "scripts", "build-pages.js")], {
    cwd: ROOT,
    stdio: "pipe"
  });

  const publicHtml = fs.readFileSync(path.join(OUTPUT, "index.html"), "utf8");
  const privateHtml = fs.readFileSync(path.join(OUTPUT, "private.html"), "utf8");
  const configJs = fs.readFileSync(path.join(OUTPUT, "config.js"), "utf8");

  assert.match(publicHtml, /Entrar al area privada/);
  assert.match(privateHtml, /id="auth-shell"/);
  assert.match(privateHtml, /supabase-web\.js/);
  assert.match(configJs, /REGULARIZAZIOA_SUPABASE_CONFIG/);
});
