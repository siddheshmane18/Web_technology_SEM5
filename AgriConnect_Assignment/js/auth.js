/* Registration and login demo using arrays + JSON in localStorage.
   This is for a classroom assignment only, not real authentication. */
(() => {
  "use strict";
  const A = () => window.Agri;
  const V = () => window.AgriValidation;

  document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("registerForm");
    const loginForm = document.getElementById("loginForm");
    if (registerForm) registerForm.addEventListener("submit", registerUser);
    if (loginForm) loginForm.addEventListener("submit", loginUser);
  });

  function registerUser(event) {
    event.preventDefault();
    const form = event.currentTarget;
    V().clearFieldErrors(form);
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const phone = document.getElementById("phone").value.trim();
    const location = document.getElementById("location").value.trim();
    const role = document.getElementById("role").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const terms = document.getElementById("terms").checked;
    const errors = {};

    if (name.length < 2) errors.name = "Enter your full name (at least 2 characters).";
    if (!V().isValidEmail(email)) errors.email = "Enter a valid email address.";
    if (!V().isValidPhone(phone)) errors.phone = "Enter a valid 10-digit Indian mobile number.";
    if (location.length < 2) errors.location = "Enter your location.";
    if (!["owner", "renter"].includes(role)) errors.role = "Select an account type.";
    if (password.length < 6) errors.password = "Password must contain at least 6 characters.";
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
    if (!terms) errors.terms = "Please confirm that your details are correct.";

    Object.entries(errors).forEach(([id, message]) => V().setFieldError(id, message));
    const messageElement = document.getElementById("registerMessage");
    if (Object.keys(errors).length) {
      A().showMessage(messageElement, "Please correct the errors above before saving.");
      return;
    }

    const users = A().readArray(A().STORAGE_KEYS.users);
    if (users.some((user) => user.email.toLowerCase() === email)) {
      V().setFieldError("email", "An account with this email already exists.");
      A().showMessage(messageElement, "Registration was not saved. Check the highlighted field.");
      return;
    }

    const user = {
      id: "user-" + Date.now() + "-" + Math.random().toString(16).slice(2, 7),
      name, email, phone, location, role,
      // Plaintext password is used only to demonstrate form/data handling in this local assignment.
      password,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    A().writeArray(A().STORAGE_KEYS.users, users);
    A().showMessage(messageElement, "Registration successful! Redirecting to login...", "success");
    form.reset();
    setTimeout(() => { window.location.href = "login.html"; }, 800);
  }

  function loginUser(event) {
    event.preventDefault();
    const form = event.currentTarget;
    V().clearFieldErrors(form);
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const errors = {};
    if (!V().isValidEmail(email)) errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Password is required.";
    Object.entries(errors).forEach(([id, message]) => V().setFieldError(id, message));
    const messageElement = document.getElementById("loginMessage");
    if (Object.keys(errors).length) {
      A().showMessage(messageElement, "Please correct the errors above.");
      return;
    }

    const users = A().readArray(A().STORAGE_KEYS.users);
    const user = users.find((item) => item.email.toLowerCase() === email && item.password === password);
    if (!user) {
      A().showMessage(messageElement, "Email or password is incorrect. Register first if you do not have an account.");
      return;
    }

    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role, location: user.location };
    localStorage.setItem(A().STORAGE_KEYS.currentUser, JSON.stringify(safeUser));
    A().showMessage(messageElement, "Login successful! Redirecting...", "success");
    setTimeout(() => { window.location.href = user.role === "owner" ? "my-equipment.html" : "equipment.html"; }, 600);
  }
})();
