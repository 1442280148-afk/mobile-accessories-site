document.addEventListener("DOMContentLoaded", () => {
  protectAdminPage();
});

async function protectAdminPage() {
  const config = window.XIQI_SUPABASE;
  const client = supabase.createClient(config.url, config.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  const {
    data: { session },
    error
  } = await client.auth.getSession();

  if (error || !session) {
    window.location.href = "admin-login.html";
    return;
  }

  await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token
  });

  const role = getJwtRole(session.access_token);
  console.log("Supabase admin session:", session.user?.email || "unknown", role);

  window.XIQI_ADMIN_CLIENT = client;
  window.XIQI_ADMIN_SESSION = session;
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

function getJwtRole(accessToken) {
  try {
    const payload = JSON.parse(atob(accessToken.split(".")[1]));
    return payload.role || "unknown";
  } catch {
    return "unknown";
  }
}
