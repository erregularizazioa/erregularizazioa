const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");
const ExcelJS = require("exceljs");

const SCHEMA_VERSION = 1;

let db;
let dbFilePath;
let SQLLib;

const EXCEL_COLUMNS = [
  { header: "ID",                       key: "id",                       width: 18 },
  { header: "Nombre o alias",           key: "caseName",                 width: 25 },
  { header: "Telefono",                 key: "phone",                    width: 15 },
  { header: "Email",                    key: "email",                    width: 30 },
  { header: "Municipio",                key: "locality",                 width: 15 },
  { header: "Voluntariado",             key: "volunteer",                width: 20 },
  { header: "Ruta orientativa",         key: "route",                    width: 35 },
  { header: "Diagnostico",             key: "resultTitle",              width: 50 },
  { header: "Estado del caso",          key: "caseStatus",               width: 22 },
  { header: "Documentos pendientes",    key: "documentsPendingSummary",  width: 60 },
  { header: "Pasos pendientes",         key: "stepsPendingSummary",      width: 60 },
  { header: "Proximo paso recomendado", key: "nextAction",               width: 60 },
  { header: "Notas",                    key: "notes",                    width: 60 },
  { header: "Creado",                   key: "createdAt",                width: 22 },
  { header: "Actualizado",              key: "updatedAt",                width: 22 }
];

// Persist the in-memory DB to disk after every write
function flush() {
  const data = db.export();
  fs.writeFileSync(dbFilePath, Buffer.from(data));
}

// Run a SELECT and return an array of plain objects
function query(sql, params) {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// Run a single SELECT and return the first row, or null
function queryOne(sql, params) {
  const rows = query(sql, params);
  return rows.length ? rows[0] : null;
}

function queryWithDb(database, sql, params) {
  const stmt = database.prepare(sql);
  if (params) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOneWithDb(database, sql, params) {
  const rows = queryWithDb(database, sql, params);
  return rows.length ? rows[0] : null;
}

async function initialize(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  dbFilePath = path.join(dataDir, "regularizazioa.db");

  SQLLib = SQLLib || await initSqlJs();

  if (fs.existsSync(dbFilePath)) {
    const fileBuffer = fs.readFileSync(dbFilePath);
    db = new SQLLib.Database(fileBuffer);
  } else {
    db = new SQLLib.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      case_name TEXT NOT NULL DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      locality TEXT DEFAULT '',
      volunteer TEXT DEFAULT '',
      route TEXT DEFAULT '',
      result_title TEXT DEFAULT '',
      result_summary TEXT DEFAULT '',
      case_status TEXT DEFAULT 'Nuevo',
      next_date TEXT DEFAULT '',
      next_action TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      documents_pending TEXT DEFAULT '',
      steps_pending TEXT DEFAULT '',
      answers TEXT DEFAULT '{}',
      checks TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO meta (key, value) VALUES ('case_counter', '0');
    INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}');
  `);

  migrateSchema();
  flush();
}

function migrateSchema() {
  const row = queryOne("SELECT value FROM meta WHERE key = ?", ["schema_version"]);
  const currentVersion = row ? Number(row.value) : 0;

  if (currentVersion < 1) {
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", ["schema_version", String(SCHEMA_VERSION)]);
    return;
  }

  if (currentVersion !== SCHEMA_VERSION) {
    db.run("UPDATE meta SET value = ? WHERE key = ?", [String(SCHEMA_VERSION), "schema_version"]);
  }
}

function loadDatabaseFromFile(filePath) {
  if (!SQLLib) {
    throw new Error("La base de datos todavia no esta inicializada.");
  }

  const fileBuffer = fs.readFileSync(filePath);
  return new SQLLib.Database(fileBuffer);
}

function assertValidAppDatabase(database) {
  const requiredTables = ["cases", "meta"];
  requiredTables.forEach(function(tableName) {
    const row = queryOneWithDb(
      database,
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      [tableName]
    );
    if (!row) {
      throw new Error("El fichero seleccionado no es una copia valida de Regularizazioa.");
    }
  });

  const schemaRow = queryOneWithDb(database, "SELECT value FROM meta WHERE key = ?", ["schema_version"]);
  if (!schemaRow) {
    throw new Error("La copia no tiene informacion de version y no se puede restaurar con seguridad.");
  }
}

function inspectBackup(backupPath) {
  const inspectDb = loadDatabaseFromFile(backupPath);

  try {
    assertValidAppDatabase(inspectDb);

    const countRow = queryOneWithDb(inspectDb, "SELECT COUNT(*) AS count FROM cases");
    const latestRow = queryOneWithDb(
      inspectDb,
      "SELECT MAX(updated_at) AS updated_at, MAX(created_at) AS created_at FROM cases"
    );
    const schemaRow = queryOneWithDb(inspectDb, "SELECT value FROM meta WHERE key = ?", ["schema_version"]);

    return {
      path: backupPath,
      caseCount: Number(countRow && countRow.count),
      schemaVersion: Number(schemaRow && schemaRow.value),
      latestActivityAt: (latestRow && (latestRow.updated_at || latestRow.created_at)) || ""
    };
  } finally {
    if (typeof inspectDb.close === "function") inspectDb.close();
  }
}

function rowToCase(row) {
  if (!row) return null;
  return {
    id:                      row.id,
    caseName:                row.case_name,
    phone:                   row.phone,
    email:                   row.email,
    locality:                row.locality,
    volunteer:               row.volunteer,
    route:                   row.route,
    resultTitle:             row.result_title,
    resultSummary:           row.result_summary,
    caseStatus:              row.case_status,
    nextDate:                row.next_date,
    nextAction:              row.next_action,
    notes:                   row.notes,
    documentsPendingSummary: row.documents_pending,
    stepsPendingSummary:     row.steps_pending,
    answers:                 JSON.parse(row.answers || "{}"),
    checks:                  JSON.parse(row.checks || "{}"),
    createdAt:               row.created_at,
    updatedAt:               row.updated_at
  };
}

function getAllCases() {
  return query("SELECT * FROM cases ORDER BY updated_at DESC, created_at DESC").map(rowToCase);
}

function getNextId() {
  const row = queryOne("SELECT value FROM meta WHERE key = ?", ["case_counter"]);
  const next = Number(row.value) + 1;
  db.run("UPDATE meta SET value = ? WHERE key = ?", [String(next), "case_counter"]);
  flush();
  return "REG-2026-" + String(next).padStart(5, "0");
}

function saveCase(caseData) {
  const now = new Date().toISOString();
  const existing = queryOne("SELECT id, created_at FROM cases WHERE id = ?", [caseData.id]);

  db.run(`
    INSERT INTO cases (
      id, case_name, phone, email, locality, volunteer, route,
      result_title, result_summary, case_status, next_date, next_action,
      notes, documents_pending, steps_pending, answers, checks,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      case_name = excluded.case_name,
      phone = excluded.phone,
      email = excluded.email,
      locality = excluded.locality,
      volunteer = excluded.volunteer,
      route = excluded.route,
      result_title = excluded.result_title,
      result_summary = excluded.result_summary,
      case_status = excluded.case_status,
      next_date = excluded.next_date,
      next_action = excluded.next_action,
      notes = excluded.notes,
      documents_pending = excluded.documents_pending,
      steps_pending = excluded.steps_pending,
      answers = excluded.answers,
      checks = excluded.checks,
      updated_at = excluded.updated_at
  `, [
    caseData.id,
    String(caseData.caseName || ""),
    String(caseData.phone || ""),
    String(caseData.email || ""),
    String(caseData.locality || ""),
    String(caseData.volunteer || ""),
    String(caseData.route || ""),
    String(caseData.resultTitle || ""),
    String(caseData.resultSummary || ""),
    String(caseData.caseStatus || "Nuevo"),
    String(caseData.nextDate || ""),
    String(caseData.nextAction || ""),
    String(caseData.notes || ""),
    String(caseData.documentsPendingSummary || ""),
    String(caseData.stepsPendingSummary || ""),
    JSON.stringify(caseData.answers || {}),
    JSON.stringify(caseData.checks || {}),
    existing ? existing.created_at : (caseData.createdAt || now),
    now
  ]);

  // Keep counter in sync when importing a case with a higher number
  const match = /REG-2026-(\d+)$/.exec(caseData.id || "");
  if (match) {
    const num = Number(match[1]);
    const counterRow = queryOne("SELECT value FROM meta WHERE key = ?", ["case_counter"]);
    if (num > Number(counterRow.value)) {
      db.run("UPDATE meta SET value = ? WHERE key = ?", [String(num), "case_counter"]);
    }
  }

  flush();
  return rowToCase(queryOne("SELECT * FROM cases WHERE id = ?", [caseData.id]));
}

async function writeExcel(filePath, casesData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Regularizazioa 2026";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Casos", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  sheet.columns = EXCEL_COLUMNS;

  const headerRow = sheet.getRow(1);
  headerRow.font      = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1e3a5f" } };
  headerRow.alignment = { vertical: "middle", wrapText: false };
  headerRow.height    = 22;

  casesData.forEach(function(c, index) {
    const row = sheet.addRow({
      id:                      c.id,
      caseName:                c.caseName,
      phone:                   c.phone,
      email:                   c.email,
      locality:                c.locality,
      volunteer:               c.volunteer,
      route:                   c.route,
      resultTitle:             c.resultTitle,
      caseStatus:              c.caseStatus,
      documentsPendingSummary: c.documentsPendingSummary,
      stepsPendingSummary:     c.stepsPendingSummary,
      nextAction:              c.nextAction,
      notes:                   c.notes,
      createdAt:               c.createdAt,
      updatedAt:               c.updatedAt
    });
    if (index % 2 === 1) {
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4F8" } };
    }
  });

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: EXCEL_COLUMNS.length }
  };

  await workbook.xlsx.writeFile(filePath);
}

function writeBackup(backupPath) {
  flush();
  fs.copyFileSync(dbFilePath, backupPath);
  return backupPath;
}

function restoreBackup(backupPath) {
  const nextDb = loadDatabaseFromFile(backupPath);
  assertValidAppDatabase(nextDb);

  if (db && typeof db.close === "function") {
    db.close();
  }
  db = nextDb;
  migrateSchema();
  flush();
  return getAllCases();
}

function getSchemaVersion() {
  const row = queryOne("SELECT value FROM meta WHERE key = ?", ["schema_version"]);
  return Number(row && row.value);
}

module.exports = {
  SCHEMA_VERSION,
  initialize,
  getAllCases,
  getNextId,
  saveCase,
  writeExcel,
  writeBackup,
  inspectBackup,
  restoreBackup,
  getSchemaVersion
};
