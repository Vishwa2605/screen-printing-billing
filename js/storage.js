(function initStorageModule() {
  const KEYS = {
    invoices: "screenPrintingInvoices",
    products: "screenPrintingProducts",
    productionRecords: "screenPrintingProductionRecords",
    messers: "screenPrintingMessers",
    invoiceDraft: "screenPrintingInvoiceDraft",
    recordDraft: "screenPrintingRecordDraft"
  };

  const SUPABASE_URL = window.SUPABASE_CONFIG?.url || "";
  const SUPABASE_KEY = window.SUPABASE_CONFIG?.anonKey || "";
  const hasSupabase = Boolean(window.supabase?.createClient && SUPABASE_URL && SUPABASE_KEY);
  const supabaseClient = hasSupabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

  function readArray(key) {
    try {
      const raw = window.localStorage.getItem(key);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`Unable to read data for ${key}.`, error);
      return [];
    }
  }

  function writeArray(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function sortText(items) {
    return [...items].sort((left, right) => String(left).localeCompare(String(right), undefined, {
      sensitivity: "base"
    }));
  }

  function readDraft(key) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error(`Unable to read draft for ${key}.`, error);
      return null;
    }
  }

  function saveDraft(key, value) {
    if (!value) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function mapInvoiceRow(row, index, invoiceId) {
    return {
      invoice_id: invoiceId,
      line_no: index + 1,
      product: row.product || "",
      grams: row.grams || "",
      qty: Number(row.qty || 0),
      f1: Boolean(row.f1),
      f2: Boolean(row.f2),
      f3: Boolean(row.f3),
      f4: Boolean(row.f4),
      b: Boolean(row.b),
      d: Boolean(row.d),
      s1: Boolean(row.s1),
      s2: Boolean(row.s2),
      rate: Number(row.rate || 0),
      amount: Number(row.amount || 0),
      amount_override: Boolean(row.amountOverride)
    };
  }

  function mapInvoiceHeader(row) {
    return {
      invoiceNo: row.invoice_no,
      date: row.invoice_date,
      messers: row.messers,
      total: Number(row.total || 0)
    };
  }

  function mapInvoiceItem(row) {
    return {
      product: row.product || "",
      grams: row.grams || "",
      qty: Number(row.qty || 0),
      f1: Boolean(row.f1),
      f2: Boolean(row.f2),
      f3: Boolean(row.f3),
      f4: Boolean(row.f4),
      b: Boolean(row.b),
      d: Boolean(row.d),
      s1: Boolean(row.s1),
      s2: Boolean(row.s2),
      rate: Number(row.rate || 0),
      amount: Number(row.amount || 0),
      amountOverride: Boolean(row.amount_override)
    };
  }

  async function localGetAllInvoices() {
    return readArray(KEYS.invoices).sort((left, right) => {
      const leftNo = String(left.invoiceNo || "");
      const rightNo = String(right.invoiceNo || "");
      return leftNo.localeCompare(rightNo, undefined, { numeric: true, sensitivity: "base" });
    });
  }

  async function localGetInvoiceByNumber(invoiceNo) {
    return readArray(KEYS.invoices).find((invoice) => String(invoice.invoiceNo) === String(invoiceNo)) || null;
  }

  async function localSaveInvoice(invoiceData) {
    const invoices = readArray(KEYS.invoices);
    const targetIndex = invoices.findIndex((invoice) => String(invoice.invoiceNo) === String(invoiceData.invoiceNo));

    if (targetIndex >= 0) {
      invoices[targetIndex] = invoiceData;
    } else {
      invoices.push(invoiceData);
    }

    writeArray(KEYS.invoices, invoices);
    return invoiceData;
  }

  async function localDeleteInvoice(invoiceNo) {
    const invoices = readArray(KEYS.invoices).filter((invoice) => String(invoice.invoiceNo) !== String(invoiceNo));
    writeArray(KEYS.invoices, invoices);
  }

  async function localClearInvoices() {
    window.localStorage.removeItem(KEYS.invoices);
  }

  async function localGetProducts() {
    return sortText(readArray(KEYS.products).filter(Boolean));
  }

  async function localSaveProduct(productName) {
    const cleanName = String(productName || "").trim();
    if (!cleanName) {
      return null;
    }

    const products = readArray(KEYS.products);
    const exists = products.some((product) => product.trim().toLowerCase() === cleanName.toLowerCase());

    if (exists) {
      return { status: "duplicate", product: cleanName };
    }

    products.push(cleanName);
    writeArray(KEYS.products, sortText(products));
    return { status: "added", product: cleanName };
  }

  async function localSaveProducts(productNames) {
    const uniqueProducts = await localGetProducts();
    const seen = new Set(uniqueProducts.map((product) => product.toLowerCase()));

    productNames.forEach((productName) => {
      const cleanName = String(productName || "").trim();
      if (!cleanName) {
        return;
      }

      const key = cleanName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueProducts.push(cleanName);
      }
    });

    writeArray(KEYS.products, sortText(uniqueProducts));
    return localGetProducts();
  }

  async function localDeleteProduct(productName) {
    const target = String(productName || "").trim().toLowerCase();
    const products = readArray(KEYS.products).filter((product) => product.trim().toLowerCase() !== target);
    writeArray(KEYS.products, sortText(products));
  }

  async function localRenameProduct(oldName, newName) {
    const cleanOld = String(oldName || "").trim();
    const cleanNew = String(newName || "").trim();
    const products = readArray(KEYS.products);

    if (products.some((product) => product.trim().toLowerCase() === cleanNew.toLowerCase() && product.trim().toLowerCase() !== cleanOld.toLowerCase())) {
      return { status: "duplicate", product: cleanNew };
    }

    const updated = products.map((product) => (
      product.trim().toLowerCase() === cleanOld.toLowerCase() ? cleanNew : product
    ));
    writeArray(KEYS.products, sortText(updated));
    return { status: "updated", product: cleanNew };
  }

  async function localGetMessers() {
    const stored = sortText(readArray(KEYS.messers).filter(Boolean));
    if (!stored.includes("PHOENIX MEDICAMENTS PVT. LTD.")) {
      stored.unshift("PHOENIX MEDICAMENTS PVT. LTD.");
    }
    return [...new Set(stored)];
  }

  async function localSaveMessers(names) {
    const current = await localGetMessers();
    const seen = new Set(current.map((name) => name.toLowerCase()));
    names.forEach((name) => {
      const cleanName = String(name || "").trim();
      if (!cleanName) {
        return;
      }
      const key = cleanName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        current.push(cleanName);
      }
    });
    writeArray(KEYS.messers, sortText(current));
    return localGetMessers();
  }

  async function localGetProductionRecords() {
    return readArray(KEYS.productionRecords).sort((left, right) => {
      const leftDate = String(left.date || "");
      const rightDate = String(right.date || "");
      return rightDate.localeCompare(leftDate, undefined, { sensitivity: "base" });
    });
  }

  async function localSaveProductionRecord(record) {
    const records = readArray(KEYS.productionRecords);
    const recordWithId = {
      id: record.id || `record_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      ...record
    };
    const targetIndex = records.findIndex((item) => item.id === recordWithId.id);

    if (targetIndex >= 0) {
      records[targetIndex] = recordWithId;
    } else {
      records.push(recordWithId);
    }

    writeArray(KEYS.productionRecords, records);
    return recordWithId;
  }

  async function localDeleteProductionRecord(recordId) {
    const records = readArray(KEYS.productionRecords).filter((record) => record.id !== recordId);
    writeArray(KEYS.productionRecords, records);
  }

  async function remoteGetAllInvoices() {
    const { data, error } = await supabaseClient.from("invoices").select("*");
    if (error) {
      console.error("Supabase invoices fetch failed.", error);
      return localGetAllInvoices();
    }

    const { data: itemRows } = await supabaseClient.from("invoice_items").select("invoice_id");
    const itemCounts = (itemRows || []).reduce((accumulator, row) => {
      accumulator[row.invoice_id] = (accumulator[row.invoice_id] || 0) + 1;
      return accumulator;
    }, {});

    return data
      .map((row) => ({
        ...mapInvoiceHeader(row),
        itemCount: itemCounts[row.id] || 0
      }))
      .sort((left, right) => String(left.invoiceNo).localeCompare(String(right.invoiceNo), undefined, {
        numeric: true,
        sensitivity: "base"
      }));
  }

  async function remoteGetInvoiceByNumber(invoiceNo) {
    const { data: header, error: headerError } = await supabaseClient
      .from("invoices")
      .select("*")
      .eq("invoice_no", invoiceNo)
      .maybeSingle();

    if (headerError || !header) {
      if (headerError) {
        console.error("Supabase invoice lookup failed.", headerError);
      }
      return null;
    }

    const { data: items, error: itemError } = await supabaseClient
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", header.id)
      .order("line_no", { ascending: true });

    if (itemError) {
      console.error("Supabase invoice items fetch failed.", itemError);
      return null;
    }

    return {
      ...mapInvoiceHeader(header),
      items: (items || []).map(mapInvoiceItem)
    };
  }

  async function remoteSaveInvoice(invoiceData) {
    const headerPayload = {
      invoice_no: invoiceData.invoiceNo,
      invoice_date: invoiceData.date,
      messers: invoiceData.messers || "",
      total: Number(invoiceData.total || 0),
      updated_at: new Date().toISOString()
    };

    const { data: existing } = await supabaseClient
      .from("invoices")
      .select("id")
      .eq("invoice_no", invoiceData.invoiceNo)
      .maybeSingle();

    let invoiceId = existing?.id || null;

    if (invoiceId) {
      const { error } = await supabaseClient
        .from("invoices")
        .update(headerPayload)
        .eq("id", invoiceId);

      if (error) {
        console.error("Supabase invoice update failed.", error);
        return localSaveInvoice(invoiceData);
      }

      await supabaseClient.from("invoice_items").delete().eq("invoice_id", invoiceId);
    } else {
      const { data, error } = await supabaseClient
        .from("invoices")
        .insert(headerPayload)
        .select("id")
        .single();

      if (error || !data) {
        console.error("Supabase invoice create failed.", error);
        return localSaveInvoice(invoiceData);
      }

      invoiceId = data.id;
    }

    const lineItems = (invoiceData.items || []).map((item, index) => mapInvoiceRow(item, index, invoiceId));
    if (lineItems.length) {
      const { error } = await supabaseClient.from("invoice_items").insert(lineItems);
      if (error) {
        console.error("Supabase invoice item insert failed.", error);
      }
    }

    await remoteSaveMessers([invoiceData.messers]);
    return invoiceData;
  }

  async function remoteDeleteInvoice(invoiceNo) {
    const { data: existing } = await supabaseClient
      .from("invoices")
      .select("id")
      .eq("invoice_no", invoiceNo)
      .maybeSingle();

    if (!existing?.id) {
      return;
    }

    const { error } = await supabaseClient.from("invoices").delete().eq("id", existing.id);
    if (error) {
      console.error("Supabase invoice delete failed.", error);
      await localDeleteInvoice(invoiceNo);
    }
  }

  async function remoteClearInvoices() {
    await supabaseClient.from("invoice_items").delete().neq("id", "");
    await supabaseClient.from("invoices").delete().neq("id", "");
  }

  async function remoteGetProducts() {
    const { data, error } = await supabaseClient.from("products").select("name").order("name", { ascending: true });
    if (error) {
      console.error("Supabase products fetch failed.", error);
      return localGetProducts();
    }

    return (data || []).map((row) => row.name);
  }

  async function remoteSaveProduct(productName) {
    const cleanName = String(productName || "").trim();
    if (!cleanName) {
      return null;
    }

    const { data: existing } = await supabaseClient
      .from("products")
      .select("id")
      .ilike("name", cleanName)
      .maybeSingle();

    if (existing?.id) {
      return { status: "duplicate", product: cleanName };
    }

    const { error } = await supabaseClient.from("products").insert({ name: cleanName });
    if (error) {
      console.error("Supabase product save failed.", error);
      return localSaveProduct(cleanName);
    }

    return { status: "added", product: cleanName };
  }

  async function remoteSaveProducts(productNames) {
    for (const productName of productNames) {
      const cleanName = String(productName || "").trim();
      if (!cleanName) {
        continue;
      }

      const { data: existing } = await supabaseClient
        .from("products")
        .select("id")
        .eq("name", cleanName)
        .maybeSingle();

      if (!existing?.id) {
        await supabaseClient.from("products").insert({ name: cleanName });
      }
    }

    return remoteGetProducts();
  }

  async function remoteDeleteProduct(productName) {
    const { error } = await supabaseClient.from("products").delete().eq("name", productName);
    if (error) {
      console.error("Supabase product delete failed.", error);
      await localDeleteProduct(productName);
    }
  }

  async function remoteRenameProduct(oldName, newName) {
    const cleanOld = String(oldName || "").trim();
    const cleanNew = String(newName || "").trim();
    const { data: duplicate } = await supabaseClient
      .from("products")
      .select("id")
      .eq("name", cleanNew)
      .maybeSingle();

    if (duplicate?.id && cleanOld.toLowerCase() !== cleanNew.toLowerCase()) {
      return { status: "duplicate", product: cleanNew };
    }

    const { error } = await supabaseClient.from("products").update({ name: cleanNew }).eq("name", cleanOld);
    if (error) {
      console.error("Supabase product rename failed.", error);
      return localRenameProduct(cleanOld, cleanNew);
    }

    return { status: "updated", product: cleanNew };
  }

  async function remoteGetMessers() {
    const { data, error } = await supabaseClient.from("messers").select("name").order("name", { ascending: true });
    if (error) {
      console.error("Supabase messers fetch failed.", error);
      return localGetMessers();
    }

    const names = (data || []).map((row) => row.name);
    if (!names.includes("PHOENIX MEDICAMENTS PVT. LTD.")) {
      names.unshift("PHOENIX MEDICAMENTS PVT. LTD.");
    }
    return names;
  }

  async function remoteSaveMessers(names) {
    for (const name of names) {
      const cleanName = String(name || "").trim();
      if (!cleanName) {
        continue;
      }

      const { data: existing } = await supabaseClient
        .from("messers")
        .select("id")
        .eq("name", cleanName)
        .maybeSingle();

      if (!existing?.id) {
        await supabaseClient.from("messers").insert({ name: cleanName });
      }
    }

    return remoteGetMessers();
  }

  async function remoteGetProductionRecords() {
    const { data, error } = await supabaseClient
      .from("production_records")
      .select("*")
      .order("record_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase production records fetch failed.", error);
      return localGetProductionRecords();
    }

    return (data || []).map((row) => ({
      id: row.id,
      product: row.product,
      batchNo: row.batch_no,
      quantity: Number(row.quantity || 0),
      grams: Number(row.grams || 0),
      date: row.record_date
    }));
  }

  async function remoteSaveProductionRecord(record) {
    const payload = {
      product: record.product || "",
      batch_no: record.batchNo || "",
      quantity: Number(record.quantity || 0),
      grams: Number(record.grams || 0),
      record_date: record.date || "",
      updated_at: new Date().toISOString()
    };

    if (record.id) {
      const { error } = await supabaseClient.from("production_records").update(payload).eq("id", record.id);
      if (error) {
        console.error("Supabase production record update failed.", error);
        return localSaveProductionRecord(record);
      }
      return { ...record };
    }

    const { data, error } = await supabaseClient
      .from("production_records")
      .insert(payload)
      .select("id")
      .single();

    if (error || !data) {
      console.error("Supabase production record create failed.", error);
      return localSaveProductionRecord(record);
    }

    return { ...record, id: data.id };
  }

  async function remoteDeleteProductionRecord(recordId) {
    const { error } = await supabaseClient.from("production_records").delete().eq("id", recordId);
    if (error) {
      console.error("Supabase production record delete failed.", error);
      await localDeleteProductionRecord(recordId);
    }
  }

  async function isDuplicateProduct(productName) {
    const target = String(productName || "").trim().toLowerCase();
    const products = await StorageEngine.getProducts();
    return products.some((product) => product.toLowerCase() === target);
  }

  function subscribeToTable(table, handler) {
    if (!hasSupabase || !supabaseClient || typeof handler !== "function") {
      return () => {};
    }

    const channel = supabaseClient
      .channel(`live_${table}_${Math.random().toString(16).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        handler();
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }

  const StorageEngine = {
    clearInvoices: () => (hasSupabase ? remoteClearInvoices() : localClearInvoices()),
    deleteInvoice: (invoiceNo) => (hasSupabase ? remoteDeleteInvoice(invoiceNo) : localDeleteInvoice(invoiceNo)),
    deleteProduct: (productName) => (hasSupabase ? remoteDeleteProduct(productName) : localDeleteProduct(productName)),
    deleteProductionRecord: (recordId) => (hasSupabase ? remoteDeleteProductionRecord(recordId) : localDeleteProductionRecord(recordId)),
    getAllInvoices: () => (hasSupabase ? remoteGetAllInvoices() : localGetAllInvoices()),
    getInvoiceByNumber: (invoiceNo) => (hasSupabase ? remoteGetInvoiceByNumber(invoiceNo) : localGetInvoiceByNumber(invoiceNo)),
    getInvoiceDraft: () => Promise.resolve(readDraft(KEYS.invoiceDraft)),
    getMessers: () => (hasSupabase ? remoteGetMessers() : localGetMessers()),
    getProducts: () => (hasSupabase ? remoteGetProducts() : localGetProducts()),
    getProductionRecords: () => (hasSupabase ? remoteGetProductionRecords() : localGetProductionRecords()),
    getRecordDraft: () => Promise.resolve(readDraft(KEYS.recordDraft)),
    isDuplicateProduct,
    isRemoteEnabled: () => hasSupabase,
    renameProduct: (oldName, newName) => (hasSupabase ? remoteRenameProduct(oldName, newName) : localRenameProduct(oldName, newName)),
    saveInvoice: (invoiceData) => (hasSupabase ? remoteSaveInvoice(invoiceData) : localSaveInvoice(invoiceData)),
    saveInvoiceDraft: (draft) => Promise.resolve(saveDraft(KEYS.invoiceDraft, draft)),
    saveMessers: (names) => (hasSupabase ? remoteSaveMessers(names) : localSaveMessers(names)),
    saveProduct: (productName) => (hasSupabase ? remoteSaveProduct(productName) : localSaveProduct(productName)),
    saveProducts: (productNames) => (hasSupabase ? remoteSaveProducts(productNames) : localSaveProducts(productNames)),
    saveProductionRecord: (record) => (hasSupabase ? remoteSaveProductionRecord(record) : localSaveProductionRecord(record)),
    saveRecordDraft: (draft) => Promise.resolve(saveDraft(KEYS.recordDraft, draft)),
    subscribeToTable
  };

  window.StorageEngine = StorageEngine;
})();
