(function initInvoiceScreen() {
  const itemsTableBody = document.getElementById("itemsTableBody");
  const rowTemplate = document.getElementById("rowTemplate");
  const addRowBtn = document.getElementById("addRowBtn");
  const printInvoiceBtn = document.getElementById("printInvoiceBtn");
  const invoiceNoInput = document.getElementById("invoiceNo");
  const invoiceDateInput = document.getElementById("invoiceDate");
  const messersInput = document.getElementById("messers");
  const grandTotal = document.getElementById("grandTotal");
  const pageTitle = document.getElementById("pageTitle");
  const productSuggestions = document.getElementById("productSuggestions");
  const messersSuggestions = document.getElementById("messersSuggestions");
  const invoiceAutosaveStatus = document.getElementById("invoiceAutosaveStatus");

  if (!itemsTableBody || !rowTemplate || !window.StorageEngine || !productSuggestions || !messersSuggestions) {
    return;
  }

  let rowCounter = 0;
  let autosaveTimer = null;
  let isPopulating = false;

  function setAutosaveStatus(text, state) {
    if (!invoiceAutosaveStatus) {
      return;
    }

    invoiceAutosaveStatus.textContent = text;
    invoiceAutosaveStatus.dataset.state = state || "";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeDisplayDate(value) {
    const cleanValue = String(value || "").trim();

    if (!cleanValue) {
      return "";
    }

    const slashMatch = cleanValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
    }

    const dashMatch = cleanValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dashMatch) {
      const [, year, month, day] = dashMatch;
      return `${day}/${month}/${year}`;
    }

    return cleanValue;
  }

  async function renderProductSuggestions() {
    const products = await window.StorageEngine.getProducts();
    productSuggestions.innerHTML = products
      .map((product) => `<option value="${escapeHtml(product)}"></option>`)
      .join("");
  }

  async function renderMessersSuggestions() {
    const messers = await window.StorageEngine.getMessers();
    messersSuggestions.innerHTML = messers
      .map((name) => `<option value="${escapeHtml(name)}"></option>`)
      .join("");
  }

  function getRate(rowData) {
    if (rowData.s1) {
      return 500;
    }

    if (rowData.s2) {
      return 600;
    }

    return 0;
  }

  function calculateRowAmount(rowData) {
    const qty = Math.max(Number(rowData.qty) || 0, 0);
    const rate = getRate(rowData);
    const slab500 = Math.ceil(qty / 500);
    const slab1000 = Math.ceil(qty / 1000);

    return (
      (rowData.f1 ? slab500 * rate : 0) +
      (rowData.b ? slab500 * rate : 0) +
      (rowData.f2 ? slab1000 * rate : 0) +
      (rowData.f3 ? slab1000 * rate : 0) +
      (rowData.f4 ? slab1000 * rate : 0) +
      (rowData.d ? 50 : 0)
    );
  }

  function setAmountModeUI(row) {
    const isManual = row.dataset.amountOverride === "true";
    const badge = row.querySelector(".amount-mode-badge");
    const toggleButton = row.querySelector(".toggle-amount-btn");

    badge.textContent = isManual ? "Manual" : "Auto";
    badge.classList.toggle("manual", isManual);
    toggleButton.textContent = isManual ? "Use Formula" : "Recalc";
  }

  function rowToData(row) {
    return {
      product: row.querySelector(".row-product").value.trim(),
      f1: row.querySelector(".row-f1").checked,
      f2: row.querySelector(".row-f2").checked,
      f3: row.querySelector(".row-f3").checked,
      f4: row.querySelector(".row-f4").checked,
      b: row.querySelector(".row-b").checked,
      d: row.querySelector(".row-d").checked,
      s1: row.querySelector(".row-s1").checked,
      s2: row.querySelector(".row-s2").checked,
      grams: row.querySelector(".row-grams").value.trim(),
      qty: Math.max(Number(row.querySelector(".row-qty").value) || 0, 0),
      amountOverride: row.dataset.amountOverride === "true",
      manualAmount: Math.max(Number(row.querySelector(".row-amount-input").value) || 0, 0)
    };
  }

  function updateGrandTotal() {
    const rows = Array.from(itemsTableBody.querySelectorAll("tr"));
    const total = rows.reduce((sum, row) => sum + (Number(row.querySelector(".row-amount-input").value) || 0), 0);
    grandTotal.textContent = total.toFixed(2);
  }

  function updateSerialNumbers() {
    Array.from(itemsTableBody.querySelectorAll("tr")).forEach((row, index) => {
      row.querySelector(".sr-no").textContent = String(index + 1);
    });
  }

  function updateRowAmount(row, options = {}) {
    const rowData = rowToData(row);
    const amountInput = row.querySelector(".row-amount-input");
    const formulaAmount = calculateRowAmount(rowData);

    if (options.forceAuto || row.dataset.amountOverride !== "true") {
      row.dataset.amountOverride = "false";
      amountInput.value = formulaAmount.toFixed(2);
    } else {
      amountInput.value = Math.max(Number(amountInput.value) || 0, 0).toFixed(2);
    }

    setAmountModeUI(row);
    updateGrandTotal();
  }

  async function addProductFromRow(row) {
    const productName = row.querySelector(".row-product").value.trim();

    if (!productName) {
      window.alert("Enter a product name first.");
      return;
    }

    const result = await window.StorageEngine.saveProduct(productName);
    if (result?.status === "duplicate") {
      window.alert(`"${productName}" is already in the product list.`);
      return;
    }

    await renderProductSuggestions();
    window.alert(`"${productName}" added to product list.`);
  }

  function createRow(data) {
    rowCounter += 1;
    const fragment = rowTemplate.content.cloneNode(true);
    const row = fragment.querySelector("tr");

    const productInput = row.querySelector(".row-product");
    const f1Input = row.querySelector(".row-f1");
    const f2Input = row.querySelector(".row-f2");
    const f3Input = row.querySelector(".row-f3");
    const f4Input = row.querySelector(".row-f4");
    const bInput = row.querySelector(".row-b");
    const dInput = row.querySelector(".row-d");
    const s1Input = row.querySelector(".row-s1");
    const s2Input = row.querySelector(".row-s2");
    const gramsInput = row.querySelector(".row-grams");
    const qtyInput = row.querySelector(".row-qty");
    const amountInput = row.querySelector(".row-amount-input");

    const sizeGroup = `sizeGroup_${Date.now()}_${rowCounter}`;
    s1Input.name = sizeGroup;
    s2Input.name = sizeGroup;

    row.dataset.amountOverride = data?.amountOverride ? "true" : "false";

    productInput.value = data?.product || "";
    f1Input.checked = Boolean(data?.f1);
    f2Input.checked = Boolean(data?.f2);
    f3Input.checked = Boolean(data?.f3);
    f4Input.checked = Boolean(data?.f4);
    bInput.checked = Boolean(data?.b);
    dInput.checked = Boolean(data?.d);
    s1Input.checked = Boolean(data?.s1);
    s2Input.checked = Boolean(data?.s2);
    gramsInput.value = data?.grams || "";
    qtyInput.value = Number(data?.qty) || 0;
    amountInput.value = Number(data?.amount || 0).toFixed(2);

    itemsTableBody.appendChild(fragment);
    updateRowAmount(row);

    if (row.dataset.amountOverride === "true") {
      amountInput.value = Number(data?.amount || 0).toFixed(2);
      setAmountModeUI(row);
      updateGrandTotal();
    }

    updateSerialNumbers();
  }

  function ensureAtLeastOneRow() {
    if (!itemsTableBody.querySelector("tr")) {
      createRow();
    }
  }

  function readFormData() {
    const rows = Array.from(itemsTableBody.querySelectorAll("tr"));
    const items = rows
      .map((row) => {
        const rowData = rowToData(row);
        const formulaAmount = calculateRowAmount(rowData);
        return {
          ...rowData,
          rate: getRate(rowData),
          amount: rowData.amountOverride ? rowData.manualAmount : formulaAmount
        };
      })
      .filter((item) => (
        item.product ||
        item.grams ||
        item.qty > 0 ||
        item.f1 ||
        item.f2 ||
        item.f3 ||
        item.f4 ||
        item.b ||
        item.d ||
        item.s1 ||
        item.s2
      ));

    return {
      invoiceNo: invoiceNoInput.value.trim(),
      date: normalizeDisplayDate(invoiceDateInput.value),
      messers: messersInput.value.trim(),
      items,
      total: items.reduce((sum, item) => sum + item.amount, 0)
    };
  }

  function hasEnoughInvoiceData(payload) {
    return Boolean(payload.invoiceNo && payload.date && payload.items.length);
  }

  async function saveDraftState() {
    const payload = readFormData();
    await window.StorageEngine.saveInvoiceDraft(payload);

    if (!hasEnoughInvoiceData(payload)) {
      setAutosaveStatus("Draft saved", "draft");
      return;
    }

    await window.StorageEngine.saveProducts(payload.items.map((item) => item.product));
    await window.StorageEngine.saveMessers([payload.messers]);
    await renderProductSuggestions();
    await renderMessersSuggestions();
    await window.StorageEngine.saveInvoice(payload);
    pageTitle.textContent = "Edit Invoice";
    setAutosaveStatus(`Saved invoice ${payload.invoiceNo}`, "saved");
  }

  function queueAutosave() {
    if (isPopulating) {
      return;
    }

    setAutosaveStatus("Saving...", "saving");
    window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => {
      void saveDraftState();
    }, 500);
  }

  function populateForm(invoice) {
    isPopulating = true;
    invoiceNoInput.value = invoice.invoiceNo || "";
    invoiceDateInput.value = normalizeDisplayDate(invoice.date || "");
    messersInput.value = invoice.messers || "";
    itemsTableBody.innerHTML = "";

    if (Array.isArray(invoice.items) && invoice.items.length) {
      invoice.items.forEach((item) => createRow(item));
    } else {
      createRow();
    }

    updateGrandTotal();
    isPopulating = false;
    setAutosaveStatus("Saved invoice loaded", "saved");
  }

  function buildPrintMarkup(invoice) {
    const minimumRows = 20;
    const emptyRows = Math.max(0, minimumRows - invoice.items.length);
    const rowsMarkup = invoice.items.map((item, index) => `
      <tr class="data-row">
        <td>${index + 1}</td>
        <td>
          <div class="particulars-line">
            <span class="particulars-name">${escapeHtml(item.product || "")}</span>
            <span class="particulars-grams">${escapeHtml(item.grams || "")}</span>
          </div>
        </td>
        <td>${Number(item.qty || 0)}</td>
        <td></td>
        <td>${Number(item.amount || 0).toFixed(2)}</td>
      </tr>
    `).join("");
    const fillerRowsMarkup = Array.from({ length: emptyRows }, (_, index) => `
      <tr class="data-row">
        <td>${invoice.items.length + index + 1}.</td>
        <td>&nbsp;</td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    `).join("");
    const totalInWords = numberToWords(Math.round(Number(invoice.total || 0)));

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${escapeHtml(invoice.invoiceNo)}</title>
        <style>
          @page { size: A4 portrait; margin: 6mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: "Trebuchet MS", Arial, sans-serif;
            color: #111;
            background: #fff;
          }
          .sheet {
            width: 182mm;
            margin: 0 auto;
            border: 1.5px solid #111;
            min-height: 255mm;
            padding: 14px 14px 10px;
            position: relative;
            background: #fff;
          }
          .sheet::before {
            content: "";
            position: absolute;
            inset: 8px;
            border: 1px solid #666;
            pointer-events: none;
          }
          .brand {
            text-align: center;
            position: relative;
            z-index: 1;
          }
          .brand h1 {
            margin: 6px 0 2px;
            font-size: 25px;
            font-weight: 800;
            letter-spacing: 0.5px;
            color: #111;
          }
          .brand .subtitle {
            font-size: 12px;
            margin-bottom: 8px;
            display: inline-block;
            border-bottom: 1px solid #111;
            padding-bottom: 2px;
            color: #111;
            font-weight: 700;
          }
          .brand p {
            margin: 2px 0;
            font-size: 10.5px;
          }
          .divider {
            border-top: 1px solid #444;
            margin: 8px auto 8px;
            width: 78%;
          }
          .invoice-title {
            text-align: center;
            font-size: 16px;
            font-weight: 800;
            letter-spacing: 1.2px;
            margin: 5px 0 9px;
            color: #111;
          }
          .meta-box {
            border: 1.25px solid #111;
            border-radius: 12px;
            overflow: hidden;
            display: grid;
            grid-template-columns: 2fr 1fr;
            min-height: 78px;
            background: #fff;
          }
          .meta-left,
          .meta-right {
            padding: 9px 10px 10px;
            font-size: 10.5px;
          }
          .meta-left {
            border-right: 1.25px solid #111;
          }
          .meta-label {
            font-weight: 700;
            margin-right: 10px;
            color: #111;
          }
          .meta-right .meta-line {
            margin-bottom: 28px;
            font-weight: 700;
            color: #111;
          }
          .bill-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-top: 8px;
            font-size: 10.5px;
          }
          .bill-table col.col-no { width: 36px; }
          .bill-table col.col-particulars { width: auto; }
          .bill-table col.col-qty { width: 68px; }
          .bill-table col.col-rate { width: 62px; }
          .bill-table col.col-amount { width: 96px; }
          .bill-table thead th {
            border: 1.25px solid #111;
            padding: 5px 6px;
            font-weight: 700;
            text-align: center;
            background: #fff;
            color: #111;
          }
          .bill-table thead th:first-child {
            border-radius: 8px 0 0 8px;
          }
          .bill-table thead th:last-child {
            border-radius: 0 8px 8px 0;
          }
          .bill-table tbody td {
            padding: 3px 6px;
            vertical-align: top;
            border-left: 1px solid #111;
            border-right: 1px solid #111;
          }
          .bill-table tbody tr:first-child td {
            border-top: 1px solid #111;
          }
          .bill-table tbody tr:last-child td {
            border-bottom: 1px solid #111;
          }
          .bill-table tbody td:nth-child(1),
          .bill-table tbody td:nth-child(3),
          .bill-table tbody td:nth-child(4),
          .bill-table tbody td:nth-child(5) {
            text-align: center;
          }
          .bill-table tbody td:nth-child(2) {
            padding-left: 8px;
          }
          .particulars-line {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 8px;
            width: 100%;
          }
          .particulars-name {
            text-align: left;
            flex: 1 1 auto;
            min-width: 0;
          }
          .particulars-grams {
            text-align: right;
            white-space: nowrap;
            flex: 0 0 auto;
          }
          .bill-table tbody td:nth-child(5) {
            text-align: right;
            padding-right: 9px;
          }
          .bill-table tbody tr.data-row {
            height: 22px;
          }
          .bill-table tbody tr.total-row td {
            border-top: 1.25px solid #111;
            padding-top: 6px;
            padding-bottom: 6px;
            vertical-align: middle;
            background: #fff;
          }
          .bill-table tbody tr.total-row td:first-child {
            border-bottom-left-radius: 8px;
          }
          .bill-table tbody tr.total-row td:last-child {
            border-bottom-right-radius: 8px;
          }
          .bill-table .job-work {
            font-size: 11.5px;
            font-weight: 700;
            vertical-align: bottom;
            padding-bottom: 4px;
            color: #111;
          }
          .total-label {
            font-size: 12px;
            font-weight: 800;
            text-align: center;
            color: #111;
          }
          .amount-value {
            font-size: 12px;
            font-weight: 700;
            color: #111;
          }
          .words-box {
            border: 1.25px solid #111;
            border-radius: 8px;
            margin-top: 4px;
            padding: 5px 8px;
            font-size: 10.5px;
            background: #fff;
          }
          .words-box strong {
            margin-right: 8px;
            color: #111;
          }
          .sign-off {
            margin-top: 6px;
            text-align: right;
            padding-right: 8px;
            font-size: 12px;
            line-height: 1.55;
            color: #111;
          }
          .sign-off strong {
            display: inline-block;
            margin-top: 2px;
            font-size: 13px;
            letter-spacing: 0.4px;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="brand">
            <h1>AJAY N. PANCHAL</h1>
            <div class="subtitle">All Kind Of Printing Work</div>
            <p>33, Gopal Jay Ram's Street, Nr. R.C.High School, Ghee Kanta Road, Ahmedabad - 380001.</p>
            <p><strong>Email :</strong> ajaypanchal9922@gmail.com &nbsp;&nbsp;&nbsp; <strong>Mo.:</strong> 99259 17495 / 91067 98735</p>
          </div>

          <div class="divider"></div>
          <div class="invoice-title">INVOICE</div>

          <div class="meta-box">
            <div class="meta-left">
              <span class="meta-label">Messers :</span>
              <strong>${escapeHtml(invoice.messers || "-")}</strong>
            </div>
            <div class="meta-right">
              <div class="meta-line">Invoice No.: ${escapeHtml(invoice.invoiceNo || "")}</div>
              <div class="meta-line">Invoice Date : ${escapeHtml(normalizeDisplayDate(invoice.date) || invoice.date || "")}</div>
            </div>
          </div>

          <table class="bill-table">
            <colgroup>
              <col class="col-no">
              <col class="col-particulars">
              <col class="col-qty">
              <col class="col-rate">
              <col class="col-amount">
            </colgroup>
            <thead>
              <tr>
                <th>No.</th>
                <th>Particulars</th>
                <th>Qty.</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsMarkup}
              ${fillerRowsMarkup}
              <tr class="total-row">
                <td></td>
                <td class="job-work">Only Job Work</td>
                <td></td>
                <td class="total-label">TOTAL</td>
                <td class="amount-value">${Number(invoice.total || 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="words-box">
            <strong>Rupees in Words :</strong> ${escapeHtml(totalInWords)}.
          </div>

          <div class="sign-off">
            <div>For,</div>
            <strong>AJAY N. PANCHAL</strong>
          </div>
        </div>
      </body>
      </html>`;
  }

  function numberToWords(number) {
    if (!Number.isFinite(number) || number <= 0) {
      return "Zero only";
    }

    const ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
      "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
      "eighteen", "nineteen"];
    const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

    function belowThousand(value) {
      let result = "";
      if (value >= 100) {
        result += `${ones[Math.floor(value / 100)]} hundred `;
        value %= 100;
      }
      if (value >= 20) {
        result += `${tens[Math.floor(value / 10)]} `;
        value %= 10;
      }
      if (value > 0) {
        result += `${ones[value]} `;
      }
      return result.trim();
    }

    const parts = [];
    const crore = Math.floor(number / 10000000);
    const lakh = Math.floor((number % 10000000) / 100000);
    const thousand = Math.floor((number % 100000) / 1000);
    const hundred = number % 1000;

    if (crore) {
      parts.push(`${belowThousand(crore)} crore`);
    }
    if (lakh) {
      parts.push(`${belowThousand(lakh)} lakh`);
    }
    if (thousand) {
      parts.push(`${belowThousand(thousand)} thousand`);
    }
    if (hundred) {
      parts.push(belowThousand(hundred));
    }

    const finalWords = `${parts.join(" ")} only`.replace(/\s+/g, " ").trim();
    return finalWords.charAt(0).toUpperCase() + finalWords.slice(1);
  }

  function printInvoice() {
    const invoice = readFormData();

    if (!invoice.items.length) {
      window.alert("Add at least one item before printing.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) {
      window.alert("Popup blocked. Please allow popups to print the invoice.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintMarkup(invoice));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  itemsTableBody.addEventListener("input", (event) => {
    const row = event.target.closest("tr");
    if (!row) {
      return;
    }

    if (event.target.classList.contains("row-amount-input")) {
      row.dataset.amountOverride = "true";
      setAmountModeUI(row);
      updateGrandTotal();
      queueAutosave();
      return;
    }

    updateRowAmount(row);
    queueAutosave();
  });

  itemsTableBody.addEventListener("change", (event) => {
    const row = event.target.closest("tr");
    if (!row) {
      return;
    }

    if (event.target.classList.contains("row-amount-input")) {
      row.dataset.amountOverride = "true";
      setAmountModeUI(row);
      updateGrandTotal();
      queueAutosave();
      return;
    }

    updateRowAmount(row);
    queueAutosave();
  });

  itemsTableBody.addEventListener("click", (event) => {
    const row = event.target.closest("tr");
    if (!row) {
      return;
    }

    if (event.target.closest(".delete-row-btn")) {
      row.remove();
      updateSerialNumbers();
      updateGrandTotal();
      ensureAtLeastOneRow();
      queueAutosave();
      return;
    }

    if (event.target.closest(".toggle-amount-btn")) {
      row.dataset.amountOverride = "false";
      updateRowAmount(row, { forceAuto: true });
      queueAutosave();
      return;
    }

    if (event.target.closest(".add-product-btn")) {
      void addProductFromRow(row);
    }
  });

  addRowBtn.addEventListener("click", () => {
    createRow();
    queueAutosave();
  });

  printInvoiceBtn.addEventListener("click", printInvoice);

  [invoiceNoInput, invoiceDateInput, messersInput].forEach((input) => {
    input.addEventListener("input", queueAutosave);
    input.addEventListener("change", queueAutosave);
  });

  const unsubscribeProducts = window.StorageEngine.subscribeToTable("products", () => {
    void renderProductSuggestions();
  });
  const unsubscribeMessers = window.StorageEngine.subscribeToTable("messers", () => {
    void renderMessersSuggestions();
  });

  window.addEventListener("beforeunload", () => {
    unsubscribeProducts();
    unsubscribeMessers();
  });

  (async () => {
    await renderProductSuggestions();
    await renderMessersSuggestions();

    const params = new URLSearchParams(window.location.search);
    const invoiceNo = params.get("invoiceNo");

    if (invoiceNo) {
      const invoice = await window.StorageEngine.getInvoiceByNumber(invoiceNo);
      if (invoice) {
        pageTitle.textContent = "Edit Invoice";
        populateForm(invoice);
      } else {
        invoiceDateInput.value = normalizeDisplayDate(new Date().toISOString().slice(0, 10));
        createRow();
        setAutosaveStatus("New invoice draft", "draft");
      }
      return;
    }

    const draft = await window.StorageEngine.getInvoiceDraft();
    if (draft) {
      populateForm(draft);
      setAutosaveStatus("Draft restored", "draft");
    } else {
      invoiceDateInput.value = normalizeDisplayDate(new Date().toISOString().slice(0, 10));
      createRow();
      setAutosaveStatus("New invoice draft", "draft");
    }
  })();
})();
