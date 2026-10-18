/* Shared storage helpers, demo data, navigation and common utilities. */
(() => {
  "use strict";

  const STORAGE_KEYS = {
    users: "agriUsers",
    currentUser: "agriCurrentUser",
    equipment: "agriEquipment",
    rentals: "agriRentalRequests"
  };

  function readArray(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error(`Could not read ${key}:`, error);
      return [];
    }
  }

  function writeArray(key, value) {
    if (!Array.isArray(value)) throw new TypeError("Only arrays can be saved here.");
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.currentUser);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error("Could not read current user:", error);
      return null;
    }
  }

  function showMessage(element, message, type = "error") {
    if (!element) return;
    element.textContent = message || "";
    element.classList.toggle("success", type === "success");
  }

  function escapeText(value) {
    return String(value ?? "");
  }

  function seedEquipment() {
    // Seed sample records only once; do not overwrite the user's saved data.
    if (localStorage.getItem(STORAGE_KEYS.equipment) !== null) return;
    const sample = [
      { id: "sample-1", name: "John Deere Tractor", category: "Tractor", location: "Pune", price: 1500, ownerId: "demo-owner-1", ownerName: "Rajesh Patil", description: "55 HP tractor suitable for ploughing, cultivation and transportation.", brand: "John Deere, 55 HP", condition: "Excellent", fuel: "Diesel", icon: "🚜", available: true, createdAt: new Date().toISOString() },
      { id: "sample-2", name: "Rotavator", category: "Cultivator", location: "Pimpri", price: 800, ownerId: "demo-owner-2", ownerName: "Amit Jadhav", description: "Rotavator suitable for soil preparation and cultivation.", brand: "6 feet", condition: "Good", fuel: "Tractor mounted", icon: "🌱", available: true, createdAt: new Date().toISOString() },
      { id: "sample-3", name: "Diesel Water Pump", category: "Irrigation", location: "Nashik", price: 500, ownerId: "demo-owner-3", ownerName: "Suresh Pawar", description: "Water pump for small and medium farm irrigation tasks.", brand: "5 HP", condition: "Good", fuel: "Diesel", icon: "💧", available: true, createdAt: new Date().toISOString() },
      { id: "sample-4", name: "Mini Harvester", category: "Harvester", location: "Satara", price: 2500, ownerId: "demo-owner-4", ownerName: "Mahesh Shinde", description: "Compact harvester for harvesting operations on small and medium farms.", brand: "35 HP", condition: "Excellent", fuel: "Diesel", icon: "🌾", available: true, createdAt: new Date().toISOString() },
      { id: "sample-5", name: "Power Sprayer", category: "Sprayer", location: "Kolhapur", price: 450, ownerId: "demo-owner-5", ownerName: "Ganesh More", description: "Power sprayer for crop protection and farm spraying tasks.", brand: "3 HP", condition: "Good", fuel: "Petrol", icon: "🧴", available: true, createdAt: new Date().toISOString() },
      { id: "sample-6", name: "Seed Drill", category: "Other Tools", location: "Ahmednagar", price: 900, ownerId: "demo-owner-6", ownerName: "Vijay Pawar", description: "Seed drill designed for uniform seed placement.", brand: "9 rows", condition: "Excellent", fuel: "Tractor mounted", icon: "🛠️", available: true, createdAt: new Date().toISOString() }
    ];
    writeArray(STORAGE_KEYS.equipment, sample);
  }

  function updateNavigation() {
    const user = getCurrentUser();
    const navButtons = document.getElementById("navButtons");
    if (!navButtons || !user) return;

    navButtons.replaceChildren();
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
    logout.className = "btn btn-primary";
    logout.type = "button";
    logout.textContent = "Logout";
    logout.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEYS.currentUser);
      window.location.href = "index.html";
    });
    navButtons.append(greeting, myEquipment, rentals, logout);
  }

  function setupMobileMenu() {
    const button = document.getElementById("menuToggle");
    const links = document.getElementById("navLinks");
    if (button && links) button.addEventListener("click", () => links.classList.toggle("open"));
  }

  document.addEventListener("DOMContentLoaded", () => {
    seedEquipment();
    updateNavigation();
    setupMobileMenu();
  });

  window.Agri = {
    STORAGE_KEYS,
    readArray,
    writeArray,
    getCurrentUser,
    showMessage,
    escapeText,
    seedEquipment
  };
})();
