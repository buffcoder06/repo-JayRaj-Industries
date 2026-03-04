// =========================
// Sidebar collapse + Theme toggle
// Put this in wwwroot/js/site.js
// =========================
(function () {
  const root = document.documentElement;
  const shell = document.querySelector(".app-shell");

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
        return originalFire({
          ...swalDefaults,
          ...options,
          customClass: {
            ...swalDefaults.customClass,
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
