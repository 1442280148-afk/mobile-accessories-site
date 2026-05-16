document.addEventListener("DOMContentLoaded", () => {
  loadProductGrid();
  loadProductDetail();
});

const config = window.XIQI_SUPABASE;
const client = supabase.createClient(config.url, config.key);

async function loadProductGrid() {
  const grid = document.querySelector(".product-grid");

  if (!grid) return;

  try {
    const products = await fetchProducts();

    if (!products.length) return;

    grid.innerHTML = products.map((product) => `
      <div class="product-card">
        <img src="${escapeAttribute(product.image_url || "")}" alt="">
        <div class="product-info">
          <h3>${escapeHtml(product.name || "XiQi Product")}</h3>
          <a href="product-detail.html?id=${encodeURIComponent(product.id)}">View Details</a>
        </div>
      </div>
    `).join("");
  } catch (error) {
    console.log("Product API unavailable, using static products.", error);
  }
}

async function loadProductDetail() {
  const detailPage = document.querySelector(".detail-page");

  if (!detailPage) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) return;

  try {
    const { data, error } = await client
      .from(config.productsTable)
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    const galleryImages = await fetchProductImages(id);
    renderProductDetail(data, galleryImages);
  } catch (error) {
    console.log("Supabase product detail unavailable, using static detail.", error);
  }
}

async function fetchProductImages(productId) {
  const { data, error } = await client
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data || [];
}

async function fetchProducts() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get("category");
  const { data, error } = await client
    .from(config.productsTable)
    .select("*")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;

  if (!category) {
    return data || [];
  }

  return (data || []).filter((product) => {
    return normalizeCategory(product.category) === normalizeCategory(category);
  });
}

function renderProductDetail(product, galleryImages = []) {
  const mainImage = document.querySelector(".detail-main-image img");
  const gallery = document.querySelector(".detail-gallery");
  const tag = document.querySelector(".detail-tag");
  const title = document.querySelector(".detail-right h1");
  const desc = document.querySelector(".detail-desc");
  const features = document.querySelector(".detail-features");
  const info = document.querySelector(".detail-info");
  const videoSection = document.querySelector(".product-video-section");
  const productVideo = document.getElementById("productVideo");
  const ogTitle = `${product.name || "Product Details"} | Guangzhou XiQi Technology`;
  const ogDescription = product.short_desc || product.description || "XiQi OEM and wholesale mobile accessories product details.";
  const images = buildGalleryImages(product, galleryImages);

  if (mainImage && images.length) {
    mainImage.src = images[0];
    updateMeta("property", "og:image", images[0]);
  }

  if (gallery && images.length) {
    gallery.innerHTML = images.map((image) => `
      <img src="${escapeAttribute(image)}" alt="">
    `).join("");
    setupGalleryControls(images);
  }

  if (tag) {
    tag.textContent = product.category || "MOBILE ACCESSORIES";
  }

  if (title) {
    title.textContent = product.name || "XiQi Product";
  }

  if (desc) {
    desc.textContent = product.description || product.short_desc || "OEM / ODM mobile accessories product from Guangzhou XiQi Technology.";
  }

  if (features) {
    const items = parseFeatures(product.features);

    if (items.length) {
      features.innerHTML = items.map((item) => `
        <div class="feature-item">${escapeHtml(item)}</div>
      `).join("");
    }
  }

  if (info) {
    const rows = [
      ["Price", product.price],
      ["MOQ", product.moq],
      ["Material", product.material],
      ["Packaging", product.packaging],
      ["Lead Time", product.lead_time]
    ].filter((row) => row[1]);

    if (rows.length) {
      info.innerHTML = rows.map(([label, value]) => `
        <div class="info-row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join("");
    }
  }

  if (videoSection && productVideo && product.product_video) {
    productVideo.src = product.product_video;
    videoSection.hidden = false;
    productVideo.load();
    productVideo.play().catch(() => {});
  }

  document.title = ogTitle;
  updateMeta("name", "description", ogDescription);
  updateMeta("property", "og:title", ogTitle);
  updateMeta("property", "og:description", ogDescription);
}

function buildGalleryImages(product, galleryImages) {
  const images = [product.image_url]
    .concat(galleryImages.map((image) => image.image_url))
    .filter(Boolean);

  return [...new Set(images)];
}

function setupGalleryControls(images) {
  const mainImage = document.querySelector(".detail-main-image img");
  const gallery = document.querySelector(".detail-gallery");

  if (!mainImage || !gallery) return;

  let activeIndex = 0;
  let touchStartX = 0;

  gallery.querySelectorAll("img").forEach((image, index) => {
    image.addEventListener("click", () => showGalleryImage(index));
  });

  mainImage.addEventListener("touchstart", (event) => {
    touchStartX = event.touches[0].clientX;
  }, { passive: true });

  mainImage.addEventListener("touchend", (event) => {
    const diff = event.changedTouches[0].clientX - touchStartX;

    if (Math.abs(diff) < 40) return;

    if (diff < 0) showGalleryImage(activeIndex + 1);
    if (diff > 0) showGalleryImage(activeIndex - 1);
  }, { passive: true });

  function showGalleryImage(index) {
    activeIndex = (index + images.length) % images.length;
    mainImage.classList.remove("is-swapping");
    void mainImage.offsetWidth;
    mainImage.src = images[activeIndex];
    mainImage.classList.add("is-swapping");
  }
}

function parseFeatures(value) {
  if (!value) return [];

  return String(value)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function updateMeta(attribute, key, content) {
  let meta = document.querySelector(`meta[${attribute}="${key}"]`);

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", content);
}

function normalizeCategory(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/s\b/g, "");
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
