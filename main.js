const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const db = require("./db");

// Keep a global reference to the window so it is not garbage-collected
let mainWindow;

function getDataDir() {
  // In dev: store data in a local ./data folder so you can inspect it easily.
  // When packaged: store in the standard userData directory so it survives app updates.
  if (app.isPackaged) {
    return app.getPath("userData");
  }
  return path.join(__dirname, "data");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    title: "Regularizazioa 2026"
  });

  mainWindow.loadFile("index.html");
  mainWindow.on("closed", () => { mainWindow = null; });
}

function timestampForFileName() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function backupDirPath() {
  return path.join(getDataDir(), "backups");
}

app.whenReady().then(async () => {
  await db.initialize(getDataDir());
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Single-instance lock so double-clicking the exe while open just focuses the window
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ── IPC handlers ────────────────────────────────────────────────────────────

ipcMain.handle("getCases", () => {
  return db.getAllCases();
});

ipcMain.handle("getRepresentatives", () => {
  return db.getAllRepresentatives();
});

ipcMain.handle("getNextId", () => {
  return db.getNextId();
});

ipcMain.handle("saveRepresentative", (_event, representativeData) => {
  return db.saveRepresentative(representativeData);
});

ipcMain.handle("saveCase", (_event, caseData) => {
  return db.saveCase(caseData);
});

ipcMain.handle("exportExcel", async (_event, casesData) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Exportar a Excel",
    defaultPath: "casos-regularizacion.xlsx",
    filters: [{ name: "Excel", extensions: ["xlsx"] }]
  });

  if (result.canceled) {
    return { ok: false, reason: "cancelled" };
  }

  try {
    await db.writeExcel(result.filePath, casesData);
    // Open the containing folder so the user can find the file immediately
    shell.showItemInFolder(result.filePath);
    return { ok: true, path: result.filePath };
  } catch (error) {
    return { ok: false, reason: error.message };
  }
});

ipcMain.handle("backupDatabase", async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Guardar copia de seguridad",
    defaultPath: "regularizazioa-backup-" + timestampForFileName() + ".db",
    filters: [{ name: "SQLite", extensions: ["db", "sqlite", "backup"] }]
  });

  if (result.canceled) {
    return { ok: false, reason: "cancelled" };
  }

  try {
    db.writeBackup(result.filePath);
    shell.showItemInFolder(result.filePath);
    return { ok: true, path: result.filePath };
  } catch (error) {
    return { ok: false, reason: error.message };
  }
});

ipcMain.handle("restoreDatabase", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Restaurar copia de seguridad",
    properties: ["openFile"],
    filters: [{ name: "SQLite", extensions: ["db", "sqlite", "backup"] }]
  });

  if (result.canceled || !result.filePaths.length) {
    return { ok: false, reason: "cancelled" };
  }

  try {
    const selectedPath = result.filePaths[0];
    const backupInfo = db.inspectBackup(selectedPath);
    const confirm = await dialog.showMessageBox(mainWindow, {
      type: "warning",
      buttons: ["Restaurar", "Cancelar"],
      defaultId: 1,
      cancelId: 1,
      title: "Confirmar restauracion",
      message: "Se reemplazaran los datos actuales por la copia seleccionada.",
      detail:
        "Casos en la copia: " + backupInfo.caseCount + "\n" +
        "Version de esquema: " + backupInfo.schemaVersion + "\n" +
        "Ultima actividad detectada: " + (backupInfo.latestActivityAt || "sin datos") + "\n\n" +
        "Antes de restaurar se guardara una copia automatica de seguridad de la base actual."
    });

    if (confirm.response !== 0) {
      return { ok: false, reason: "cancelled" };
    }

    const autoBackupDir = backupDirPath();
    await fs.promises.mkdir(autoBackupDir, { recursive: true });
    const autoBackupPath = path.join(autoBackupDir, "pre-restore-" + timestampForFileName() + ".db");
    db.writeBackup(autoBackupPath);

    const cases = db.restoreBackup(selectedPath);
    return { ok: true, path: selectedPath, autoBackupPath, cases };
  } catch (error) {
    return { ok: false, reason: error.message };
  }
});
