const logic = window.RegularizacionLogic;
const T = window.TRANSLATIONS;
const runtimeConfig = window.REGULARIZAZIOA_APP_CONFIG || {};
const appMode = runtimeConfig.mode === "desktop" || runtimeConfig.mode === "static" || runtimeConfig.mode === "web-private"
  ? runtimeConfig.mode
  : (window.electronAPI ? "desktop" : "static");
const isStaticMode = appMode === "static";
const isWebPrivateMode = appMode === "web-private";
const supportsCaseStorage = !isStaticMode;
const supportsDesktopOnlyTools = appMode === "desktop";
const api = !isStaticMode && window.electronAPI
  ? window.electronAPI
  : {
      getCases: async function() { return []; },
      getNextId: async function() { throw new Error("read-only"); },
      saveCase: async function() { throw new Error("read-only"); },
      exportExcel: async function() { throw new Error("read-only"); },
      backupDatabase: async function() { throw new Error("read-only"); },
      restoreDatabase: async function() { throw new Error("read-only"); }
    };

const caseForm              = document.getElementById("case-form");
const caseIdField           = document.getElementById("case-id");
const caseIdPreview         = document.getElementById("case-id-preview");
const saveCaseButton        = document.getElementById("save-case-button");
const caseNameField         = document.getElementById("case-name");
const casePhoneField        = document.getElementById("case-phone");
const caseEmailField        = document.getElementById("case-email");
const caseLocalityField     = document.getElementById("case-locality");
const caseVolunteerField    = document.getElementById("case-volunteer");
const caseRepresentativeNameField  = document.getElementById("case-representative-name");
const caseRepresentativePhoneField = document.getElementById("case-representative-phone");
const caseRepresentativeEmailField = document.getElementById("case-representative-email");
const caseNotificationTargetField  = document.getElementById("case-notification-target");
const caseNextDateField     = document.getElementById("case-next-date");
const caseNextActionField   = document.getElementById("case-next-action");
const caseNotesField        = document.getElementById("case-notes");
const clearCaseButton       = document.getElementById("clear-case-button");
const printButton           = document.getElementById("print-button");
const copySummaryButton     = document.getElementById("copy-summary-button");
const backupButton          = document.getElementById("backup-button");
const restoreButton         = document.getElementById("restore-button");
const exportExcelButton     = document.getElementById("export-excel-button");
const storageMessage        = document.getElementById("storage-message");
const irregularCriteria     = document.getElementById("irregular-criteria");
const guidancePreview       = document.getElementById("guidance-preview");
const guidanceDocuments     = document.getElementById("guidance-documents");
const guidanceSteps         = document.getElementById("guidance-steps");
const caseSummary           = document.getElementById("case-summary");
const caseSearchField       = document.getElementById("case-search");
const caseStatusFilterField = document.getElementById("case-status-filter");
const caseTableBody         = document.getElementById("case-table-body");
const caseEmpty             = document.getElementById("case-empty");
const casesPanel            = document.getElementById("cases-panel");
const stepPrevButton        = document.getElementById("step-prev");
const stepNextButton        = document.getElementById("step-next");
const stepProgressLabel     = document.getElementById("step-progress-label");
const duplicateWarning      = document.getElementById("duplicate-warning");
const heroIntro             = document.getElementById("hero-intro");
const runtimeModeMessage    = document.getElementById("runtime-mode-message");
const autosaveIndicator     = document.getElementById("autosave-indicator");

const TOTAL_STEPS = 6;

let currentStep = 1;
let currentChecks = {};
let lastSuggestedAction = "";
let casesState = [];
let currentLang = localStorage.getItem("regularizazioa-lang") || "es";
let urgentFilterActive = false;

var TODAY_STR = new Date().toISOString().slice(0, 10);

function isOverdue(c) {
  return c.nextDate && c.nextDate < TODAY_STR && !["Favorable","Desfavorable","Cerrada"].includes(c.caseStatus);
}

// i18n

function t(key) {
  return (T[currentLang] && T[currentLang].ui[key]) || (T.es.ui[key]) || key;
}

function tChecklist(key) {
  return (T[currentLang] && T[currentLang].checklist[key]) || (T.es.checklist[key]) || null;
}

function tResult(code) {
  return (T[currentLang] && T[currentLang].results[code]) || (T.es.results[code]) || null;
}

function applyRuntimeText() {
  if (heroIntro) {
    heroIntro.textContent = isStaticMode ? t("hero.intro.static") : (isWebPrivateMode ? t("hero.intro.private") : t("hero.intro"));
  }

  if (runtimeModeMessage) {
    runtimeModeMessage.textContent = isStaticMode ? t("static.banner") : t("private.banner");
    runtimeModeMessage.classList.toggle("hidden", !(isStaticMode || isWebPrivateMode));
  }
}

function applyLanguage() {
  document.getElementById("html-root").lang = currentLang;
  document.querySelectorAll("[data-i18n]").forEach(function(el) {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(function(el) {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.getElementById("lang-es").classList.toggle("active", currentLang === "es");
  document.getElementById("lang-fr").classList.toggle("active", currentLang === "fr");
  applyRuntimeText();
  showAnalysisStep(currentStep);
  renderGuidance();
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("regularizazioa-lang", lang);
  applyLanguage();
}

// Utilities

function clearStorageMessage() {
  storageMessage.textContent = "";
  storageMessage.className = "notice hidden";
}

function setStorageMessage(text, tone) {
  storageMessage.textContent = text;
  storageMessage.className = "notice " + (tone || "info");
}

function applyRuntimeMode() {
  document.body.dataset.appMode = appMode;
  document.documentElement.dataset.appMode = appMode;

  if (isStaticMode) {
    if (saveCaseButton) saveCaseButton.classList.add("hidden");
    if (autosaveIndicator) autosaveIndicator.classList.add("hidden");
    if (caseIdPreview) {
      caseIdPreview.textContent = "";
      caseIdPreview.classList.add("hidden");
    }
    if (casesPanel) casesPanel.classList.add("hidden");
  }

  if (!supportsDesktopOnlyTools) {
    if (backupButton) backupButton.classList.add("hidden");
    if (restoreButton) restoreButton.classList.add("hidden");
    if (exportExcelButton) exportExcelButton.classList.add("hidden");
  }
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(dateValue) {
  if (!dateValue) return "-";
  var locale = currentLang === "fr" ? "fr-FR" : "es-ES";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit", month: "2-digit", year: "numeric"
  }).format(new Date(dateValue));
}

function fileNameFromPath(filePath) {
  if (!filePath) return "";
  return String(filePath).split(/[\\/]/).pop();
}

// Analysis wizard

function showAnalysisStep(step) {
  currentStep = step;
  document.querySelectorAll(".analysis-step").forEach(function(el) {
    el.classList.toggle("active", Number(el.dataset.step) === step);
  });
  document.querySelectorAll("[data-step-dot]").forEach(function(dot) {
    var dotStep = Number(dot.dataset.stepDot);
    dot.classList.toggle("active", dotStep === step);
    dot.classList.toggle("done", dotStep < step);
  });
  stepProgressLabel.textContent = t("step.progress.format")
    .replace("{step}", step)
    .replace("{total}", TOTAL_STEPS)
    .replace("{label}", t("step." + step + ".label"));
  updateStepNavigation(step, collectAnswers());
  renderGuidance();
}

function getNextAnalysisStep(step, answers) {
  if (step >= TOTAL_STEPS) return null;

  if (step === 1) {
    return 2;
  }

  if (step === 2) {
    if (answers.personType === "minor") return null;
    return answers.beforeJan2026 === "yes" && answers.fiveMonths === "yes" ? 3 : null;
  }

  if (step === 3) {
    return answers.validPermit === "yes" ? null : 4;
  }

  if (step === 4) {
    return answers.ukraineProtection === "yes" || answers.stateless === "yes" ? null : 5;
  }

  if (step === 5) {
    return answers.pendingApplication === "yes" ? null : 6;
  }

  return null;
}

function updateStepNavigation(step, answers) {
  var nextStep = getNextAnalysisStep(step, answers);
  stepPrevButton.classList.toggle("hidden", step === 1);
  stepNextButton.textContent = nextStep ? t("step.next") : t("step.last");
  return nextStep;
}

// Validation

function focusField(el) {
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.focus();
}

function validatePhone() {
  var phone = casePhoneField.value.trim();
  var error = document.getElementById("phone-error");
  var invalid = phone.length > 0 && !/^[6-9]\d{8}$/.test(phone);
  error.classList.toggle("hidden", !invalid);
  return !invalid;
}

function validateEmail() {
  var email = caseEmailField.value.trim();
  var error = document.getElementById("email-error");
  var invalid = email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  error.classList.toggle("hidden", !invalid);
  return !invalid;
}

function normalizeComparableText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeComparablePhone(value) {
  return String(value || "").replace(/\D+/g, "");
}

function getFieldValue(field, fallback) {
  if (!field) return fallback == null ? "" : fallback;
  return typeof field.value === "string" ? field.value : (fallback == null ? "" : fallback);
}

function setFieldValue(field, value) {
  if (!field) return;
  field.value = value;
}

function findPotentialDuplicate(formData) {
  var currentId = String(formData.id || "").trim();
  var phone = normalizeComparablePhone(formData.phone);
  var email = normalizeComparableText(formData.email);
  var name = normalizeComparableText(formData.caseName);
  var locality = normalizeComparableText(formData.locality);

  return casesState.find(function(c) {
    if (String(c.id || "").trim() === currentId) return false;

    var samePhone = phone && normalizeComparablePhone(c.phone) === phone;
    var sameEmail = email && normalizeComparableText(c.email) === email;
    var sameNameLocality = name && locality &&
      normalizeComparableText(c.caseName) === name &&
      normalizeComparableText(c.locality) === locality;

    return samePhone || sameEmail || sameNameLocality;
  }) || null;
}

function updateDuplicateWarning() {
  var duplicate = findPotentialDuplicate(collectCaseFormData());
  if (!duplicate) {
    duplicateWarning.textContent = "";
    duplicateWarning.classList.add("hidden");
    return;
  }

  duplicateWarning.textContent = t("warning.duplicate.format")
    .replace("{id}", duplicate.id || "-")
    .replace("{name}", duplicate.caseName || "-");
  duplicateWarning.classList.remove("hidden");
}

// Form helpers

function getCheckedValues(name) {
  return Array.from(document.querySelectorAll('input[name="' + name + '"]:checked'))
    .map(function(input) { return input.value; });
}

function getRadioValue(name) {
  var el = document.querySelector('input[name="' + name + '"]:checked');
  return el ? el.value : "";
}

function setRadioValue(name, value) {
  var input = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
  if (input) input.checked = true;
}

function setCheckboxValues(name, values) {
  var valueSet = new Set(values);
  document.querySelectorAll('input[name="' + name + '"]').forEach(function(input) {
    input.checked = valueSet.has(input.value);
  });
}

function toggleIrregularCriteria() {
  irregularCriteria.classList.toggle("hidden", getRadioValue("piBefore2026") === "yes");
}

function toggleMinorCriteria(personType) {
  var isMinor = personType === "minor";
  document.querySelectorAll("[data-minor-only]").forEach(function(el) {
    el.classList.toggle("hidden", !isMinor);
  });
  document.querySelectorAll("[data-adult-only]").forEach(function(el) {
    el.classList.toggle("hidden", isMinor);
  });
}

function collectAnswers() {
  return {
    personType:         getRadioValue("personType"),
    minorBirthPlace:    getRadioValue("minorBirthPlace"),
    minorGuardianStatus: getRadioValue("minorGuardianStatus"),
    minorSchoolingRequired: getRadioValue("minorSchoolingRequired"),
    minorNeedsCustodyProof: getRadioValue("minorNeedsCustodyProof"),
    minorHasDisability: getRadioValue("minorHasDisability"),
    validPermit:        getRadioValue("validPermit"),
    ukraineProtection:  getRadioValue("ukraineProtection"),
    stateless:          getRadioValue("stateless"),
    publicOrderRisk:    getRadioValue("publicOrderRisk"),
    publicHealthRisk:   getRadioValue("publicHealthRisk"),
    rejectableRecord:   getRadioValue("rejectableRecord"),
    nonReturnCommitment: getRadioValue("nonReturnCommitment"),
    pendingApplication: getRadioValue("pendingApplication"),
    beforeJan2026:      getRadioValue("beforeJan2026"),
    fiveMonths:         getRadioValue("fiveMonths"),
    identityDocument:   getRadioValue("identityDocument"),
    criminalRecord:     getRadioValue("criminalRecord"),
    piBefore2026:       getRadioValue("piBefore2026"),
    irregularOptions:   getCheckedValues("irregularCriterion")
  };
}

function collectCaseFormData() {
  return {
    id:         caseIdField.value.trim(),
    caseName:   caseNameField.value.trim(),
    phone:      casePhoneField.value.trim(),
    email:      caseEmailField.value.trim(),
    locality:   caseLocalityField.value.trim(),
    volunteer:  caseVolunteerField.value.trim(),
    representativeName: getFieldValue(caseRepresentativeNameField).trim(),
    representativePhone: getFieldValue(caseRepresentativePhoneField).trim(),
    representativeEmail: getFieldValue(caseRepresentativeEmailField).trim(),
    notificationTarget: getFieldValue(caseNotificationTargetField, "persona"),
    caseStatus: getRadioValue("caseStatus") || "Nuevo",
    nextDate:   caseNextDateField.value.trim(),
    nextAction: caseNextActionField.value.trim(),
    notes:      caseNotesField.value.trim()
  };
}

// Guidance rendering

function list(items) {
  return "<ul>" + items.map(function(item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("") + "</ul>";
}

function renderChecklist(container, items, emptyKey, numbered) {
  if (!items.length) {
    container.innerHTML = '<p class="note">' + escapeHtml(t(emptyKey)) + "</p>";
    return;
  }
  container.innerHTML = '<div class="checklist">' + items.map(function(item, index) {
    var label = tChecklist(item.key) || item.label;
    return '<label class="check-item">' +
      '<input type="checkbox" data-check-key="' + escapeHtml(item.key) + '" ' + (item.done ? "checked" : "") + ">" +
      (numbered ? '<span class="step-num">' + (index + 1) + ".</span>" : "") +
      "<span>" + escapeHtml(label) + "</span>" +
      "</label>";
  }).join("") + "</div>";
}

function syncSuggestedAction(suggestedAction) {
  var currentValue = caseNextActionField.value.trim();
  if (!currentValue || currentValue === lastSuggestedAction) {
    caseNextActionField.value = suggestedAction;
  }
  lastSuggestedAction = suggestedAction;
}

function renderGuidance() {
  var answers = collectAnswers();
  toggleMinorCriteria(answers.personType);
  toggleIrregularCriteria();
  updateStepNavigation(currentStep, answers);
  var guidance = logic.buildCaseGuidance(answers, currentChecks);
  var result   = guidance.result;
  var tr       = tResult(result.code) || result;
  var whyList  = Array.isArray(tr.why) ? tr.why : Object.values(tr.why || {});
  var whyBlock = whyList.length
    ? '<div class="result-block"><h4>' + escapeHtml(t("guidance.why.heading")) + '</h4>' + list(whyList) + "</div>"
    : "";

  guidancePreview.innerHTML =
    '<div class="status-card ' + result.tone + '">' +
      "<h3>" + escapeHtml(tr.title || result.title) + "</h3>" +
      "<p>"  + escapeHtml(tr.summary || result.summary) + "</p>" +
    "</div>" +
    '<span class="route-badge">' + escapeHtml(tr.routeLabel || result.routeLabel || t("guidance.route.pending")) + "</span>" +
    whyBlock +
    '<div class="pending-summary">' +
      "<div><strong>" + escapeHtml(t("guidance.pending.docs")) + "</strong>" + escapeHtml(guidance.documentsPendingSummary) + "</div>" +
      "<div><strong>" + escapeHtml(t("guidance.pending.steps")) + "</strong>"  + escapeHtml(guidance.stepsPendingSummary) + "</div>" +
    "</div>" +
    '<p class="note">' + escapeHtml(t("guidance.official")) + "</p>";

  renderChecklist(guidanceDocuments, guidance.documents, "guidance.docs.empty", false);

  // For routes with dynamic step keys (Otra via), use the translated nextSteps
  // from tResult so the steps appear in the active language, not always Spanish.
  var steps = guidance.steps;
  if (result.routeLabel === "Otra via" && tr.nextSteps && tr.nextSteps.length) {
    steps = tr.nextSteps.map(function(label, i) {
      var key = "step-other-" + (i + 1);
      return { key: key, label: label, done: !!(currentChecks[key]) };
    });
  }
  renderChecklist(guidanceSteps, steps, "guidance.steps.empty", true);
  syncSuggestedAction(guidance.recommendedAction);
  return guidance;
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document.execCommand === "function") {
    var temp = document.createElement("textarea");
    temp.value = text;
    temp.setAttribute("readonly", "readonly");
    temp.style.position = "absolute";
    temp.style.left = "-9999px";
    document.body.appendChild(temp);
    temp.select();
    var copied = document.execCommand("copy");
    document.body.removeChild(temp);
    if (copied) return;
  }

  throw new Error(t("msg.copyUnsupported"));
}

function buildCaseSummaryText() {
  var guidance = renderGuidance();
  var result = guidance.result;
  var tr = tResult(result.code) || result;
  var formData = collectCaseFormData();
  var caseId = formData.id || caseIdPreview.textContent.trim() || "-";

  return [
    t("field.id") + ": " + caseId,
    t("field.name") + ": " + (formData.caseName || "-"),
    t("table.route") + ": " + (tr.routeLabel || result.routeLabel || "-"),
    t("field.status") + ": " + (formData.caseStatus || "-"),
    t("field.notificationTarget") + ": " + t("notificationTarget." + (formData.notificationTarget || "persona")),
    t("field.representativeName") + ": " + (formData.representativeName || "-"),
    t("field.nextDate") + ": " + (formData.nextDate ? formatDate(formData.nextDate) : "-"),
    t("field.nextAction") + ": " + (caseNextActionField.value.trim() || guidance.recommendedAction || "-"),
    t("guidance.pending.docs") + ": " + guidance.documentsPendingSummary,
    t("guidance.pending.steps") + ": " + guidance.stepsPendingSummary,
    t("field.volunteer") + ": " + (formData.volunteer || "-")
  ].join("\n");
}

// Case table

function renderCaseSummaryCards(cases) {
  var openCount     = cases.filter(function(c) { return !["Favorable","Desfavorable","Cerrada"].includes(c.caseStatus); }).length;
  var submittedCount = cases.filter(function(c) { return ["Presentada","Inicio recibido","Favorable"].includes(c.caseStatus); }).length;
  var favorableCount = cases.filter(function(c) { return c.caseStatus === "Favorable"; }).length;
  var overdueCount  = cases.filter(isOverdue).length;
  caseSummary.innerHTML =
    '<div class="summary-pill"><span>' + escapeHtml(t("summary.total"))     + '</span><strong>' + cases.length     + "</strong></div>" +
    '<div class="summary-pill"><span>' + escapeHtml(t("summary.open"))      + '</span><strong>' + openCount        + "</strong></div>" +
    '<div class="summary-pill"><span>' + escapeHtml(t("summary.submitted")) + '</span><strong>' + submittedCount   + "</strong></div>" +
    '<div class="summary-pill"><span>' + escapeHtml(t("summary.favorable")) + '</span><strong>' + favorableCount   + "</strong></div>" +
    '<div class="summary-pill ' + (overdueCount > 0 ? "overdue" : "") + '"><span>' + escapeHtml(t("summary.overdue")) + '</span><strong>' + overdueCount + "</strong></div>";
}

function getFilteredCases() {
  var search       = caseSearchField.value.trim().toLowerCase();
  var statusFilter = caseStatusFilterField.value;
  var filtered = casesState.filter(function(c) {
    var matchesStatus = !statusFilter || c.caseStatus === statusFilter;
    var matchesUrgent = !urgentFilterActive || isOverdue(c);
    var haystack = [
      c.id, c.caseName, c.phone, c.email, c.locality, c.volunteer,
      c.representativeName, c.representativePhone, c.representativeEmail,
      c.notificationTarget, c.route, c.nextAction
    ]
      .join(" ").toLowerCase();
    return matchesStatus && matchesUrgent && (!search || haystack.includes(search));
  });
  // Sort: overdue first, then by nextDate ascending, then most recently updated
  filtered.sort(function(a, b) {
    var aOver = isOverdue(a) ? 0 : 1;
    var bOver = isOverdue(b) ? 0 : 1;
    if (aOver !== bOver) return aOver - bOver;
    if (a.nextDate && b.nextDate) return a.nextDate < b.nextDate ? -1 : a.nextDate > b.nextDate ? 1 : 0;
    if (a.nextDate) return -1;
    if (b.nextDate) return 1;
    return (b.updatedAt || b.createdAt || "") < (a.updatedAt || a.createdAt || "") ? -1 : 1;
  });
  return filtered;
}

var ROUTE_BADGE_CLASS = {
  "Situacion administrativa irregular": "route-irregular",
  "Proteccion Internacional":           "route-pi",
  "Caso familiar":                      "route-family",
  "Revisar expediente previo":          "route-pending",
  "Otra via":                           "route-other"
};

function routeBadge(routeLabel) {
  if (!routeLabel || routeLabel === "-") return "-";
  var cls = ROUTE_BADGE_CLASS[routeLabel] || (routeLabel.indexOf("Menor ") === 0 ? "route-family" : "route-other");
  return '<span class="route-badge-pill ' + cls + '">' + escapeHtml(routeLabel) + "</span>";
}

function truncate(str, max) {
  if (!str) return "-";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function formatNextDate(dateStr, overdue) {
  if (!dateStr) return "-";
  var formatted = formatDate(dateStr);
  return overdue
    ? '<span class="overdue-date" title="' + escapeHtml(formatted) + '">⚠ ' + escapeHtml(formatted) + "</span>"
    : escapeHtml(formatted);
}

function renderCaseTable() {
  var filtered = getFilteredCases();
  renderCaseSummaryCards(casesState);
  caseEmpty.classList.toggle("hidden", filtered.length > 0);
  caseTableBody.innerHTML = filtered.map(function(c) {
    var overdue = isOverdue(c);
    return '<tr class="' + (overdue ? "row-overdue" : "") + '">' +
      "<td>" + escapeHtml(c.id) + "</td>" +
      "<td><strong>" + escapeHtml(c.caseName || "-") + "</strong><br>" +
        '<span class="note">' + escapeHtml(c.phone || c.email || "-") + "</span></td>" +
      "<td>" + routeBadge(c.route || "-") + "</td>" +
      "<td>" + escapeHtml(c.caseStatus || "-") + "</td>" +
      "<td>" + formatNextDate(c.nextDate, overdue) + "</td>" +
      "<td>" + escapeHtml(truncate(c.nextAction, 60)) + "</td>" +
      "<td>" + escapeHtml(c.volunteer || "-") + "</td>" +
      "<td>" + escapeHtml(formatDate(c.updatedAt || c.createdAt)) + "</td>" +
      '<td><button type="button" class="table-action secondary" data-case-id="' + escapeHtml(c.id) + '">' + escapeHtml(t("table.edit")) + "</button></td>" +
      "</tr>";
  }).join("");
}

// Case form

function clearCaseForm() {
  caseForm.reset();
  caseIdField.value         = "";
  caseIdPreview.textContent = "";
  caseIdPreview.classList.add("hidden");
  caseLocalityField.value   = "Bergara";
  setFieldValue(caseRepresentativeNameField, "");
  setFieldValue(caseRepresentativePhoneField, "");
  setFieldValue(caseRepresentativeEmailField, "");
  setFieldValue(caseNotificationTargetField, "persona");
  setRadioValue("caseStatus", "Nuevo");
  document.getElementById("phone-error").classList.add("hidden");
  document.getElementById("email-error").classList.add("hidden");
  currentChecks = {};
  lastSuggestedAction = "";
  updateDuplicateWarning();
  clearStorageMessage();
  showAnalysisStep(1);
}

function populateCaseForm(caseItem) {
  var c = logic.normalizeCase(caseItem);
  caseIdField.value           = c.id;
  caseIdPreview.textContent   = c.id;
  caseIdPreview.classList.remove("hidden");
  caseNameField.value         = c.caseName;
  casePhoneField.value        = c.phone;
  caseEmailField.value        = c.email;
  document.getElementById("phone-error").classList.add("hidden");
  document.getElementById("email-error").classList.add("hidden");
  caseLocalityField.value     = c.locality || "Bergara";
  caseVolunteerField.value    = c.volunteer;
  setFieldValue(caseRepresentativeNameField, c.representativeName || "");
  setFieldValue(caseRepresentativePhoneField, c.representativePhone || "");
  setFieldValue(caseRepresentativeEmailField, c.representativeEmail || "");
  setFieldValue(caseNotificationTargetField, c.notificationTarget || "persona");
  setRadioValue("caseStatus", c.caseStatus || "Nuevo");
  caseNextDateField.value     = c.nextDate;
  caseNotesField.value        = c.notes;
  caseNextActionField.value   = c.nextAction;
  setRadioValue("personType",         c.answers.personType);
  setRadioValue("minorBirthPlace",    c.answers.minorBirthPlace);
  setRadioValue("minorGuardianStatus", c.answers.minorGuardianStatus);
  setRadioValue("minorSchoolingRequired", c.answers.minorSchoolingRequired);
  setRadioValue("minorNeedsCustodyProof", c.answers.minorNeedsCustodyProof);
  setRadioValue("minorHasDisability", c.answers.minorHasDisability);
  setRadioValue("validPermit",        c.answers.validPermit);
  setRadioValue("ukraineProtection",  c.answers.ukraineProtection);
  setRadioValue("stateless",          c.answers.stateless);
  setRadioValue("publicOrderRisk",    c.answers.publicOrderRisk);
  setRadioValue("publicHealthRisk",   c.answers.publicHealthRisk);
  setRadioValue("rejectableRecord",   c.answers.rejectableRecord);
  setRadioValue("nonReturnCommitment", c.answers.nonReturnCommitment);
  setRadioValue("pendingApplication", c.answers.pendingApplication);
  setRadioValue("beforeJan2026",      c.answers.beforeJan2026);
  setRadioValue("fiveMonths",         c.answers.fiveMonths);
  setRadioValue("identityDocument",   c.answers.identityDocument);
  setRadioValue("criminalRecord",     c.answers.criminalRecord);
  setRadioValue("piBefore2026",       c.answers.piBefore2026);
  setCheckboxValues("irregularCriterion", c.answers.irregularOptions);
  currentChecks = Object.assign({}, c.checks);
  lastSuggestedAction = "";
  updateDuplicateWarning();
  showAnalysisStep(1);
  caseForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Event listeners

document.querySelectorAll(
  'input[name="personType"], input[name="minorBirthPlace"], input[name="minorGuardianStatus"], ' +
  'input[name="minorSchoolingRequired"], input[name="minorNeedsCustodyProof"], input[name="minorHasDisability"], ' +
  'input[name="validPermit"], input[name="ukraineProtection"], ' +
  'input[name="stateless"], input[name="publicOrderRisk"], input[name="publicHealthRisk"], ' +
  'input[name="rejectableRecord"], input[name="nonReturnCommitment"], input[name="pendingApplication"], input[name="beforeJan2026"], ' +
  'input[name="fiveMonths"], input[name="identityDocument"], input[name="criminalRecord"], input[name="piBefore2026"], ' +
  'input[name="irregularCriterion"]'
).forEach(function(input) { input.addEventListener("change", renderGuidance); });

stepPrevButton.addEventListener("click", function() {
  if (currentStep > 1) showAnalysisStep(currentStep - 1);
});

stepNextButton.addEventListener("click", function() {
  var nextStep = getNextAnalysisStep(currentStep, collectAnswers());
  if (nextStep) {
    showAnalysisStep(nextStep);
  } else {
    document.querySelector(".guidance-grid").scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

casePhoneField.addEventListener("input", validatePhone);
caseEmailField.addEventListener("input", validateEmail);
caseNameField.addEventListener("input", updateDuplicateWarning);
casePhoneField.addEventListener("input", updateDuplicateWarning);
caseEmailField.addEventListener("input", updateDuplicateWarning);
caseLocalityField.addEventListener("input", updateDuplicateWarning);

guidanceDocuments.addEventListener("change", function(event) {
  var checkbox = event.target.closest("[data-check-key]");
  if (!checkbox) return;
  currentChecks[checkbox.dataset.checkKey] = checkbox.checked;
  renderGuidance();
});

guidanceSteps.addEventListener("change", function(event) {
  var checkbox = event.target.closest("[data-check-key]");
  if (!checkbox) return;
  currentChecks[checkbox.dataset.checkKey] = checkbox.checked;
  renderGuidance();
});

clearCaseButton.addEventListener("click", clearCaseForm);
printButton.addEventListener("click", function() { window.print(); });

exportExcelButton.addEventListener("click", async function() {
  if (!supportsDesktopOnlyTools) {
    setStorageMessage(isStaticMode ? t("msg.static.readOnly") : t("msg.private.desktopOnly"), "info");
    return;
  }
  if (!casesState.length) {
    setStorageMessage("No hay casos guardados para exportar.", "warn");
    return;
  }
  try {
    var result = await api.exportExcel(casesState);
    if (result.ok) {
      setStorageMessage("Excel exportado correctamente. Se ha abierto la carpeta.", "success");
    } else if (result.reason !== "cancelled") {
      setStorageMessage("No se pudo exportar el Excel: " + result.reason, "error");
    }
  } catch (err) {
    setStorageMessage("Error al exportar: " + err.message, "error");
  }
});

backupButton.addEventListener("click", async function() {
  if (!supportsDesktopOnlyTools) {
    setStorageMessage(isStaticMode ? t("msg.static.readOnly") : t("msg.private.desktopOnly"), "info");
    return;
  }
  try {
    var result = await api.backupDatabase();
    if (!result || !result.ok) {
      if (result && result.reason !== "cancelled") {
        setStorageMessage("Error al crear la copia: " + result.reason, "error");
      }
      return;
    }
    setStorageMessage(t("msg.backup.saved.format").replace("{name}", fileNameFromPath(result.path)), "success");
  } catch (err) {
    setStorageMessage("Error al crear la copia: " + err.message, "error");
  }
});

restoreButton.addEventListener("click", async function() {
  if (!supportsDesktopOnlyTools) {
    setStorageMessage(isStaticMode ? t("msg.static.readOnly") : t("msg.private.desktopOnly"), "info");
    return;
  }
  try {
    var result = await api.restoreDatabase();
    if (!result || !result.ok) {
      if (result && result.reason !== "cancelled") {
        setStorageMessage("Error al restaurar la copia: " + result.reason, "error");
      }
      return;
    }
    casesState = await api.getCases();
    clearCaseForm();
    renderCaseTable();
    var restoreMsg = t("msg.restore.done.format").replace("{name}", fileNameFromPath(result.path));
    if (result.autoBackupPath) {
      restoreMsg += " " + t("msg.restore.safeBackup.format").replace("{name}", fileNameFromPath(result.autoBackupPath));
    }
    setStorageMessage(restoreMsg, "success");
  } catch (err) {
    setStorageMessage("Error al restaurar la copia: " + err.message, "error");
  }
});

async function performSave(options) {
  var silent = options && options.silent;
  clearStorageMessage();

  if (!supportsCaseStorage) {
    if (!silent) setStorageMessage(t("msg.static.readOnly"), "info");
    return;
  }

  var formData = collectCaseFormData();

  if (!formData.caseName) {
    if (!silent) {
      setStorageMessage(t("error.name"), "error");
      focusField(caseNameField);
    }
    return;
  }

  var phoneOk = validatePhone();
  var emailOk = validateEmail();
  if (!phoneOk || !emailOk) {
    if (!silent) {
      setStorageMessage(t("error.format"), "error");
      focusField(!phoneOk ? casePhoneField : caseEmailField);
    }
    return;
  }

  var guidance = renderGuidance();
  var id = formData.id || await api.getNextId();

  var caseData = logic.normalizeCase(Object.assign({}, formData, {
    id:                      id,
    route:                   guidance.result.routeLabel,
    resultTitle:             guidance.result.title,
    resultSummary:           guidance.result.summary,
    documentsPendingSummary: guidance.documentsPendingSummary,
    stepsPendingSummary:     guidance.stepsPendingSummary,
    answers:                 collectAnswers(),
    checks:                  currentChecks
  }));

  try {
    var saved = await api.saveCase(caseData);
    casesState = await api.getCases();
    renderCaseTable();
    populateCaseForm(saved);
    if (silent) {
      showAutosaveIndicator();
    } else {
      setStorageMessage(t("msg.saved.format").replace("{id}", saved.id), "success");
    }
  } catch (err) {
    if (!silent) setStorageMessage("Error al guardar el caso: " + err.message, "error");
  }
}

function showAutosaveIndicator() {
  var el = autosaveIndicator;
  if (!el) return;
  el.textContent = t("msg.autosaved");
  el.classList.add("visible");
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(function() { el.classList.remove("visible"); }, 2500);
}

caseForm.addEventListener("submit", function(event) {
  event.preventDefault();
  performSave({ silent: false });
});

// Autosave on focusout (debounced 1.5s), only when caseName is filled
var autosaveTimer = null;
caseForm.addEventListener("focusout", function() {
  if (!supportsCaseStorage) return;
  clearTimeout(autosaveTimer);
  if (!caseNameField.value.trim()) return;
  autosaveTimer = setTimeout(function() {
    performSave({ silent: true });
  }, 1500);
});

// Ctrl+S shortcut
document.addEventListener("keydown", function(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === "s") {
    event.preventDefault();
    clearTimeout(autosaveTimer);
    performSave({ silent: false });
  }
});

copySummaryButton.addEventListener("click", async function() {
  if (!caseNameField.value.trim()) {
    setStorageMessage(t("error.name"), "error");
    focusField(caseNameField);
    return;
  }

  try {
    await copyTextToClipboard(buildCaseSummaryText());
    setStorageMessage(t("msg.summaryCopied"), "success");
  } catch (err) {
    setStorageMessage(err.message || t("msg.copyUnsupported"), "error");
  }
});

caseSearchField.addEventListener("input", renderCaseTable);
caseStatusFilterField.addEventListener("change", renderCaseTable);

document.getElementById("urgent-filter-button").addEventListener("click", function() {
  urgentFilterActive = !urgentFilterActive;
  this.classList.toggle("active", urgentFilterActive);
  renderCaseTable();
});

caseTableBody.addEventListener("click", function(event) {
  var button = event.target.closest("[data-case-id]");
  if (!button) return;
  var caseItem = casesState.find(function(c) { return c.id === button.dataset.caseId; });
  if (caseItem) {
    populateCaseForm(caseItem);
    setStorageMessage(t("msg.editing.format").replace("{id}", caseItem.id), "info");
  }
});

// Lang toggle

document.getElementById("lang-es").addEventListener("click", function() { setLanguage("es"); });
document.getElementById("lang-fr").addEventListener("click", function() { setLanguage("fr"); });

// Bootstrap

async function initialize() {
  applyRuntimeMode();

  if (supportsCaseStorage) {
    try {
      casesState = await api.getCases();
    } catch (err) {
      setStorageMessage("Error al cargar los casos: " + err.message, "error");
      casesState = [];
    }
  }
  caseLocalityField.value = caseLocalityField.value || "Bergara";
  applyLanguage();
  renderCaseTable();
}

initialize();
