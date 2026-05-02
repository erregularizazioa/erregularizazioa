const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");
const ExcelJS = require("exceljs");

const SCHEMA_VERSION = 4;

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
  { header: "Representante",            key: "representativeName",       width: 25 },
  { header: "Telefono representante",   key: "representativePhone",      width: 18 },
  { header: "Email representante",      key: "representativeEmail",      width: 30 },
  { header: "Notificaciones",           key: "notificationTarget",       width: 22 },
  { header: "Entidad colaboradora",     key: "presentationByCollaborator", width: 22 },
  { header: "Presentara",               key: "presentationPresenter",    width: 24 },
  { header: "Autorizacion firmada",     key: "presentationAuthorizationSigned", width: 22 },
  { header: "Documentacion completa",   key: "presentationDocumentsReady", width: 22 },
  { header: "Lista para Mercurio",      key: "presentationMercurioReady", width: 20 },
  { header: "Fecha de presentacion",    key: "presentationDate",         width: 18 },
  { header: "Numero de registro",       key: "presentationRegistryNumber", width: 26 },
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
      representative_id TEXT DEFAULT '',
      representative_name TEXT DEFAULT '',
      representative_phone TEXT DEFAULT '',
      representative_email TEXT DEFAULT '',
      notification_target TEXT DEFAULT 'persona',
      presentation_by_collaborator TEXT DEFAULT '',
      presentation_presenter TEXT DEFAULT '',
      presentation_authorization_signed TEXT DEFAULT '',
      presentation_documents_ready TEXT DEFAULT '',
      presentation_mercurio_ready TEXT DEFAULT '',
      presentation_date TEXT DEFAULT '',
      presentation_registry_number TEXT DEFAULT '',
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

    CREATE TABLE IF NOT EXISTS representatives (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO meta (key, value) VALUES ('case_counter', '0');
    INSERT OR IGNORE INTO meta (key, value) VALUES ('representative_counter', '0');
    INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}');
  `);

  migrateSchema();
  flush();
}

function migrateSchema() {
  const row = queryOne("SELECT value FROM meta WHERE key = ?", ["schema_version"]);
  let currentVersion = row ? Number(row.value) : 0;
  let changed = !row;

  if (currentVersion < 2) {
    db.run("ALTER TABLE cases ADD COLUMN representative_name TEXT DEFAULT ''");
    db.run("ALTER TABLE cases ADD COLUMN representative_phone TEXT DEFAULT ''");
    db.run("ALTER TABLE cases ADD COLUMN representative_email TEXT DEFAULT ''");
    db.run("ALTER TABLE cases ADD COLUMN notification_target TEXT DEFAULT 'persona'");
    currentVersion = 2;
    changed = true;
  }

  if (currentVersion < 3) {
    db.run("ALTER TABLE cases ADD COLUMN presentation_by_collaborator TEXT DEFAULT ''");
    db.run("ALTER TABLE cases ADD COLUMN presentation_presenter TEXT DEFAULT ''");
    db.run("ALTER TABLE cases ADD COLUMN presentation_authorization_signed TEXT DEFAULT ''");
    db.run("ALTER TABLE cases ADD COLUMN presentation_documents_ready TEXT DEFAULT ''");
    db.run("ALTER TABLE cases ADD COLUMN presentation_mercurio_ready TEXT DEFAULT ''");
    db.run("ALTER TABLE cases ADD COLUMN presentation_date TEXT DEFAULT ''");
    db.run("ALTER TABLE cases ADD COLUMN presentation_registry_number TEXT DEFAULT ''");
    currentVersion = 3;
    changed = true;
  }

  if (currentVersion < 4) {
    db.run("ALTER TABLE cases ADD COLUMN representative_id TEXT DEFAULT ''");
    db.run(`
      CREATE TABLE IF NOT EXISTS representatives (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        phone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        updated_at TEXT NOT NULL
      )
    `);
    db.run("INSERT OR IGNORE INTO meta (key, value) VALUES ('representative_counter', '0')");
    currentVersion = 4;
    changed = true;
  }

  if (changed || currentVersion !== SCHEMA_VERSION) {
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", ["schema_version", String(SCHEMA_VERSION)]);
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
    representativeId:        row.representative_id,
    representativeName:      row.representative_name,
    representativePhone:     row.representative_phone,
    representativeEmail:     row.representative_email,
    notificationTarget:      row.notification_target,
    presentationByCollaborator: row.presentation_by_collaborator,
    presentationPresenter:   row.presentation_presenter,
    presentationAuthorizationSigned: row.presentation_authorization_signed,
    presentationDocumentsReady: row.presentation_documents_ready,
    presentationMercurioReady: row.presentation_mercurio_ready,
    presentationDate:        row.presentation_date,
    presentationRegistryNumber: row.presentation_registry_number,
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

function rowToRepresentative(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    updatedAt: row.updated_at
  };
}

function getAllRepresentatives() {
  return query("SELECT * FROM representatives ORDER BY LOWER(name), updated_at DESC").map(rowToRepresentative);
}

function getNextId() {
  const row = queryOne("SELECT value FROM meta WHERE key = ?", ["case_counter"]);
  const next = Number(row.value) + 1;
  db.run("UPDATE meta SET value = ? WHERE key = ?", [String(next), "case_counter"]);
  flush();
  return "REG-2026-" + String(next).padStart(5, "0");
}

function getNextRepresentativeId() {
  const row = queryOne("SELECT value FROM meta WHERE key = ?", ["representative_counter"]);
  const next = Number(row && row.value || 0) + 1;
  db.run("UPDATE meta SET value = ? WHERE key = ?", [String(next), "representative_counter"]);
  return "REP-" + String(next).padStart(5, "0");
}

function saveRepresentative(representativeData) {
  const now = new Date().toISOString();
  const existingId = String(representativeData && representativeData.id || "").trim();
  const name = String(representativeData && representativeData.name || "").trim();
  const phone = String(representativeData && representativeData.phone || "").trim();
  const email = String(representativeData && representativeData.email || "").trim();

  if (!name) {
    throw new Error("El representante necesita al menos un nombre.");
  }

  const id = existingId || getNextRepresentativeId();

  db.run(`
    INSERT INTO representatives (id, name, phone, email, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      phone = excluded.phone,
      email = excluded.email,
      updated_at = excluded.updated_at
  `, [id, name, phone, email, now]);

  const match = /^REP-(\d+)$/.exec(id);
  if (match) {
    const num = Number(match[1]);
    const counterRow = queryOne("SELECT value FROM meta WHERE key = ?", ["representative_counter"]);
    if (num > Number(counterRow && counterRow.value || 0)) {
      db.run("UPDATE meta SET value = ? WHERE key = ?", [String(num), "representative_counter"]);
    }
  }

  flush();
  return rowToRepresentative(queryOne("SELECT * FROM representatives WHERE id = ?", [id]));
}

function saveCase(caseData) {
  const now = new Date().toISOString();
  const existing = queryOne("SELECT id, created_at FROM cases WHERE id = ?", [caseData.id]);

  db.run(`
    INSERT INTO cases (
      id, case_name, phone, email, locality, volunteer,
      representative_id,
      representative_name, representative_phone, representative_email, notification_target,
      presentation_by_collaborator, presentation_presenter, presentation_authorization_signed,
      presentation_documents_ready, presentation_mercurio_ready, presentation_date, presentation_registry_number,
      route,
      result_title, result_summary, case_status, next_date, next_action,
      notes, documents_pending, steps_pending, answers, checks,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      case_name = excluded.case_name,
      phone = excluded.phone,
      email = excluded.email,
      locality = excluded.locality,
      volunteer = excluded.volunteer,
      representative_id = excluded.representative_id,
      representative_name = excluded.representative_name,
      representative_phone = excluded.representative_phone,
      representative_email = excluded.representative_email,
      notification_target = excluded.notification_target,
      presentation_by_collaborator = excluded.presentation_by_collaborator,
      presentation_presenter = excluded.presentation_presenter,
      presentation_authorization_signed = excluded.presentation_authorization_signed,
      presentation_documents_ready = excluded.presentation_documents_ready,
      presentation_mercurio_ready = excluded.presentation_mercurio_ready,
      presentation_date = excluded.presentation_date,
      presentation_registry_number = excluded.presentation_registry_number,
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
    String(caseData.representativeId || ""),
    String(caseData.representativeName || ""),
    String(caseData.representativePhone || ""),
    String(caseData.representativeEmail || ""),
    String(caseData.notificationTarget || "persona"),
    String(caseData.presentationByCollaborator || ""),
    String(caseData.presentationPresenter || ""),
    String(caseData.presentationAuthorizationSigned || ""),
    String(caseData.presentationDocumentsReady || ""),
    String(caseData.presentationMercurioReady || ""),
    String(caseData.presentationDate || ""),
    String(caseData.presentationRegistryNumber || ""),
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
      representativeName:      c.representativeName,
      representativePhone:     c.representativePhone,
      representativeEmail:     c.representativeEmail,
      notificationTarget:      c.notificationTarget,
      presentationByCollaborator: c.presentationByCollaborator,
      presentationPresenter:   c.presentationPresenter,
      presentationAuthorizationSigned: c.presentationAuthorizationSigned,
      presentationDocumentsReady: c.presentationDocumentsReady,
      presentationMercurioReady: c.presentationMercurioReady,
      presentationDate:        c.presentationDate,
      presentationRegistryNumber: c.presentationRegistryNumber,
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
  getAllRepresentatives,
  getNextId,
  saveRepresentative,
  saveCase,
  writeExcel,
  writeBackup,
  inspectBackup,
  restoreBackup,
  getSchemaVersion
};
