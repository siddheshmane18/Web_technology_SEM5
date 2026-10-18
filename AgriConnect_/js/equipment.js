/* Equipment listing, search/filter/sort and equipment CRUD. */
(() => {
  "use strict";
  const A = () => window.Agri;
  const money = (value) => "₹" + Number(value).toLocaleString("en-IN");

  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("equipmentContainer")) initListing();
    if (document.getElementById("detailsContainer")) initDetails();
    if (document.getElementById("equipmentForm")) initEquipmentForm();
    if (document.getElementById("myEquipmentContainer")) renderMyEquipment();
  });

  function getEquipment() { return A().readArray(A().STORAGE_KEYS.equipment); }

  function initListing() {
    const search = document.getElementById("search");
    const category = document.getElementById("category");
    const location = document.getElementById("location");
    const sort = document.getElementById("sortEquipment");
    const reset = document.getElementById("resetFilters");
    [search, category, location, sort].forEach((element) => {
      if (element) element.addEventListener(element === sort ? "change" : "input", renderListing);
    });
    if (reset) reset.addEventListener("click", () => {
      search.value = ""; category.value = ""; location.value = ""; sort.value = "recommended";
      renderListing();
    });
    const params = new URLSearchParams(window.location.search);
    if (params.has("category")) category.value = params.get("category");
    renderListing();
  }

  function renderListing() {
    const container = document.getElementById("equipmentContainer");
    if (!container) return;
    const query = (document.getElementById("search")?.value || "").trim().toLowerCase();
    const category = document.getElementById("category")?.value || "";
    const location = (document.getElementById("location")?.value || "").trim().toLowerCase();
    const sort = document.getElementById("sortEquipment")?.value || "recommended";
    let list = getEquipment().filter((item) => {
      const searchText = [item.name, item.category, item.location, item.ownerName, item.description].join(" ").toLowerCase();
      return searchText.includes(query) && (!category || item.category === category) && item.location.toLowerCase().includes(location) && item.available !== false;
    });
    if (sort === "low") list.sort((a, b) => a.price - b.price);
    if (sort === "high") list.sort((a, b) => b.price - a.price);
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    container.replaceChildren();
    document.getElementById("equipmentCount").textContent = `${list.length} item${list.length === 1 ? "" : "s"} found`;
    if (!list.length) {
      container.append(makeEmptyState("🔎", "No equipment found", "Try a different search term or reset the filters."));
      return;
    }
    list.forEach((item) => container.append(createEquipmentCard(item, false)));
  }

  function createEquipmentCard(item, showManagement) {
    const card = document.createElement("article");
    card.className = "equipment-card";
    const visual = document.createElement("div");
    visual.className = "equipment-visual";
    const icon = document.createElement("span");
    icon.textContent = item.icon || "🚜";
    const status = document.createElement("span");
    status.className = "status-badge" + (item.available === false ? " unavailable" : "");
    status.textContent = item.available === false ? "Unavailable" : "Available";
    visual.append(icon, status);
    const info = document.createElement("div");
    info.className = "equipment-info";
    const title = document.createElement("h3"); title.textContent = item.name;
    const place = document.createElement("p"); place.textContent = `📍 ${item.location}`;
    const owner = document.createElement("p"); owner.textContent = `Owner: ${item.ownerName || "AgriConnect farmer"}`;
    const description = document.createElement("p"); description.textContent = item.description;
    const meta = document.createElement("div"); meta.className = "equipment-meta";
    const price = document.createElement("span"); price.className = "price"; price.textContent = money(item.price);
    const perDay = document.createElement("small"); perDay.textContent = " / day"; price.append(perDay);
    const view = document.createElement("a"); view.className = "btn btn-primary"; view.href = `equipment-details.html?id=${encodeURIComponent(item.id)}`; view.textContent = "View details";
    meta.append(price, view);
    info.append(title, place, owner, description, meta);
    if (showManagement) {
      const actions = document.createElement("div"); actions.className = "card-actions";
      const edit = document.createElement("a"); edit.className = "btn btn-outline"; edit.href = `add-equipment.html?id=${encodeURIComponent(item.id)}`; edit.textContent = "Edit";
      const remove = document.createElement("button"); remove.className = "btn btn-danger"; remove.type = "button"; remove.textContent = "Delete";
      remove.addEventListener("click", () => deleteEquipment(item.id));
      actions.append(edit, remove);
      info.append(actions);
    }
    card.append(visual, info);
    return card;
  }

  function makeEmptyState(icon, title, description) {
    const box = document.createElement("div"); box.className = "empty-state";
    const visual = document.createElement("div"); visual.className = "empty-icon"; visual.textContent = icon;
    const heading = document.createElement("h3"); heading.textContent = title;
    const text = document.createElement("p"); text.textContent = description;
    box.append(visual, heading, text);
    return box;
  }

  function initDetails() {
    const id = new URLSearchParams(window.location.search).get("id");
    const item = getEquipment().find((entry) => entry.id === id);
    const message = document.getElementById("detailsMessage");
    if (!item) {
      A().showMessage(message, "Equipment not found. Return to the equipment page and choose a valid listing.");
      document.getElementById("detailsContainer").hidden = true;
      return;
    }
    const setText = (elementId, value) => { const element = document.getElementById(elementId); if (element) element.textContent = value ?? "—"; };
    setText("equipmentIcon", item.icon || "🚜");
    setText("equipmentName", item.name);
    setText("equipmentLocation", `📍 ${item.location}`);
    setText("equipmentPrice", money(item.price));
    setText("equipmentDescription", item.description);
    setText("equipmentCategory", item.category);
    setText("equipmentPower", item.brand || "Not specified");
    setText("equipmentCondition", item.condition || "Not specified");
    setText("equipmentFuel", item.fuel || "Not specified");
    setText("equipmentOwner", item.ownerName || "AgriConnect farmer");
    setText("equipmentStatus", item.available === false ? "Unavailable" : "Available");
    const status = document.getElementById("equipmentStatus");
    if (item.available === false) status.classList.add("unavailable");
    const form = document.getElementById("rentalForm");
    if (item.available === false) {
      form.querySelector("button[type=submit]").disabled = true;
      A().showMessage(document.getElementById("rentalMessage"), "This equipment is currently unavailable.");
    }
    window.currentEquipment = item;
  }

  function initEquipmentForm() {
    const form = document.getElementById("equipmentForm");
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("id");
    const user = A().getCurrentUser();
    const message = document.getElementById("equipmentFormMessage");
    if (!user) {
      A().showMessage(message, "Please login before listing equipment.");
      form.querySelectorAll("input,select,textarea,button").forEach((el) => { if (el.type !== "hidden") el.disabled = true; });
      const link = document.createElement("a"); link.className = "btn btn-primary"; link.href = "login.html"; link.textContent = "Login";
      form.append(link);
      return;
    }
    if (user.role !== "owner") {
      A().showMessage(message, "Only an Equipment Owner account can create or edit listings. Register as an owner to use this feature.");
      form.querySelectorAll("input,select,textarea,button").forEach((el) => { if (el.type !== "hidden") el.disabled = true; });
      return;
    }
    if (editId) {
      const item = getEquipment().find((entry) => entry.id === editId && entry.ownerId === user.id);
      if (!item) {
        A().showMessage(message, "Listing not found or you do not own this listing.");
        form.querySelectorAll("input,select,textarea,button").forEach((el) => { if (el.type !== "hidden") el.disabled = true; });
        return;
      }
      document.getElementById("equipmentFormTitle").textContent = "Edit equipment";
      document.getElementById("equipmentId").value = item.id;
      document.getElementById("name").value = item.name;
      document.getElementById("category").value = item.category;
      document.getElementById("location").value = item.location;
      document.getElementById("price").value = item.price;
      document.getElementById("brand").value = item.brand || "";
      document.getElementById("condition").value = item.condition || "";
      document.getElementById("fuel").value = item.fuel || "";
      document.getElementById("icon").value = item.icon || "🚜";
      document.getElementById("description").value = item.description;
    }
    form.addEventListener("submit", saveEquipment);
  }

  function saveEquipment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    A().showMessage(document.getElementById("equipmentFormMessage"), "");
    form.querySelectorAll(".field-error").forEach((el) => { el.textContent = ""; });
    const user = A().getCurrentUser();
    const id = document.getElementById("equipmentId").value;
    const values = {
      name: document.getElementById("name").value.trim(),
      category: document.getElementById("category").value,
      location: document.getElementById("location").value.trim(),
      price: document.getElementById("price").value,
      brand: document.getElementById("brand").value.trim(),
      condition: document.getElementById("condition").value,
      fuel: document.getElementById("fuel").value.trim(),
      icon: document.getElementById("icon").value,
      description: document.getElementById("description").value.trim()
    };
    const errors = {};
    if (values.name.length < 3) errors.name = "Equipment name must be at least 3 characters.";
    if (!["Tractor", "Cultivator", "Irrigation", "Harvester", "Sprayer", "Other Tools"].includes(values.category)) errors.category = "Choose a valid category.";
    if (values.location.length < 2) errors.location = "Enter a valid location.";
    if (values.price === "" || !Number.isFinite(Number(values.price)) || Number(values.price) <= 0) errors.price = "Enter a price greater than ₹0.";
    if (!["Excellent", "Good", "Fair"].includes(values.condition)) errors.condition = "Choose the equipment condition.";
    if (values.description.length < 10) errors.description = "Description must be at least 10 characters.";
    Object.entries(errors).forEach(([field, text]) => window.AgriValidation.setFieldError(field, text));
    if (Object.keys(errors).length) {
      A().showMessage(document.getElementById("equipmentFormMessage"), "Please fix the highlighted errors. No data was saved.");
      return;
    }
    const list = getEquipment();
    if (id) {
      const index = list.findIndex((item) => item.id === id && item.ownerId === user.id);
      if (index < 0) {
        A().showMessage(document.getElementById("equipmentFormMessage"), "Could not update: listing not found or not owned by you.");
        return;
      }
      list[index] = { ...list[index], ...values, price: Number(values.price), updatedAt: new Date().toISOString() };
    } else {
      list.unshift({
        id: "eq-" + Date.now() + "-" + Math.random().toString(16).slice(2, 7),
        ...values, price: Number(values.price), ownerId: user.id, ownerName: user.name,
        available: true, createdAt: new Date().toISOString()
      });
    }
    A().writeArray(A().STORAGE_KEYS.equipment, list);
    A().showMessage(document.getElementById("equipmentFormMessage"), id ? "Equipment updated successfully!" : "Equipment added successfully!", "success");
    setTimeout(() => { window.location.href = "my-equipment.html"; }, 600);
  }

  function renderMyEquipment() {
    const container = document.getElementById("myEquipmentContainer");
    const message = document.getElementById("myEquipmentMessage");
    const user = A().getCurrentUser();
    if (!user) {
      A().showMessage(message, "Please login as an Equipment Owner to manage listings.");
      container.append(makeEmptyState("🔐", "Login required", "Sign in with an owner account to manage your equipment."));
      return;
    }
    if (user.role !== "owner") {
      A().showMessage(message, "Your account is registered as a renter. Only equipment owners can manage listings.");
      container.append(makeEmptyState("👨‍🌾", "Owner account required", "Register a separate account with the Equipment Owner role to add listings."));
      return;
    }
    const list = getEquipment().filter((item) => item.ownerId === user.id);
    container.replaceChildren();
    if (!list.length) {
      container.append(makeEmptyState("🚜", "No listings yet", "Add your first equipment listing to make it visible to other farmers."));
      return;
    }
    list.forEach((item) => container.append(createEquipmentCard(item, true)));
  }

  function deleteEquipment(id) {
    const user = A().getCurrentUser();
    if (!user || user.role !== "owner") {
      alert("Please login with an equipment owner account.");
      return;
    }
    const list = getEquipment();
    const item = list.find((entry) => entry.id === id);
    if (!item || item.ownerId !== user.id) {
      alert("You can only delete equipment that you own.");
      return;
    }
    if (!confirm(`Delete "${item.name}"? This action cannot be undone.`)) return;
    A().writeArray(A().STORAGE_KEYS.equipment, list.filter((entry) => entry.id !== id));
    renderMyEquipment();
  }

  window.AgriEquipment = { getEquipment, renderListing, renderMyEquipment };
})();
