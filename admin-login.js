const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");
const loginButton = loginForm.querySelector('button[type="submit"]');
const config = window.XIQI_SUPABASE;
const client = supabase.createClient(config.url, config.key);

checkExistingSession();

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatus.textContent = "Signing in...";
  loginButton.disabled = true;
  loginButton.classList.add("is-loading");

  const formData = new FormData(loginForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  try {
    const { error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    window.location.href = "admin.html";
  } catch (error) {
    loginStatus.textContent = error.message || "Login failed.";
  } finally {
    loginButton.disabled = false;
    loginButton.classList.remove("is-loading");
  }
});

async function checkExistingSession() {
  const { data } = await client.auth.getSession();

  if (data.session) {
    window.location.href = "admin.html";
  }
}
