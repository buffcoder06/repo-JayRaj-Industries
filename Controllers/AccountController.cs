using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using JayRaj_Industries.DataAccessLayer;
using JayRaj_Industries.Filters;
using JayRaj_Industries.Models;
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

        public AccountController(UsersDAL usersDAL)
        {
            _usersDAL = usersDAL;
        }

        // How long "Keep me signed in" keeps the session alive.
        private static readonly TimeSpan RememberMeLifetime = TimeSpan.FromDays(7);

        [HttpGet]
        public IActionResult Login(string? returnUrl = null, bool throttled = false)
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
            return View(new LoginRequest());
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [EnableRateLimiting(LoginRateLimit.PolicyName)]
        public async Task<IActionResult> Login(LoginRequest request, string? returnUrl = null)
        {
            ViewData["ReturnUrl"] = returnUrl;

            if (!ModelState.IsValid)
            {
                return View(request);
            }

            var user = await _usersDAL.FindByUsernameAsync(request.Username);
            if (user == null || !PasswordHasher.Verify(request.Password, user.PasswordHash))
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
            var properties = new AuthenticationProperties
            {
                IsPersistent = request.RememberMe,
                // Unset → the cookie options' 8-hour sliding expiry applies.
                ExpiresUtc = request.RememberMe ? DateTimeOffset.UtcNow.Add(RememberMeLifetime) : null
            };
            await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity), properties);

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
