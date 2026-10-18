/* Rental calculations and request management using arrays + JSON. */
(() => {
  "use strict";
  const A = () => window.Agri;
  const money = (value) => "₹" + Number(value).toLocaleString("en-IN");

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("rentalForm");
    if (form) {
      const start = document.getElementById("startDate");
      const end = document.getElementById("endDate");
      const today = new Date();
      const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      start.min = localToday;
      end.min = localToday;
      start.addEventListener("change", () => {
        end.min = start.value || localToday;
        calculateTotal();
      });
      end.addEventListener("change", calculateTotal);
      form.addEventListener("submit", submitRental);
    }
    if (document.getElementById("myRequestsContainer")) renderRentalRequests();
  });

  function calculateTotal() {
    const item = window.currentEquipment;
    const startValue = document.getElementById("startDate")?.value;
    const endValue = document.getElementById("endDate")?.value;
    const totalElement = document.getElementById("totalAmount");
    if (!item || !startValue || !endValue) {
      if (totalElement) totalElement.textContent = money(0);
      return 0;
    }
    const start = new Date(startValue + "T00:00:00");
    const end = new Date(endValue + "T00:00:00");
    const days = Math.floor((end - start) / 86400000) + 1;
    const total = days > 0 ? days * Number(item.price) : 0;
    if (totalElement) totalElement.textContent = money(total);
    return total;
  }

  function submitRental(event) {
    event.preventDefault();
    const form = event.currentTarget;
    form.querySelectorAll(".field-error").forEach((el) => { el.textContent = ""; });
    const message = document.getElementById("rentalMessage");
    A().showMessage(message, "");
    const user = A().getCurrentUser();
    if (!user) {
      A().showMessage(message, "Please login or register before sending a rental request.");
      return;
    }
    const item = window.currentEquipment;
    if (!item) {
      A().showMessage(message, "Equipment could not be found. Return to the listing and try again.");
      return;
    }
    if (item.available === false) {
      A().showMessage(message, "This equipment is currently unavailable.");
      return;
    }
    if (item.ownerId === user.id) {
      A().showMessage(message, "You cannot request to rent your own equipment.");
      return;
    }
    const startValue = document.getElementById("startDate").value;
    const endValue = document.getElementById("endDate").value;
    let valid = true;
    if (!startValue) { document.getElementById("startDateError").textContent = "Select a start date."; valid = false; }
    if (!endValue) { document.getElementById("endDateError").textContent = "Select an end date."; valid = false; }
    const start = startValue ? new Date(startValue + "T00:00:00") : null;
    const end = endValue ? new Date(endValue + "T00:00:00") : null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (start && start < today) { document.getElementById("startDateError").textContent = "Start date cannot be in the past."; valid = false; }
    if (start && end && end < start) { document.getElementById("endDateError").textContent = "End date must be on or after the start date."; valid = false; }
    if (!valid) {
      A().showMessage(message, "Please correct the rental dates. No request was saved.");
      calculateTotal();
      return;
    }
    const days = Math.floor((end - start) / 86400000) + 1;
    const rentals = A().readArray(A().STORAGE_KEYS.rentals);
    const conflict = rentals.some((request) => request.equipmentId === item.id && request.status === "Accepted" &&
      !(end < new Date(request.startDate + "T00:00:00") || start > new Date(request.endDate + "T00:00:00")));
    if (conflict) {
      A().showMessage(message, "Those dates overlap an accepted rental. Please choose different dates.");
      return;
    }
    rentals.push({
      id: "rent-" + Date.now() + "-" + Math.random().toString(16).slice(2, 7),
      equipmentId: item.id, equipmentName: item.name,
      renterId: user.id, renterName: user.name,
      ownerId: item.ownerId, ownerName: item.ownerName,
      startDate: startValue, endDate: endValue, numberOfDays: days,
      pricePerDay: Number(item.price), totalAmount: days * Number(item.price),
      status: "Pending", createdAt: new Date().toISOString()
    });
    A().writeArray(A().STORAGE_KEYS.rentals, rentals);
    A().showMessage(message, "Rental request sent successfully!", "success");
    form.reset();
    calculateTotal();
  }

  function renderRentalRequests() {
    const user = A().getCurrentUser();
    const sentContainer = document.getElementById("myRequestsContainer");
    const ownerContainer = document.getElementById("ownerRequestsContainer");
    if (!user) {
      sentContainer.append(emptyRequestMessage("Please login to view your rental requests."));
      ownerContainer.append(emptyRequestMessage("Login as an equipment owner to view requests for your equipment."));
      return;
    }
    const rentals = A().readArray(A().STORAGE_KEYS.rentals);
    const sent = rentals.filter((item) => item.renterId === user.id);
    const received = rentals.filter((item) => item.ownerId === user.id);
    renderRequestList(sentContainer, sent, "You have not sent any rental requests yet.", "sent");
    renderRequestList(ownerContainer, received, "No rental requests have been received for your equipment yet.", "received");
  }

  function emptyRequestMessage(message) {
    const div = document.createElement("div"); div.className = "empty-state";
    const text = document.createElement("p"); text.textContent = message; div.append(text); return div;
  }

  function renderRequestList(container, requests, emptyText, mode) {
    container.replaceChildren();
    if (!requests.length) { container.append(emptyRequestMessage(emptyText)); return; }
    requests.slice().reverse().forEach((request) => {
      const card = document.createElement("article"); card.className = "request-card";
      const badge = document.createElement("span"); badge.className = "status-badge" + (request.status === "Rejected" || request.status === "Cancelled" ? " unavailable" : "");
      badge.textContent = request.status;
      const title = document.createElement("h3"); title.textContent = request.equipmentName;
      const person = document.createElement("p"); person.textContent = mode === "sent" ? `Owner: ${request.ownerName}` : `Requested by: ${request.renterName}`;
      const dates = document.createElement("p"); dates.textContent = `Dates: ${request.startDate} to ${request.endDate} (${request.numberOfDays} day(s))`;
      const total = document.createElement("p"); total.textContent = `Total: ${money(request.totalAmount)} (${money(request.pricePerDay)} per day)`;
      card.append(badge, title, person, dates, total);
      const actions = document.createElement("div"); actions.className = "card-actions";
      if (mode === "received" && request.status === "Pending") {
        const accept = document.createElement("button"); accept.className = "btn btn-primary"; accept.textContent = "Accept";
        accept.addEventListener("click", () => updateStatus(request.id, "Accepted"));
        const reject = document.createElement("button"); reject.className = "btn btn-danger"; reject.textContent = "Reject";
        reject.addEventListener("click", () => updateStatus(request.id, "Rejected"));
        actions.append(accept, reject);
      } else if (mode === "sent" && request.status === "Pending") {
        const cancel = document.createElement("button"); cancel.className = "btn btn-danger"; cancel.textContent = "Cancel request";
        cancel.addEventListener("click", () => updateStatus(request.id, "Cancelled"));
        actions.append(cancel);
      }
      if (actions.children.length) card.append(actions);
      container.append(card);
    });
  }

  function updateStatus(id, newStatus) {
    const user = A().getCurrentUser();
    const rentals = A().readArray(A().STORAGE_KEYS.rentals);
    const index = rentals.findIndex((item) => item.id === id);
    if (index < 0 || !user) { alert("Request not found or login is required."); return; }
    const request = rentals[index];
    if (newStatus === "Cancelled" && (request.renterId !== user.id || request.status !== "Pending")) {
      alert("You can cancel only your own pending requests."); return;
    }
    if (["Accepted", "Rejected"].includes(newStatus) && (request.ownerId !== user.id || request.status !== "Pending")) {
      alert("Only the equipment owner can respond to a pending request."); return;
    }
    if (newStatus === "Accepted") {
      const conflict = rentals.some((other) => other.id !== id && other.equipmentId === request.equipmentId && other.status === "Accepted" &&
        !(new Date(request.endDate + "T00:00:00") < new Date(other.startDate + "T00:00:00") ||
          new Date(request.startDate + "T00:00:00") > new Date(other.endDate + "T00:00:00")));
      if (conflict) { alert("Cannot accept: these dates overlap another accepted rental."); return; }
    }
    rentals[index] = { ...request, status: newStatus, updatedAt: new Date().toISOString() };
    A().writeArray(A().STORAGE_KEYS.rentals, rentals);
    renderRentalRequests();
  }

  window.AgriRental = { calculateTotal, renderRentalRequests };
})();
