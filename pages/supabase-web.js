(function initSupabaseWeb() {
  var logic = window.RegularizacionLogic;
  var config = window.REGULARIZAZIOA_SUPABASE_CONFIG || {};
  var authShell = document.getElementById("auth-shell");
  var privateApp = document.getElementById("private-app");
  var loginForm = document.getElementById("login-form");
  var loginEmail = document.getElementById("login-email");
  var loginMessage = document.getElementById("login-message");
  var userBar = document.getElementById("private-userbar");
  var currentUserEmail = document.getElementById("current-user-email");
  var logoutButton = document.getElementById("logout-button");

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

  if (!window.supabase || !config.url || !config.anonKey) {
    setLoggedInState(null);
    setAuthMessage("Falta configurar Supabase antes de usar el area privada.", "error");
    window.electronAPI = {
      getCases: async function() { return []; },
      getNextId: async function() { throw missingConfigError(); },
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
      throw new Error("Necesitas iniciar sesion para acceder a los casos.");
    }
    return session;
  }

  function normalizeSavedCase(row) {
    return logic.normalizeCase((row && row.payload) || {});
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

    getNextId: async function() {
      await requireSession();
      var result = await supabaseClient.rpc("next_case_id");
      if (result.error) throw result.error;
      return result.data;
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
        setAuthMessage("Inicia sesion con un correo invitado para abrir el area privada.", "info");
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
      if (!email) {
        setAuthMessage("Escribe un correo autorizado.", "error");
        return;
      }

      try {
        var redirectUrl = window.location.origin + window.location.pathname;
        var result = await supabaseClient.auth.signInWithOtp({
          email: email,
          options: {
            emailRedirectTo: redirectUrl,
            shouldCreateUser: false
          }
        });
        if (result.error) throw result.error;
        setAuthMessage("Hemos enviado un enlace de acceso a tu correo.", "success");
      } catch (error) {
        setAuthMessage(error.message, "error");
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
      setAuthMessage("Inicia sesion con un correo invitado para abrir el area privada.", "info");
    }
  });

  refreshAuthUi();
})();
