(function () {
    const FIXED_PO_DATE_VALUE = "2025-10-01";
    const JAYRAJ_CHAKAN_ADDRESS = "GAT NO.624/9, Kuruli Village, Alandi Phata, Chakan, Tal. Khed, Dist. Pune - 410501";

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
            billTo: "KUNDLIK AUTOMATION PVT. LTD",
            billAddress: "GAT NO.624/9, Kuruli Village, Alandi Phata, Chakan, Tal. Khed, Dist. Pune - 410501",
            partyGst: "27AACCK6309H1ZK",
            partyPan: "AACCK6309H",
            poNo: "JW/252600012",
            hsnCode: ""
        },
        kundalik_engineers: {
            billTo: "KUNDLIK ENGINEERS",
            billAddress: "GAT NO.624/9, Kuruli Village, Alandi Phata, Chakan, Tal. Khed, Dist. Pune - 410501",
            partyGst: "27CQGPK7226L1ZF",
            partyPan: "CQGPK7226L",
            poNo: "JW/252600006",
            hsnCode: ""
        },
        scrap: {
            billTo: "STEEL TRADE",
            billAddress: "GAT NO.- 61, Chimbali, Tal Khed, Pune - 410501",
            partyGst: "27APFPC9110F2Z9",
            partyPan: "APFPC9110F",
            poNo: "",
            hsnCode: ""
        }
    };

    const scrapParties = {
        kundalik_automation: {
            billTo: "KUNDLIK AUTOMATION PVT. LTD",
            billAddress: "GAT NO.624/9, Kuruli Village, Alandi Phata, Chakan, Tal. Khed, Dist. Pune - 410501",
            partyGst: "27AACCK6309H1ZK",
            partyPan: "AACCK6309H",
            poNo: "JW/252600012",
            allowManualPoNo: false,
            hsnCode: ""
        },
        kundalik_engineers: {
            billTo: "KUNDLIK ENGINEERS",
            billAddress: "GAT NO.624/9, Kuruli Village, Alandi Phata, Chakan, Tal. Khed, Dist. Pune - 410501",
            partyGst: "27CQGPK7226L1ZF",
            partyPan: "CQGPK7226L",
            poNo: "JW/252600006",
            allowManualPoNo: false,
            hsnCode: ""
        },
        steel_trade: {
            billTo: "STEEL TRADE",
            billAddress: "GAT NO.- 61, Chimbali, Tal Khed, Pune - 410501",
            partyGst: "27APFPC9110F2Z9",
            partyPan: "APFPC9110F",
            poNo: "",
            allowManualPoNo: true,
            hsnCode: "72044900"
        }
    };

    function formatMoney(value) {
        const rounded = Math.round(Number(value) || 0);
        return rounded.toLocaleString("en-IN");
    }

    function formatMoneyDecimal(value) {
        const n = Number(value) || 0;
        return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function isScrapProfile() {
        return $("#invoiceProfileSelect").val() === "scrap";
    }

    function getInvoiceItemsFromGrid() {
        const items = [];
        $("#invoiceItemsTable tbody tr").each(function () {
            const tds = $(this).find("td");
            if (tds.length < 6) return;

            const srText = $(tds[0]).text().trim();
            const descInput = $(tds[1]).find(".inv-desc-input");
            const desc = descInput.length ? (descInput.text() || "").trim() : $(tds[1]).text().trim();
            const qtyInput = $(tds[2]).find(".inv-qty-input");
            const qtyText = qtyInput.length ? qtyInput.val() : $(tds[2]).text().trim();
            const unitInput = $(tds[3]).find(".inv-unit-input");
            const unit = (unitInput.length ? unitInput.val() : $(tds[3]).text().trim()) || "-";
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
        return normalized.includes("JP375REARDIFFCASE10043997") ||
            normalized.includes("JP375REARDIFFCASE10043998") ||
            normalized.includes("JRAWCASEDIFFP40233011PHONIXINTIGRALDIFFCASE");
    }

    function isFullyEditableComponent(description) {
        const normalized = String(description || "")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");
        return normalized.includes("JRAWCASEDIFFP40233011PHONIXINTIGRALDIFFCASE");
    }

    function escapeHtmlAttr(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function setToday(id) {
        const today = new Date().toISOString().split("T")[0];
        const el = document.getElementById(id);
        if (el) el.value = today;
    }

    function setCurrentMonthDateRange(fromId, toId) {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const toLocalIso = (dt) => {
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, "0");
            const d = String(dt.getDate()).padStart(2, "0");
            return `${y}-${m}-${d}`;
        };

        const fromEl = document.getElementById(fromId);
        const toEl = document.getElementById(toId);
        if (fromEl) fromEl.value = toLocalIso(firstDay);
        if (toEl) toEl.value = toLocalIso(lastDay);
    }

    function getFinancialYearPrefix(dateObj) {
        const now = dateObj || new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const startYear = month >= 4 ? year : year - 1;
        const endYear = startYear + 1;
        const startYY = String(startYear).slice(-2);
        const endYY = String(endYear).slice(-2);
        return `${startYY}-${endYY}/`;
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
        // PO date is always editable so users can update it as needed
        $("#poDate").prop("disabled", false);
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

    function isSteelTradeScrapCase() {
        const profileKey = $("#invoiceProfileSelect").val();
        const selectedParty = $("#scrapPartySelect").val() || "kundalik_automation";
        return profileKey === "scrap" && selectedParty === "steel_trade";
    }

    function syncHeader() {
        setPoDateByContext();
        updatePoDateEditState();
        const profileKey = $("#invoiceProfileSelect").val();
        const selectedParty = $("#scrapPartySelect").val() || "kundalik_automation";
        const hsnCode = profileKey === "scrap"
            ? ((scrapParties[selectedParty] && scrapParties[selectedParty].hsnCode) || "")
            : ((invoiceProfiles[profileKey] && invoiceProfiles[profileKey].hsnCode) || "");
        const companyTopAddress = isSteelTradeScrapCase()
            ? JAYRAJ_CHAKAN_ADDRESS
            : ($("#billAddress").val() || "");

        $("#pBillTo").text($("#billTo").val() || "");
        $("#pBillAddress").text($("#billAddress").val() || "");
        $("#pCompanyTopAddress").text(companyTopAddress);
        $("#pPartyGst").text($("#partyGst").val() || "");
        const hidePan = isSteelTradeScrapCase();
        $("#pPartyPanRow").toggle(!hidePan);
        $("#pPartyPan").text(hidePan ? "" : ($("#partyPan").val() || ""));
        const showVehicleNo = isSteelTradeScrapCase();
        $("#pVehicleNoRow").toggle(showVehicleNo);
        $("#pVehicleNo").text(showVehicleNo ? ($("#scrapVehicleNo").val() || "") : "");
        $("#pInvNo").text($("#invNo").val() || "");
        $("#pInvDate").text(formatDisplayDate($("#invDate").val() || ""));
        $("#pPoNo").text($("#poNo").val() || "");
        $("#pPoDate").text(formatDisplayDate($("#poDate").val() || ""));
        $("#pHsnCode").text(hsnCode);
    }

    function updateAuthorisedSignatureVisibility() {
        const profileKey = $("#invoiceProfileSelect").val();
        let showSignature = true;

        if (profileKey === "scrap") {
            const selectedParty = $("#scrapPartySelect").val() || "kundalik_automation";
            showSignature = selectedParty !== "steel_trade";
        }

        $(".authorised-sign-img").toggle(showSignature);
    }

    function applyScrapParty() {
        const selectedParty = $("#scrapPartySelect").val() || "kundalik_automation";
        const party = scrapParties[selectedParty] || scrapParties.kundalik_automation;

        $("#billTo").val(party.billTo);
        $("#billAddress").val(party.billAddress);
        $("#partyGst").val(party.partyGst);
        $("#partyPan").val(selectedParty === "steel_trade" ? "" : party.partyPan);
        $("#scrapVehicleSection").toggle(selectedParty === "steel_trade");
        if (selectedParty !== "steel_trade") {
            $("#scrapVehicleNo").val("");
        }

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

    function normalizeScrapDescription() {
        const current = ($("#scrapDescription").val() || "").trim();
        if (!current || current.toLowerCase() === "scrap bill month") {
            $("#scrapDescription").val("Casting Scrap");
        }
    }

    function applyInvoiceProfile(profileKey) {
        const profile = invoiceProfiles[profileKey] || invoiceProfiles.kundalik_automation;
        const isScrap = profileKey === "scrap";

        $("#scrapManualSection").toggle(isScrap);
        setStaticFieldLocks();

        if (isScrap) {
            normalizeScrapDescription();
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
        const desc = $("#scrapDescription").val() || "Casting Scrap";
        const qty = Number($("#scrapQty").val()) || 0;
        const rate = Number($("#scrapRatePerKg").val()) || 0;
        const formattedInvoiceDate = formatDisplayDate(invoiceDate);
        const period = formattedInvoiceDate ? ` (${formattedInvoiceDate})` : "";

        return [{
            srNo: 1,
            itemDescription: `${desc}${period}`,
            qty: qty,
            unit: "Kg",
            rate: rate
        }];
    }

    function updateTotals() {
        const scrap = isScrapProfile();
        const fmt = scrap ? formatMoneyDecimal : formatMoney;
        let subtotal = 0;
        $("#invoiceItemsTable tbody tr").each(function () {
            const qtyInput = $(this).find(".inv-qty-input");
            const qty = qtyInput.length > 0
                ? parseDisplayNumber(qtyInput.val())
                : parseDisplayNumber($(this).find(".inv-qty").text());
            const rateInput = $(this).find(".inv-rate-input");
            const rate = rateInput.length > 0
                ? parseDisplayNumber(rateInput.val())
                : parseDisplayNumber($(this).find(".inv-rate").text());
            const amount = qty * rate;
            subtotal += amount;
            $(this).find(".inv-amt").text(fmt(amount));
        });

        const cgst = subtotal * 0.09;
        const sgst = subtotal * 0.09;
        const grandTotal = Math.round(subtotal + cgst + sgst);

        $("#assessableValue").text(fmt(subtotal));
        $("#subTotal").text(fmt(subtotal));
        $("#cgstValue").text(fmt(cgst));
        $("#sgstValue").text(fmt(sgst));
        $("#grandTotal").text(formatMoney(grandTotal));
        $("#amtWords").text(amountToWords(grandTotal));
    }

    function renderRows(items) {
        const tbody = $("#invoiceItemsTable tbody");
        tbody.empty();
        const minVisibleRows = 12;
        const entryStartOffset = 1;

        function appendEntrySpacerRow() {
            tbody.append("<tr class='invoice-entry-spacer'><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>");
        }

        if (!items || items.length === 0) {
            appendEntrySpacerRow();
            tbody.append("<tr class='invoice-nodata-row'><td colspan='6' class='text-center'>No data found for selected date range</td></tr>");
            for (let i = 1 + entryStartOffset; i < minVisibleRows; i++) {
                tbody.append("<tr class='invoice-filler-row'><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>");
            }
            updateTotals();
            $("#btnDownloadInvoicePdf").prop("disabled", true);
            return;
        }

        $("#btnDownloadInvoicePdf").prop("disabled", false);

        const scrap = isScrapProfile();
        const fmt = scrap ? formatMoneyDecimal : formatMoney;
        appendEntrySpacerRow();
        items.forEach(function (item, index) {
            const qty = Number(item.qty || 0);
            const rate = Number(item.rate || 0);
            const editableRate = isRateEditableComponent(item.itemDescription || "");
            const editableFields = isFullyEditableComponent(item.itemDescription || "");
            const rateCell = editableRate
                ? `<input type="number" class="inv-rate-input" min="0" step="0.01" value="${scrap ? rate : Math.round(rate)}" />`
                : `<span class="inv-rate text-center">${fmt(rate)}</span>`;
            const descCell = editableFields
                ? `<div class="inv-desc-input" contenteditable="true">${escapeHtmlAttr(item.itemDescription || "")}</div>`
                : (item.itemDescription || "");
            const qtyCell = editableFields
                ? `<input type="number" class="inv-qty-input" min="0" step="0.01" value="${qty}" />`
                : fmt(qty);
            const qtyCellClass = editableFields ? "" : "inv-qty";
            const unitCell = editableFields
                ? `<input type="text" class="inv-unit-input" value="${escapeHtmlAttr(item.unit || "-")}" />`
                : (item.unit || "-");
            const row = `
                <tr class="invoice-item-row">
                    <td class="text-center">${index + 1}</td>
                    <td>${descCell}</td>
                    <td class="${qtyCellClass} text-center">${qtyCell}</td>
                    <td class="text-center">${unitCell}</td>
                    <td class="text-center">${rateCell}</td>
                    <td class="inv-amt text-center">${fmt(0)}</td>
                </tr>`;
            tbody.append(row);
        });

        for (let i = items.length + entryStartOffset; i < minVisibleRows; i++) {
            tbody.append("<tr class='invoice-filler-row'><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>");
        }

        updateTotals();
    }

    function renumberInvoiceRows() {
        $("#invoiceItemsTable tbody tr.invoice-item-row, #invoiceItemsTable tbody tr.invoice-manual-row")
            .each(function (index) {
                $(this).find("td").eq(0).text(index + 1);
            });
    }

    function updateRemoveLineButtonState() {
        const hasManualRows = $("#invoiceItemsTable tbody tr.invoice-manual-row").length > 0;
        $("#btnRemoveInvoiceLine").prop("disabled", !hasManualRows);
    }

    function addManualInvoiceRow() {
        const tbody = $("#invoiceItemsTable tbody");

        if (tbody.find("tr.invoice-entry-spacer").length === 0) {
            tbody.prepend("<tr class='invoice-entry-spacer'><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>");
        }
        tbody.find("tr.invoice-nodata-row").remove();

        const row = $(
            "<tr class='invoice-manual-row'>" +
            "<td class='text-center'>0</td>" +
            "<td><div class='inv-desc-input' contenteditable='true' data-placeholder='Item description'></div></td>" +
            "<td class='text-center'><input type='number' class='inv-qty-input' min='0' step='0.01' value='0' /></td>" +
            "<td class='text-center'><input type='text' class='inv-unit-input' value='Nos' /></td>" +
            "<td class='text-center'><input type='number' class='inv-rate-input' min='0' step='0.01' value='0' /></td>" +
            "<td class='inv-amt text-center'>0</td>" +
            "</tr>"
        );

        const firstFiller = tbody.find("tr.invoice-filler-row").first();
        if (firstFiller.length) {
            row.insertBefore(firstFiller);
            firstFiller.remove();
        } else {
            tbody.append(row);
        }

        $("#btnDownloadInvoicePdf").prop("disabled", false);
        renumberInvoiceRows();
        updateTotals();
        updateRemoveLineButtonState();
        row.find(".inv-desc-input").trigger("focus");
    }

    function removeLastManualInvoiceRow() {
        const rows = $("#invoiceItemsTable tbody tr.invoice-manual-row");
        if (rows.length === 0) return;

        rows.last().remove();
        renumberInvoiceRows();
        updateTotals();
        updateRemoveLineButtonState();
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
        setCurrentMonthDateRange("invFromDate", "invToDate");
        syncHeader();

        $("#invNo").val(getFinancialYearPrefix(new Date()));
        applyInvoiceProfile($("#invoiceProfileSelect").val());

        $("#billTo, #billAddress, #partyGst, #partyPan, #invNo, #invDate, #poNo, #poDate, #scrapVehicleNo").on("input change", syncHeader);
        $(document).on("input change", ".inv-rate-input, .inv-qty-input", updateTotals);
        $("#btnAddInvoiceLine").on("click", function () {
            addManualInvoiceRow();
        });
        $("#btnRemoveInvoiceLine").on("click", function () {
            removeLastManualInvoiceRow();
        });
        $("#scrapPartySelect").on("change", function () {
            if ($("#invoiceProfileSelect").val() === "scrap") {
                applyScrapParty();
            }
        });
        $("#invoiceProfileSelect").on("change", function () {
            applyInvoiceProfile($(this).val());
        });

        $("#btnLoadInvoiceData").on("click", function () {
            const $btn = $(this);
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
                $("#scrapQty").val(qty);
                renderRows(buildScrapRow());
                notify("success", "Loaded", "Scrap invoice row prepared successfully.");
                return;
            }

            $btn.prop("disabled", true).text("Loading...");
            $.ajax({
                url: "/Invoice/GetInvoiceLineItems",
                type: "GET",
                data: { startDate, endDate, invoiceProfile: selectedProfile },
                dataType: "json",
                success: function (res) {
                    $btn.prop("disabled", false).text("Load Items");
                    if (!res.success) {
                        notify("error", "Error", res.message || "Failed to load invoice data.");
                        return;
                    }
                    renderRows(res.items || []);
                    notify("success", "Loaded", "Invoice items loaded successfully.");
                },
                error: function () {
                    $btn.prop("disabled", false).text("Load Items");
                    notify("error", "Error", "Unable to fetch invoice data.");
                }
            });
        });

        $("#btnDownloadInvoicePdf").on("click", async function () {
            // Warn if any line item has a zero rate
            let zeroRateFound = false;
            $("#invoiceItemsTable tbody tr").each(function () {
                const rateInput = $(this).find(".inv-rate-input");
                const rateText = rateInput.length ? rateInput.val() : $(this).find(".inv-rate").text();
                const rate = parseDisplayNumber(rateText);
                const qty = parseDisplayNumber($(this).find(".inv-qty").text());
                if (qty > 0 && rate === 0) {
                    zeroRateFound = true;
                    return false; // break
                }
            });

            if (zeroRateFound) {
                const result = await window.Swal.fire({
                    icon: 'warning',
                    title: 'Zero Rate Detected',
                    text: 'One or more items have a rate of 0. Do you want to continue downloading?',
                    showCancelButton: true,
                    confirmButtonText: 'Yes, Download',
                    cancelButtonText: 'Cancel',
                    confirmButtonColor: '#f0a500'
                });
                if (!result.isConfirmed) return;
            }

            await logInvoiceDownload();
            await downloadPdf();
        });
    });
})();
