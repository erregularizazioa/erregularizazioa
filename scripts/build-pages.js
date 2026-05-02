const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "dist", "pages");
const FILES_TO_COPY = [
  "index.html",
  "app.js",
  "logic.js",
  "translations.js",
  "styles.css"
];

async function main() {
  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });

  await Promise.all(FILES_TO_COPY.map(async function(fileName) {
    await fs.promises.copyFile(
      path.join(ROOT_DIR, fileName),
      path.join(OUTPUT_DIR, fileName)
    );
  }));

  await fs.promises.writeFile(path.join(OUTPUT_DIR, ".nojekyll"), "");

  process.stdout.write("GitHub Pages bundle generated in dist/pages\n");
}

main().catch(function(error) {
  process.stderr.write(error.stack + "\n");
  process.exitCode = 1;
});
