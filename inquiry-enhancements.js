document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("inquiryForm");

  if (!form) return;

  const config = window.XIQI_SUPABASE;
  const client = supabase.createClient(config.url, config.key);
  const button = form.querySelector('button[type="submit"]');
  const status = document.createElement("div");

  status.className = "form-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  button.insertAdjacentElement("afterend", status);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (button.disabled) return;

    setLoading(button, true);
    setStatus(status, "Sending your inquiry...", "");

    const data = {
      name: clean(form.name.value),
      email: clean(form.email.value),
      whatsapp: clean(form.whatsapp.value),
      product: clean(form.product.value),
      message: clean(form.message.value)
    };

    try {
      const { error } = await client.from("inquiries").insert([data]);

      if (error) throw error;

      form.reset();
      setStatus(status, "Inquiry submitted successfully. We will reply within 24 hours.", "success");
    } catch (error) {
      console.log(error);
      setStatus(status, "Submission failed. Please try again or contact us on WhatsApp.", "error");
    } finally {
      setLoading(button, false);
    }
  });
});

function setLoading(button, isLoading) {
  button.disabled = isLoading;
  button.classList.toggle("is-loading", isLoading);
  button.textContent = isLoading ? "Sending..." : "Send Inquiry";
}

function setStatus(status, message, type) {
  status.textContent = message;
  status.className = `form-status ${type}`.trim();
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}
