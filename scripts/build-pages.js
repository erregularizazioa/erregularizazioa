const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "dist", "pages");
const SHARED_FILES_TO_COPY = [
  "app.js",
  "logic.js",
  "translations.js",
  "styles.css",
  "pages/config.js",
  "pages/supabase-web.js"
];

function injectPrivateShell(appHtml) {
  return appHtml
    .replace(
      '<main class="layout">',
      [
        '<section id="auth-shell" class="layout auth-layout">',
        '  <section class="panel auth-panel">',
        '    <p class="eyebrow">Regularizacion extraordinaria 2026</p>',
        '    <h1>Area privada</h1>',
        '    <p class="intro">Acceso restringido para el equipo invitado. Inicia sesion con tu correo autorizado para abrir la base centralizada de casos.</p>',
        '    <form id="login-form" class="auth-form">',
        '      <label class="field">',
        '        <span>Email autorizado</span>',
        '        <input id="login-email" type="email" placeholder="tu-correo@ejemplo.org" autocomplete="email" required>',
        '      </label>',
        '      <div class="actions">',
        '        <button type="submit">Enviar enlace de acceso</button>',
        '        <a class="secondary-link" href="./">Volver a la pagina publica</a>',
        '      </div>',
        '      <div id="login-message" class="notice hidden" role="status"></div>',
        '    </form>',
        '  </section>',
        '</section>',
        '',
        '<main id="private-app" class="layout hidden">'
      ].join("\n")
    )
    .replace(
      '      <div id="runtime-mode-message" class="notice info hidden" role="status" data-i18n="static.banner">\n        Esta version publica solo muestra el simulador y la orientacion. No guarda casos ni exporta datos.\n      </div>\n    </header>',
      [
        '      <div id="runtime-mode-message" class="notice info hidden" role="status" data-i18n="static.banner">',
        '        Esta version publica solo muestra el simulador y la orientacion. No guarda casos ni exporta datos.',
        '      </div>',
        '      <div id="private-userbar" class="private-userbar hidden">',
        '        <span id="current-user-email" class="note"></span>',
        '        <button id="logout-button" type="button" class="secondary">Cerrar sesion</button>',
        '      </div>',
        '    </header>'
      ].join("\n")
    )
    .replace(
      '  <script src="translations.js"></script>\n  <script src="logic.js"></script>\n  <script src="app.js"></script>',
      [
        '  <script src="config.js"></script>',
        '  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',
        '  <script src="translations.js"></script>',
        '  <script src="logic.js"></script>',
        '  <script src="supabase-web.js"></script>',
        '  <script src="app.js"></script>'
      ].join("\n")
    );
}

async function main() {
  await fs.promises.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });

  await Promise.all(SHARED_FILES_TO_COPY.map(async function(fileName) {
    const outputName = fileName.replace(/^pages\//, "");
    await fs.promises.copyFile(
      path.join(ROOT_DIR, fileName),
      path.join(OUTPUT_DIR, outputName)
    );
  }));

  const appHtml = await fs.promises.readFile(path.join(ROOT_DIR, "index.html"), "utf8");
  const publicHtml = await fs.promises.readFile(path.join(ROOT_DIR, "pages", "public-index.html"), "utf8");
  const privateHtml = injectPrivateShell(appHtml);

  await Promise.all([
    fs.promises.writeFile(path.join(OUTPUT_DIR, "index.html"), publicHtml),
    fs.promises.writeFile(path.join(OUTPUT_DIR, "private.html"), privateHtml)
  ]);

  await fs.promises.writeFile(path.join(OUTPUT_DIR, ".nojekyll"), "");

  process.stdout.write("GitHub Pages bundle generated in dist/pages\n");
}

main().catch(function(error) {
  process.stderr.write(error.stack + "\n");
  process.exitCode = 1;
});
