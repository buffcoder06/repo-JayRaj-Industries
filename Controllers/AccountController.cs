using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using JayRaj_Industries.DataAccessLayer;
using JayRaj_Industries.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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

        [HttpGet]
        public IActionResult Login(string? returnUrl = null)
        {
            if (User?.Identity?.IsAuthenticated == true)
            {
                return LocalRedirect(returnUrl ?? "/");
            }

            ViewData["ReturnUrl"] = returnUrl;
            return View(new LoginRequest());
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Login(LoginRequest request, string? returnUrl = null)
        {
            ViewData["ReturnUrl"] = returnUrl;

            if (!ModelState.IsValid)
            {
                ModelState.AddModelError(string.Empty, "Please enter a username and password.");
                return View(request);
            }

            var user = await _usersDAL.FindByUsernameAsync(request.Username);
            if (user == null || !PasswordHasher.Verify(request.Password, user.PasswordHash))
            {
                ModelState.AddModelError(string.Empty, "Invalid username or password.");
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
            await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity));

            return LocalRedirect(returnUrl ?? "/");
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return RedirectToAction(nameof(Login));
        }
    }
}
