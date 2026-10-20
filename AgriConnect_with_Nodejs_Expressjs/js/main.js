/* Shared helpers. Existing HTML and CSS are kept unchanged. */
(() => {
  "use strict";
  const STORAGE_KEYS = {
    currentUser: "agriCurrentUser",
    users: "agriUsers",
    equipment: "agriEquipment",
    rentals: "agriRentalRequests"
  };

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || "Request failed.");
      error.status = response.status;
      error.fields = data.errors || {};
      throw error;
    }
    return data;
  }

  function getCurrentUser() {
    try {
      const value = localStorage.getItem(STORAGE_KEYS.currentUser);
      return value ? JSON.parse(value) : null;
    } catch { return null; }
  }

  function setCurrentUser(user) {
    if (user) localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEYS.currentUser);
  }

  function showMessage(element, message, type = "error") {
    if (!element) return;
    element.textContent = message || "";
    element.classList.toggle("success", type === "success");
  }

  function readArray(key) {
    try {
      const raw = localStorage.getItem(key);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  }

  function writeArray(key, value) {
    if (!Array.isArray(value)) throw new TypeError("Expected an array.");
    localStorage.setItem(key, JSON.stringify(value));
  }

  function updateNavigation() {
    const nav = document.getElementById("navButtons");
    if (!nav) return;
    nav.replaceChildren();
    api("/api/auth/me").then(({ user }) => {
      setCurrentUser(user);
      if (!user) {
        const login = document.createElement("a");
        login.className = "btn btn-outline";
        login.href = "login.html";
        login.textContent = "Login";
        const register = document.createElement("a");
        register.className = "btn btn-primary";
        register.href = "register.html";
        register.textContent = "Register";
        nav.append(login, register);
        return;
      }
      const greeting = document.createElement("span");
      greeting.className = "small muted";
      greeting.textContent = `Hi, ${user.name}`;
      const myEquipment = document.createElement("a");
      myEquipment.className = "btn btn-outline";
      myEquipment.href = "my-equipment.html";
      myEquipment.textContent = user.role === "owner" ? "My Equipment" : "My Account";
      const rentals = document.createElement("a");
      rentals.className = "btn btn-outline";
      rentals.href = "my-rentals.html";
      rentals.textContent = "My Rentals";
      const logout = document.createElement("button");
      logout.type = "button";
      logout.className = "btn btn-primary";
      logout.textContent = "Logout";
      logout.addEventListener("click", async () => {
        try { await api("/api/auth/logout", { method: "POST" }); } catch {}
        setCurrentUser(null);
        location.href = "index.html";
      });
      nav.append(greeting, myEquipment, rentals, logout);
    }).catch(() => {});
  }

  document.addEventListener("DOMContentLoaded", () => {
    updateNavigation();
    const button = document.getElementById("menuToggle");
    const links = document.getElementById("navLinks");
    if (button && links) button.addEventListener("click", () => links.classList.toggle("open"));
  });

  window.Agri = { STORAGE_KEYS, api, getCurrentUser, setCurrentUser, showMessage, readArray, writeArray };
})();