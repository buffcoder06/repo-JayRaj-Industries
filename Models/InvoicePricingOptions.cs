namespace JayRaj_Industries.Models
{
    // Bound from the "InvoicePricing" section of appsettings.json.
    // Component keys here must match the normalized form produced by
    // InvoiceController.NormalizeComponent (uppercase, letters/digits only).
    public class InvoicePricingOptions
    {
        public Dictionary<string, decimal> ComponentRates { get; set; } = new();

        public List<string> KundalikAutomationAllowedComponents { get; set; } = new();

        public List<string> KundalikEngineersAllowedComponents { get; set; } = new();

        // e.g. "10043998" -> "10043997": substrings to substitute in a component's
        // display description before matching/pricing it.
        public Dictionary<string, string> ComponentDisplaySubstitutions { get; set; } = new();
    }
}
