document.addEventListener("DOMContentLoaded", () => {
  loadHomeCategories();
  loadFactoryVideo();
});

async function loadHomeCategories() {
  const grid = document.querySelector("#products .category-grid");

  if (!grid) return;

  try {
    const config = window.XIQI_SUPABASE;
    const client = supabase.createClient(config.url, config.key);
    const { data, error } = await client
      .from("categories")
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) throw error;

    grid.innerHTML = (data || []).map((category) => {
      const name = category.name || "XiQi Category";
      const slug = category.slug || slugify(name);
      const link = category.link || `product.html?category=${encodeURIComponent(slug)}`;

      return `
      <div class="category-card">
        <img src="${escapeAttribute(category.image_url || "logo.png")}" alt="${escapeAttribute(name)}">
        <div class="category-info">
          <h3>${escapeHtml(name)}</h3>
          <p>${escapeHtml(category.description || "")}</p>
          <a href="${escapeAttribute(link)}" class="product-link">
            View Details
          </a>
        </div>
      </div>
    `;
    }).join("");
  } catch (error) {
    console.log("Home categories unavailable, using static cards.", error);
  }
}

async function loadFactoryVideo() {
  const video = document.querySelector(".about-left video");

  if (!video) return;

  try {
    const config = window.XIQI_SUPABASE;
    const client = supabase.createClient(config.url, config.key);
    const { data, error } = await client
      .from("factory_media")
      .select("title,description,video_url,status,sort_order")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data || !data.video_url) return;

    const source = video.querySelector("source");

    if (source) {
      source.src = data.video_url;
      source.type = "video/mp4";
    } else {
      video.src = data.video_url;
    }

    video.load();
    video.play().catch(() => {});
  } catch (error) {
    console.log("Factory video unavailable, using static video.", error);
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

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
