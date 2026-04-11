(function initProductsPage() {
  const productNameInput = document.getElementById("productNameInput");
  const addProductBtn = document.getElementById("addProductBtn");
  const productSearchInput = document.getElementById("productSearchInput");
  const productsTableBody = document.getElementById("productsTableBody");
  const productCountChip = document.getElementById("productCountChip");

  if (!productNameInput || !addProductBtn || !productSearchInput || !productsTableBody || !productCountChip || !window.StorageEngine) {
    return;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function renderProducts() {
    const query = productSearchInput.value.trim().toLowerCase();
    const products = await window.StorageEngine.getProducts();
    const filteredProducts = query
      ? products.filter((product) => product.toLowerCase().includes(query))
      : products;

    productCountChip.textContent = `${products.length} products`;

    if (!filteredProducts.length) {
      productsTableBody.innerHTML = '<tr><td colspan="3" class="empty-state">No matching products found.</td></tr>';
      return;
    }

    productsTableBody.innerHTML = filteredProducts.map((product, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(product)}</td>
        <td>
          <div class="hero-actions">
            <button class="mini-btn edit-product-btn" type="button" data-product-name="${escapeHtml(product)}">Edit</button>
            <button class="icon-btn delete-product-btn" type="button" data-product-name="${escapeHtml(product)}">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  async function addProduct() {
    const productName = productNameInput.value.trim();

    if (!productName) {
      window.alert("Enter a product name first.");
      productNameInput.focus();
      return;
    }

    const result = await window.StorageEngine.saveProduct(productName);
    if (result?.status === "duplicate") {
      window.alert(`"${productName}" is already in the product list.`);
      productNameInput.focus();
      return;
    }

    productNameInput.value = "";
    await renderProducts();
    productNameInput.focus();
  }

  async function editProduct(productName) {
    const nextName = window.prompt("Edit product name", productName);

    if (nextName === null) {
      return;
    }

    const cleanName = nextName.trim();
    if (!cleanName) {
      window.alert("Product name cannot be empty.");
      return;
    }

    const result = await window.StorageEngine.renameProduct(productName, cleanName);
    if (result?.status === "duplicate") {
      window.alert(`"${cleanName}" is already in the product list.`);
      return;
    }

    await renderProducts();
  }

  addProductBtn.addEventListener("click", () => {
    void addProduct();
  });

  productNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void addProduct();
    }
  });

  productSearchInput.addEventListener("input", () => {
    void renderProducts();
  });

  productsTableBody.addEventListener("click", async (event) => {
    const editButton = event.target.closest(".edit-product-btn");
    const deleteButton = event.target.closest(".delete-product-btn");

    if (editButton) {
      const productName = editButton.dataset.productName;
      if (productName) {
        await editProduct(productName);
      }
      return;
    }

    if (!deleteButton) {
      return;
    }

    const productName = deleteButton.dataset.productName;
    if (!productName) {
      return;
    }

    const shouldDelete = window.confirm(`Delete product "${productName}"?`);
    if (!shouldDelete) {
      return;
    }

    await window.StorageEngine.deleteProduct(productName);
    await renderProducts();
  });

  const unsubscribeProducts = window.StorageEngine.subscribeToTable("products", () => {
    void renderProducts();
  });

  window.addEventListener("beforeunload", () => {
    unsubscribeProducts();
  });

  void renderProducts();
})();
