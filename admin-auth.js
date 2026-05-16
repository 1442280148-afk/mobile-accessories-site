document.addEventListener("DOMContentLoaded", () => {
  protectAdminPage();
});

async function protectAdminPage() {
  const config = window.XIQI_SUPABASE;
  const client = supabase.createClient(config.url, config.key);
  const { data } = await client.auth.getSession();

  if (!data.session) {
    window.location.href = "admin-login.html";
    return;
  }

  document.body.classList.add("admin-authenticated");
  loadAdminScript();

  const logoutButton = document.getElementById("logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      await client.auth.signOut();
      window.location.href = "admin-login.html";
    });
  }
}

function loadAdminScript() {
  const script = document.createElement("script");
  script.src = "admin.js";
  document.body.appendChild(script);
}
