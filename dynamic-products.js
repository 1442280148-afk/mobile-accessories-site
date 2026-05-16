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

    renderProductDetail(data);
  } catch (error) {
    console.log("Supabase product detail unavailable, using static detail.", error);
  }
}

async function fetchProducts() {
  const { data, error } = await client
    .from(config.productsTable)
    .select("*")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

function renderProductDetail(product) {
  const mainImage = document.querySelector(".detail-main-image img");
  const gallery = document.querySelector(".detail-gallery");
  const tag = document.querySelector(".detail-tag");
  const title = document.querySelector(".detail-right h1");
  const desc = document.querySelector(".detail-desc");

  if (mainImage && product.image_url) {
    mainImage.src = product.image_url;
  }

  if (gallery && product.image_url) {
    gallery.innerHTML = [product.image_url, product.image_url, product.image_url, product.image_url].map((image) => `
      <img src="${escapeAttribute(image)}" alt="">
    `).join("");
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
