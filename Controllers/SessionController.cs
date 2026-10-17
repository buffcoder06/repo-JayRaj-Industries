using Microsoft.AspNetCore.Mvc;

namespace JayRaj_Industries.Controllers
{
    // Requires sign-in (fallback policy). Hitting it renews the auth cookie,
    // which is how "Stay signed in" and on-page activity extend the session.
    public class SessionController : Controller
    {
        [HttpGet]
        [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
        public IActionResult KeepAlive() => NoContent();
    }
}
