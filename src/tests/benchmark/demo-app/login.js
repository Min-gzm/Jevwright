const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "password123";

const form = document.getElementById("login-form");
const email = document.getElementById("email");
const password = document.getElementById("password");
const error = document.getElementById("login-error");
const togglePassword = document.getElementById("toggle-password");

togglePassword.addEventListener("click", () => {
  const show = password.type === "password";
  password.type = show ? "text" : "password";
  togglePassword.setAttribute("aria-label", show ? "Hide password" : "Show password");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (email.value.trim() === DEMO_EMAIL && password.value === DEMO_PASSWORD) {
    window.location.href = "board.html";
    return;
  }
  error.hidden = false;
  email.setAttribute("aria-invalid", "true");
  password.setAttribute("aria-invalid", "true");
});
