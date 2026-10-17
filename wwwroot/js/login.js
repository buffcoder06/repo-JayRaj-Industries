// Sign-in page behaviour. Kept in a file (not inline) so the
// Content-Security-Policy can forbid inline scripts.
(function () {
    var form = document.getElementById('loginForm');
    var user = document.getElementById('Username');
    var pass = document.getElementById('Password');
    var toggle = document.getElementById('togglePassword');
    var caps = document.getElementById('capsHint');
    var submit = document.getElementById('loginSubmit');
    if (!form) return;

    // Username already filled (failed attempt) → go straight to password.
    (user.value ? pass : user).focus();

    toggle.addEventListener('click', function () {
        var show = pass.type === 'password';
        pass.type = show ? 'text' : 'password';
        toggle.setAttribute('aria-pressed', String(show));
        toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        toggle.title = show ? 'Hide password' : 'Show password';
        pass.focus();
    });

    function checkCaps(e) {
        if (e.getModifierState) caps.hidden = !e.getModifierState('CapsLock');
    }
    pass.addEventListener('keydown', checkCaps);
    pass.addEventListener('keyup', checkCaps);
    pass.addEventListener('blur', function () { caps.hidden = true; });

    [user, pass].forEach(function (el) {
        el.addEventListener('input', function () {
            el.classList.remove('is-invalid');
            el.setAttribute('aria-invalid', 'false');
        });
    });

    form.addEventListener('submit', function (e) {
        var missing = [user, pass].filter(function (el) { return !el.value.trim(); });
        if (missing.length) {
            e.preventDefault();
            missing.forEach(function (el) { el.classList.add('is-invalid'); el.setAttribute('aria-invalid', 'true'); });
            missing[0].focus();
            return;
        }
        if (submit.disabled) { e.preventDefault(); return; }
        submit.disabled = true;
        submit.classList.add('is-loading');
        submit.querySelector('.jr-login__submit-label').textContent = 'Signing in…';
    });

    // Re-enable if the page is restored from the back/forward cache.
    window.addEventListener('pageshow', function () {
        submit.disabled = false;
        submit.classList.remove('is-loading');
        submit.querySelector('.jr-login__submit-label').textContent = 'Sign in';
    });

    // Multi-tab: if the user signs in from another tab, this login page
    // continues into the app instead of sitting on a now-stale form.
    window.addEventListener('storage', function (e) {
        if (e.key !== 'jr.authState' || !e.newValue) return;
        var state;
        try { state = JSON.parse(e.newValue); } catch (err) { return; }
        if (!state || !state.user) return;
        var target = new URLSearchParams(window.location.search).get('returnUrl') || '/';
        // Only same-site paths ("/x", never "//host" or "http://…").
        if (target.charAt(0) !== '/' || target.charAt(1) === '/' || target.charAt(1) === '\\') target = '/';
        window.location.replace(target);
    });
})();
