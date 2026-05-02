const fs = require("fs");
const path = require("path");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") {
    return;
  }

  const resourcesDir = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
    "Contents",
    "Resources"
  );
  const defaultIconPath = path.join(resourcesDir, "electron.icns");

  if (fs.existsSync(defaultIconPath)) {
    await fs.promises.unlink(defaultIconPath);
  }
};
