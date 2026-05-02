const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const db = require("../db");

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "regularizazioa-db-"));
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

test("initialize stores the current schema version", { concurrency: false }, async () => {
  const tempDir = makeTempDir();

  try {
    await db.initialize(tempDir);
    assert.equal(db.getSchemaVersion(), db.SCHEMA_VERSION);
  } finally {
    cleanup(tempDir);
  }
});

test("backup and restore roundtrip the database contents", { concurrency: false }, async () => {
  const tempDir = makeTempDir();
  const backupPath = path.join(tempDir, "backup.db");

  try {
    await db.initialize(tempDir);

    const firstId = db.getNextId();
    db.saveCase({
      id: firstId,
      caseName: "Caso original",
      locality: "Bergara",
      answers: {},
      checks: {}
    });

    db.writeBackup(backupPath);

    const secondId = db.getNextId();
    db.saveCase({
      id: secondId,
      caseName: "Caso posterior",
      locality: "Bilbao",
      answers: {},
      checks: {}
    });

    assert.equal(db.getAllCases().length, 2, "sanity check: two cases should exist before restore");

    const restoredCases = db.restoreBackup(backupPath);
    assert.equal(restoredCases.length, 1, "restore should roll back to the backup snapshot");
    assert.equal(restoredCases[0].caseName, "Caso original");
    assert.equal(db.getAllCases().length, 1);
  } finally {
    cleanup(tempDir);
  }
});

test("inspectBackup returns metadata about a valid backup", { concurrency: false }, async () => {
  const tempDir = makeTempDir();
  const backupPath = path.join(tempDir, "backup.db");

  try {
    await db.initialize(tempDir);
    const id = db.getNextId();
    db.saveCase({
      id,
      caseName: "Caso metadata",
      locality: "Bergara",
      answers: {},
      checks: {}
    });

    db.writeBackup(backupPath);
    const info = db.inspectBackup(backupPath);

    assert.equal(info.caseCount, 1);
    assert.equal(info.schemaVersion, db.SCHEMA_VERSION);
    assert.equal(info.path, backupPath);
  } finally {
    cleanup(tempDir);
  }
});

test("restoreBackup rejects invalid files", { concurrency: false }, async () => {
  const tempDir = makeTempDir();
  const invalidPath = path.join(tempDir, "not-a-db.db");

  try {
    await db.initialize(tempDir);
    fs.writeFileSync(invalidPath, "not a sqlite database");

    assert.throws(
      () => db.restoreBackup(invalidPath),
      /no es una copia valida|file is not a database|malformed/i
    );
  } finally {
    cleanup(tempDir);
  }
});

test("saveCase persists representative, notification, and presentation data", { concurrency: false }, async () => {
  const tempDir = makeTempDir();

  try {
    await db.initialize(tempDir);
    const id = db.getNextId();
    db.saveCase({
      id,
      caseName: "Caso notificaciones",
      representativeName: "SOS Example",
      representativePhone: "612345678",
      representativeEmail: "representante@ejemplo.org",
      notificationTarget: "representante",
      presentationByCollaborator: "yes",
      presentationPresenter: "Compa con certificado",
      presentationAuthorizationSigned: "yes",
      presentationDocumentsReady: "yes",
      presentationMercurioReady: "yes",
      presentationDate: "2026-05-10",
      presentationRegistryNumber: "REGISTRO-2026-55",
      answers: {},
      checks: {}
    });

    const saved = db.getAllCases()[0];
    assert.equal(saved.representativeName, "SOS Example");
    assert.equal(saved.representativePhone, "612345678");
    assert.equal(saved.representativeEmail, "representante@ejemplo.org");
    assert.equal(saved.notificationTarget, "representante");
    assert.equal(saved.presentationByCollaborator, "yes");
    assert.equal(saved.presentationPresenter, "Compa con certificado");
    assert.equal(saved.presentationAuthorizationSigned, "yes");
    assert.equal(saved.presentationDocumentsReady, "yes");
    assert.equal(saved.presentationMercurioReady, "yes");
    assert.equal(saved.presentationDate, "2026-05-10");
    assert.equal(saved.presentationRegistryNumber, "REGISTRO-2026-55");
  } finally {
    cleanup(tempDir);
  }
});

test("representative directory can be reused across linked cases", { concurrency: false }, async () => {
  const tempDir = makeTempDir();

  try {
    await db.initialize(tempDir);

    const representative = db.saveRepresentative({
      name: "Entidad Colaboradora",
      phone: "600111222",
      email: "colaboradora@ejemplo.org"
    });

    const caseId = db.getNextId();
    db.saveCase({
      id: caseId,
      caseName: "Caso enlazado",
      representativeId: representative.id,
      representativeName: representative.name,
      representativePhone: representative.phone,
      representativeEmail: representative.email,
      answers: {},
      checks: {}
    });

    const updatedRepresentative = db.saveRepresentative({
      id: representative.id,
      name: "Entidad Colaboradora",
      phone: "600999888",
      email: "colaboradora@ejemplo.org"
    });

    const savedCase = db.getAllCases()[0];
    const representatives = db.getAllRepresentatives();

    assert.equal(savedCase.representativeId, representative.id);
    assert.equal(savedCase.representativePhone, "600111222");
    assert.equal(representatives.length, 1);
    assert.equal(updatedRepresentative.phone, "600999888");
    assert.equal(representatives[0].phone, "600999888");
  } finally {
    cleanup(tempDir);
  }
});
