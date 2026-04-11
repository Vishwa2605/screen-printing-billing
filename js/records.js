(function initRecordsPage() {
  const productInput = document.getElementById("recordProductInput");
  const batchInput = document.getElementById("recordBatchInput");
  const dateInput = document.getElementById("recordDateInput");
  const quantityInput = document.getElementById("recordQuantityInput");
  const gramsInput = document.getElementById("recordGramsInput");
  const recordsTableBody = document.getElementById("recordsTableBody");

  // ✅ NEW (Search)
  const searchInput = document.getElementById("recordSearchInput");
  let allRecords = [];

  const productSuggestions = document.getElementById("recordProductSuggestions");
  const recordAutosaveStatus = document.getElementById("recordAutosaveStatus");

  if (!productInput || !batchInput || !dateInput || !quantityInput || !gramsInput || !recordsTableBody || !productSuggestions || !window.StorageEngine) {
    return;
  }

  let autosaveTimer = null;
  let lastSavedSignature = "";
  let editingRecordId = "";

  function setAutosaveStatus(text, state) {
    if (!recordAutosaveStatus) return;
    recordAutosaveStatus.textContent = text;
    recordAutosaveStatus.dataset.state = state || "";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function renderProductSuggestions() {
    const products = await window.StorageEngine.getProducts();
    productSuggestions.innerHTML = products
      .map((product) => `<option value="${escapeHtml(product)}"></option>`)
      .join("");
  }

  // ✅ UPDATED (store records + filter)
  async function renderRecords() {
    const records = await window.StorageEngine.getProductionRecords();
    allRecords = records;

    applySearchFilter();
  }

  // ✅ NEW SEARCH FUNCTION
  function applySearchFilter() {
    let records = allRecords;

    const query = (searchInput?.value || "").toLowerCase().trim();

    if (query) {
      records = allRecords.filter(record =>
        (record.product || "").toLowerCase().includes(query) ||
        (record.batchNo || "").toLowerCase().includes(query)
      );
    }

    if (!records.length) {
      recordsTableBody.innerHTML =
        '<tr><td colspan="7" class="empty-state">No matching records found.</td></tr>';
      return;
    }

    recordsTableBody.innerHTML = records.map((record, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(record.product)}</td>
        <td>${escapeHtml(record.batchNo)}</td>
        <td>${Number(record.quantity || 0)}</td>
        <td>${Number(record.grams || 0)}</td>
        <td>${escapeHtml(record.date)}</td>
        <td>
          <div class="hero-actions">
            <button class="mini-btn edit-record-btn" type="button" data-record-id="${escapeHtml(record.id)}">Edit</button>
            <button class="icon-btn delete-record-btn" type="button" data-record-id="${escapeHtml(record.id)}">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  async function resetForm() {
    productInput.value = "";
    batchInput.value = "";
    quantityInput.value = "";
    gramsInput.value = "";
    dateInput.value = new Date().toISOString().slice(0, 10);

    await window.StorageEngine.saveRecordDraft({
      product: "",
      batchNo: "",
      quantity: 0,
      grams: 0,
      date: dateInput.value
    });
  }

  function buildPayload() {
    return {
      id: editingRecordId || undefined,
      product: productInput.value.trim(),
      batchNo: batchInput.value.trim(),
      quantity: Math.max(Number(quantityInput.value) || 0, 0),
      grams: Math.max(Number(gramsInput.value) || 0, 0),
      date: dateInput.value
    };
  }

  function isCompleteRecord(payload) {
    return Boolean(payload.product && payload.batchNo && payload.date && payload.quantity > 0 && payload.grams > 0);
  }

  async function saveRecordDraftAndMaybeCommit() {
    const payload = buildPayload();
    await window.StorageEngine.saveRecordDraft(payload);

    if (!isCompleteRecord(payload)) {
      setAutosaveStatus("Draft saved", "draft");
      return;
    }

    const signature = JSON.stringify(payload);
    if (signature === lastSavedSignature) {
      setAutosaveStatus("Already saved", "saved");
      return;
    }

    await window.StorageEngine.saveProduct(payload.product);
    await window.StorageEngine.saveProductionRecord(payload);
    lastSavedSignature = signature;

    await renderProductSuggestions();
    await renderRecords();

    setAutosaveStatus("Record saved", "saved");
    editingRecordId = "";
    await resetForm();
  }

  function queueAutosave() {
    setAutosaveStatus("Saving...", "saving");
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      saveRecordDraftAndMaybeCommit();
    }, 450);
  }

  [productInput, batchInput, dateInput, quantityInput, gramsInput].forEach((input) => {
    input.addEventListener("input", queueAutosave);
    input.addEventListener("change", queueAutosave);
  });

  // ✅ SEARCH LISTENER
  if (searchInput) {
    searchInput.addEventListener("input", applySearchFilter);
  }

  recordsTableBody.addEventListener("click", async (event) => {
    const editButton = event.target.closest(".edit-record-btn");
    const deleteButton = event.target.closest(".delete-record-btn");

    if (editButton) {
      const recordId = editButton.dataset.recordId;
      const record = (await window.StorageEngine.getProductionRecords()).find((item) => item.id === recordId);

      if (record) {
        editingRecordId = record.id;
        productInput.value = record.product || "";
        batchInput.value = record.batchNo || "";
        quantityInput.value = record.quantity || "";
        gramsInput.value = record.grams || "";
        dateInput.value = record.date || new Date().toISOString().slice(0, 10);
        setAutosaveStatus("Editing record", "draft");
      }
      return;
    }

    if (!deleteButton) return;

    const recordId = deleteButton.dataset.recordId;
    if (!recordId) return;

    const shouldDelete = window.confirm("Delete this production record?");
    if (!shouldDelete) return;

    await window.StorageEngine.deleteProductionRecord(recordId);

    if (editingRecordId === recordId) {
      editingRecordId = "";
      await resetForm();
    }

    await renderRecords();
  });

  const unsubscribeProducts = window.StorageEngine.subscribeToTable("products", () => {
    renderProductSuggestions();
  });

  const unsubscribeRecords = window.StorageEngine.subscribeToTable("production_records", () => {
    renderRecords();
  });

  window.addEventListener("beforeunload", () => {
    unsubscribeProducts();
    unsubscribeRecords();
  });

  (async () => {
    const draft = await window.StorageEngine.getRecordDraft();

    if (draft) {
      productInput.value = draft.product || "";
      batchInput.value = draft.batchNo || "";
      quantityInput.value = draft.quantity || "";
      gramsInput.value = draft.grams || "";
      dateInput.value = draft.date || new Date().toISOString().slice(0, 10);
      setAutosaveStatus("Draft restored", "draft");
    } else {
      await resetForm();
      setAutosaveStatus("Autosave ready", "ready");
    }

    await renderProductSuggestions();
    await renderRecords();
  })();
})();