const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "dist", "pages");
const SHARED_PATHS_TO_COPY = [
  "app.js",
  "logic.js",
  "translations.js",
  "styles.css",
  "pages/config.js",
  "pages/favicon.ico",
  "pages/supabase-web.js",
  "pages/assets"
];

function injectPrivateShell(appHtml) {
  return appHtml
    .replace(
      '<main class="layout">',
      [
        '<section id="auth-shell" class="layout auth-layout">',
        '  <section class="panel auth-panel auth-panel-simple">',
        '    <img class="auth-brand-logo" src="./assets/sindicato-socialista-vivienda.png" alt="Sindicato Socialista de Vivienda">',
        '    <p class="eyebrow">Área privada del equipo</p>',
        '    <h1>Entrar</h1>',
        '    <p class="intro">Usa tu usuario autorizado para abrir los casos guardados y continuar el seguimiento.</p>',
        '    <div class="notice info auth-notice" role="status">La portada pública explica la herramienta. Los casos reales solo se guardan aquí.</div>',
        '    <form id="login-form" class="auth-form">',
        '      <label class="field">',
        '        <span>Email autorizado</span>',
        '        <input id="login-email" type="email" placeholder="tu-correo@ejemplo.org" autocomplete="email" required>',
        '      </label>',
        '      <label class="field">',
        '        <span>Contraseña</span>',
        '        <input id="login-password" type="password" placeholder="Tu contraseña" autocomplete="current-password" required>',
        '      </label>',
        '      <div class="actions auth-actions">',
        '        <button type="submit">Entrar</button>',
        '        <a class="secondary-link" href="./">Volver a la página pública</a>',
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
        '        <button id="logout-button" type="button" class="secondary">Cerrar sesión</button>',
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

  await Promise.all(SHARED_PATHS_TO_COPY.map(async function(entryPath) {
    const sourcePath = path.join(ROOT_DIR, entryPath);
    const outputPath = path.join(OUTPUT_DIR, entryPath.replace(/^pages\//, ""));
    const sourceStats = await fs.promises.stat(sourcePath);

    if (sourceStats.isDirectory()) {
      await fs.promises.cp(sourcePath, outputPath, { recursive: true });
      return;
    }

    await fs.promises.copyFile(sourcePath, outputPath);
  }));

  const appHtml = await fs.promises.readFile(path.join(ROOT_DIR, "index.html"), "utf8");
  const publicHtml = await fs.promises.readFile(path.join(ROOT_DIR, "pages", "public-index.html"), "utf8");
  const privateHtml = injectPrivateShell(appHtml);

  await Promise.all([
    fs.promises.writeFile(path.join(OUTPUT_DIR, "index.html"), publicHtml),
    fs.promises.writeFile(path.join(OUTPUT_DIR, "simulador.html"), appHtml),
    fs.promises.writeFile(path.join(OUTPUT_DIR, "private.html"), privateHtml)
  ]);

  await fs.promises.writeFile(path.join(OUTPUT_DIR, ".nojekyll"), "");

  process.stdout.write("GitHub Pages bundle generated in dist/pages\n");
}

main().catch(function(error) {
  process.stderr.write(error.stack + "\n");
  process.exitCode = 1;
});
