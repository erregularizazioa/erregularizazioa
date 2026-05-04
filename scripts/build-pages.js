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
  "pages/public-submit.js",
  "pages/assets"
];

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
  const publicSubmitHtml = appHtml.replace(
    '  <script src="translations.js"></script>\n  <script src="logic.js"></script>\n  <script src="app.js"></script>',
    [
      '  <script src="config.js"></script>',
      '  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>',
      '  <script src="translations.js"></script>',
      '  <script src="logic.js"></script>',
      '  <script src="public-submit.js"></script>',
      '  <script src="app.js"></script>'
    ].join("\n")
  );

  await Promise.all([
    fs.promises.writeFile(path.join(OUTPUT_DIR, "index.html"), publicSubmitHtml),
    fs.promises.writeFile(path.join(OUTPUT_DIR, "simulador.html"), publicSubmitHtml)
  ]);

  await fs.promises.writeFile(path.join(OUTPUT_DIR, ".nojekyll"), "");

  process.stdout.write("GitHub Pages bundle generated in dist/pages\n");
}

main().catch(function(error) {
  process.stderr.write(error.stack + "\n");
  process.exitCode = 1;
});
