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
      .select("id,title,image_url,description,link,status,sort_order")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) throw error;
    if (!data || !data.length) return;

    grid.innerHTML = data.map((product) => `
      <div class="category-card">
        <img src="${escapeAttribute(product.image_url || "")}" alt="${escapeAttribute(product.title || "XiQi Category")}">
        <div class="category-info">
          <h3>${escapeHtml(product.title || "XiQi Category")}</h3>
          <p>${escapeHtml(product.description || "")}</p>
          <a href="${escapeAttribute(product.link || "product.html")}" class="product-link">
            View Details
          </a>
        </div>
      </div>
    `).join("");
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
