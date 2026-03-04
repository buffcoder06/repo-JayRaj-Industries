namespace JayRaj_Industries.Models
{
    public class InvoiceLineItem
    {
        public int SrNo { get; set; }
        public string ItemDescription { get; set; } = string.Empty;
        public decimal Qty { get; set; }
        public string Unit { get; set; } = "-";
        public decimal Rate { get; set; }
        public decimal Amount => Qty * Rate;
    }

    public class InvoiceDownloadLogRequest
    {
        public string? StartDate { get; set; }
        public string? EndDate { get; set; }
        public string? InvoiceProfile { get; set; }
        public string? InvoiceNo { get; set; }
        public string? InvoiceDate { get; set; }
        public decimal AssessableValue { get; set; }
        public decimal CgstAmount { get; set; }
        public decimal SgstAmount { get; set; }
        public decimal GstAmount { get; set; }
        public decimal GrandTotal { get; set; }
        public List<InvoiceLineItem> Items { get; set; } = new();
    }
}
