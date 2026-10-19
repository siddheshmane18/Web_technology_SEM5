"use strict";

/*
 * AgriConnect Assignment 2
 * Server-side validation using ONLY Node.js built-in modules.
 * No Express, no external npm packages, and no database.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const SESSION_COOKIE = "agri_session";
const sessions = new Map();

for (const filename of ["users.json", "equipment.json", "rentals.json"]) {
  const fullPath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(fullPath)) fs.writeFileSync(fullPath, "[]", "utf8");
}

function readData(filename) {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Could not read ${filename}:`, error.message);
    return [];
  }
}

function writeData(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), "utf8");
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, message, extraHeaders = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders
  });
  res.end(message);
}

function readRequestBody(req, maxBytes = 100_000) {
  return new Promise((resolve, reject) => {
    let body = "";
    let total = 0;

    req.on("data", chunk => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(Object.assign(new Error("Request body is too large."), { statusCode: 413 }));
        req.destroy();
        return;
      }
      body += chunk.toString("utf8");
    });

    req.on("end", () => {
      if (!body) return resolve({});
      const contentType = String(req.headers["content-type"] || "").split(";")[0].trim();

      try {
        if (contentType === "application/json") return resolve(JSON.parse(body));
        if (contentType === "application/x-www-form-urlencoded") {
          return resolve(Object.fromEntries(new URLSearchParams(body).entries()));
        }
        reject(Object.assign(new Error("Unsupported content type. Send JSON data."), { statusCode: 415 }));
      } catch {
        reject(Object.assign(new Error("Request body contains invalid JSON or form data."), { statusCode: 400 }));
      }
    });

    req.on("error", reject);
  });
}

function validateRegistration(body) {
  const errors = [];
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = typeof body.role === "string" ? body.role : "";

  if (name.length < 2 || name.length > 60) errors.push("Name must contain 2 to 60 characters.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) errors.push("Enter a valid email address.");
  if (password.length < 8 || password.length > 72) errors.push("Password must contain 8 to 72 characters.");
  if (!["farmer", "owner"].includes(role)) errors.push("Choose a valid account role.");

  return { errors, value: { name, email, password, role } };
}

function validateLogin(body) {
  const errors = [];
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Enter a valid email address.");
  if (!password || password.length > 72) errors.push("Password is required.");
  return { errors, value: { email, password } };
}

function validateEquipment(body) {
  const errors = [];
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const price = Number(body.price);
  const condition = typeof body.condition === "string" ? body.condition : "Good";

  if (name.length < 2 || name.length > 80) errors.push("Equipment name must contain 2 to 80 characters.");
  if (!["Tractor", "Tillage Equipment", "Harvester", "Seeder", "Sprayer", "Other"].includes(category)) {
    errors.push("Choose a valid equipment category.");
  }
  if (!Number.isFinite(price) || price <= 0 || price > 1000000) errors.push("Rental price must be a number greater than ₹0 and no more than ₹10,00,000 per day.");
  if (location.length < 2 || location.length > 100) errors.push("Location must contain 2 to 100 characters.");
  if (description.length < 10 || description.length > 1000) errors.push("Description must contain 10 to 1000 characters.");
  if (!["Excellent", "Good", "Fair"].includes(condition)) errors.push("Choose a valid equipment condition.");

  return { errors, value: { name, category, price, location, description, condition } };
}

function validateRental(body) {
  const errors = [];
  const equipmentId = Number(body.equipmentId);
  const startDate = typeof body.startDate === "string" ? body.startDate : "";
  const days = Number(body.days);

  if (!Number.isInteger(equipmentId) || equipmentId <= 0) errors.push("Choose valid equipment.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || Number.isNaN(Date.parse(startDate))) {
    errors.push("Enter a valid rental start date.");
  } else {
    const start = new Date(`${startDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) errors.push("Rental start date cannot be in the past.");
  }
  if (!Number.isInteger(days) || days < 1 || days > 90) errors.push("Rental duration must be between 1 and 90 days.");

  return { errors, value: { equipmentId, startDate, days } };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, user) {
  const computed = crypto.scryptSync(password, user.salt, 64);
  const expected = Buffer.from(user.passwordHash, "hex");
  return expected.length === computed.length && crypto.timingSafeEqual(computed, expected);
}

function getSession(req) {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.split(";").map(v => v.trim()).find(v => v.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  const token = decodeURIComponent(match.slice(SESSION_COOKIE.length + 1));
  const session = sessions.get(token);
  if (!session) return null;
  return { token, userId: session.userId };
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function requireUser(req, res) {
  const session = getSession(req);
  if (!session) {
    sendJson(res, 401, { success: false, message: "Please log in to continue." });
    return null;
  }
  const user = readData("users.json").find(u => u.id === session.userId);
  if (!user) {
    sessions.delete(session.token);
    sendJson(res, 401, { success: false, message: "Session is no longer valid. Please log in again." });
    return null;
  }
  return user;
}

function serveStatic(req, res, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return sendText(res, 400, "Bad request.");
  }

  const requested = decoded === "/" ? "/index.html" : decoded;
  const fullPath = path.resolve(PUBLIC_DIR, "." + requested);

  if (!fullPath.startsWith(PUBLIC_DIR + path.sep) && fullPath !== path.join(PUBLIC_DIR, "index.html")) {
    return sendText(res, 403, "Forbidden.");
  }

  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) return sendText(res, 404, "Page not found.");
    const ext = path.extname(fullPath).toLowerCase();
    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".ico": "image/x-icon"
    };
    res.writeHead(200, {
      "Content-Type": types[ext] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff"
    });
    fs.createReadStream(fullPath).pipe(res);
  });
}

async function handleApi(req, res, url) {
  const pathname = url.pathname;
  const method = req.method;

  if (method === "GET" && pathname === "/api/health") {
    return sendJson(res, 200, { success: true, message: "AgriConnect Node.js server is running." });
  }

  if (method === "POST" && pathname === "/api/register") {
    const body = await readRequestBody(req);
    const { errors, value } = validateRegistration(body);
    if (errors.length) return sendJson(res, 400, { success: false, message: "Please correct the highlighted errors.", errors });

    const users = readData("users.json");
    if (users.some(u => u.email === value.email)) {
      return sendJson(res, 409, { success: false, message: "An account with this email already exists.", errors: ["Email address is already registered."] });
    }

    const credentials = hashPassword(value.password);
    const user = {
      id: users.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0) + 1,
      name: value.name,
      email: value.email,
      role: value.role,
      salt: credentials.salt,
      passwordHash: credentials.hash,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    writeData("users.json", users);
    return sendJson(res, 201, { success: true, message: "Registration successful. You can now log in.", user: publicUser(user) });
  }

  if (method === "POST" && pathname === "/api/login") {
    const body = await readRequestBody(req);
    const { errors, value } = validateLogin(body);
    if (errors.length) return sendJson(res, 400, { success: false, message: "Please correct the highlighted errors.", errors });

    const user = readData("users.json").find(u => u.email === value.email);
    if (!user || !verifyPassword(value.password, user)) {
      return sendJson(res, 401, { success: false, message: "Invalid email or password." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, { userId: user.id, createdAt: Date.now() });
    return sendJson(res, 200, { success: true, message: `Welcome back, ${user.name}.`, user: publicUser(user) }, {
      "Set-Cookie": `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`
    });
  }

  if (method === "POST" && pathname === "/api/logout") {
    const session = getSession(req);
    if (session) sessions.delete(session.token);
    return sendJson(res, 200, { success: true, message: "You have logged out." }, {
      "Set-Cookie": `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
    });
  }

  if (method === "GET" && pathname === "/api/me") {
    const session = getSession(req);
    if (!session) return sendJson(res, 200, { success: true, user: null });
    const user = readData("users.json").find(u => u.id === session.userId);
    return sendJson(res, 200, { success: true, user: user ? publicUser(user) : null });
  }

  if (method === "GET" && pathname === "/api/equipment") {
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const category = (url.searchParams.get("category") || "").trim();
    const sort = url.searchParams.get("sort") || "newest";
    let equipment = readData("equipment.json").filter(item => item.status !== "deleted");
    if (q) equipment = equipment.filter(item => `${item.name} ${item.category} ${item.location} ${item.description}`.toLowerCase().includes(q));
    if (category) equipment = equipment.filter(item => item.category === category);
    if (sort === "price-asc") equipment.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") equipment.sort((a, b) => b.price - a.price);
    else equipment.sort((a, b) => b.id - a.id);
    return sendJson(res, 200, { success: true, equipment });
  }

  if (method === "POST" && pathname === "/api/equipment") {
    const user = requireUser(req, res);
    if (!user) return;
    if (user.role !== "owner") return sendJson(res, 403, { success: false, message: "Only equipment owners can add listings." });

    const body = await readRequestBody(req);
    const { errors, value } = validateEquipment(body);
    if (errors.length) return sendJson(res, 400, { success: false, message: "Equipment was not saved. Correct the errors below.", errors });

    const equipment = readData("equipment.json");
    const item = {
      id: equipment.reduce((max, e) => Math.max(max, Number(e.id) || 0), 0) + 1,
      ...value,
      ownerId: user.id,
      ownerName: user.name,
      status: "available",
      createdAt: new Date().toISOString()
    };
    equipment.push(item);
    writeData("equipment.json", equipment);
    return sendJson(res, 201, { success: true, message: "Equipment added successfully.", equipment: item });
  }

  const equipmentMatch = pathname.match(/^\/api\/equipment\/(\d+)$/);
  if (equipmentMatch && method === "PUT") {
    const user = requireUser(req, res);
    if (!user) return;
    const id = Number(equipmentMatch[1]);
    const equipment = readData("equipment.json");
    const item = equipment.find(e => e.id === id && e.status !== "deleted");
    if (!item) return sendJson(res, 404, { success: false, message: "Equipment listing not found." });
    if (item.ownerId !== user.id) return sendJson(res, 403, { success: false, message: "You can only edit your own equipment." });

    const body = await readRequestBody(req);
    const { errors, value } = validateEquipment(body);
    if (errors.length) return sendJson(res, 400, { success: false, message: "Equipment was not updated. Correct the errors below.", errors });
    Object.assign(item, value, { updatedAt: new Date().toISOString() });
    writeData("equipment.json", equipment);
    return sendJson(res, 200, { success: true, message: "Equipment updated successfully.", equipment: item });
  }

  if (equipmentMatch && method === "DELETE") {
    const user = requireUser(req, res);
    if (!user) return;
    const id = Number(equipmentMatch[1]);
    const equipment = readData("equipment.json");
    const item = equipment.find(e => e.id === id && e.status !== "deleted");
    if (!item) return sendJson(res, 404, { success: false, message: "Equipment listing not found." });
    if (item.ownerId !== user.id) return sendJson(res, 403, { success: false, message: "You can only delete your own equipment." });
    item.status = "deleted";
    writeData("equipment.json", equipment);
    return sendJson(res, 200, { success: true, message: "Equipment listing deleted." });
  }

  if (method === "GET" && pathname === "/api/my-equipment") {
    const user = requireUser(req, res);
    if (!user) return;
    const equipment = readData("equipment.json").filter(e => e.ownerId === user.id && e.status !== "deleted");
    return sendJson(res, 200, { success: true, equipment });
  }

  if (method === "POST" && pathname === "/api/rentals") {
    const user = requireUser(req, res);
    if (!user) return;
    if (user.role !== "farmer") return sendJson(res, 403, { success: false, message: "Only farmer/renter accounts can request equipment." });

    const body = await readRequestBody(req);
    const { errors, value } = validateRental(body);
    if (errors.length) return sendJson(res, 400, { success: false, message: "Rental request was not submitted.", errors });

    const equipment = readData("equipment.json");
    const item = equipment.find(e => e.id === value.equipmentId && e.status === "available");
    if (!item) return sendJson(res, 404, { success: false, message: "Selected equipment is not available." });
    if (item.ownerId === user.id) return sendJson(res, 400, { success: false, message: "You cannot rent your own equipment." });

    const rentals = readData("rentals.json");
    const rental = {
      id: rentals.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1,
      equipmentId: item.id,
      equipmentName: item.name,
      ownerId: item.ownerId,
      renterId: user.id,
      renterName: user.name,
      startDate: value.startDate,
      days: value.days,
      totalPrice: item.price * value.days,
      status: "pending",
      createdAt: new Date().toISOString()
    };
    rentals.push(rental);
    writeData("rentals.json", rentals);
    return sendJson(res, 201, { success: true, message: "Rental request submitted successfully.", rental });
  }

  if (method === "GET" && pathname === "/api/my-rentals") {
    const user = requireUser(req, res);
    if (!user) return;
    const rentals = readData("rentals.json").filter(r => r.renterId === user.id);
    return sendJson(res, 200, { success: true, rentals });
  }

  if (method === "GET" && pathname === "/api/owner-rentals") {
    const user = requireUser(req, res);
    if (!user) return;
    if (user.role !== "owner") return sendJson(res, 403, { success: false, message: "Only equipment owners can manage incoming rental requests." });
    const rentals = readData("rentals.json").filter(r => r.ownerId === user.id);
    return sendJson(res, 200, { success: true, rentals });
  }

  const rentalMatch = pathname.match(/^\/api\/rentals\/(\d+)$/);
  if (rentalMatch && method === "PATCH") {
    const user = requireUser(req, res);
    if (!user) return;
    if (user.role !== "owner") return sendJson(res, 403, { success: false, message: "Only equipment owners can update rental requests." });

    const body = await readRequestBody(req);
    const status = typeof body.status === "string" ? body.status : "";
    if (!["accepted", "rejected"].includes(status)) {
      return sendJson(res, 400, { success: false, message: "Rental status must be accepted or rejected.", errors: ["Choose accepted or rejected."] });
    }

    const rentals = readData("rentals.json");
    const rental = rentals.find(r => r.id === Number(rentalMatch[1]));
    if (!rental) return sendJson(res, 404, { success: false, message: "Rental request not found." });
    if (rental.ownerId !== user.id) return sendJson(res, 403, { success: false, message: "You can only manage requests for your equipment." });
    if (rental.status !== "pending") return sendJson(res, 409, { success: false, message: "This request has already been processed." });

    rental.status = status;
    rental.updatedAt = new Date().toISOString();
    writeData("rentals.json", rentals);
    return sendJson(res, 200, { success: true, message: `Rental request ${status}.`, rental });
  }

  return sendJson(res, 404, { success: false, message: "API endpoint not found." });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  // Small safety headers for all responses.
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");

  try {
    if (url.pathname.startsWith("/api/")) {
      return await handleApi(req, res, url);
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      return sendText(res, 405, "Method not allowed.");
    }
    return serveStatic(req, res, url.pathname);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      sendJson(res, error.statusCode || 500, {
        success: false,
        message: error.statusCode ? error.message : "An unexpected server error occurred."
      });
    } else {
      res.end();
    }
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`AgriConnect is running at http://localhost:${PORT}`);
  console.log("Server-side validation is implemented using built-in Node.js modules.");
});
