/* global window, document, fetch */
(function initPublicIntake() {
  var T = window.TRANSLATIONS || {};
  var config = window.REGULARIZAZIOA_SUPABASE_CONFIG || {};
  var currentLang = "es";
  var captchaToken = "";
  var captchaWidgetId = null;

  var form = document.getElementById("case-form");
  var message = document.getElementById("storage-message");
  var idField = document.getElementById("case-id");
  var idPreview = document.getElementById("case-id-preview");
  var nameField = document.getElementById("case-name");
  var phoneField = document.getElementById("case-phone");
  var emailField = document.getElementById("case-email");
  var phoneError = document.getElementById("phone-error");
  var emailError = document.getElementById("email-error");
  var clearButton = document.getElementById("clear-case-button");
  var captchaShell = document.getElementById("captcha-shell");
  var captchaContainer = document.getElementById("submit-captcha");

  function t(key) {
    return (T[currentLang] && T[currentLang].ui && T[currentLang].ui[key]) ||
      (T.es && T.es.ui && T.es.ui[key]) || key;
  }

  function setMessage(text, tone) {
    if (!message) return;
    message.textContent = text || "";
    message.className = text ? "notice " + (tone || "info") : "notice hidden";
  }

  function setLanguage(lang) {
    currentLang = lang === "fr" ? "fr" : "es";
    document.getElementById("html-root").lang = currentLang;
    document.querySelectorAll("[data-i18n]").forEach(function(el) {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function(el) {
      el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
    });
    document.getElementById("lang-es").classList.toggle("active", currentLang === "es");
    document.getElementById("lang-fr").classList.toggle("active", currentLang === "fr");
  }

  function captchaEnabled() {
    return config.captchaProvider === "turnstile" && Boolean(config.captchaSiteKey);
  }

  function resetCaptcha() {
    captchaToken = "";
    if (window.turnstile && captchaWidgetId !== null) {
      window.turnstile.reset(captchaWidgetId);
    }
  }

  function renderCaptchaWhenReady() {
    if (!captchaEnabled() || !captchaContainer || !captchaShell) return;
    captchaShell.classList.remove("hidden");

    if (!window.turnstile || typeof window.turnstile.render !== "function") {
      window.setTimeout(renderCaptchaWhenReady, 250);
      return;
    }

    if (captchaWidgetId !== null) return;
    captchaWidgetId = window.turnstile.render(captchaContainer, {
      sitekey: config.captchaSiteKey,
      callback: function(token) {
        captchaToken = token || "";
      },
      "expired-callback": resetCaptcha,
      "error-callback": resetCaptcha
    });
  }

  function getValue(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }

  function getChecked(id) {
    var el = document.getElementById(id);
    return Boolean(el && el.checked);
  }

  function isValidPhone(value) {
    if (!value) return true;
    return /^[+()\d\s.-]{6,20}$/.test(value);
  }

  function isValidEmail(value) {
    if (!value) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validateContact() {
    var phone = getValue("case-phone");
    var email = getValue("case-email");
    var phoneOk = isValidPhone(phone);
    var emailOk = isValidEmail(email);
    phoneError.classList.toggle("hidden", phoneOk);
    emailError.classList.toggle("hidden", emailOk);
    if (!phoneOk || !emailOk) {
      setMessage(t("error.format"), "error");
      return false;
    }
    if (!phone && !email) {
      setMessage(t("error.contact"), "error");
      phoneField.focus();
      return false;
    }
    return true;
  }

  function createPublicId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return "PUB-" + window.crypto.randomUUID();
    }
    return "PUB-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  function collectPayload() {
    var now = new Date().toISOString();
    var id = idField.value || createPublicId();
    idField.value = id;
    return {
      id: id,
      source: "public-intake",
      caseStatus: "Nuevo",
      caseName: getValue("case-name"),
      phone: getValue("case-phone"),
      email: getValue("case-email"),
      locality: getValue("case-locality"),
      contactPreference: getValue("contact-preference"),
      preferredLanguage: getValue("preferred-language"),
      personType: getValue("person-type"),
      nationality: getValue("nationality"),
      notes: getValue("case-notes"),
      answers: {
        beforeJan2026: getChecked("before-2026") ? "yes" : "unsure",
        fiveMonths: getChecked("five-months") ? "yes" : "unsure",
        piBefore2026: getChecked("pi-before-2026") ? "yes" : "no",
        identityDocument: getChecked("identity-document") ? "yes" : "unsure",
        pendingApplication: getChecked("pending-application") ? "yes" : "no",
        irregularOptions: [
          getChecked("work") ? "work" : "",
          getChecked("family") ? "family" : "",
          getChecked("vulnerability") ? "vulnerability" : ""
        ].filter(Boolean)
      },
      privacyConsent: getChecked("privacy-consent"),
      createdAt: now,
      updatedAt: now
    };
  }

  async function submitPayload(payload) {
    if (!config.submitFunctionUrl) {
      throw new Error(t("error.config"));
    }
    if (!captchaEnabled()) {
      throw new Error(t("error.captchaConfig"));
    }
    if (!captchaToken) {
      throw new Error(t("error.captcha"));
    }

    var response = await fetch(config.submitFunctionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ captchaToken: captchaToken, payload: payload })
    });
    var result = await response.json().catch(function() { return {}; });
    if (!response.ok) {
      throw new Error(result.error || t("error.submit"));
    }
    return result.payload || payload;
  }

  if (phoneField) phoneField.addEventListener("input", function() { phoneError.classList.toggle("hidden", isValidPhone(getValue("case-phone"))); });
  if (emailField) emailField.addEventListener("input", function() { emailError.classList.toggle("hidden", isValidEmail(getValue("case-email"))); });

  document.getElementById("lang-es").addEventListener("click", function() { setLanguage("es"); });
  document.getElementById("lang-fr").addEventListener("click", function() { setLanguage("fr"); });

  clearButton.addEventListener("click", function() {
    form.reset();
    idField.value = "";
    idPreview.textContent = "";
    idPreview.classList.add("hidden");
    setMessage("", "info");
    resetCaptcha();
  });

  form.addEventListener("submit", async function(event) {
    event.preventDefault();
    setMessage("", "info");

    if (!nameField.value.trim()) {
      setMessage(t("error.name"), "error");
      nameField.focus();
      return;
    }
    if (!validateContact()) return;
    if (!getChecked("privacy-consent")) {
      setMessage(t("error.consent"), "error");
      return;
    }

    try {
      var saved = await submitPayload(collectPayload());
      idPreview.textContent = saved.id || idField.value;
      idPreview.classList.remove("hidden");
      setMessage(t("msg.saved.format").replace("{id}", saved.id || idField.value), "success");
    } catch (error) {
      setMessage(error.message, "error");
    } finally {
      resetCaptcha();
    }
  });

  setLanguage("es");
  renderCaptchaWhenReady();
})();
