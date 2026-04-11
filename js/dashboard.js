(function initDashboard() {
  const tbody = document.getElementById("invoiceTableBody");
  const invoiceCount = document.getElementById("invoiceCount");
  const clearBtn = document.getElementById("clearInvoicesBtn");

  if (!tbody || !invoiceCount || !clearBtn || !window.StorageEngine) {
    return;
  }

  function currency(value) {
    return Number(value || 0).toFixed(2);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function renderRows() {
    const invoices = await window.StorageEngine.getAllInvoices();
    invoiceCount.textContent = `${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`;

    if (!invoices.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No invoices saved yet.</td></tr>';
      return;
    }

    tbody.innerHTML = invoices.map((invoice) => {
      const safeMessers = escapeHtml(invoice.messers || "");
      const itemCount = Array.isArray(invoice.items) ? invoice.items.length : Number(invoice.itemCount || 0);

      return `
        <tr>
          <td>${escapeHtml(invoice.invoiceNo || "")}</td>
          <td>${escapeHtml(invoice.date || "")}</td>
          <td>${safeMessers}</td>
          <td>${itemCount}</td>
          <td>${currency(invoice.total)}</td>
          <td>
            <div class="hero-actions">
              <a class="btn btn-secondary" href="invoice.html?invoiceNo=${encodeURIComponent(invoice.invoiceNo || "")}">Edit</a>
              <button class="icon-btn delete-invoice-btn" type="button" data-invoice-no="${escapeHtml(invoice.invoiceNo || "")}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  tbody.addEventListener("click", async (event) => {
    const deleteButton = event.target.closest(".delete-invoice-btn");

    if (!deleteButton) {
      return;
    }

    const invoiceNo = deleteButton.dataset.invoiceNo;
    if (!invoiceNo) {
      return;
    }

    const shouldDelete = window.confirm(`Delete invoice ${invoiceNo}?`);
    if (!shouldDelete) {
      return;
    }

    await window.StorageEngine.deleteInvoice(invoiceNo);
    await renderRows();
  });

  clearBtn.addEventListener("click", async () => {
    const shouldClear = window.confirm("Delete all saved invoices?");

    if (!shouldClear) {
      return;
    }

    await window.StorageEngine.clearInvoices();
    await renderRows();
  });

  const unsubscribeInvoices = window.StorageEngine.subscribeToTable("invoices", () => {
    void renderRows();
  });
  const unsubscribeInvoiceItems = window.StorageEngine.subscribeToTable("invoice_items", () => {
    void renderRows();
  });

  window.addEventListener("beforeunload", () => {
    unsubscribeInvoices();
    unsubscribeInvoiceItems();
  });

  void renderRows();
})();
