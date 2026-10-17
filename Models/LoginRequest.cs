using System.ComponentModel.DataAnnotations;

namespace JayRaj_Industries.Models
{
    public class LoginRequest
    {
        [Required(ErrorMessage = "Username is required.")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required.")]
        public string Password { get; set; } = string.Empty;

        // "Keep me signed in": persistent cookie instead of a browser-session one.
        public bool RememberMe { get; set; }
    }
}
