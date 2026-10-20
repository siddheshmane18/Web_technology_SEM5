/* Equipment UI connected to Express APIs; CSS classes and HTML IDs are retained. */
(() => {
  "use strict";
  const A = () => window.Agri;
  const money = value => "₹" + Number(value || 0).toLocaleString("en-IN");
  let cachedEquipment = [];

  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("equipmentContainer")) initListing();
    if (document.getElementById("detailsContainer")) initDetails();
    if (document.getElementById("equipmentForm")) initEquipmentForm();
    if (document.getElementById("myEquipmentContainer")) renderMyEquipment();
  });

  async function fetchEquipment(id) {
    if (id) return (await A().api(`/api/equipment/${encodeURIComponent(id)}`)).equipment;
    return (await A().api("/api/equipment")).equipment;
  }

  function emptyState(icon, title, description) {
    const box = document.createElement("div"); box.className = "empty-state";
    const visual = document.createElement("div"); visual.className = "empty-icon"; visual.textContent = icon;
    const h = document.createElement("h3"); h.textContent = title;
    const p = document.createElement("p"); p.textContent = description;
    box.append(visual, h, p); return box;
  }

  function createCard(item, management = false) {
    const card = document.createElement("article"); card.className = "equipment-card";
    const visual = document.createElement("div"); visual.className = "equipment-visual";
    const icon = document.createElement("span"); icon.textContent = item.icon || "🚜";
    const status = document.createElement("span");
    status.className = "status-badge" + (item.available === false ? " unavailable" : "");
    status.textContent = item.available === false ? "Unavailable" : "Available";
    visual.append(icon, status);
    const info = document.createElement("div"); info.className = "equipment-info";
    const title = document.createElement("h3"); title.textContent = item.name;
    const place = document.createElement("p"); place.textContent = `📍 ${item.location}`;
    const owner = document.createElement("p"); owner.textContent = `Owner: ${item.ownerName || "AgriConnect farmer"}`;
    const description = document.createElement("p"); description.textContent = item.description;
    const meta = document.createElement("div"); meta.className = "equipment-meta";
    const price = document.createElement("span"); price.className = "price"; price.textContent = money(item.price);
    const perDay = document.createElement("small"); perDay.textContent = " / day"; price.append(perDay);
    const view = document.createElement("a"); view.className = "btn btn-primary";
    view.href = `equipment-details.html?id=${encodeURIComponent(item.id)}`; view.textContent = "View details";
    meta.append(price, view); info.append(title, place, owner, description, meta);
    if (management) {
      const actions = document.createElement("div"); actions.className = "card-actions";
      const edit = document.createElement("a"); edit.className = "btn btn-outline";
      edit.href = `add-equipment.html?id=${encodeURIComponent(item.id)}`; edit.textContent = "Edit";
      const del = document.createElement("button"); del.className = "btn btn-danger"; del.type = "button"; del.textContent = "Delete";
      del.addEventListener("click", () => deleteEquipment(item));
      actions.append(edit, del); info.append(actions);
    }
    card.append(visual, info); return card;
  }

  function initListing() {
    const params = new URLSearchParams(location.search);
    if (params.has("category")) document.getElementById("category").value = params.get("category");
    ["search", "category", "location", "sortEquipment"].forEach(id => {
      const el = document.getElementById(id);
      el?.addEventListener(id === "sortEquipment" || id === "category" ? "change" : "input", renderListing);
    });
    document.getElementById("resetFilters")?.addEventListener("click", () => {
      document.getElementById("search").value = "";
      document.getElementById("category").value = "";
      document.getElementById("location").value = "";
      document.getElementById("sortEquipment").value = "recommended";
      renderListing();
    });
    renderListing();
  }

  async function renderListing() {
    const container = document.getElementById("equipmentContainer");
    if (!container) return;
    const query = document.getElementById("search")?.value.trim() || "";
    const category = document.getElementById("category")?.value || "";
    const location = document.getElementById("location")?.value.trim() || "";
    const sortMap = { low: "price-asc", high: "price-desc", name: "name" };
    const sort = sortMap[document.getElementById("sortEquipment")?.value] || "";
    const params = new URLSearchParams({ search: query, category, location, sort });
    try {
      const result = await A().api(`/api/equipment?${params}`);
      cachedEquipment = result.equipment;
      const list = cachedEquipment.filter(item => item.available !== false);
      container.replaceChildren();
      const count = document.getElementById("equipmentCount");
      if (count) count.textContent = `${list.length} item${list.length === 1 ? "" : "s"} found`;
      if (!list.length) container.append(emptyState("🔎", "No equipment found", "Try another search or reset the filters."));
      else list.forEach(item => container.append(createCard(item)));
    } catch (error) {
      container.replaceChildren(emptyState("⚠️", "Could not load equipment", error.message));
    }
  }

  async function initDetails() {
    const id = new URLSearchParams(location.search).get("id");
    const message = document.getElementById("detailsMessage");
    try {
      if (!id) throw new Error("Equipment ID is missing.");
      const item = await fetchEquipment(id);
      const set = (elementId, value) => {
        const el = document.getElementById(elementId);
        if (el) el.textContent = value ?? "—";
      };
      set("equipmentIcon", item.icon || "🚜");
      set("equipmentName", item.name);
      set("equipmentLocation", `📍 ${item.location}`);
      set("equipmentPrice", money(item.price));
      set("equipmentDescription", item.description);
      set("equipmentCategory", item.category);
      set("equipmentPower", item.brand || "Not specified");
      set("equipmentCondition", item.condition || "Not specified");
      set("equipmentFuel", item.fuel || "Not specified");
      set("equipmentOwner", item.ownerName || "AgriConnect farmer");
      set("equipmentStatus", item.available === false ? "Unavailable" : "Available");
      if (item.available === false) {
        document.getElementById("equipmentStatus")?.classList.add("unavailable");
        const button = document.querySelector("#rentalForm button[type=submit]");
        if (button) button.disabled = true;
      }
      window.currentEquipment = item;
      document.dispatchEvent(new CustomEvent("agri:equipment-loaded", { detail: item }));
    } catch (error) {
      A().showMessage(message, error.message);
      const container = document.getElementById("detailsContainer");
      if (container) container.hidden = true;
    }
  }

  async function initEquipmentForm() {
    const form = document.getElementById("equipmentForm");
    const editId = new URLSearchParams(location.search).get("id");
    const message = document.getElementById("equipmentFormMessage");
    try {
      const { user } = await A().api("/api/auth/me");
      A().setCurrentUser(user);
      if (!user) throw new Error("Please log in before listing equipment.");
      if (user.role !== "owner") throw new Error("Only an Equipment Owner account can manage listings.");
      if (editId) {
        const item = await fetchEquipment(editId);
        if (item.ownerId !== user.id) throw new Error("You do not own this listing.");
        document.getElementById("equipmentFormTitle").textContent = "Edit equipment";
        document.getElementById("equipmentId").value = item.id;
        ["name", "category", "location", "price", "brand", "condition", "fuel", "icon", "description"]
          .forEach(key => { const el = document.getElementById(key); if (el) el.value = item[key] ?? ""; });
      }
      form.addEventListener("submit", saveEquipment);
    } catch (error) {
      A().showMessage(message, error.message);
      form.querySelectorAll("input,select,textarea,button").forEach(el => { if (el.type !== "hidden") el.disabled = true; });
    }
  }

  async function saveEquipment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = document.getElementById("equipmentFormMessage");
    A().showMessage(message, "");
    form.querySelectorAll(".field-error").forEach(el => el.textContent = "");
    const id = document.getElementById("equipmentId").value;
    const values = {};
    ["name", "category", "location", "price", "brand", "condition", "fuel", "icon", "description"]
      .forEach(key => values[key] = document.getElementById(key)?.value.trim() || "");
    values.price = document.getElementById("price").value;
    try {
      const result = await A().api(id ? `/api/equipment/${encodeURIComponent(id)}` : "/api/equipment", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(values)
      });
      A().showMessage(message, result.message, "success");
      setTimeout(() => location.href = "my-equipment.html", 600);
    } catch (error) {
      Object.entries(error.fields || {}).forEach(([key, text]) => window.AgriValidation.setFieldError(key, text));
      A().showMessage(message, error.message);
    }
  }

  async function renderMyEquipment() {
    const container = document.getElementById("myEquipmentContainer");
    const message = document.getElementById("myEquipmentMessage");
    if (!container) return;
    try {
      const { equipment } = await A().api("/api/equipment/mine");
      container.replaceChildren();
      if (!equipment.length) container.append(emptyState("🚜", "No listings yet", "Add your first equipment listing."));
      else equipment.forEach(item => container.append(createCard(item, true)));
    } catch (error) {
      A().showMessage(message, error.message);
      container.replaceChildren(emptyState("🔐", "Login required", "Log in with an equipment owner account to manage listings."));
    }
  }

  async function deleteEquipment(item) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await A().api(`/api/equipment/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      renderMyEquipment();
    } catch (error) {
      alert(error.message);
    }
  }

  window.AgriEquipment = { renderListing, renderMyEquipment };
})();