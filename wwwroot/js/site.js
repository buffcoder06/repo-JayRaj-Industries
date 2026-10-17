// =========================
// Sidebar collapse + Theme toggle
// Put this in wwwroot/js/site.js
// =========================
(function () {
  const root = document.documentElement;
  const shell = document.querySelector(".app-shell");

  // Send the antiforgery token as a header on every AJAX call so
  // [ValidateAntiForgeryToken] POST actions accept requests that aren't
  // traditional form posts (JSON bodies, query-string POSTs, etc.).
  const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');
  if (tokenInput && window.jQuery) {
    window.jQuery.ajaxSetup({
      headers: { "X-CSRF-TOKEN": tokenInput.value }
    });
  }

  const logoutBtn = document.getElementById("btnLogout");
  if (logoutBtn && window.jQuery) {
    logoutBtn.addEventListener("click", function () {
      window.jQuery.ajax({
        url: "/Account/Logout",
        type: "POST",
        success: function () {
          window.location.href = "/Account/Login";
        },
        error: function () {
          window.location.href = "/Account/Login";
        }
      });
    });
  }

  // Theme: system/light/dark
  function applyTheme(mode) {
    if (!mode || mode === "system") {
      root.removeAttribute("data-theme");
      localStorage.removeItem("theme");
      return;
    }
    root.setAttribute("data-theme", mode);
    localStorage.setItem("theme", mode);
  }

  // init theme
  const savedTheme = localStorage.getItem("theme") || "system";
  applyTheme(savedTheme);

  // toggle theme button
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") || "system";
      // cycle: system -> light -> dark -> system
      const next = current === "system" ? "light" : current === "light" ? "dark" : "system";
      applyTheme(next);
    });
  });

  // Sidebar toggle (desktop collapse + mobile slide)
  document.querySelectorAll("[data-sidebar-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!shell) return;
      // mobile open/close
      if (window.matchMedia("(max-width: 768px)").matches) {
        shell.classList.toggle("app-shell--sidebar-open");
        return;
      }
      // desktop collapse/expand
      shell.classList.toggle("app-shell--sidebar-collapsed");
      localStorage.setItem(
        "sidebarCollapsed",
        shell.classList.contains("app-shell--sidebar-collapsed") ? "1" : "0"
      );
    });
  });

  // init sidebar collapsed state for desktop
  if (shell && localStorage.getItem("sidebarCollapsed") === "1") {
    shell.classList.add("app-shell--sidebar-collapsed");
  }

  // Mark active sidebar link from current route
  const currentPath = window.location.pathname.toLowerCase();
  document.querySelectorAll(".app-sidebar__link").forEach((link) => {
    const href = (link.getAttribute("href") || "").toLowerCase();
    if (href && (currentPath === href || (href !== "/" && currentPath.startsWith(href)))) {
      link.setAttribute("aria-current", "page");
    }
  });

  // Header search shortcut: Ctrl+K (Cmd+K on Mac) or "/" focuses the search.
  const searchInput = document.querySelector(".jr-search input");
  if (searchInput) {
    document.addEventListener("keydown", (e) => {
      const target = e.target;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable;
      const modK = (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k";
      if (modK || (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    });
  }

  // Today's date as YYYY-MM-DD in the user's local time zone. Don't use
  // toISOString() for this: it's UTC, so in India it gives yesterday's date
  // between midnight and 5:30 AM.
  window.jrToday = function () {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  };

  // Digits-only inputs (chalan numbers): mark with data-jr-digits. Delegated
  // so inputs rendered later (e.g. inside popups) are covered too.
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (!el.matches || !el.matches("input[data-jr-digits]")) return;
    const clean = el.value.replace(/\D/g, "");
    if (clean !== el.value) el.value = clean;
  }, true);

  // -------------------------------------------------------------------
  // Idle session timeout (server limit: SessionPolicy.IdleTimeout).
  // The server renews the session on every request; this mirrors that clock
  // in the browser so the user is warned 2 minutes before sign-out, and any
  // real activity (typing, clicking) quietly keeps the session alive.
  // The clock is shared across tabs through localStorage.
  // -------------------------------------------------------------------
  const idleSeconds = parseInt(document.body.dataset.sessionIdleSeconds || "", 10);
  if (idleSeconds > 0 && window.jQuery) {
    const $ = window.jQuery;
    const IDLE_MS = idleSeconds * 1000 - 5000;   // a little before the server's limit
    const WARN_MS = 2 * 60 * 1000;
    const PING_EVERY_MS = 60 * 1000;           // at most one keep-alive per minute
    const KEY = "jr.lastServerActivity";
    let lastLocal = Date.now();
    let pinging = false;
    let signingOut = false;
    let $warning = null;

    const readLast = () => {
      try { return Math.max(lastLocal, parseInt(localStorage.getItem(KEY) || "0", 10) || 0); }
      catch (e) { return lastLocal; }
    };
    const markServerActivity = () => {
      lastLocal = Date.now();
      try { localStorage.setItem(KEY, String(lastLocal)); } catch (e) { /* private mode */ }
    };
    const goToLogin = () => {
      if (signingOut) return;
      signingOut = true;
      const back = window.location.pathname + window.location.search;
      window.location.href = "/Account/Login?expired=true&returnUrl=" + encodeURIComponent(back);
    };
    const signOutNow = () => {
      if (signingOut) return;
      $.ajax({ url: "/Account/Logout", type: "POST", global: false, complete: goToLogin });
    };
    const keepAlive = () => {
      if (pinging || signingOut) return;
      pinging = true;
      $.ajax({ url: "/Session/KeepAlive", type: "GET", cache: false })
        .always(() => { pinging = false; });
    };

    // Every successful server round-trip renews the session.
    $(document).ajaxSuccess(markServerActivity);
    // Session already gone (e.g. laptop slept): go to sign-in instead of a
    // confusing "Load Error".
    $(document).ajaxError((e, xhr) => { if (xhr.status === 401) goToLogin(); });
    markServerActivity();

    // Real user activity extends the session (unless the warning is showing,
    // where the user must choose explicitly).
    ["keydown", "mousedown", "touchstart", "wheel"].forEach((evt) =>
      document.addEventListener(evt, () => {
        if ($warning) return;
        if (Date.now() - readLast() > PING_EVERY_MS) keepAlive();
      }, { passive: true, capture: true }));

    const formatLeft = (ms) => {
      const s = Math.max(0, Math.ceil(ms / 1000));
      return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    };

    const showWarning = () => {
      $warning = $(
        '<div class="jr-modal-backdrop jr-session-warning" role="presentation">' +
          '<div class="jr-modal jr-modal--session" role="alertdialog" aria-modal="true" aria-labelledby="jrSessionTitle" aria-describedby="jrSessionText">' +
            '<div class="jr-session-warning__body">' +
              '<div class="jr-session-warning__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm.5 5v5.2l4.3 2.6-.8 1.3-5-3V7z"/></svg></div>' +
              '<h2 class="jr-session-warning__title" id="jrSessionTitle">Still there?</h2>' +
              '<p class="jr-session-warning__text" id="jrSessionText">For security you\'ll be signed out in <strong class="jr-tabular" id="jrSessionLeft"></strong> because of inactivity.</p>' +
            '</div>' +
            '<div class="jr-session-warning__actions">' +
              '<button type="button" class="jr-btn jr-btn--ghost" id="jrSessionSignOut">Sign out</button>' +
              '<button type="button" class="jr-btn jr-btn--accent" id="jrSessionStay">Stay signed in</button>' +
            '</div>' +
          '</div>' +
        '</div>');
      $("body").append($warning);
      requestAnimationFrame(() => requestAnimationFrame(() => $warning && $warning.addClass("is-open")));
      $warning.find("#jrSessionStay").on("click", () => { keepAlive(); hideWarning(); }).trigger("focus");
      $warning.find("#jrSessionSignOut").on("click", signOutNow);
    };
    const hideWarning = () => {
      if (!$warning) return;
      $warning.remove();
      $warning = null;
    };

    setInterval(() => {
      if (signingOut) return;
      const left = readLast() + IDLE_MS - Date.now();
      if (left <= 0) { hideWarning(); signOutNow(); return; }
      if (left <= WARN_MS) {
        if (!$warning) showWarning();
        $warning.find("#jrSessionLeft").text(formatLeft(left));
      } else if ($warning) {
        hideWarning();   // another tab (or a ping) extended the session
      }
    }, 1000);
  }

  // Apply global SweetAlert2 branding once library is available.
  function setupSwalTheme() {
    if (!window.Swal || window.__jrSwalPatched) return false;

    const swalDefaults = {
      customClass: {
        popup: "jr-alert-popup",
        title: "jr-alert-title",
        htmlContainer: "jr-alert-text",
        confirmButton: "jr-alert-btn jr-alert-btn--primary",
        cancelButton: "jr-alert-btn jr-alert-btn--muted"
      },
      buttonsStyling: false,
      background: "#ffffff",
      reverseButtons: true
    };

    const originalFire = window.Swal.fire.bind(window.Swal);
    window.Swal.fire = function (...args) {
      if (typeof args[0] === "string") {
        const [title, text, icon] = args;
        return originalFire({
          ...swalDefaults,
          title,
          text,
          icon
        });
      }

      if (typeof args[0] === "object" && args[0] !== null) {
        const options = args[0];
        // Callers still pass legacy confirmButtonColor values (ignored with
        // buttonsStyling off); a red one on a confirm dialog means "destructive".
        const destructive = options.showCancelButton &&
          /^(red|#d33|#dc3545)$/i.test(options.confirmButtonColor || "");
        return originalFire({
          ...swalDefaults,
          ...options,
          customClass: {
            ...swalDefaults.customClass,
            ...(destructive ? { confirmButton: "jr-alert-btn jr-alert-btn--danger" } : {}),
            ...(options.customClass || {})
          }
        });
      }

      return originalFire(...args);
    };

    window.__jrSwalPatched = true;
    return true;
  }

  if (!setupSwalTheme()) {
    let attempts = 0;
    const maxAttempts = 50;
    const timer = setInterval(() => {
      attempts += 1;
      if (setupSwalTheme() || attempts >= maxAttempts) {
        clearInterval(timer);
      }
    }, 120);
  }
})();
