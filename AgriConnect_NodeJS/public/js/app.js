"use strict";

const $ = (selector) => document.querySelector(selector);

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = { success: false, message: "The server returned an unreadable response." };
  }

  if (!response.ok || payload.success === false) {
    const error = new Error(payload.message || "Request failed.");
    error.status = response.status;
    error.errors = payload.errors || [];
    throw error;
  }
  return payload;
}

function showMessage(element, message, type = "success", errors = []) {
  if (!element) return;
  element.className = `message ${type}`;
  element.replaceChildren();
  const heading = document.createElement("div");
  heading.textContent = message;
  element.appendChild(heading);
  if (errors.length) {
    const list = document.createElement("ul");
    errors.forEach(text => {
      const li = document.createElement("li");
      li.textContent = text;
      list.appendChild(li);
    });
    element.appendChild(list);
  }
}

function formDataObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function updateNavigation() {
  try {
    const result = await api("/api/me");
    const user = result.user;
    document.querySelectorAll("[data-guest-link]").forEach(el => el.hidden = Boolean(user));
    document.querySelectorAll("[data-user-link]").forEach(el => el.hidden = !user);
    document.querySelectorAll("[data-owner-link]").forEach(el => el.hidden = !(user && user.role === "owner"));
    document.querySelectorAll("[data-farmer-link]").forEach(el => el.hidden = !(user && user.role === "farmer"));
    document.querySelectorAll("#logoutButton").forEach(el => el.hidden = !user);
    document.querySelectorAll("[data-user-name]").forEach(el => el.textContent = user ? user.name : "");
  } catch (error) {
    console.warn("Could not retrieve current user:", error.message);
  }
}

async function setupRegister() {
  const form = $("#registerForm");
  if (!form) return;
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const message = $("#formMessage");
    try {
      const result = await api("/api/register", { method: "POST", body: JSON.stringify(formDataObject(form)) });
      showMessage(message, result.message, "success");
      form.reset();
    } catch (error) {
      showMessage(message, error.message, "error", error.errors);
    }
  });
}

async function setupLogin() {
  const form = $("#loginForm");
  if (!form) return;
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const message = $("#formMessage");
    try {
      const result = await api("/api/login", { method: "POST", body: JSON.stringify(formDataObject(form)) });
      showMessage(message, result.message, "success");
      setTimeout(() => window.location.href = result.user.role === "owner" ? "/my-equipment.html" : "/equipment.html", 700);
    } catch (error) {
      showMessage(message, error.message, "error", error.errors);
    }
  });
}

async function setupLogout() {
  document.querySelectorAll("#logoutButton").forEach(button => {
    button.addEventListener("click", async () => {
      try { await api("/api/logout", { method: "POST", body: "{}" }); }
      finally { window.location.href = "/"; }
    });
  });
}

function equipmentCard(item, options = {}) {
  const card = document.createElement("article");
  card.className = "equipment-card";
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = item.category;
  const title = document.createElement("h3");
  title.textContent = item.name;
  const location = document.createElement("p");
  location.textContent = `📍 ${item.location}`;
  const condition = document.createElement("p");
  condition.textContent = `Condition: ${item.condition}`;
  const description = document.createElement("p");
  description.textContent = item.description;
  const price = document.createElement("div");
  price.className = "equipment-price";
  price.textContent = `₹${Number(item.price).toLocaleString("en-IN")} / day`;
  card.append(tag, title, location, condition, description, price);

  if (options.owner) {
    const actions = document.createElement("div");
    actions.className = "inline-actions";
    const edit = document.createElement("button");
    edit.className = "button light";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => editEquipment(item));
    const del = document.createElement("button");
    del.className = "button danger";
    del.textContent = "Delete";
    del.addEventListener("click", () => deleteEquipment(item.id));
    actions.append(edit, del);
    card.append(actions);
  } else {
    const rent = document.createElement("button");
    rent.className = "button";
    rent.textContent = "Request rental";
    rent.addEventListener("click", () => requestRental(item));
    card.append(rent);
  }
  return card;
}

async function setupEquipmentList() {
  const grid = $("#equipmentGrid");
  if (!grid) return;
  const load = async () => {
    grid.replaceChildren();
    const query = new URLSearchParams({
      q: $("#searchQuery").value,
      category: $("#categoryFilter").value,
      sort: $("#sortFilter").value
    });
    try {
      const result = await api(`/api/equipment?${query.toString()}`);
      if (!result.equipment.length) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "No equipment found. Try another search or check back later.";
        grid.append(empty);
      } else {
        result.equipment.forEach(item => grid.append(equipmentCard(item)));
      }
    } catch (error) {
      showMessage($("#pageMessage"), error.message, "error", error.errors);
    }
  };
  $("#searchForm").addEventListener("submit", event => { event.preventDefault(); load(); });
  $("#categoryFilter").addEventListener("change", load);
  $("#sortFilter").addEventListener("change", load);
  await load();
}

async function setupAddEquipment() {
  const form = $("#equipmentForm");
  if (!form) return;
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const message = $("#formMessage");
    try {
      const result = await api("/api/equipment", { method: "POST", body: JSON.stringify(formDataObject(form)) });
      showMessage(message, result.message, "success");
      form.reset();
    } catch (error) {
      showMessage(message, error.message, "error", error.errors);
    }
  });
}

async function setupMyEquipment() {
  const grid = $("#myEquipmentGrid");
  if (!grid) return;
  try {
    const result = await api("/api/my-equipment");
    if (!result.equipment.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "You have not added any equipment yet.";
      grid.append(empty);
      return;
    }
    result.equipment.forEach(item => grid.append(equipmentCard(item, { owner: true })));
  } catch (error) {
    showMessage($("#pageMessage"), error.message, "error", error.errors);
  }
}

async function editEquipment(item) {
  const name = prompt("Equipment name:", item.name);
  if (name === null) return;
  const priceInput = prompt("Daily rental price (₹):", String(item.price));
  if (priceInput === null) return;
  const location = prompt("Location:", item.location);
  if (location === null) return;
  const description = prompt("Description (at least 10 characters):", item.description);
  if (description === null) return;
  const body = { ...item, name, price: priceInput, location, description };
  delete body.id; delete body.ownerId; delete body.ownerName; delete body.status; delete body.createdAt;
  try {
    const result = await api(`/api/equipment/${item.id}`, { method: "PUT", body: JSON.stringify(body) });
    showMessage($("#pageMessage"), result.message, "success");
    setTimeout(() => window.location.reload(), 500);
  } catch (error) {
    showMessage($("#pageMessage"), error.message, "error", error.errors);
  }
}

async function deleteEquipment(id) {
  if (!confirm("Delete this equipment listing?")) return;
  try {
    const result = await api(`/api/equipment/${id}`, { method: "DELETE" });
    showMessage($("#pageMessage"), result.message, "success");
    setTimeout(() => window.location.reload(), 350);
  } catch (error) {
    showMessage($("#pageMessage"), error.message, "error", error.errors);
  }
}

async function requestRental(item) {
  const startDate = prompt("Rental start date (YYYY-MM-DD):", new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10));
  if (startDate === null) return;
  const days = prompt("Number of rental days (1–90):", "1");
  if (days === null) return;
  try {
    const result = await api("/api/rentals", {
      method: "POST",
      body: JSON.stringify({ equipmentId: item.id, startDate, days })
    });
    alert(`${result.message}\nEstimated total: ₹${Number(result.rental.totalPrice).toLocaleString("en-IN")}`);
  } catch (error) {
    alert([error.message, ...(error.errors || [])].join("\n"));
  }
}

function rentalCard(rental, ownerMode = false) {
  const card = document.createElement("article");
  card.className = "rental-card";
  const info = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = rental.equipmentName;
  const detail = document.createElement("p");
  detail.textContent = ownerMode
    ? `Requested by ${rental.renterName} · ${rental.days} day(s) from ${rental.startDate}`
    : `${rental.days} day(s) from ${rental.startDate}`;
  const total = document.createElement("p");
  total.textContent = `Total: ₹${Number(rental.totalPrice).toLocaleString("en-IN")}`;
  const status = document.createElement("span");
  status.className = "tag";
  status.textContent = `Status: ${rental.status}`;
  info.append(title, detail, total, status);
  card.append(info);

  if (ownerMode && rental.status === "pending") {
    const actions = document.createElement("div");
    actions.className = "inline-actions";
    for (const statusValue of ["accepted", "rejected"]) {
      const button = document.createElement("button");
      button.className = `button ${statusValue === "rejected" ? "danger" : ""}`;
      button.textContent = statusValue === "accepted" ? "Accept" : "Reject";
      button.addEventListener("click", async () => {
        try {
          const result = await api(`/api/rentals/${rental.id}`, { method: "PATCH", body: JSON.stringify({ status: statusValue }) });
          showMessage($("#pageMessage"), result.message, "success");
          setTimeout(() => window.location.reload(), 400);
        } catch (error) {
          showMessage($("#pageMessage"), error.message, "error", error.errors);
        }
      });
      actions.append(button);
    }
    card.append(actions);
  }
  return card;
}

async function setupRentals() {
  const list = $("#rentalsList");
  if (list) {
    try {
      const result = await api("/api/my-rentals");
      if (!result.rentals.length) {
        const empty = document.createElement("div"); empty.className = "empty"; empty.textContent = "You have not made any rental requests yet."; list.append(empty);
      } else result.rentals.forEach(r => list.append(rentalCard(r)));
    } catch (error) { showMessage($("#pageMessage"), error.message, "error", error.errors); }
  }

  const ownerList = $("#ownerRequestsList");
  if (ownerList) {
    try {
      const result = await api("/api/owner-rentals");
      if (!result.rentals.length) {
        const empty = document.createElement("div"); empty.className = "empty"; empty.textContent = "There are no rental requests for your equipment yet."; ownerList.append(empty);
      } else result.rentals.forEach(r => ownerList.append(rentalCard(r, true)));
    } catch (error) { showMessage($("#pageMessage"), error.message, "error", error.errors); }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await updateNavigation();
  await setupRegister();
  await setupLogin();
  await setupLogout();
  await setupEquipmentList();
  await setupAddEquipment();
  await setupMyEquipment();
  await setupRentals();
});
