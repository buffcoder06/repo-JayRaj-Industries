(function () {
    const FIXED_PO_DATE_VALUE = "2025-10-01";

    function numberToWordsUnder1000(num) {
        const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
            "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
        const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
        let words = "";

        if (num >= 100) {
            words += `${ones[Math.floor(num / 100)]} Hundred `;
            num %= 100;
        }
        if (num >= 20) {
            words += `${tens[Math.floor(num / 10)]} `;
            num %= 10;
        }
        if (num > 0) {
            words += `${ones[num]} `;
        }
        return words.trim();
    }

    function numberToWordsIndian(num) {
        if (num === 0) return "Zero";

        const crore = Math.floor(num / 10000000);
        num %= 10000000;
        const lakh = Math.floor(num / 100000);
        num %= 100000;
        const thousand = Math.floor(num / 1000);
        num %= 1000;
        const hundredPart = num;

        const parts = [];
        if (crore) parts.push(`${numberToWordsUnder1000(crore)} Crore`);
        if (lakh) parts.push(`${numberToWordsUnder1000(lakh)} Lakh`);
        if (thousand) parts.push(`${numberToWordsUnder1000(thousand)} Thousand`);
        if (hundredPart) parts.push(numberToWordsUnder1000(hundredPart));

        return parts.join(" ").trim();
    }

    function amountToWords(amount) {
        const absolute = Number(amount) || 0;
        const rupees = Math.floor(absolute);
        const paise = Math.round((absolute - rupees) * 100);

        if (rupees === 0 && paise === 0) return "Zero Rupees Only";

        let result = `${numberToWordsIndian(rupees)} Rupees`;
        if (paise > 0) {
            result += ` and ${numberToWordsIndian(paise)} Paise`;
        }
        return `${result} Only`;
    }

    const invoiceProfiles = {
        kundalik_automation: {
            billTo: "KUNDALIK AUTOMATION PVT. LTD",
            billAddress: "GAT NO.624/9, Kuruli Village, Tal Khed, Pune - 410501",
            partyGst: "27AACC6309H1ZK",
            partyPan: "AACCK6309H",
            poNo: "JW/252600012"
        },
        kundalik_engineers: {
            billTo: "KUNDALIK ENGINEERS",
            billAddress: "GAT NO.624/9, Kuruli Village, Tal Khed, Pune - 410501",
            partyGst: "27CQGPK7226L1F",
            partyPan: "AACCK6309H",
            poNo: "JW/252600006"
        },
        scrap: {
            billTo: "STEEL TRADE",
            billAddress: "GAT NO.- 61, Chimbali, Tal Khed, Pune - 410501",
            partyGst: "27AACC6309H1ZK",
            partyPan: "APFPC9110F",
            poNo: ""
        }
    };

    const scrapParties = {
        kundalik_automation: {
            billTo: "KUNDALIK AUTOMATION PVT. LTD",
            billAddress: "GAT NO.624/9, Kuruli Village, Tal Khed, Pune - 410501",
            partyGst: "27AACC6309H1ZK",
            partyPan: "AACCK6309H",
            poNo: "JW/252600012",
            allowManualPoNo: false
        },
        steel_trade: {
            billTo: "STEEL TRADE",
            billAddress: "GAT NO.- 61, Chimbali, Tal Khed, Pune - 410501",
            partyGst: "27AACC6309H1ZK",
            partyPan: "APFPC9110F",
            poNo: "",
            allowManualPoNo: true
        }
    };

    function formatMoney(value) {
        const rounded = Math.round(Number(value) || 0);
        return rounded.toLocaleString("en-IN");
    }

    function getInvoiceItemsFromGrid() {
        const items = [];
        $("#invoiceItemsTable tbody tr").each(function () {
            const tds = $(this).find("td");
            if (tds.length < 6) return;

            const srText = $(tds[0]).text().trim();
            const desc = $(tds[1]).text().trim();
            const qtyText = $(tds[2]).text().trim();
            const unit = $(tds[3]).text().trim() || "-";
            const rateInput = $(tds[4]).find(".inv-rate-input");
            const rateText = rateInput.length ? rateInput.val() : $(tds[4]).text().trim();
            const amountText = $(tds[5]).text().trim();

            if (!desc) return;

            const srNo = parseDisplayNumber(srText);
            const qty = parseDisplayNumber(qtyText);
            const rate = parseDisplayNumber(rateText);
            const amount = parseDisplayNumber(amountText);

            items.push({
                srNo: srNo,
                itemDescription: desc,
                qty: qty,
                unit: unit,
                rate: rate,
                amount: amount
            });
        });
        return items;
    }

    function buildInvoiceDownloadLogPayload() {
        const assessableValue = parseDisplayNumber($("#assessableValue").text());
        const cgstAmount = parseDisplayNumber($("#cgstValue").text());
        const sgstAmount = parseDisplayNumber($("#sgstValue").text());
        const grandTotal = parseDisplayNumber($("#grandTotal").text());

        return {
            startDate: $("#invFromDate").val() || null,
            endDate: $("#invToDate").val() || null,
            invoiceProfile: $("#invoiceProfileSelect").val() || null,
            invoiceNo: $("#invNo").val() || null,
            invoiceDate: $("#invDate").val() || null,
            assessableValue: assessableValue,
            cgstAmount: cgstAmount,
            sgstAmount: sgstAmount,
            gstAmount: cgstAmount + sgstAmount,
            grandTotal: grandTotal,
            items: getInvoiceItemsFromGrid()
        };
    }

    async function logInvoiceDownload() {
        const payload = buildInvoiceDownloadLogPayload();
        if (!payload.items || payload.items.length === 0) return;

        try {
            await $.ajax({
                url: "/Invoice/LogInvoiceDownload",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(payload)
            });
        } catch {
            // do not block download on logging failure
        }
    }

    function notify(icon, title, text) {
        if (window.Swal && typeof window.Swal.fire === "function") {
            window.Swal.fire({ icon, title, text });
            return;
        }

        if (window.showToast && typeof window.showToast === "function") {
            window.showToast(text, { type: icon === "error" ? "error" : "success", title: title || "" });
            return;
        }
        console.warn("Notification unavailable:", title, text);
    }

    function parseDisplayNumber(value) {
        const raw = String(value || "").replace(/,/g, "").trim();
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function isRateEditableComponent(description) {
        const normalized = String(description || "")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");
        return normalized.includes("JP375REARDIFFCASE10043997") || normalized.includes("JP375REARDIFFCASE10043998");
    }

    function setToday(id) {
        const today = new Date().toISOString().split("T")[0];
        const el = document.getElementById(id);
        if (el) el.value = today;
    }

    function setFixedPoDate() {
        $("#poDate").val(FIXED_PO_DATE_VALUE);
    }

    function setPoDateByContext(forceClearForSteelTrade = false) {
        const profileKey = $("#invoiceProfileSelect").val();
        const scrapParty = $("#scrapPartySelect").val();

        if (profileKey === "scrap" && scrapParty === "steel_trade") {
            if (forceClearForSteelTrade) {
                $("#poDate").val("");
            }
            return;
        }

        setFixedPoDate();
    }

    function updatePoDateEditState() {
        const profileKey = $("#invoiceProfileSelect").val();
        const scrapParty = $("#scrapPartySelect").val();
        const allowManualPoDate = profileKey === "scrap" && scrapParty === "steel_trade";
        $("#poDate").prop("disabled", !allowManualPoDate);
    }

    function formatDisplayDate(dateText) {
        if (!dateText) return "";
        const dt = new Date(`${dateText}T00:00:00`);
        if (Number.isNaN(dt.getTime())) return dateText;
        const day = String(dt.getDate()).padStart(2, "0");
        const month = dt.toLocaleString("en-IN", { month: "short" });
        const year = dt.getFullYear();
        return `${day}-${month}-${year}`;
    }

    function syncHeader() {
        setPoDateByContext();
        updatePoDateEditState();

        $("#pBillTo").text($("#billTo").val() || "");
        $("#pBillAddress").text($("#billAddress").val() || "");
        $("#pCompanyTopAddress").text($("#billAddress").val() || "");
        $("#pPartyGst").text($("#partyGst").val() || "");
        $("#pPartyPan").text($("#partyPan").val() || "");
        $("#pInvNo").text($("#invNo").val() || "");
        $("#pInvDate").text(formatDisplayDate($("#invDate").val() || ""));
        $("#pPoNo").text($("#poNo").val() || "");
        $("#pPoDate").text(formatDisplayDate($("#poDate").val() || ""));
    }

    function updateAuthorisedSignatureVisibility() {
        const profileKey = $("#invoiceProfileSelect").val();
        let showSignature = true;

        if (profileKey === "scrap") {
            const selectedParty = $("#scrapPartySelect").val() || "kundalik_automation";
            showSignature = selectedParty === "kundalik_automation";
        }

        $(".authorised-sign-img").toggle(showSignature);
    }

    function applyScrapParty() {
        const selectedParty = $("#scrapPartySelect").val() || "kundalik_automation";
        const party = scrapParties[selectedParty] || scrapParties.kundalik_automation;

        $("#billTo").val(party.billTo);
        $("#billAddress").val(party.billAddress);
        $("#partyGst").val(party.partyGst);
        $("#partyPan").val(party.partyPan);

        if (!party.allowManualPoNo) {
            $("#poNo").val(party.poNo);
        } else {
            $("#poNo").val("");
        }

        $("#poNo").prop("readonly", !party.allowManualPoNo);
        setPoDateByContext(true);
        updatePoDateEditState();
        updateAuthorisedSignatureVisibility();
        syncHeader();
    }

    function setStaticFieldLocks() {
        $("#billTo, #billAddress, #partyGst, #partyPan").prop("disabled", true);
        updatePoDateEditState();
    }

    function applyInvoiceProfile(profileKey) {
        const profile = invoiceProfiles[profileKey] || invoiceProfiles.kundalik_automation;
        const isScrap = profileKey === "scrap";

        $("#scrapManualSection").toggle(isScrap);
        setStaticFieldLocks();

        if (isScrap) {
            setPoDateByContext();
            applyScrapParty();
        } else {
            $("#billTo").val(profile.billTo);
            $("#billAddress").val(profile.billAddress);
            $("#partyGst").val(profile.partyGst);
            $("#partyPan").val(profile.partyPan);
            $("#poNo").val(profile.poNo);
            $("#poNo").prop("readonly", false);
        }

        setPoDateByContext();
        updateAuthorisedSignatureVisibility();
        syncHeader();
    }

    function buildScrapRow() {
        const invoiceDate = $("#invDate").val();
        const desc = $("#scrapDescription").val() || "Scrap Bill Month";
        const qty = Number($("#scrapQty").val()) || 0;
        const rate = Number($("#scrapRatePerKg").val()) || 0;
        const formattedInvoiceDate = formatDisplayDate(invoiceDate);
        const period = formattedInvoiceDate ? ` (${formattedInvoiceDate})` : "";

        return [{
            srNo: 1,
            itemDescription: `${desc}${period}`,
            qty: qty,
            unit: "-",
            rate: rate
        }];
    }

    function updateTotals() {
        let subtotal = 0;
        $("#invoiceItemsTable tbody tr").each(function () {
            const qty = parseDisplayNumber($(this).find(".inv-qty").text());
            const rateInput = $(this).find(".inv-rate-input");
            const rate = rateInput.length > 0
                ? parseDisplayNumber(rateInput.val())
                : parseDisplayNumber($(this).find(".inv-rate").text());
            const amount = qty * rate;
            subtotal += amount;
            $(this).find(".inv-amt").text(formatMoney(amount));
        });

        const cgst = subtotal * 0.09;
        const sgst = subtotal * 0.09;
        const grandTotal = subtotal + cgst + sgst;
        const roundedGrandTotal = Math.round(grandTotal);

        $("#assessableValue").text(formatMoney(subtotal));
        $("#subTotal").text(formatMoney(subtotal));
        $("#cgstValue").text(formatMoney(cgst));
        $("#sgstValue").text(formatMoney(sgst));
        $("#grandTotal").text(formatMoney(grandTotal));
        $("#amtWords").text(amountToWords(roundedGrandTotal));
    }

    function renderRows(items) {
        const tbody = $("#invoiceItemsTable tbody");
        tbody.empty();
        const minVisibleRows = 12;

        if (!items || items.length === 0) {
            tbody.append("<tr><td colspan='6' class='text-center'>No data found for selected date range</td></tr>");
            for (let i = 1; i < minVisibleRows; i++) {
                tbody.append("<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>");
            }
            updateTotals();
            return;
        }

        items.forEach(function (item, index) {
            const qty = Number(item.qty || 0);
            const rate = Number(item.rate || 0);
            const editableRate = isRateEditableComponent(item.itemDescription || "");
            const rateCell = editableRate
                ? `<input type="number" class="inv-rate-input" min="0" step="1" value="${Math.round(rate)}" />`
                : `<span class="inv-rate text-center">${formatMoney(rate)}</span>`;
            const row = `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${item.itemDescription || ""}</td>
                    <td class="inv-qty text-center">${formatMoney(qty)}</td>
                    <td class="text-center">${item.unit || "-"}</td>
                    <td class="text-center">${rateCell}</td>
                    <td class="inv-amt text-center">${formatMoney(0)}</td>
                </tr>`;
            tbody.append(row);
        });

        for (let i = items.length; i < minVisibleRows; i++) {
            tbody.append("<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>");
        }

        updateTotals();
    }

    async function downloadPdf() {
        const target = document.getElementById("invoiceCanvas");
        if (!target) return;

        const canvas = await html2canvas(target, { scale: 2, backgroundColor: "#ffffff" });
        const imageData = canvas.toDataURL("image/png");
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let y = 0;
        if (imgHeight <= pageHeight) {
            pdf.addImage(imageData, "PNG", 0, 0, imgWidth, imgHeight);
        } else {
            let remainingHeight = imgHeight;
            while (remainingHeight > 0) {
                pdf.addImage(imageData, "PNG", 0, y, imgWidth, imgHeight);
                remainingHeight -= pageHeight;
                y -= pageHeight;
                if (remainingHeight > 0) pdf.addPage();
            }
        }

        const invoiceNo = ($("#invNo").val() || "invoice").toString().replace(/[^\w\-]+/g, "_");
        pdf.save(`${invoiceNo}.pdf`);
    }

    $(document).ready(function () {
        setToday("invDate");
        setPoDateByContext();
        setToday("invFromDate");
        setToday("invToDate");
        syncHeader();

        $("#invNo").val(`INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`);
        applyInvoiceProfile($("#invoiceProfileSelect").val());

        $("#billTo, #billAddress, #partyGst, #partyPan, #invNo, #invDate, #poNo, #poDate").on("input change", syncHeader);
        $(document).on("input change", ".inv-rate-input", updateTotals);
        $("#scrapPartySelect").on("change", function () {
            if ($("#invoiceProfileSelect").val() === "scrap") {
                applyScrapParty();
            }
        });
        $("#invoiceProfileSelect").on("change", function () {
            applyInvoiceProfile($(this).val());
        });

        $("#btnLoadInvoiceData").on("click", function () {
            const selectedProfile = $("#invoiceProfileSelect").val();
            const startDate = $("#invFromDate").val();
            const endDate = $("#invToDate").val();

            if (!startDate || !endDate) {
                notify("error", "Validation", "Please select from and to dates.");
                return;
            }

            if (selectedProfile === "scrap") {
                const qty = Number($("#scrapQty").val()) || 0;
                const rate = Number($("#scrapRatePerKg").val()) || 0;
                if (qty <= 0 || rate <= 0) {
                    notify("error", "Validation", "Please select scrap quantity and rate please");
                    return;
                }
                renderRows(buildScrapRow());
                notify("success", "Loaded", "Scrap invoice row prepared successfully.");
                return;
            }

            $.ajax({
                url: "/Invoice/GetInvoiceLineItems",
                type: "GET",
                data: { startDate, endDate, invoiceProfile: selectedProfile },
                dataType: "json",
                success: function (res) {
                    if (!res.success) {
                        notify("error", "Error", res.message || "Failed to load invoice data.");
                        return;
                    }
                    renderRows(res.items || []);
                    notify("success", "Loaded", "Invoice items loaded successfully.");
                },
                error: function () {
                    notify("error", "Error", "Unable to fetch invoice data.");
                }
            });
        });

        $("#btnDownloadInvoicePdf").on("click", async function () {
            await logInvoiceDownload();
            await downloadPdf();
        });
    });
})();
