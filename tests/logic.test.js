const test = require("node:test");
const assert = require("node:assert/strict");
const logic = require("../logic.js");

function baseAnswers(overrides = {}) {
  return logic.normalizeAnswers({
    personType: "adult",
    validPermit: "no",
    ukraineProtection: "no",
    stateless: "no",
    pendingApplication: "no",
    beforeJan2026: "yes",
    fiveMonths: "yes",
    identityDocument: "yes",
    criminalRecord: "yes",
    piBefore2026: "no",
    irregularOptions: ["work"],
    ...overrides
  });
}

function minorAnswers(overrides = {}) {
  return logic.normalizeAnswers({
    ...baseAnswers({
      personType: "minor",
      irregularOptions: []
    }),
    minorBirthPlace: "spain",
    minorGuardianStatus: "regular",
    minorSchoolingRequired: "yes",
    ...overrides
  });
}

test("diagnostica Proteccion Internacional cuando corresponde", () => {
  const result = logic.evaluateAnswers(baseAnswers({ piBefore2026: "yes", irregularOptions: [] }));

  assert.equal(result.tone, "ok");
  assert.equal(result.routeLabel, "Proteccion Internacional");
  assert.match(result.title, /Proteccion Internacional/);
});

test("diagnostica via por irregularidad cuando hay supuesto acreditable", () => {
  const result = logic.evaluateAnswers(baseAnswers({ irregularOptions: ["family"] }));

  assert.equal(result.tone, "ok");
  assert.equal(result.routeLabel, "Situacion administrativa irregular");
});

test("marca expediente previo cuando ya hay una solicitud abierta", () => {
  const result = logic.evaluateAnswers(baseAnswers({ pendingApplication: "yes" }));

  assert.equal(result.tone, "warn");
  assert.equal(result.routeLabel, "Revisar expediente previo");
});

test("marca identidad pendiente sin perder la via PI", () => {
  const result = logic.evaluateAnswers(baseAnswers({ piBefore2026: "yes", irregularOptions: [], identityDocument: "no" }));

  assert.equal(result.tone, "warn");
  assert.equal(result.routeLabel, "Proteccion Internacional");
  assert.match(result.title, /identidad/i);
});

test("marca identidad pendiente sin perder la via por irregularidad", () => {
  const result = logic.evaluateAnswers(baseAnswers({ irregularOptions: ["family"], identityDocument: "no" }));

  assert.equal(result.tone, "warn");
  assert.equal(result.routeLabel, "Situacion administrativa irregular");
  assert.match(result.title, /identidad/i);
});

test("construye checklist de documentacion y pasos para un caso PI", () => {
  const guidance = logic.buildCaseGuidance(
    baseAnswers({ piBefore2026: "yes", irregularOptions: [] }),
    { "doc-form-pi-ex31": true, "step-review-route": true }
  );

  assert.equal(guidance.result.routeLabel, "Proteccion Internacional");
  assert.ok(guidance.documents.some((item) => item.key === "doc-pi-proof"));
  assert.ok(guidance.documents.some((item) => item.key === "doc-form-pi-ex31"));
  assert.ok(guidance.documents.some((item) => item.key === "doc-fee-790-052"));
  assert.ok(guidance.steps.some((item) => item.key === "step-pi-desist"));
  assert.ok(guidance.steps.some((item) => item.key === "step-filing-window"));
  assert.ok(guidance.steps.some((item) => item.key === "step-filing-channels"));
  assert.ok(guidance.steps.some((item) => item.key === "step-provisional-permit"));
  assert.ok(guidance.steps.some((item) => item.key === "step-resolution-window"));
  assert.match(guidance.documentsPendingSummary, /Proteccion Internacional/);
});

test("construye checklist de irregularidad aunque falte concretar el supuesto", () => {
  const guidance = logic.buildCaseGuidance(baseAnswers({ irregularOptions: [] }), {});

  assert.equal(guidance.result.routeLabel, "Situacion administrativa irregular");
  assert.ok(guidance.documents.some((item) => item.key === "doc-irregular-proof"));
  assert.match(guidance.recommendedAction, /Formulario oficial|Acreditar al menos uno|Confirmar que la via/i);
});

test("clasifica menores nacidos en Espana con progenitor regular con una ruta especifica", () => {
  const guidance = logic.buildCaseGuidance(
    minorAnswers({
      minorBirthPlace: "spain",
      minorGuardianStatus: "regular",
      minorSchoolingRequired: "yes"
    }),
    {}
  );

  assert.equal(guidance.result.routeLabel, "Menor nacido en Espana con progenitor/tutor regular");
  assert.ok(guidance.documents.some((item) => item.key === "doc-form-minor-ex25"));
  assert.ok(guidance.documents.some((item) => item.key === "doc-minor-birth-cert-spain"));
  assert.ok(guidance.documents.some((item) => item.key === "doc-minor-schooling"));
  assert.ok(guidance.documents.some((item) => item.key === "doc-minor-guardian-regular-status"));
  assert.ok(guidance.steps.some((item) => item.key === "step-minor-regular-route"));
  assert.ok(guidance.steps.some((item) => item.key === "step-minor-regular-filing"));
});

test("clasifica menores nacidos en el extranjero con progenitor irregular y custodia documentada", () => {
  const guidance = logic.buildCaseGuidance(
    minorAnswers({
      minorBirthPlace: "abroad",
      minorGuardianStatus: "irregular",
      minorNeedsCustodyProof: "yes",
      minorSchoolingRequired: "yes"
    }),
    {}
  );

  assert.equal(guidance.result.routeLabel, "Menor nacido en el extranjero con progenitor/tutor irregular");
  assert.ok(guidance.documents.some((item) => item.key === "doc-form-minor-ex31-ex32"));
  assert.ok(guidance.documents.some((item) => item.key === "doc-minor-passports-family"));
  assert.ok(guidance.documents.some((item) => item.key === "doc-minor-birth-cert-abroad"));
  assert.ok(guidance.documents.some((item) => item.key === "doc-minor-custody-proof"));
  assert.ok(guidance.steps.some((item) => item.key === "step-minor-irregular-follow-up"));
});

test("usa EX-32 y formalidades documentales para la via irregular", () => {
  const guidance = logic.buildCaseGuidance(
    baseAnswers({ irregularOptions: ["work"] }),
    {}
  );

  assert.ok(guidance.documents.some((item) => item.key === "doc-form-irregular-ex32"));
  assert.ok(guidance.documents.some((item) => item.key === "doc-translation-legalization"));
  assert.ok(guidance.documents.some((item) => item.key === "doc-copies-originals"));
  assert.ok(guidance.documents.some((item) => item.key === "doc-previous-records"));
  assert.ok(guidance.steps.some((item) => item.key === "step-expulsion-review"));
});

test("bloquea la orientacion automatica si hay compromiso de no retorno", () => {
  const result = logic.evaluateAnswers(baseAnswers({ nonReturnCommitment: "yes" }));

  assert.equal(result.routeLabel, "Otra via");
  assert.equal(result.code, "advanced-exclusion");
  assert.match(result.summary, /revision especializada|no retorno/i);
});

test("bloquea la orientacion automatica si la persona figura como rechazable", () => {
  const result = logic.evaluateAnswers(baseAnswers({ rejectableRecord: "yes" }));

  assert.equal(result.routeLabel, "Otra via");
  assert.equal(result.code, "advanced-exclusion");
  assert.match(result.summary, /revision especializada|rechazable/i);
});

test("normaliza una ficha conservando respuestas y checks", () => {
  const caseItem = logic.normalizeCase({
    id: "REG-2026-00001",
    caseName: "Caso demo",
    answers: { piBefore2026: "yes", identityDocument: "yes" },
    checks: { "doc-form": 1 }
  });

  assert.equal(caseItem.id, "REG-2026-00001");
  assert.equal(caseItem.answers.piBefore2026, "yes");
  assert.equal(caseItem.answers.identityDocument, "yes");
  assert.equal(caseItem.checks["doc-form"], true);
});

test("fusiona casos importados y actualiza el repetido", () => {
  const existing = [
    logic.normalizeCase({
      id: "REG-2026-00001",
      caseName: "Caso original",
      route: "Proteccion Internacional",
      updatedAt: "2026-04-27T09:00:00.000Z"
    })
  ];

  const imported = [
    logic.normalizeCase({
      id: "REG-2026-00001",
      caseName: "Caso actualizado",
      route: "Situacion administrativa irregular",
      updatedAt: "2026-04-27T10:00:00.000Z"
    }),
    logic.normalizeCase({
      id: "REG-2026-00002",
      caseName: "Caso nuevo",
      route: "Caso familiar",
      updatedAt: "2026-04-27T11:00:00.000Z"
    })
  ];

  const result = logic.mergeCases(existing, imported);

  assert.equal(result.added, 1);
  assert.equal(result.updated, 1);
  assert.equal(result.cases[0].id, "REG-2026-00002");
  assert.equal(result.cases[1].route, "Situacion administrativa irregular");
});

test("genera identificadores correlativos", () => {
  const first = logic.nextCaseId(0);
  const second = logic.nextCaseId(first.counter);

  assert.equal(first.id, "REG-2026-00001");
  assert.equal(second.id, "REG-2026-00002");
});

test("genera CSV con columnas de pendientes y proximo paso", () => {
  const csv = logic.buildCasesCsv([
    logic.normalizeCase({
      id: "REG-2026-00001",
      caseName: "Caso, con coma",
      route: "Proteccion Internacional",
      documentsPendingSummary: "Pasaporte | Penales",
      stepsPendingSummary: "Pedir cita",
      nextAction: 'Revisar "penales"'
    })
  ]);

  assert.match(csv, /"Documentos pendientes"/);
  assert.match(csv, /"Pasaporte \| Penales"/);
  assert.match(csv, /"Revisar ""penales"""/);
});
