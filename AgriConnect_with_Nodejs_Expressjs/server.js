const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DB = {
  users: path.join(DATA_DIR, "users.json"),
  equipment: path.join(DATA_DIR, "equipment.json"),
  rentals: path.join(DATA_DIR, "rentals.json")
};

fs.mkdirSync(DATA_DIR, { recursive: true });
for (const file of Object.values(DB)) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]", "utf8");
}

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  name: "agriconnect.sid",
  secret: process.env.SESSION_SECRET || "development-only-change-this-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 2 * 60 * 60 * 1000
  }
}));

function readData(name) {
  const parsed = JSON.parse(fs.readFileSync(DB[name], "utf8"));
  if (!Array.isArray(parsed)) throw new Error(`Invalid ${name}.json`);
  return parsed;
}
function writeData(name, rows) {
  const file = DB[name];
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(rows, null, 2), "utf8");
  fs.renameSync(temp, file);
}
const id = prefix => `${prefix}-${crypto.randomUUID()}`;
const validEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const publicUser = u => ({
  id: u.id, name: u.name, email: u.email,
  phone: u.phone, location: u.location, role: u.role
});
function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ message: "Please log in first." });
  next();
}
function requireOwner(req, res, next) {
  if (req.session.user?.role !== "owner")
    return res.status(403).json({ message: "An equipment owner account is required." });
  next();
}
function validateRegistration(body) {
  const value = {
    name: String(body.name || "").trim(),
    email: String(body.email || "").trim().toLowerCase(),
    phone: String(body.phone || "").trim(),
    location: String(body.location || "").trim(),
    role: String(body.role || ""),
    password: String(body.password || "")
  };
  const errors = {};
  if (value.name.length < 2 || value.name.length > 80) errors.name = "Name must contain 2–80 characters.";
  if (!validEmail(value.email)) errors.email = "Enter a valid email address.";
  if (!/^[6-9]\d{9}$/.test(value.phone)) errors.phone = "Enter a valid 10-digit Indian mobile number.";
  if (value.location.length < 2 || value.location.length > 100) errors.location = "Enter a valid location.";
  if (!["owner", "renter"].includes(value.role)) errors.role = "Select a valid account type.";
  if (value.password.length < 8 || value.password.length > 72) errors.password = "Password must contain 8–72 characters.";
  if (value.password !== String(body.confirmPassword || "")) errors.confirmPassword = "Passwords do not match.";
  return { value, errors };
}
const CATEGORIES = ["Tractor", "Cultivator", "Irrigation", "Harvester", "Sprayer", "Other Tools"];
function validateEquipment(body) {
  const value = {
    name: String(body.name || "").trim(),
    category: String(body.category || ""),
    location: String(body.location || "").trim(),
    price: Number(body.price),
    brand: String(body.brand || "").trim(),
    condition: String(body.condition || ""),
    fuel: String(body.fuel || "").trim(),
    icon: String(body.icon || "🚜").slice(0, 10),
    description: String(body.description || "").trim()
  };
  const errors = {};
  if (value.name.length < 3 || value.name.length > 80) errors.name = "Equipment name must contain 3–80 characters.";
  if (!CATEGORIES.includes(value.category)) errors.category = "Choose a valid category.";
  if (value.location.length < 2 || value.location.length > 100) errors.location = "Enter a valid location.";
  if (String(body.price ?? "").trim() === "" || !Number.isFinite(value.price) || value.price <= 0 || value.price > 10000000)
    errors.price = "Enter a valid daily price greater than zero.";
  if (!["Excellent", "Good", "Fair"].includes(value.condition)) errors.condition = "Choose a valid condition.";
  if (value.description.length < 10 || value.description.length > 600) errors.description = "Description must contain 10–600 characters.";
  if (value.brand.length > 100) errors.brand = "Brand must not exceed 100 characters.";
  if (value.fuel.length > 50) errors.fuel = "Fuel must not exceed 50 characters.";
  return { value, errors };
}
function validDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
function overlaps(a1, a2, b1, b2) { return a1 <= b2 && b1 <= a2; }
function daysInclusive(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000) + 1;
}

app.get("/api/health", (req, res) => res.json({ status: "ok", application: "AgriConnect" }));
app.get("/api/auth/me", (req, res) => res.json({ user: req.session.user || null }));

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { value, errors } = validateRegistration(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ message: "Please correct the highlighted fields.", errors });
    const users = readData("users");
    if (users.some(u => u.email === value.email))
      return res.status(409).json({ message: "This email is already registered.", errors: { email: "An account with this email already exists." } });
    const user = {
      id: id("user"), name: value.name, email: value.email, phone: value.phone,
      location: value.location, role: value.role,
      passwordHash: await bcrypt.hash(value.password, 12),
      createdAt: new Date().toISOString()
    };
    users.push(user);
    writeData("users", users);
    res.status(201).json({ message: "Registration successful.", user: publicUser(user) });
  } catch (e) { next(e); }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const errors = {};
    if (!validEmail(email)) errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Password is required.";
    if (Object.keys(errors).length) return res.status(400).json({ message: "Invalid login details.", errors });
    const user = readData("users").find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return res.status(401).json({ message: "Email or password is incorrect." });
    req.session.regenerate(err => {
      if (err) return next(err);
      req.session.user = publicUser(user);
      req.session.save(saveErr => {
        if (saveErr) return next(saveErr);
        res.json({ message: "Login successful.", user: req.session.user });
      });
    });
  } catch (e) { next(e); }
});

app.post("/api/auth/logout", (req, res, next) => {
  req.session.destroy(err => {
    if (err) return next(err);
    res.clearCookie("agriconnect.sid");
    res.json({ message: "Logged out." });
  });
});

app.get("/api/equipment", (req, res, next) => {
  try {
    let rows = readData("equipment");
    const search = String(req.query.search || "").trim().toLowerCase();
    const category = String(req.query.category || "");
    const location = String(req.query.location || "").trim().toLowerCase();
    const sort = String(req.query.sort || "");
    rows = rows.filter(item => {
      const text = [item.name, item.category, item.location, item.ownerName, item.description, item.brand].join(" ").toLowerCase();
      return text.includes(search) && (!category || item.category === category) &&
        String(item.location || "").toLowerCase().includes(location);
    });
    if (sort === "price-asc") rows.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") rows.sort((a, b) => b.price - a.price);
    if (sort === "name") rows.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "newest") rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ equipment: rows });
  } catch (e) { next(e); }
});

app.get("/api/equipment/mine", requireLogin, requireOwner, (req, res, next) => {
  try {
    res.json({ equipment: readData("equipment").filter(x => x.ownerId === req.session.user.id) });
  } catch (e) { next(e); }
});

app.get("/api/equipment/:id", (req, res, next) => {
  try {
    const item = readData("equipment").find(x => x.id === req.params.id);
    if (!item) return res.status(404).json({ message: "Equipment not found." });
    res.json({ equipment: item });
  } catch (e) { next(e); }
});

app.post("/api/equipment", requireLogin, requireOwner, (req, res, next) => {
  try {
    const { value, errors } = validateEquipment(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ message: "Invalid equipment details.", errors });
    const rows = readData("equipment");
    const item = {
      id: id("equipment"), ...value, ownerId: req.session.user.id,
      ownerName: req.session.user.name, available: true, createdAt: new Date().toISOString()
    };
    rows.unshift(item);
    writeData("equipment", rows);
    res.status(201).json({ message: "Equipment added.", equipment: item });
  } catch (e) { next(e); }
});

app.put("/api/equipment/:id", requireLogin, requireOwner, (req, res, next) => {
  try {
    const rows = readData("equipment");
    const i = rows.findIndex(x => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ message: "Equipment not found." });
    if (rows[i].ownerId !== req.session.user.id) return res.status(403).json({ message: "You can only edit your own equipment." });
    const { value, errors } = validateEquipment(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ message: "Invalid equipment details.", errors });
    rows[i] = { ...rows[i], ...value, updatedAt: new Date().toISOString() };
    writeData("equipment", rows);
    res.json({ message: "Equipment updated.", equipment: rows[i] });
  } catch (e) { next(e); }
});

app.delete("/api/equipment/:id", requireLogin, requireOwner, (req, res, next) => {
  try {
    const rows = readData("equipment");
    const item = rows.find(x => x.id === req.params.id);
    if (!item) return res.status(404).json({ message: "Equipment not found." });
    if (item.ownerId !== req.session.user.id) return res.status(403).json({ message: "You can only delete your own equipment." });
    const rentals = readData("rentals");
    if (rentals.some(r => r.equipmentId === item.id && ["Pending", "Accepted"].includes(r.status)))
      return res.status(409).json({ message: "Resolve pending or accepted rentals before deleting this equipment." });
    writeData("equipment", rows.filter(x => x.id !== item.id));
    res.json({ message: "Equipment deleted." });
  } catch (e) { next(e); }
});

app.post("/api/rentals", requireLogin, (req, res, next) => {
  try {
    const equipmentId = String(req.body.equipmentId || "");
    const startDate = String(req.body.startDate || "");
    const endDate = String(req.body.endDate || "");
    const errors = {};
    if (!equipmentId) errors.equipmentId = "Select equipment.";
    if (!validDate(startDate)) errors.startDate = "Enter a valid start date.";
    if (!validDate(endDate)) errors.endDate = "Enter a valid end date.";
    const today = new Date().toISOString().slice(0, 10);
    if (validDate(startDate) && startDate < today) errors.startDate = "Start date cannot be in the past.";
    if (validDate(startDate) && validDate(endDate) && endDate < startDate) errors.endDate = "End date must be on or after the start date.";
    if (Object.keys(errors).length) return res.status(400).json({ message: "Invalid rental request.", errors });

    const item = readData("equipment").find(x => x.id === equipmentId);
    if (!item) return res.status(404).json({ message: "Equipment not found." });
    if (item.available === false) return res.status(409).json({ message: "Equipment is unavailable." });
    if (item.ownerId === req.session.user.id) return res.status(403).json({ message: "You cannot rent your own equipment." });

    const rows = readData("rentals");
    if (rows.some(r => r.equipmentId === equipmentId && r.status === "Accepted" &&
      overlaps(startDate, endDate, r.startDate, r.endDate)))
      return res.status(409).json({ message: "Selected dates overlap an accepted rental." });

    const numberOfDays = daysInclusive(startDate, endDate);
    if (numberOfDays < 1 || numberOfDays > 365)
      return res.status(400).json({ message: "Rental period must be 1–365 days." });

    const rental = {
      id: id("rental"), equipmentId: item.id, equipmentName: item.name,
      renterId: req.session.user.id, renterName: req.session.user.name,
      ownerId: item.ownerId, ownerName: item.ownerName,
      startDate, endDate, numberOfDays, pricePerDay: item.price,
      totalAmount: numberOfDays * item.price, status: "Pending",
      createdAt: new Date().toISOString()
    };
    rows.push(rental);
    writeData("rentals", rows);
    res.status(201).json({ message: "Rental request submitted.", rental });
  } catch (e) { next(e); }
});

app.get("/api/rentals/mine", requireLogin, (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const rows = readData("rentals");
    res.json({
      sent: rows.filter(r => r.renterId === userId),
      received: rows.filter(r => r.ownerId === userId)
    });
  } catch (e) { next(e); }
});

app.patch("/api/rentals/:id/status", requireLogin, (req, res, next) => {
  try {
    const status = String(req.body.status || "");
    if (!["Accepted", "Rejected", "Cancelled"].includes(status))
      return res.status(400).json({ message: "Invalid rental status." });
    const rows = readData("rentals");
    const i = rows.findIndex(r => r.id === req.params.id);
    if (i < 0) return res.status(404).json({ message: "Rental request not found." });
    const rental = rows[i];
    const uid = req.session.user.id;
    if (rental.status !== "Pending") return res.status(409).json({ message: "Only pending requests can be changed." });
    if (status === "Cancelled" && rental.renterId !== uid)
      return res.status(403).json({ message: "You can only cancel your own requests." });
    if (status !== "Cancelled" && rental.ownerId !== uid)
      return res.status(403).json({ message: "Only the equipment owner can respond." });
    if (status === "Accepted" && rows.some(r => r.id !== rental.id && r.equipmentId === rental.equipmentId &&
      r.status === "Accepted" && overlaps(rental.startDate, rental.endDate, r.startDate, r.endDate)))
      return res.status(409).json({ message: "Another accepted rental overlaps these dates." });
    rows[i] = { ...rental, status, updatedAt: new Date().toISOString() };
    writeData("rentals", rows);
    res.json({ message: `Request ${status.toLowerCase()}.`, rental: rows[i] });
  } catch (e) { next(e); }
});

// Serve the existing HTML, CSS and JS in the project root.
app.use(express.static(__dirname));
app.use("/api", (req, res) => res.status(404).json({ message: "API endpoint not found." }));
app.use((req, res) => res.status(404).send("Page not found."));
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: "Unexpected server error." });
});

app.listen(PORT, () => console.log(`AgriConnect running at http://localhost:${PORT}`));
