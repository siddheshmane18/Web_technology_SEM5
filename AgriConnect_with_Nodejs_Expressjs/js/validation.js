/* Reusable client-side validation helpers for the assignment. */
(() => {
  "use strict";

  function setFieldError(id, message) {
    const element = document.getElementById(id + "Error");
    if (element) element.textContent = message || "";
  }

  function clearFieldErrors(form) {
    if (!form) return;
    form.querySelectorAll(".field-error").forEach((element) => {
      element.textContent = "";
    });
    const message = form.querySelector(".form-message");
    if (message) {
      message.textContent = "";
      message.classList.remove("success");
    }
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidPhone(phone) {
    return /^[6-9]\d{9}$/.test(phone);
  }

  window.AgriValidation = { setFieldError, clearFieldErrors, isValidEmail, isValidPhone };
})();
