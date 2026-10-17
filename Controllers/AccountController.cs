using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using JayRaj_Industries.DataAccessLayer;
using JayRaj_Industries.Filters;
using JayRaj_Industries.Models;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace JayRaj_Industries.Controllers
{
    [AllowAnonymous]
    public class AccountController : Controller
    {
        private readonly UsersDAL _usersDAL;
        private readonly IAntiforgery _antiforgery;

        public AccountController(UsersDAL usersDAL, IAntiforgery antiforgery)
        {
            _usersDAL = usersDAL;
            _antiforgery = antiforgery;
        }

        // Verified against when the username doesn't exist, so an unknown user
        // takes as long to reject as a wrong password (no username probing by timing).
        private static readonly string DummyPasswordHash = PasswordHasher.Hash(Guid.NewGuid().ToString());

        [HttpGet]
        public IActionResult Login(string? returnUrl = null, bool throttled = false, bool expired = false, bool signedOut = false)
        {
            if (User?.Identity?.IsAuthenticated == true)
            {
                return LocalRedirect(SafeReturnUrl(returnUrl));
            }

            ViewData["ReturnUrl"] = returnUrl;
            if (throttled)
            {
                ModelState.AddModelError(string.Empty, "Too many sign-in attempts. Please wait a few minutes and try again.");
            }
            else if (expired)
            {
                ViewData["Notice"] = $"You were signed out after {SessionPolicy.IdleTimeout.TotalMinutes:0.#} minutes of inactivity. Please sign in again.";
            }
            else if (signedOut)
            {
                ViewData["Notice"] = "You have been signed out.";
            }
            return View(new LoginRequest());
        }

        [HttpPost]
        [IgnoreAntiforgeryToken]   // validated manually below, to handle stale tabs gracefully
        [EnableRateLimiting(LoginRateLimit.PolicyName)]
        public async Task<IActionResult> Login(LoginRequest request, string? returnUrl = null)
        {
            ViewData["ReturnUrl"] = returnUrl;

            // A login form left open in another tab carries a token issued before
            // the user signed in (or out) elsewhere, so it no longer validates.
            // Instead of a bare 400: continue if already signed in, else ask again.
            if (!await _antiforgery.IsRequestValidAsync(HttpContext))
            {
                if (User?.Identity?.IsAuthenticated == true)
                {
                    return LocalRedirect(SafeReturnUrl(returnUrl));
                }
                ModelState.AddModelError(string.Empty, "This sign-in page had expired. Please sign in again.");
                return View(new LoginRequest { Username = request.Username });
            }

            if (!ModelState.IsValid)
            {
                return View(request);
            }

            var user = await _usersDAL.FindByUsernameAsync(request.Username);
            var passwordOk = PasswordHasher.Verify(request.Password, user?.PasswordHash ?? DummyPasswordHash);
            if (user == null || !passwordOk)
            {
                ModelState.AddModelError(string.Empty, "Incorrect username or password.");
                request.Password = string.Empty;
                return View(request);
            }

            var claims = new List<Claim>
            {
                new(ClaimTypes.Name, user.Username),
                new(ClaimTypes.NameIdentifier, user.UserId.ToString())
            };
            if (!string.IsNullOrWhiteSpace(user.DisplayName))
            {
                claims.Add(new Claim("DisplayName", user.DisplayName));
            }

            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            // Browser-session cookie with the 15-min idle / 12-h absolute limits (SessionPolicy).
            await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(identity), SessionPolicy.NewSessionProperties());

            return LocalRedirect(SafeReturnUrl(returnUrl));
        }

        // LocalRedirect throws on non-local URLs; fall back to home instead of a 500.
        private string SafeReturnUrl(string? returnUrl) =>
            !string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl) ? returnUrl : "/";

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return RedirectToAction(nameof(Login));
        }
    }
}
