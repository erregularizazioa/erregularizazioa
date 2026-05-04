(function initPublicSubmit() {
  var config = window.REGULARIZAZIOA_SUPABASE_CONFIG || {};
  var captchaShell = document.getElementById("captcha-shell");
  var captchaContainer = document.getElementById("submit-captcha");
  var captchaToken = "";
  var captchaWidgetId = null;

  window.REGULARIZAZIOA_APP_CONFIG = Object.assign({}, window.REGULARIZAZIOA_APP_CONFIG, {
    mode: "public-submit"
  });

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

  function getSubmissionEndpoint() {
    return config.submitFunctionUrl || "";
  }

  window.electronAPI = {
    getCases: async function() { return []; },
    getRepresentatives: async function() { return []; },
    getNextId: async function() {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return "PUB-" + window.crypto.randomUUID();
      }
      return "PUB-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    },
    prepareSave: async function() {
      if (!getSubmissionEndpoint()) {
        throw new Error("Falta configurar submitFunctionUrl en pages/config.js.");
      }
      if (!captchaEnabled()) {
        throw new Error("Falta configurar captchaSiteKey en pages/config.js.");
      }
      if (!captchaToken) {
        throw new Error("Completa la verificacion anti-bots.");
      }
    },
    saveRepresentative: async function() {
      throw new Error("La agenda de representantes no esta disponible en el formulario publico.");
    },
    saveCase: async function(caseData) {
      try {
        var response = await fetch(getSubmissionEndpoint(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            captchaToken: captchaToken,
            payload: caseData
          })
        });
        var result = await response.json().catch(function() { return {}; });
        if (!response.ok) {
          throw new Error(result.error || "No se pudo enviar el formulario.");
        }
        return result.payload || caseData;
      } finally {
        resetCaptcha();
      }
    },
    exportExcel: async function() { return { ok: false, reason: "web-public" }; },
    backupDatabase: async function() { return { ok: false, reason: "web-public" }; },
    restoreDatabase: async function() { return { ok: false, reason: "web-public" }; }
  };

  renderCaptchaWhenReady();
})();
