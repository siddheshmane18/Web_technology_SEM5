/* Rental requests connected to Express; existing rental form and request cards retained. */
(() => {
  "use strict";
  const A = () => window.Agri;
  const money = value => "₹" + Number(value || 0).toLocaleString("en-IN");

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("rentalForm");
    if (form) {
      const start = document.getElementById("startDate");
      const end = document.getElementById("endDate");
      const now = new Date();
      const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      start.min = today;
      end.min = today;
      start.addEventListener("change", () => { end.min = start.value || today; calculateTotal(); });
      end.addEventListener("change", calculateTotal);
      form.addEventListener("submit", submitRental);
      document.addEventListener("agri:equipment-loaded", calculateTotal);
    }
    if (document.getElementById("myRequestsContainer")) renderRentalRequests();
  });

  function calculateTotal() {
    const item = window.currentEquipment;
    const startValue = document.getElementById("startDate")?.value;
    const endValue = document.getElementById("endDate")?.value;
    const target = document.getElementById("totalAmount");
    if (!item || !startValue || !endValue) {
      if (target) target.textContent = money(0);
      return 0;
    }
    const start = new Date(`${startValue}T00:00:00`);
    const end = new Date(`${endValue}T00:00:00`);
    const days = Math.floor((end - start) / 86400000) + 1;
    const total = days > 0 ? days * Number(item.price) : 0;
    if (target) target.textContent = money(total);
    return total;
  }

  async function submitRental(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = document.getElementById("rentalMessage");
    form.querySelectorAll(".field-error").forEach(el => el.textContent = "");
    A().showMessage(message, "");
    const item = window.currentEquipment;
    if (!item) return A().showMessage(message, "Equipment could not be loaded.");
    const values = {
      equipmentId: item.id,
      startDate: document.getElementById("startDate").value,
      endDate: document.getElementById("endDate").value
    };
    try {
      const result = await A().api("/api/rentals", {
        method: "POST",
        body: JSON.stringify(values)
      });
      A().showMessage(message, result.message, "success");
      form.reset();
      calculateTotal();
    } catch (error) {
      Object.entries(error.fields || {}).forEach(([key, text]) => {
        const el = document.getElementById(`${key}Error`);
        if (el) el.textContent = text;
      });
      A().showMessage(message, error.message);
    }
  }

  function emptyMessage(text) {
    const box = document.createElement("div"); box.className = "empty-state";
    const p = document.createElement("p"); p.textContent = text; box.append(p);
    return box;
  }

  async function renderRentalRequests() {
    const sentContainer = document.getElementById("myRequestsContainer");
    const receivedContainer = document.getElementById("ownerRequestsContainer");
    try {
      const result = await A().api("/api/rentals/mine");
      renderList(sentContainer, result.sent, "You have not sent any rental requests.", "sent");
      renderList(receivedContainer, result.received, "No rental requests have been received.", "received");
    } catch (error) {
      sentContainer.replaceChildren(emptyMessage(error.message));
      receivedContainer.replaceChildren(emptyMessage("Log in to view requests for your equipment."));
    }
  }

  function renderList(container, requests, emptyText, mode) {
    container.replaceChildren();
    if (!requests.length) {
      container.append(emptyMessage(emptyText));
      return;
    }
    requests.slice().reverse().forEach(request => {
      const card = document.createElement("article"); card.className = "request-card";
      const badge = document.createElement("span");
      badge.className = "status-badge" + (["Rejected", "Cancelled"].includes(request.status) ? " unavailable" : "");
      badge.textContent = request.status;
      const title = document.createElement("h3"); title.textContent = request.equipmentName;
      const person = document.createElement("p");
      person.textContent = mode === "sent" ? `Owner: ${request.ownerName}` : `Requested by: ${request.renterName}`;
      const dates = document.createElement("p");
      dates.textContent = `Dates: ${request.startDate} to ${request.endDate} (${request.numberOfDays} day(s))`;
      const total = document.createElement("p");
      total.textContent = `Total: ${money(request.totalAmount)} (${money(request.pricePerDay)} per day)`;
      card.append(badge, title, person, dates, total);
      const actions = document.createElement("div"); actions.className = "card-actions";
      if (mode === "received" && request.status === "Pending") {
        addAction(actions, "Accept", "btn btn-primary", () => updateStatus(request.id, "Accepted"));
        addAction(actions, "Reject", "btn btn-danger", () => updateStatus(request.id, "Rejected"));
      } else if (mode === "sent" && request.status === "Pending") {
        addAction(actions, "Cancel request", "btn btn-danger", () => updateStatus(request.id, "Cancelled"));
      }
      if (actions.children.length) card.append(actions);
      container.append(card);
    });
  }

  function addAction(parent, text, className, handler) {
    const button = document.createElement("button");
    button.type = "button"; button.className = className; button.textContent = text;
    button.addEventListener("click", handler); parent.append(button);
  }

  async function updateStatus(id, status) {
    try {
      await A().api(`/api/rentals/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      renderRentalRequests();
    } catch (error) {
      alert(error.message);
    }
  }

  window.AgriRental = { calculateTotal, renderRentalRequests };
})();