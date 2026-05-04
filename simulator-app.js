const logic = window.RegularizacionLogic;
const T = window.TRANSLATIONS;

const caseForm = document.getElementById("case-form");
const irregularCriteria = document.getElementById("irregular-criteria");
const guidancePreview = document.getElementById("guidance-preview");
const guidanceDocuments = document.getElementById("guidance-documents");
const guidanceSteps = document.getElementById("guidance-steps");
const stepPrevButton = document.getElementById("step-prev");
const stepNextButton = document.getElementById("step-next");
const stepProgressLabel = document.getElementById("step-progress-label");
const resetSimulatorButton = document.getElementById("reset-simulator-button");

const TOTAL_STEPS = 6;
const ANSWER_SELECTOR = [
  'input[name="personType"]',
  'input[name="minorBirthPlace"]',
  'input[name="minorGuardianStatus"]',
  'input[name="minorSchoolingRequired"]',
  'input[name="minorNeedsCustodyProof"]',
  'input[name="minorHasDisability"]',
  'input[name="validPermit"]',
  'input[name="ukraineProtection"]',
  'input[name="stateless"]',
  'input[name="publicOrderRisk"]',
  'input[name="publicHealthRisk"]',
  'input[name="rejectableRecord"]',
  'input[name="nonReturnCommitment"]',
  'input[name="pendingApplication"]',
  'input[name="beforeJan2026"]',
  'input[name="fiveMonths"]',
  'input[name="identityDocument"]',
  'input[name="criminalRecord"]',
  'input[name="piBefore2026"]',
  'input[name="irregularCriterion"]'
].join(", ");

let currentStep = 1;
let currentChecks = {};
let currentLang = localStorage.getItem("regularizazioa-lang") || "es";

function t(key) {
  return (T[currentLang] && T[currentLang].ui[key]) || (T.es.ui[key]) || key;
}

function tChecklist(key) {
  return (T[currentLang] && T[currentLang].checklist[key]) || (T.es.checklist[key]) || null;
}

function tResult(code) {
  return (T[currentLang] && T[currentLang].results[code]) || (T.es.results[code]) || null;
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function list(items) {
  return "<ul>" + items.map(function(item) {
    return "<li>" + escapeHtml(item) + "</li>";
  }).join("") + "</ul>";
}

function getCheckedValues(name) {
  return Array.from(document.querySelectorAll('input[name="' + name + '"]:checked'))
    .map(function(input) { return input.value; });
}

function getRadioValue(name) {
  var el = document.querySelector('input[name="' + name + '"]:checked');
  return el ? el.value : "";
}

function collectAnswers() {
  return {
    personType: getRadioValue("personType"),
    minorBirthPlace: getRadioValue("minorBirthPlace"),
    minorGuardianStatus: getRadioValue("minorGuardianStatus"),
    minorSchoolingRequired: getRadioValue("minorSchoolingRequired"),
    minorNeedsCustodyProof: getRadioValue("minorNeedsCustodyProof"),
    minorHasDisability: getRadioValue("minorHasDisability"),
    validPermit: getRadioValue("validPermit"),
    ukraineProtection: getRadioValue("ukraineProtection"),
    stateless: getRadioValue("stateless"),
    publicOrderRisk: getRadioValue("publicOrderRisk"),
    publicHealthRisk: getRadioValue("publicHealthRisk"),
    rejectableRecord: getRadioValue("rejectableRecord"),
    nonReturnCommitment: getRadioValue("nonReturnCommitment"),
    pendingApplication: getRadioValue("pendingApplication"),
    beforeJan2026: getRadioValue("beforeJan2026"),
    fiveMonths: getRadioValue("fiveMonths"),
    identityDocument: getRadioValue("identityDocument"),
    criminalRecord: getRadioValue("criminalRecord"),
    piBefore2026: getRadioValue("piBefore2026"),
    irregularOptions: getCheckedValues("irregularCriterion")
  };
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

function toggleIrregularCriteria() {
  irregularCriteria.classList.toggle("hidden", getRadioValue("piBefore2026") === "yes");
}

function getNextAnalysisStep(step, answers) {
  if (step >= TOTAL_STEPS) return null;
  if (step === 1) return 2;
  if (step === 2) {
    if (answers.personType === "minor") return null;
    return answers.beforeJan2026 === "yes" && answers.fiveMonths === "yes" ? 3 : null;
  }
  if (step === 3) return answers.validPermit === "yes" ? null : 4;
  if (step === 4) return answers.ukraineProtection === "yes" || answers.stateless === "yes" ? null : 5;
  if (step === 5) return answers.pendingApplication === "yes" ? null : 6;
  return null;
}

function updateStepNavigation(step, answers) {
  var nextStep = getNextAnalysisStep(step, answers);
  stepPrevButton.classList.toggle("hidden", step === 1);
  stepNextButton.textContent = nextStep ? t("step.next") : t("step.last");
  return nextStep;
}

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

function renderGuidance() {
  var answers = collectAnswers();
  toggleMinorCriteria(answers.personType);
  toggleIrregularCriteria();
  updateStepNavigation(currentStep, answers);

  var guidance = logic.buildCaseGuidance(answers, currentChecks);
  var result = guidance.result;
  var tr = tResult(result.code) || result;
  var whyList = Array.isArray(tr.why) ? tr.why : Object.values(tr.why || {});
  var whyBlock = whyList.length
    ? '<div class="result-block"><h4>' + escapeHtml(t("guidance.why.heading")) + '</h4>' + list(whyList) + "</div>"
    : "";

  guidancePreview.innerHTML =
    '<div class="status-card ' + escapeHtml(result.tone) + '">' +
      "<h3>" + escapeHtml(tr.title || result.title) + "</h3>" +
      "<p>" + escapeHtml(tr.summary || result.summary) + "</p>" +
    "</div>" +
    '<span class="route-badge">' + escapeHtml(tr.routeLabel || result.routeLabel || t("guidance.route.pending")) + "</span>" +
    whyBlock +
    '<div class="pending-summary">' +
      "<div><strong>" + escapeHtml(t("guidance.pending.docs")) + "</strong>" + escapeHtml(guidance.documentsPendingSummary) + "</div>" +
      "<div><strong>" + escapeHtml(t("guidance.pending.steps")) + "</strong>" + escapeHtml(guidance.stepsPendingSummary) + "</div>" +
    "</div>" +
    '<p class="note">' + escapeHtml(t("guidance.official")) + "</p>";

  renderChecklist(guidanceDocuments, guidance.documents, "guidance.docs.empty", false);

  var steps = guidance.steps;
  if (result.routeLabel === "Otra via" && tr.nextSteps && tr.nextSteps.length) {
    steps = tr.nextSteps.map(function(label, i) {
      var key = "step-other-" + (i + 1);
      return { key: key, label: label, done: !!currentChecks[key] };
    });
  }
  renderChecklist(guidanceSteps, steps, "guidance.steps.empty", true);
  return guidance;
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
  showAnalysisStep(currentStep);
  renderGuidance();
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("regularizazioa-lang", lang);
  applyLanguage();
}

document.querySelectorAll(ANSWER_SELECTOR).forEach(function(input) {
  input.addEventListener("change", renderGuidance);
});

stepPrevButton.addEventListener("click", function() {
  if (currentStep > 1) {
    showAnalysisStep(currentStep - 1);
    renderGuidance();
  }
});

stepNextButton.addEventListener("click", function() {
  var nextStep = getNextAnalysisStep(currentStep, collectAnswers());
  if (nextStep) {
    showAnalysisStep(nextStep);
    renderGuidance();
  } else {
    document.querySelector(".guidance-grid").scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

[guidanceDocuments, guidanceSteps].forEach(function(container) {
  container.addEventListener("change", function(event) {
    var checkbox = event.target.closest("[data-check-key]");
    if (!checkbox) return;
    currentChecks[checkbox.dataset.checkKey] = checkbox.checked;
    renderGuidance();
  });
});

resetSimulatorButton.addEventListener("click", function() {
  caseForm.reset();
  currentChecks = {};
  showAnalysisStep(1);
  renderGuidance();
});

document.getElementById("lang-es").addEventListener("click", function() { setLanguage("es"); });
document.getElementById("lang-fr").addEventListener("click", function() { setLanguage("fr"); });

applyLanguage();
