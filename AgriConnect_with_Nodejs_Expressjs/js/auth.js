/* Uses Express authentication APIs; existing form markup remains unchanged. */
(() => {
  "use strict";
  const A = () => window.Agri;
  const V = () => window.AgriValidation;

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("registerForm")?.addEventListener("submit", registerUser);
    document.getElementById("loginForm")?.addEventListener("submit", loginUser);
  });

  function showErrors(errors) {
    Object.entries(errors || {}).forEach(([field, message]) => V().setFieldError(field, message));
  }

  async function registerUser(event) {
    event.preventDefault();
    const form = event.currentTarget;
    V().clearFieldErrors(form);
    const values = {
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim().toLowerCase(),
      phone: document.getElementById("phone").value.trim(),
      location: document.getElementById("location").value.trim(),
      role: document.getElementById("role").value,
      password: document.getElementById("password").value,
      confirmPassword: document.getElementById("confirm-password").value
    };
    const localErrors = {};
    if (values.password.length < 8) localErrors.password = "Password must contain at least 8 characters.";
    if (values.password !== values.confirmPassword) localErrors.confirmPassword = "Passwords do not match.";
    if (!document.getElementById("terms").checked) localErrors.terms = "Please confirm your details.";
    showErrors(localErrors);
    const message = document.getElementById("registerMessage");
    if (Object.keys(localErrors).length) {
      A().showMessage(message, "Please correct the errors above.");
      return;
    }
    try {
      await A().api("/api/auth/register", { method: "POST", body: JSON.stringify(values) });
      A().showMessage(message, "Registration successful! Redirecting to login...", "success");
      form.reset();
      setTimeout(() => location.href = "login.html", 800);
    } catch (error) {
      showErrors(error.fields);
      A().showMessage(message, error.message);
    }
  }

  async function loginUser(event) {
    event.preventDefault();
    const form = event.currentTarget;
    V().clearFieldErrors(form);
    const message = document.getElementById("loginMessage");
    const values = {
      email: document.getElementById("email").value.trim().toLowerCase(),
      password: document.getElementById("password").value
    };
    try {
      const result = await A().api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(values)
      });
      A().setCurrentUser(result.user);
      A().showMessage(message, "Login successful! Redirecting...", "success");
      setTimeout(() => {
        location.href = result.user.role === "owner" ? "my-equipment.html" : "equipment.html";
      }, 600);
    } catch (error) {
      showErrors(error.fields);
      A().showMessage(message, error.message);
    }
  }
})();