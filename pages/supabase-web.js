(function initSupabaseWeb() {
  var logic = window.RegularizacionLogic;
  var config = window.REGULARIZAZIOA_SUPABASE_CONFIG || {};
  var authShell = document.getElementById("auth-shell");
  var privateApp = document.getElementById("private-app");
  var loginForm = document.getElementById("login-form");
  var loginEmail = document.getElementById("login-email");
  var loginPassword = document.getElementById("login-password");
  var loginMessage = document.getElementById("login-message");
  var captchaShell = document.getElementById("captcha-shell");
  var captchaContainer = document.getElementById("login-captcha");
  var userBar = document.getElementById("private-userbar");
  var currentUserEmail = document.getElementById("current-user-email");
  var logoutButton = document.getElementById("logout-button");
  var captchaToken = "";
  var captchaWidgetId = null;

  window.REGULARIZAZIOA_APP_CONFIG = Object.assign({}, window.REGULARIZAZIOA_APP_CONFIG, {
    mode: "web-private"
  });

  function setAuthMessage(text, tone) {
    if (!loginMessage) return;
    if (!text) {
      loginMessage.textContent = "";
      loginMessage.className = "notice hidden";
      return;
    }
    loginMessage.textContent = text;
    loginMessage.className = "notice " + (tone || "info");
  }

  function setLoggedInState(session) {
    var loggedIn = Boolean(session);
    if (authShell) authShell.classList.toggle("hidden", loggedIn);
    if (privateApp) privateApp.classList.toggle("hidden", !loggedIn);
    if (userBar) userBar.classList.toggle("hidden", !loggedIn);
    if (currentUserEmail) currentUserEmail.textContent = session && session.user ? (session.user.email || "") : "";
  }

  function missingConfigError() {
    return new Error("Falta configurar Supabase en pages/config.js.");
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

  if (!window.supabase || !config.url || !config.anonKey) {
    setLoggedInState(null);
    setAuthMessage("Falta configurar Supabase antes de usar el area privada.", "error");
    window.electronAPI = {
      getCases: async function() { return []; },
      getRepresentatives: async function() { return []; },
      getNextId: async function() { throw missingConfigError(); },
      saveRepresentative: async function() { throw missingConfigError(); },
      saveCase: async function() { throw missingConfigError(); },
      exportExcel: async function() { return { ok: false, reason: "desktop-only" }; },
      backupDatabase: async function() { return { ok: false, reason: "desktop-only" }; },
      restoreDatabase: async function() { return { ok: false, reason: "desktop-only" }; }
    };
    return;
  }

  var supabaseClient = window.supabase.createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  async function getSession() {
    var result = await supabaseClient.auth.getSession();
    if (result.error) throw result.error;
    return result.data.session;
  }

  async function requireSession() {
    var session = await getSession();
    if (!session) {
      throw new Error("Necesitas iniciar sesión para acceder a los casos.");
    }
    return session;
  }

  function normalizeSavedCase(row) {
    return logic.normalizeCase((row && row.payload) || {});
  }

  function normalizeSavedRepresentative(row) {
    return logic.normalizeRepresentative((row && row.payload) || {});
  }

  window.electronAPI = {
    getCases: async function() {
      var session = await getSession();
      if (!session) return [];

      var result = await supabaseClient
        .from("app_cases")
        .select("payload, updated_at")
        .order("updated_at", { ascending: false });

      if (result.error) throw result.error;
      return (result.data || []).map(normalizeSavedCase);
    },

    getRepresentatives: async function() {
      var session = await getSession();
      if (!session) return [];

      var result = await supabaseClient
        .from("app_representatives")
        .select("payload, updated_at")
        .order("updated_at", { ascending: false });

      if (result.error) throw result.error;
      return (result.data || []).map(normalizeSavedRepresentative);
    },

    getNextId: async function() {
      await requireSession();
      var result = await supabaseClient.rpc("next_case_id");
      if (result.error) throw result.error;
      return result.data;
    },

    saveRepresentative: async function(representativeData) {
      var session = await requireSession();
      var normalized = logic.normalizeRepresentative(representativeData);
      var now = new Date().toISOString();

      if (!normalized.name) {
        throw new Error("El representante necesita al menos un nombre.");
      }

      var id = normalized.id || (
        window.crypto && typeof window.crypto.randomUUID === "function"
          ? "REP-" + window.crypto.randomUUID()
          : "REP-" + now.replace(/\D/g, "").slice(-12) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase()
      );
      var row = {
        id: id,
        payload: Object.assign({}, normalized, {
          id: id,
          updatedAt: now
        }),
        created_at: now,
        updated_at: now,
        updated_by: session.user.id
      };

      var result = await supabaseClient
        .from("app_representatives")
        .upsert(row, { onConflict: "id" })
        .select("payload")
        .single();

      if (result.error) throw result.error;
      return normalizeSavedRepresentative(result.data);
    },

    saveCase: async function(caseData) {
      var session = await requireSession();
      var normalized = logic.normalizeCase(caseData);
      var now = new Date().toISOString();
      var row = {
        id: normalized.id,
        payload: Object.assign({}, normalized, {
          createdAt: normalized.createdAt || now,
          updatedAt: now
        }),
        created_at: normalized.createdAt || now,
        updated_at: now,
        updated_by: session.user.id
      };

      var result = await supabaseClient
        .from("app_cases")
        .upsert(row, { onConflict: "id" })
        .select("payload")
        .single();

      if (result.error) throw result.error;
      return normalizeSavedCase(result.data);
    },

    exportExcel: async function() {
      return { ok: false, reason: "desktop-only" };
    },

    backupDatabase: async function() {
      return { ok: false, reason: "desktop-only" };
    },

    restoreDatabase: async function() {
      return { ok: false, reason: "desktop-only" };
    }
  };

  async function refreshAuthUi() {
    try {
      var session = await getSession();
      setLoggedInState(session);
      if (!session) {
        setAuthMessage("Inicia sesión con tu correo y contraseña para abrir el área privada.", "info");
      } else {
        setAuthMessage("", "info");
      }
    } catch (error) {
      setLoggedInState(null);
      setAuthMessage(error.message, "error");
    }
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async function(event) {
      event.preventDefault();
      setAuthMessage("", "info");

      var email = String(loginEmail && loginEmail.value || "").trim();
      var password = String(loginPassword && loginPassword.value || "");
      if (!email) {
        setAuthMessage("Escribe un correo autorizado.", "error");
        return;
      }
      if (!password) {
        setAuthMessage("Escribe la contraseña.", "error");
        return;
      }
      if (captchaEnabled() && !captchaToken) {
        setAuthMessage("Completa la verificación anti-bots.", "error");
        return;
      }

      try {
        var result = await supabaseClient.auth.signInWithPassword({
          email: email,
          password: password,
          options: captchaEnabled() ? { captchaToken: captchaToken } : undefined
        });
        if (result.error) throw result.error;
        setAuthMessage("", "info");
      } catch (error) {
        setAuthMessage(error.message, "error");
      } finally {
        if (captchaEnabled()) resetCaptcha();
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", async function() {
      await supabaseClient.auth.signOut();
      window.location.href = window.location.pathname;
    });
  }

  supabaseClient.auth.onAuthStateChange(function(event, session) {
    setLoggedInState(session || null);
    if (!session) {
      setAuthMessage("Inicia sesión con tu correo y contraseña para abrir el área privada.", "info");
    }
  });

  refreshAuthUi();
  renderCaptchaWhenReady();
})();
