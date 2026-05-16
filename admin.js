const form = document.getElementById("productForm");
const statusText = document.getElementById("formStatus");
const productList = document.getElementById("productList");
const refreshButton = document.getElementById("refreshProducts");
const inquiryList = document.getElementById("inquiryList");
const refreshInquiriesButton = document.getElementById("refreshInquiries");
const categoryForm = document.getElementById("categoryForm");
const categoryList = document.getElementById("categoryList");
const refreshCategoriesButton = document.getElementById("refreshCategories");
const cancelCategoryEditButton = document.getElementById("cancelCategoryEdit");
const categoryStatus = document.getElementById("categoryStatus");
const categorySubmitButton = categoryForm.querySelector('button[type="submit"]');
const factoryForm = document.getElementById("factoryForm");
const factoryVideoList = document.getElementById("factoryVideoList");
const refreshFactoryVideosButton = document.getElementById("refreshFactoryVideos");
const cancelFactoryEditButton = document.getElementById("cancelFactoryEdit");
const factoryStatus = document.getElementById("factoryStatus");
const factorySubmitButton = factoryForm.querySelector('button[type="submit"]');
const productGalleryList = document.getElementById("productGalleryList");
const removeProductVideoButton = document.getElementById("removeProductVideo");
const productVideoStatus = document.getElementById("productVideoStatus");
const cancelEditButton = document.getElementById("cancelEdit");
const submitButton = form.querySelector('button[type="submit"]');
const config = window.XIQI_SUPABASE;
const client = supabase.createClient(config.url, config.key);

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (submitButton.disabled) return;

  setBusy(true);
  setStatus("Saving product...");

  try {
    const formData = new FormData(form);
    const id = formData.get("id");
    const imageUrl = await resolveImageUrl(formData);
    const videoUrl = await resolveProductVideoUrl(formData);
    const savedProduct = await saveProduct(formData, imageUrl, videoUrl);
    await uploadProductGalleryImages(savedProduct.id);
    resetForm();
    setStatus(id ? "Product updated." : "Product added.");
    await loadProducts();
  } catch (error) {
    setStatus(error.message || "Failed to save product.");
  } finally {
    setBusy(false);
  }
});

refreshButton.addEventListener("click", loadProducts);
refreshInquiriesButton.addEventListener("click", loadInquiries);
cancelEditButton.addEventListener("click", resetForm);
refreshCategoriesButton.addEventListener("click", loadCategories);
cancelCategoryEditButton.addEventListener("click", resetCategoryForm);
refreshFactoryVideosButton.addEventListener("click", loadFactoryVideos);
cancelFactoryEditButton.addEventListener("click", resetFactoryForm);
removeProductVideoButton.addEventListener("click", () => {
  form.current_video_url.value = "";
  form.remove_product_video.value = "1";
  removeProductVideoButton.hidden = true;
  productVideoStatus.textContent = "Product video will be removed after saving.";
});

categoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (categorySubmitButton.disabled) return;

  setButtonBusy(categorySubmitButton, true);
  categoryStatus.textContent = "Saving category...";

  try {
    const formData = new FormData(categoryForm);
    const id = formData.get("id");
    const imageUrl = await resolveCategoryImageUrl(formData);
    await saveCategory(formData, imageUrl);
    resetCategoryForm();
    categoryStatus.textContent = id ? "Category updated." : "Category added.";
    await loadCategories();
  } catch (error) {
    categoryStatus.textContent = error.message || "Failed to save category.";
  } finally {
    setButtonBusy(categorySubmitButton, false);
  }
});

factoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (factorySubmitButton.disabled) return;

  setButtonBusy(factorySubmitButton, true);
  factoryStatus.textContent = "Saving video...";

  try {
    const formData = new FormData(factoryForm);
    const id = formData.get("id");
    const videoUrl = await resolveFactoryVideoUrl(formData);
    await saveFactoryVideo(formData, videoUrl);
    resetFactoryForm();
    factoryStatus.textContent = id ? "Video updated." : "Video added.";
    await loadFactoryVideos();
  } catch (error) {
    factoryStatus.textContent = error.message || "Failed to save video.";
  } finally {
    setButtonBusy(factorySubmitButton, false);
  }
});

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

async function uploadFile(file, bucket, folder) {
  const ext = file.name.match(/\.[a-z0-9]+$/i)?.[0] || "";
  const filename = `${folder}/${Date.now()}-${crypto.randomUUID()}${ext}`;
  const { error } = await client.storage
    .from(bucket)
    .upload(filename, file, {
      contentType: file.type,
      upsert: false
    });

  if (error) {
    throw new Error(error.message || "File upload failed.");
  }

  const { data } = client.storage.from(bucket).getPublicUrl(filename);
  return data.publicUrl;
}

async function resolveProductVideoUrl(formData) {
  const file = document.getElementById("productVideoFile").files[0];

  if (formData.get("remove_product_video") === "1") {
    return "";
  }

  if (!file) {
    return formData.get("current_video_url") || "";
  }

  return uploadFile(file, config.storageBucket, "product-videos");
}

async function saveProduct(formData, imageUrl, videoUrl) {
  const id = formData.get("id");
  const payload = {
    name: clean(formData.get("name")),
    category: clean(formData.get("category")),
    short_desc: clean(formData.get("short_desc")),
    description: clean(formData.get("description")),
    image_url: imageUrl,
    price: clean(formData.get("price")),
    moq: clean(formData.get("moq")),
    material: clean(formData.get("material")),
    packaging: clean(formData.get("packaging")),
    lead_time: clean(formData.get("lead_time")),
    features: clean(formData.get("features")),
    product_video: videoUrl,
    status: clean(formData.get("status")) || "published",
    sort_order: Number(formData.get("sort_order") || 0)
  };

  if (!payload.name) {
    throw new Error("Product name is required.");
  }

  if (id) {
    const { data, error } = await client
      .from(config.productsTable)
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await client
    .from(config.productsTable)
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function uploadProductGalleryImages(productId) {
  const files = Array.from(document.getElementById("galleryFiles").files || []);

  if (!files.length) return;

  const { data: existingImages, error: countError } = await client
    .from("product_images")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (countError) throw countError;

  const startSort = Number(existingImages?.[0]?.sort_order || 0);
  const rows = [];

  for (let index = 0; index < files.length; index += 1) {
    const imageUrl = await uploadFile(files[index], config.storageBucket, "product-gallery");
    rows.push({
      product_id: productId,
      image_url: imageUrl,
      sort_order: startSort + index + 1
    });
  }

  const { error } = await client.from("product_images").insert(rows);
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
        <p>${escapeHtml(product.price || "")}</p>
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
  form.current_video_url.value = product.product_video || "";
  form.remove_product_video.value = "";
  form.name.value = product.name || "";
  form.category.value = product.category || "";
  form.sort_order.value = product.sort_order || 0;
  form.status.value = product.status || "published";
  form.price.value = product.price || "";
  form.moq.value = product.moq || "";
  form.material.value = product.material || "";
  form.packaging.value = product.packaging || "";
  form.lead_time.value = product.lead_time || "";
  form.short_desc.value = product.short_desc || "";
  form.description.value = product.description || "";
  form.features.value = product.features || "";
  removeProductVideoButton.hidden = !product.product_video;
  productVideoStatus.textContent = product.product_video ? "Product video attached." : "";
  submitButton.textContent = "Update Product";
  cancelEditButton.hidden = false;
  setStatus("Editing product.");
  loadProductGallery(product.id);
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

async function loadProductGallery(productId) {
  productGalleryList.innerHTML = "<p>Loading gallery...</p>";

  try {
    const { data, error } = await client
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    renderProductGallery(data || []);
  } catch (error) {
    productGalleryList.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

function renderProductGallery(images) {
  if (!images.length) {
    productGalleryList.innerHTML = "<p>No gallery images yet.</p>";
    return;
  }

  productGalleryList.innerHTML = images.map((image) => `
    <article class="gallery-manage-item">
      <img src="${escapeAttribute(image.image_url)}" alt="">
      <input type="number" value="${Number(image.sort_order || 0)}" data-action="sort" data-id="${escapeAttribute(image.id)}">
      <button type="button" data-action="main" data-url="${escapeAttribute(image.image_url)}">Set Main</button>
      <button type="button" data-action="delete" data-id="${escapeAttribute(image.id)}">Delete</button>
    </article>
  `).join("");

  productGalleryList.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => updateGallerySort(input.dataset.id, input.value));
  });

  productGalleryList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.action === "main") setMainProductImage(button.dataset.url);
      if (button.dataset.action === "delete") deleteGalleryImage(button.dataset.id);
    });
  });
}

async function updateGallerySort(id, sortOrder) {
  const { error } = await client
    .from("product_images")
    .update({ sort_order: Number(sortOrder || 0) })
    .eq("id", id);

  if (error) window.alert(error.message || "Failed to update image sort.");
}

async function setMainProductImage(imageUrl) {
  const productId = form.id.value;

  if (!productId) return;

  const { error } = await client
    .from(config.productsTable)
    .update({ image_url: imageUrl })
    .eq("id", productId);

  if (error) {
    window.alert(error.message || "Failed to set main image.");
    return;
  }

  form.current_image_url.value = imageUrl;
  setStatus("Main image updated.");
  await loadProducts();
}

async function deleteGalleryImage(id) {
  const confirmed = window.confirm("Delete this gallery image?");

  if (!confirmed) return;

  const { error } = await client.from("product_images").delete().eq("id", id);

  if (error) {
    window.alert(error.message || "Failed to delete gallery image.");
    return;
  }

  await loadProductGallery(form.id.value);
}

async function resolveCategoryImageUrl(formData) {
  const file = document.getElementById("categoryImageFile").files[0];
  const currentImageUrl = formData.get("current_image_url");

  if (!file) {
    if (currentImageUrl) return currentImageUrl;
    throw new Error("Please choose a category image.");
  }

  return uploadFile(file, config.storageBucket, "categories");
}

async function saveCategory(formData, imageUrl) {
  const id = formData.get("id");
  const payload = {
    title: clean(formData.get("title")),
    image_url: imageUrl,
    description: clean(formData.get("description")),
    link: clean(formData.get("link")) || "product.html",
    sort_order: Number(formData.get("sort_order") || 0),
    status: clean(formData.get("status")) || "published"
  };

  if (!payload.title) {
    throw new Error("Category title is required.");
  }

  if (id) {
    const { error } = await client.from("categories").update(payload).eq("id", id);
    if (error) throw error;
    return;
  }

  const { error } = await client.from("categories").insert([payload]);
  if (error) throw error;
}

async function loadCategories() {
  categoryList.innerHTML = "<p>Loading categories...</p>";

  try {
    const { data, error } = await client
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;
    renderCategories(data || []);
  } catch (error) {
    categoryList.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

function renderCategories(categories) {
  if (!categories.length) {
    categoryList.innerHTML = "<p>No categories yet.</p>";
    return;
  }

  categoryList.innerHTML = categories.map((category) => `
    <article class="admin-product">
      <img src="${escapeAttribute(category.image_url || "")}" alt="">
      <div>
        <h3>${escapeHtml(category.title || "Untitled Category")}</h3>
        <p>${escapeHtml(category.description || "")}</p>
        <p>${escapeHtml(category.link || "")}</p>
        <span class="status-pill">${escapeHtml(category.status || "draft")}</span>
      </div>
      <div class="admin-product-actions">
        <button type="button" data-action="edit" data-id="${escapeAttribute(category.id)}">Edit</button>
        <button type="button" data-action="delete" data-id="${escapeAttribute(category.id)}">Delete</button>
      </div>
    </article>
  `).join("");

  categoryList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const category = categories.find((item) => item.id === button.dataset.id);

      if (button.dataset.action === "edit") editCategory(category);
      if (button.dataset.action === "delete") deleteCategory(category);
    });
  });
}

function editCategory(category) {
  if (!category) return;

  categoryForm.id.value = category.id || "";
  categoryForm.current_image_url.value = category.image_url || "";
  categoryForm.title.value = category.title || "";
  categoryForm.description.value = category.description || "";
  categoryForm.link.value = category.link || "";
  categoryForm.sort_order.value = category.sort_order || 0;
  categoryForm.status.value = category.status || "published";
  categorySubmitButton.textContent = "Update Category";
  cancelCategoryEditButton.hidden = false;
  categoryStatus.textContent = "Editing category.";
}

async function deleteCategory(category) {
  if (!category) return;

  const confirmed = window.confirm(`Delete ${category.title || "this category"}?`);
  if (!confirmed) return;

  const { error } = await client.from("categories").delete().eq("id", category.id);

  if (error) {
    categoryStatus.textContent = error.message || "Failed to delete category.";
    return;
  }

  categoryStatus.textContent = "Category deleted.";
  await loadCategories();
}

function resetCategoryForm() {
  categoryForm.reset();
  categoryForm.id.value = "";
  categoryForm.current_image_url.value = "";
  categorySubmitButton.textContent = "Add Category";
  cancelCategoryEditButton.hidden = true;
}

async function resolveFactoryVideoUrl(formData) {
  const file = document.getElementById("factoryVideoFile").files[0];
  const currentVideoUrl = formData.get("current_video_url");

  if (!file) {
    if (currentVideoUrl) return currentVideoUrl;
    throw new Error("Please choose an MP4 video.");
  }

  return uploadFile(file, "factory-videos", "homepage");
}

async function saveFactoryVideo(formData, videoUrl) {
  const id = formData.get("id");
  const payload = {
    title: clean(formData.get("title")),
    description: clean(formData.get("description")),
    video_url: videoUrl,
    sort_order: Number(formData.get("sort_order") || 0),
    status: clean(formData.get("status")) || "published"
  };

  if (!payload.title) {
    throw new Error("Video title is required.");
  }

  if (id) {
    const { error } = await client.from("factory_media").update(payload).eq("id", id);
    if (error) throw error;
    return;
  }

  const { error } = await client.from("factory_media").insert([payload]);
  if (error) throw error;
}

async function loadFactoryVideos() {
  factoryVideoList.innerHTML = "<p>Loading videos...</p>";

  try {
    const { data, error } = await client
      .from("factory_media")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;
    renderFactoryVideos(data || []);
  } catch (error) {
    factoryVideoList.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

function renderFactoryVideos(videos) {
  if (!videos.length) {
    factoryVideoList.innerHTML = "<p>No factory videos yet.</p>";
    return;
  }

  factoryVideoList.innerHTML = videos.map((video) => `
    <article class="admin-product">
      <video class="admin-video-preview" src="${escapeAttribute(video.video_url || "")}" muted></video>
      <div>
        <h3>${escapeHtml(video.title || "Untitled Video")}</h3>
        <p>${escapeHtml(video.description || "")}</p>
        <span class="status-pill">${escapeHtml(video.status || "draft")}</span>
      </div>
      <div class="admin-product-actions">
        <button type="button" data-action="edit" data-id="${escapeAttribute(video.id)}">Edit</button>
        <button type="button" data-action="delete" data-id="${escapeAttribute(video.id)}">Delete</button>
      </div>
    </article>
  `).join("");

  factoryVideoList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const video = videos.find((item) => item.id === button.dataset.id);

      if (button.dataset.action === "edit") editFactoryVideo(video);
      if (button.dataset.action === "delete") deleteFactoryVideo(video);
    });
  });
}

function editFactoryVideo(video) {
  if (!video) return;

  factoryForm.id.value = video.id || "";
  factoryForm.current_video_url.value = video.video_url || "";
  factoryForm.title.value = video.title || "";
  factoryForm.description.value = video.description || "";
  factoryForm.sort_order.value = video.sort_order || 0;
  factoryForm.status.value = video.status || "published";
  factorySubmitButton.textContent = "Update Video";
  cancelFactoryEditButton.hidden = false;
  factoryStatus.textContent = "Editing video.";
}

async function deleteFactoryVideo(video) {
  if (!video) return;

  const confirmed = window.confirm(`Delete ${video.title || "this video"}?`);
  if (!confirmed) return;

  const { error } = await client.from("factory_media").delete().eq("id", video.id);

  if (error) {
    factoryStatus.textContent = error.message || "Failed to delete video.";
    return;
  }

  factoryStatus.textContent = "Video deleted.";
  await loadFactoryVideos();
}

function resetFactoryForm() {
  factoryForm.reset();
  factoryForm.id.value = "";
  factoryForm.current_video_url.value = "";
  factorySubmitButton.textContent = "Add Video";
  cancelFactoryEditButton.hidden = true;
}

async function loadInquiries() {
  inquiryList.innerHTML = "<p>Loading inquiries...</p>";

  try {
    const { data, error } = await client
      .from("inquiries")
      .select("id,name,email,whatsapp,product,message,status,created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    renderInquiries(data || []);
  } catch (error) {
    inquiryList.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

function renderInquiries(inquiries) {
  if (!inquiries.length) {
    inquiryList.innerHTML = "<p>No inquiries yet.</p>";
    return;
  }

  inquiryList.innerHTML = inquiries.map((inquiry) => `
    <article class="admin-inquiry" data-inquiry-id="${escapeAttribute(inquiry.id)}">
      <div>
        <h3>${escapeHtml(inquiry.name || "Unnamed Customer")}</h3>
        <select class="inquiry-status-select" data-action="status" data-id="${escapeAttribute(inquiry.id)}">
          ${renderStatusOptions(inquiry.status)}
        </select>
        <div class="inquiry-meta">
          <p><strong>Email:</strong> ${escapeHtml(inquiry.email || "-")}</p>
          <p><strong>WhatsApp:</strong> ${escapeHtml(inquiry.whatsapp || "-")}</p>
          <p><strong>Interested Product:</strong> ${escapeHtml(inquiry.product || "-")}</p>
          <p><strong>Submitted:</strong> ${escapeHtml(formatDate(inquiry.created_at))}</p>
        </div>
        <div class="inquiry-detail" hidden>
          <p class="inquiry-message">${escapeHtml(inquiry.message || "")}</p>
        </div>
      </div>
      <div class="inquiry-actions">
        <button type="button" data-action="view" data-id="${escapeAttribute(inquiry.id)}">View Details</button>
        <button type="button" data-action="delete" data-id="${escapeAttribute(inquiry.id)}">Delete</button>
      </div>
    </article>
  `).join("");

  inquiryList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const inquiry = inquiries.find((item) => item.id === button.dataset.id);

      if (button.dataset.action === "view") {
        toggleInquiryDetail(button);
      }

      if (button.dataset.action === "delete") {
        deleteInquiry(inquiry);
      }
    });
  });

  inquiryList.querySelectorAll(".inquiry-status-select").forEach((select) => {
    select.addEventListener("change", () => {
      updateInquiryStatus(select.dataset.id, select.value);
    });
  });
}

function renderStatusOptions(status) {
  const current = normalizeInquiryStatus(status);
  const statuses = ["new", "replied", "closed"];

  return statuses.map((item) => `
    <option value="${item}" ${item === current ? "selected" : ""}>${capitalize(item)}</option>
  `).join("");
}

function normalizeInquiryStatus(status) {
  const value = String(status || "new").toLowerCase();
  return ["new", "replied", "closed"].includes(value) ? value : "new";
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toggleInquiryDetail(button) {
  const card = button.closest(".admin-inquiry");
  const detail = card?.querySelector(".inquiry-detail");

  if (!detail) return;

  detail.hidden = !detail.hidden;
  button.textContent = detail.hidden ? "View Details" : "Hide Details";
}

async function updateInquiryStatus(id, status) {
  const { error } = await client
    .from("inquiries")
    .update({ status })
    .eq("id", id);

  if (error) {
    window.alert(error.message || "Failed to update inquiry status.");
    await loadInquiries();
  }
}

async function deleteInquiry(inquiry) {
  if (!inquiry) return;

  const confirmed = window.confirm(`Delete inquiry from ${inquiry.name || "this customer"}?`);

  if (!confirmed) return;

  const { error } = await client
    .from("inquiries")
    .delete()
    .eq("id", inquiry.id);

  if (error) {
    window.alert(error.message || "Failed to delete inquiry.");
    return;
  }

  await loadInquiries();
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString();
}

function resetForm() {
  form.reset();
  form.id.value = "";
  form.current_image_url.value = "";
  form.current_video_url.value = "";
  form.remove_product_video.value = "";
  productGalleryList.innerHTML = "";
  productVideoStatus.textContent = "";
  removeProductVideoButton.hidden = true;
  submitButton.textContent = "Add Product";
  cancelEditButton.hidden = true;
}

function setBusy(isBusy) {
  setButtonBusy(submitButton, isBusy);
}

function setButtonBusy(button, isBusy) {
  button.disabled = isBusy;
  button.classList.toggle("is-loading", isBusy);
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
loadCategories();
loadFactoryVideos();
loadInquiries();
