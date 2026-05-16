const form = document.getElementById("productForm");
const statusText = document.getElementById("formStatus");
const productList = document.getElementById("productList");
const refreshButton = document.getElementById("refreshProducts");
const cancelEditButton = document.getElementById("cancelEdit");
const submitButton = form.querySelector('button[type="submit"]');
const config = window.XIQI_SUPABASE;
const client = supabase.createClient(config.url, config.key);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Saving product...");

  try {
    const formData = new FormData(form);
    const id = formData.get("id");
    const imageUrl = await resolveImageUrl(formData);
    await saveProduct(formData, imageUrl);
    resetForm();
    setStatus(id ? "Product updated." : "Product added.");
    await loadProducts();
  } catch (error) {
    setStatus(error.message || "Failed to save product.");
  }
});

refreshButton.addEventListener("click", loadProducts);
cancelEditButton.addEventListener("click", resetForm);

async function resolveImageUrl(formData) {
  const fileInput = document.getElementById("imageFile");
  const file = fileInput.files[0];
  const currentImageUrl = formData.get("current_image_url");

  if (!file) {
    if (currentImageUrl) return currentImageUrl;
    throw new Error("Please choose a product image.");
  }

  return uploadImage(file);
}

async function uploadImage(file) {
  const ext = file.name.match(/\.[a-z0-9]+$/i)?.[0] || "";
  const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const { error } = await client.storage
    .from(config.storageBucket)
    .upload(filename, file, {
      contentType: file.type,
      upsert: false
    });

  if (error) {
    throw new Error(error.message || "Image upload failed.");
  }

  const { data } = client.storage.from(config.storageBucket).getPublicUrl(filename);
  return data.publicUrl;
}

async function saveProduct(formData, imageUrl) {
  const id = formData.get("id");
  const payload = {
    name: clean(formData.get("name")),
    category: clean(formData.get("category")),
    short_desc: clean(formData.get("short_desc")),
    description: clean(formData.get("description")),
    image_url: imageUrl,
    status: clean(formData.get("status")) || "published",
    sort_order: Number(formData.get("sort_order") || 0)
  };

  if (!payload.name) {
    throw new Error("Product name is required.");
  }

  if (id) {
    const { error } = await client
      .from(config.productsTable)
      .update(payload)
      .eq("id", id);

    if (error) throw error;
    return;
  }

  const { error } = await client
    .from(config.productsTable)
    .insert([payload]);

  if (error) throw error;
}

async function loadProducts() {
  productList.innerHTML = "<p>Loading products...</p>";

  try {
    const { data, error } = await client
      .from(config.productsTable)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;
    renderProducts(data || []);
  } catch (error) {
    productList.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

function renderProducts(products) {
  if (!products.length) {
    productList.innerHTML = "<p>No products yet.</p>";
    return;
  }

  productList.innerHTML = products.map((product) => `
    <article class="admin-product">
      <img src="${escapeAttribute(product.image_url || "")}" alt="">
      <div>
        <h3>${escapeHtml(product.name || "Untitled Product")}</h3>
        <p>${escapeHtml(product.category || "Uncategorized")}</p>
        <p>${escapeHtml(product.short_desc || "")}</p>
      </div>
      <div class="admin-product-actions">
        <button type="button" data-action="edit" data-id="${escapeAttribute(product.id)}">Edit</button>
        <button type="button" data-action="delete" data-id="${escapeAttribute(product.id)}">Delete</button>
      </div>
    </article>
  `).join("");

  productList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const product = products.find((item) => item.id === button.dataset.id);

      if (button.dataset.action === "edit") {
        editProduct(product);
      }

      if (button.dataset.action === "delete") {
        deleteProduct(product);
      }
    });
  });
}

function editProduct(product) {
  if (!product) return;

  form.id.value = product.id || "";
  form.current_image_url.value = product.image_url || "";
  form.name.value = product.name || "";
  form.category.value = product.category || "";
  form.sort_order.value = product.sort_order || 0;
  form.status.value = product.status || "published";
  form.short_desc.value = product.short_desc || "";
  form.description.value = product.description || "";
  submitButton.textContent = "Update Product";
  cancelEditButton.hidden = false;
  setStatus("Editing product.");
}

async function deleteProduct(product) {
  if (!product) return;

  const confirmed = window.confirm(`Delete ${product.name || "this product"}?`);

  if (!confirmed) return;

  setStatus("Deleting product...");
  const { error } = await client
    .from(config.productsTable)
    .delete()
    .eq("id", product.id);

  if (error) {
    setStatus(error.message || "Failed to delete product.");
    return;
  }

  setStatus("Product deleted.");
  await loadProducts();
}

function resetForm() {
  form.reset();
  form.id.value = "";
  form.current_image_url.value = "";
  submitButton.textContent = "Add Product";
  cancelEditButton.hidden = true;
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function setStatus(message) {
  statusText.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

loadProducts();
