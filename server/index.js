import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { db } from "./db.js";
import { seedIfEmpty } from "./seed.js";
import { installAuth } from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 4000);

seedIfEmpty();

app.set("trust proxy", "loopback");
app.use(express.json({ limit: "1mb" }));
installAuth(app, express);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const txSelect = `
  SELECT t.*, c.name AS client_name, p.name AS order_name, w.name AS worker_name
  FROM transactions t
  LEFT JOIN clients c ON c.id = t.client_id
  LEFT JOIN orders p ON p.id = t.order_id
  LEFT JOIN workers w ON w.id = t.worker_id
`;

const materialSelect = `
  SELECT m.*,
    (SELECT MAX(mm.date) FROM material_movements mm WHERE mm.material_id = m.id) AS last_movement,
    (SELECT COUNT(*) FROM material_movements mm WHERE mm.material_id = m.id) AS movement_count
  FROM materials m
`;

const movementSelect = `
  SELECT mm.*, m.name AS material_name, m.unit AS material_unit,
         p.name AS order_name, w.name AS worker_name
  FROM material_movements mm
  JOIN materials m ON m.id = mm.material_id
  LEFT JOIN orders p ON p.id = mm.order_id
  LEFT JOIN workers w ON w.id = mm.worker_id
`;

const workerSelect = `
  SELECT w.*,
    (SELECT COUNT(*) FROM order_workers pw JOIN orders p ON p.id = pw.order_id
      WHERE pw.worker_id = w.id AND p.status IN ('new', 'design', 'production', 'install')) AS active_orders,
    (SELECT COUNT(*) FROM order_workers pw WHERE pw.worker_id = w.id) AS order_count,
    COALESCE((SELECT SUM(t.amount) FROM transactions t
      WHERE t.worker_id = w.id AND t.type = 'expense' AND t.category = 'Payroll'), 0) AS paid_total,
    (SELECT MAX(t.date) FROM transactions t
      WHERE t.worker_id = w.id AND t.type = 'expense' AND t.category = 'Payroll') AS last_paid
  FROM workers w
`;

function mapTransaction(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    date: row.date,
    category: row.category,
    description: row.description,
    clientId: row.client_id,
    orderId: row.order_id,
    workerId: row.worker_id,
    method: row.method,
    reference: row.reference,
    notes: row.notes,
    clientName: row.client_name ?? null,
    orderName: row.order_name ?? null,
    workerName: row.worker_name ?? null,
    createdAt: row.created_at,
  };
}

function mapMaterial(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    stock: Number(row.stock),
    minStock: Number(row.min_stock),
    unitCost: row.unit_cost,
    supplier: row.supplier,
    location: row.location,
    lastMovement: row.last_movement ?? null,
    movementCount: row.movement_count ?? 0,
    value: Number(row.stock) * row.unit_cost,
    lowStock: Number(row.stock) <= Number(row.min_stock),
  };
}

function mapMovement(row) {
  return {
    id: row.id,
    materialId: row.material_id,
    materialName: row.material_name,
    materialUnit: row.material_unit,
    type: row.type,
    quantity: Number(row.quantity),
    unitCost: row.unit_cost,
    date: row.date,
    orderId: row.order_id,
    orderName: row.order_name ?? null,
    workerId: row.worker_id,
    workerName: row.worker_name ?? null,
    note: row.note,
    createdAt: row.created_at,
  };
}

function mapWorker(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    department: row.department,
    phone: row.phone,
    email: row.email,
    salary: row.salary,
    status: row.status,
    hireDate: row.hire_date,
    avatarColor: row.avatar_color,
    activeOrders: row.active_orders ?? 0,
    orderCount: row.order_count ?? 0,
    paidTotal: row.paid_total ?? 0,
    lastPaid: row.last_paid ?? null,
    createdAt: row.created_at,
  };
}

function getOrders() {
  const rows = db.prepare(`
    SELECT p.*, c.name AS client_name, c.industry AS client_industry, w.name AS manager_name,
      w.avatar_color AS manager_color,
      COALESCE((SELECT SUM(t.amount) FROM transactions t
        WHERE t.order_id = p.id AND t.type = 'income'), 0) AS income,
      COALESCE((SELECT SUM(t.amount) FROM transactions t
        WHERE t.order_id = p.id AND t.type = 'expense'), 0) AS expense,
      (SELECT COUNT(*) FROM material_movements mm WHERE mm.order_id = p.id) AS material_movements
    FROM orders p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN workers w ON w.id = p.manager_id
    ORDER BY CASE p.status
        WHEN 'install' THEN 0 WHEN 'production' THEN 1 WHEN 'design' THEN 2
        WHEN 'new' THEN 3 WHEN 'completed' THEN 4 ELSE 5 END,
      CASE WHEN p.deadline IS NULL THEN 1 ELSE 0 END, p.deadline ASC
  `).all();

  const assignments = db.prepare(`
    SELECT pw.order_id, w.id, w.name, w.role, w.avatar_color, w.department
    FROM order_workers pw JOIN workers w ON w.id = pw.worker_id
    ORDER BY w.name
  `).all();

  return rows.map((p) => ({
    id: p.id,
    orderNumber: p.order_number,
    name: p.name,
    clientId: p.client_id,
    clientName: p.client_name ?? "Internal",
    clientIndustry: p.client_industry,
    product: p.product,
    status: p.status,
    quote: p.quote,
    site: p.site,
    orderDate: p.order_date,
    deadline: p.deadline,
    priority: p.priority,
    managerId: p.manager_id,
    managerName: p.manager_name ?? null,
    managerColor: p.manager_color ?? "#2f6b4f",
    notes: p.notes,
    income: p.income,
    expense: p.expense,
    profit: p.income - p.expense,
    balance: p.status === "cancelled" ? 0 : Math.max(0, p.quote - p.income),
    materialMovements: p.material_movements,
    crew: assignments
      .filter((a) => a.order_id === p.id)
      .map((a) => ({ id: a.id, name: a.name, role: a.role, avatarColor: a.avatar_color, department: a.department })),
    createdAt: p.created_at,
  }));
}

function getClients() {
  return db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM orders p WHERE p.client_id = c.id) AS order_count,
      (SELECT COUNT(*) FROM orders p WHERE p.client_id = c.id
        AND p.status IN ('new', 'design', 'production', 'install')) AS active_orders,
      COALESCE((SELECT SUM(t.amount) FROM transactions t
        WHERE t.client_id = c.id AND t.type = 'income'), 0) AS revenue,
      (SELECT MAX(t.date) FROM transactions t WHERE t.client_id = c.id AND t.type = 'income') AS last_payment
    FROM clients c
    ORDER BY revenue DESC, c.name
  `).all().map((c) => ({
    id: c.id,
    name: c.name,
    industry: c.industry,
    contactName: c.contact_name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    orderCount: c.order_count,
    activeOrders: c.active_orders,
    revenue: c.revenue,
    lastPayment: c.last_payment,
    createdAt: c.created_at,
  }));
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(key, delta) {
  const [year, month] = key.split("-").map(Number);
  return monthKey(new Date(year, month - 1 + delta, 1));
}

function totalsForMonth(key) {
  const rows = db.prepare(`
    SELECT type, COALESCE(SUM(amount), 0) AS total
    FROM transactions WHERE substr(date, 1, 7) = ? GROUP BY type
  `).all(key);
  const result = { income: 0, expense: 0 };
  rows.forEach((row) => {
    result[row.type] = row.total;
  });
  return result;
}

function percentChange(current, previous) {
  if (!previous) return null;
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

function parseId(value) {
  if (value === undefined || value === null || value === "") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new HttpError(400, `${label} is required.`);
  return value.trim();
}

function validateReference(table, id, label) {
  if (id === null || id === undefined) return null;
  const exists = db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(id);
  if (!exists) throw new HttpError(400, `${label} not found.`);
  return id;
}

function optionalDate(value) {
  if (value === undefined || value === null || value === "") return null;
  return requireDate(value);
}

function requireDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, "A valid date is required.");
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, "A valid date is required.");
  }
  return value;
}

function requireAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, "Amount must be greater than zero.");
  return Math.round(amount);
}

function deriveClientId(orderId, clientId) {
  if (clientId) return clientId;
  if (!orderId) return null;
  const order = db.prepare("SELECT client_id FROM orders WHERE id = ?").get(orderId);
  return order?.client_id ?? null;
}

const ORDER_STATUSES = ["new", "design", "production", "install", "completed", "cancelled"];
const ORDER_PRODUCTS = [
  "Volumetric letters",
  "Facade sign",
  "Stela / pylon",
  "Lightbox",
  "LED display",
  "Car branding",
  "Banner / print",
  "Interior signage",
  "Other",
];
const ORDER_PRIORITIES = ["low", "normal", "high"];

function nextOrderNumber() {
  const prefix = `ZD-${new Date().getFullYear()}-`;
  const rows = db.prepare("SELECT order_number FROM orders WHERE order_number LIKE ?").all(`${prefix}%`);
  const highest = rows.reduce((max, row) => {
    const value = Number(row.order_number.slice(prefix.length));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
}

function validateStatus(value, fallback) {
  if (value === undefined) return fallback;
  if (!ORDER_STATUSES.includes(value)) throw new HttpError(400, "Unknown order status.");
  return value;
}

function validateProduct(value, fallback) {
  if (value === undefined) return fallback;
  if (!ORDER_PRODUCTS.includes(value)) throw new HttpError(400, "Unknown product type.");
  return value;
}

function validatePriority(value, fallback) {
  if (value === undefined) return fallback;
  if (!ORDER_PRIORITIES.includes(value)) throw new HttpError(400, "Unknown priority.");
  return value;
}

// ——— Dashboard ————————————————————————————————————————————————
app.get("/api/dashboard", (_req, res) => {
  const currentKey = monthKey();
  const previousKey = shiftMonth(currentKey, -1);
  const current = totalsForMonth(currentKey);
  const previous = totalsForMonth(previousKey);

  const months = [];
  for (let i = 5; i >= 0; i -= 1) {
    const [y, m] = shiftMonth(currentKey, -i).split("-").map(Number);
    months.push({
      key: shiftMonth(currentKey, -i),
      month: shiftMonth(currentKey, -i),
      label: new Date(y, m - 1, 1).toLocaleString("en-US", { month: "short" }),
      income: 0,
      expense: 0,
    });
  }

  const chartRows = db.prepare(`
    SELECT substr(date, 1, 7) AS month, type, SUM(amount) AS total
    FROM transactions WHERE substr(date, 1, 7) >= ?
    GROUP BY month, type
  `).all(months[0].key);
  chartRows.forEach((row) => {
    const month = months.find((m) => m.key === row.month);
    if (month) month[row.type] = row.total;
  });

  const expenseMix = db.prepare(`
    SELECT category AS name, SUM(amount) AS value
    FROM transactions
    WHERE type = 'expense' AND substr(date, 1, 7) = ?
    GROUP BY category ORDER BY value DESC
  `).all(currentKey);

  const recentTransactions = db.prepare(`${txSelect} ORDER BY t.date DESC, t.id DESC LIMIT 7`).all().map(mapTransaction);

  const orders = getOrders();
  const openStatuses = new Set(["new", "design", "production", "install"]);
  const openOrders = orders.filter((p) => openStatuses.has(p.status));
  const activeOrders = openOrders
    .sort((a, b) => {
      if (a.deadline === b.deadline) return a.id - b.id;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    })
    .slice(0, 5);
  const orderValue = openOrders.reduce((sum, order) => sum + order.quote, 0);
  const quotedTotal = orders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + order.quote, 0);
  const collected = orders.reduce((sum, order) => sum + order.income, 0);

  const lowStock = db.prepare(`${materialSelect} WHERE m.stock <= m.min_stock ORDER BY (m.stock / NULLIF(m.min_stock, 0)) ASC LIMIT 4`).all().map(mapMaterial);

  const inventory = db.prepare(`
    SELECT COUNT(*) AS items, COALESCE(SUM(stock * unit_cost), 0) AS value,
      SUM(CASE WHEN stock <= min_stock THEN 1 ELSE 0 END) AS low_count
    FROM materials
  `).get();

  const consumed = db.prepare(`
    SELECT COALESCE(SUM(quantity * unit_cost), 0) AS value, COUNT(*) AS count
    FROM material_movements WHERE type = 'out' AND substr(date, 1, 7) = ?
  `).get(currentKey);

  const team = db.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) AS on_leave,
      COALESCE(SUM(CASE WHEN status != 'inactive' THEN salary ELSE 0 END), 0) AS payroll
    FROM workers
  `).get();

  const crew = db.prepare(`${workerSelect} WHERE w.status = 'active' ORDER BY active_orders DESC, w.name LIMIT 5`).all().map(mapWorker);

  res.json({
    month: currentKey,
    monthLabel: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
    stats: {
      income: current.income,
      expense: current.expense,
      profit: current.income - current.expense,
      margin: current.income ? Number((((current.income - current.expense) / current.income) * 100).toFixed(1)) : 0,
      incomeChange: percentChange(current.income, previous.income),
      expenseChange: percentChange(current.expense, previous.expense),
      profitChange: percentChange(current.income - current.expense, previous.income - previous.expense),
      previousIncome: previous.income,
      previousExpense: previous.expense,
      openOrders: openOrders.length,
      inProduction: openOrders.filter((p) => p.status === "production").length,
      awaitingInstall: openOrders.filter((p) => p.status === "install").length,
      orderValue,
      outstanding: Math.max(0, quotedTotal - collected),
      totalOrders: orders.length,
      inventoryValue: inventory.value,
      lowStockCount: inventory.low_count,
      inventoryItems: inventory.items,
      consumedThisMonth: consumed.value,
      materialUsageCount: consumed.count,
      teamTotal: team.total,
      teamActive: team.active,
      teamOnLeave: team.on_leave ?? 0,
      monthlyPayroll: team.payroll,
    },
    chart: months,
    expenseMix,
    recentTransactions,
    openOrders: activeOrders,
    lowStock,
    crew,
  });
});

// ——— Transactions —————————————————————————————————————————————
app.get("/api/transactions", (req, res) => {
  const where = [];
  const params = [];
  const type = req.query.type;
  if (type === "income" || type === "expense") {
    where.push("t.type = ?");
    params.push(type);
  }
  if (req.query.month) {
    where.push("substr(t.date, 1, 7) = ?");
    params.push(req.query.month);
  }
  if (req.query.orderId) {
    where.push("t.order_id = ?");
    params.push(Number(req.query.orderId));
  }
  if (req.query.workerId) {
    where.push("t.worker_id = ?");
    params.push(Number(req.query.workerId));
  }
  if (req.query.category) {
    where.push("t.category = ?");
    params.push(req.query.category);
  }
  if (req.query.search) {
    const search = `%${String(req.query.search).trim()}%`;
    where.push("(t.description LIKE ? OR t.category LIKE ? OR t.reference LIKE ? OR c.name LIKE ? OR p.name LIKE ? OR w.name LIKE ?)");
    params.push(search, search, search, search, search, search);
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db.prepare(`${txSelect} ${clause} ORDER BY t.date DESC, t.id DESC LIMIT 500`).all(...params).map(mapTransaction);
  const summary = rows.reduce(
    (acc, row) => {
      acc[row.type] += row.amount;
      acc.count += 1;
      return acc;
    },
    { income: 0, expense: 0, count: 0 }
  );
  summary.net = summary.income - summary.expense;

  const months = db.prepare("SELECT DISTINCT substr(date, 1, 7) AS month FROM transactions ORDER BY month DESC").all().map((r) => r.month);

  res.json({ transactions: rows, summary, months });
});

app.post("/api/transactions", (req, res) => {
  const body = req.body || {};
  const type = body.type === "income" ? "income" : body.type === "expense" ? "expense" : null;
  if (!type) throw new HttpError(400, "Transaction type must be income or expense.");
  const amount = requireAmount(body.amount);
  const date = requireDate(body.date);
  const category = requireString(body.category, "Category");
  const description = requireString(body.description, "Description");
  const orderId = validateReference("orders", parseId(body.orderId), "Order");
  const clientId = validateReference("clients", deriveClientId(orderId, parseId(body.clientId)), "Client");
  const workerId = validateReference("workers", parseId(body.workerId), "Team member");
  const method = requireString(body.method || "Bank transfer", "Payment method");

  const result = db.prepare(`
    INSERT INTO transactions
      (type, amount, date, category, description, client_id, order_id, worker_id, method, reference, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(type, amount, date, category, description, clientId, orderId, workerId, method, body.reference?.trim() || null, body.notes?.trim() || null);

  const row = db.prepare(`${txSelect} WHERE t.id = ?`).get(Number(result.lastInsertRowid));
  res.status(201).json({ transaction: mapTransaction(row) });
});

app.put("/api/transactions/:id", (req, res) => {
  const id = parseId(req.params.id);
  const existing = id ? db.prepare("SELECT * FROM transactions WHERE id = ?").get(id) : null;
  if (!existing) throw new HttpError(404, "Transaction not found.");
  const body = req.body || {};
  const type = body.type === "income" || body.type === "expense" ? body.type : existing.type;
  const amount = requireAmount(body.amount ?? existing.amount);
  const date = requireDate(body.date ?? existing.date);
  const category = requireString(body.category ?? existing.category, "Category");
  const description = requireString(body.description ?? existing.description, "Description");
  const orderId = validateReference(
    "orders",
    body.orderId === undefined ? existing.order_id : parseId(body.orderId),
    "Order"
  );
  const clientId = validateReference(
    "clients",
    deriveClientId(orderId, body.clientId === undefined ? existing.client_id : parseId(body.clientId)),
    "Client"
  );
  const workerId = validateReference(
    "workers",
    body.workerId === undefined ? existing.worker_id : parseId(body.workerId),
    "Team member"
  );
  const method = requireString(body.method ?? existing.method, "Payment method");

  db.prepare(`
    UPDATE transactions SET type = ?, amount = ?, date = ?, category = ?, description = ?,
      client_id = ?, order_id = ?, worker_id = ?, method = ?, reference = ?, notes = ?
    WHERE id = ?
  `).run(
    type,
    amount,
    date,
    category,
    description,
    clientId,
    orderId,
    workerId,
    method,
    body.reference === undefined ? existing.reference : body.reference?.trim() || null,
    body.notes === undefined ? existing.notes : body.notes?.trim() || null,
    id
  );

  const row = db.prepare(`${txSelect} WHERE t.id = ?`).get(id);
  res.json({ transaction: mapTransaction(row) });
});

app.delete("/api/transactions/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (!id) throw new HttpError(400, "Invalid transaction.");
  const result = db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
  if (!result.changes) throw new HttpError(404, "Transaction not found.");
  res.json({ ok: true });
});

// ——— Orders —————————————————————————————————————————————————
app.get("/api/orders", (_req, res) => {
  res.json({ orders: getOrders() });
});

app.get("/api/orders/:id", (req, res) => {
  const id = parseId(req.params.id);
  const order = getOrders().find((p) => p.id === id);
  if (!order) throw new HttpError(404, "Order not found.");
  const transactions = db.prepare(`${txSelect} WHERE t.order_id = ? ORDER BY t.date DESC, t.id DESC LIMIT 8`).all(id).map(mapTransaction);
  const movements = db.prepare(`${movementSelect} WHERE mm.order_id = ? ORDER BY mm.date DESC, mm.id DESC LIMIT 8`).all(id).map(mapMovement);
  res.json({ order: { ...order, transactions, movements } });
});

app.post("/api/orders", (req, res) => {
  const body = req.body || {};
  const name = requireString(body.name, "Order name");
  const clientId = validateReference("clients", parseId(body.clientId), "Client");
  if (!clientId) throw new HttpError(400, "Client is required.");
  const quote = Math.max(0, Number(body.quote) || 0);
  const status = validateStatus(body.status, "new");
  const product = validateProduct(body.product, "Volumetric letters");
  const priority = validatePriority(body.priority, "normal");
  const orderDate = optionalDate(body.orderDate);
  const deadline = optionalDate(body.deadline);
  if (orderDate && deadline && deadline < orderDate) {
    throw new HttpError(400, "Deadline cannot be before the order date.");
  }
  const managerId = validateReference("workers", parseId(body.managerId), "Manager");
  const workerIds = Array.isArray(body.workerIds)
    ? [...new Set(body.workerIds.map((value) => parseId(value)).filter(Boolean))]
    : [];
  workerIds.forEach((workerId) => validateReference("workers", workerId, "Team member"));

  const result = db.prepare(`
    INSERT INTO orders
      (order_number, name, client_id, product, status, quote, site, order_date, deadline, priority, manager_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nextOrderNumber(),
    name,
    clientId,
    product,
    status,
    Math.round(quote),
    body.site?.trim() || null,
    orderDate,
    deadline,
    priority,
    managerId,
    body.notes?.trim() || null
  );
  const orderId = Number(result.lastInsertRowid);
  const insertCrew = db.prepare("INSERT OR IGNORE INTO order_workers (order_id, worker_id) VALUES (?, ?)");
  workerIds.forEach((workerId) => insertCrew.run(orderId, workerId));

  res.status(201).json({ order: getOrders().find((p) => p.id === orderId) });
});

app.put("/api/orders/:id", (req, res) => {
  const id = parseId(req.params.id);
  const existing = id ? db.prepare("SELECT * FROM orders WHERE id = ?").get(id) : null;
  if (!existing) throw new HttpError(404, "Order not found.");
  const body = req.body || {};
  const name = requireString(body.name ?? existing.name, "Order name");
  const clientId = validateReference(
    "clients",
    body.clientId === undefined ? existing.client_id : parseId(body.clientId),
    "Client"
  );
  if (!clientId) throw new HttpError(400, "Client is required.");
  const status = validateStatus(body.status, existing.status);
  const product = validateProduct(body.product, existing.product);
  const priority = validatePriority(body.priority, existing.priority);
  const quote = Math.max(0, Number(body.quote ?? existing.quote) || 0);
  const orderDate = body.orderDate === undefined ? existing.order_date : optionalDate(body.orderDate);
  const deadline = body.deadline === undefined ? existing.deadline : optionalDate(body.deadline);
  if (orderDate && deadline && deadline < orderDate) {
    throw new HttpError(400, "Deadline cannot be before the order date.");
  }
  const managerId = validateReference(
    "workers",
    body.managerId === undefined ? existing.manager_id : parseId(body.managerId),
    "Manager"
  );
  const workerIds = Array.isArray(body.workerIds)
    ? [...new Set(body.workerIds.map((value) => parseId(value)).filter(Boolean))]
    : null;
  workerIds?.forEach((workerId) => validateReference("workers", workerId, "Team member"));

  db.prepare(`
    UPDATE orders SET name = ?, client_id = ?, product = ?, status = ?, quote = ?, site = ?,
      order_date = ?, deadline = ?, priority = ?, manager_id = ?, notes = ?
    WHERE id = ?
  `).run(
    name,
    clientId,
    product,
    status,
    Math.round(quote),
    body.site === undefined ? existing.site : body.site?.trim() || null,
    orderDate,
    deadline,
    priority,
    managerId,
    body.notes?.trim() || null,
    id
  );

  if (workerIds) {
    db.prepare("DELETE FROM order_workers WHERE order_id = ?").run(id);
    const insertCrew = db.prepare("INSERT OR IGNORE INTO order_workers (order_id, worker_id) VALUES (?, ?)");
    workerIds.forEach((workerId) => insertCrew.run(id, workerId));
  }

  res.json({ order: getOrders().find((p) => p.id === id) });
});

// ——— Materials ————————————————————————————————————————————————
app.get("/api/materials", (_req, res) => {
  const materials = db.prepare(`${materialSelect} ORDER BY (m.stock <= m.min_stock) DESC, m.name`).all().map(mapMaterial);
  const movements = db.prepare(`${movementSelect} ORDER BY mm.date DESC, mm.id DESC LIMIT 24`).all().map(mapMovement);
  const currentKey = monthKey();
  const consumed = db.prepare(`
    SELECT COALESCE(SUM(quantity * unit_cost), 0) AS value, COUNT(*) AS count,
      COALESCE(SUM(quantity), 0) AS quantity
    FROM material_movements WHERE type = 'out' AND substr(date, 1, 7) = ?
  `).get(currentKey);
  const received = db.prepare(`
    SELECT COUNT(*) AS count, COALESCE(SUM(quantity * unit_cost), 0) AS value
    FROM material_movements WHERE type = 'in' AND substr(date, 1, 7) = ?
  `).get(currentKey);
  const summary = {
    totalValue: materials.reduce((sum, m) => sum + m.value, 0),
    lowCount: materials.filter((m) => m.lowStock).length,
    itemCount: materials.length,
    consumedThisMonth: consumed.value,
    usageCount: consumed.count,
    receivedThisMonth: received.value,
    receivedCount: received.count,
  };
  res.json({ materials, movements, summary });
});

app.post("/api/materials", (req, res) => {
  const body = req.body || {};
  const name = requireString(body.name, "Material name");
  const result = db.prepare(`
    INSERT INTO materials (name, category, unit, stock, min_stock, unit_cost, supplier, location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    body.category?.trim() || "Other",
    body.unit?.trim() || "pcs",
    Math.max(0, Number(body.stock) || 0),
    Math.max(0, Number(body.minStock) || 0),
    Math.max(0, Math.round(Number(body.unitCost) || 0)),
    body.supplier?.trim() || null,
    body.location?.trim() || null
  );
  const material = db.prepare(`${materialSelect} WHERE m.id = ?`).get(Number(result.lastInsertRowid));
  res.status(201).json({ material: mapMaterial(material) });
});

app.put("/api/materials/:id", (req, res) => {
  const id = parseId(req.params.id);
  const existing = id ? db.prepare("SELECT * FROM materials WHERE id = ?").get(id) : null;
  if (!existing) throw new HttpError(404, "Material not found.");
  const body = req.body || {};
  db.prepare(`
    UPDATE materials SET name = ?, category = ?, unit = ?, min_stock = ?, unit_cost = ?, supplier = ?, location = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    requireString(body.name ?? existing.name, "Material name"),
    body.category?.trim() || existing.category,
    body.unit?.trim() || existing.unit,
    Math.max(0, Number(body.minStock ?? existing.min_stock) || 0),
    Math.max(0, Math.round(Number(body.unitCost ?? existing.unit_cost) || 0)),
    body.supplier === undefined ? existing.supplier : body.supplier?.trim() || null,
    body.location === undefined ? existing.location : body.location?.trim() || null,
    id
  );
  const material = db.prepare(`${materialSelect} WHERE m.id = ?`).get(id);
  res.json({ material: mapMaterial(material) });
});

app.post("/api/materials/:id/movements", (req, res) => {
  const id = parseId(req.params.id);
  const material = id ? db.prepare("SELECT * FROM materials WHERE id = ?").get(id) : null;
  if (!material) throw new HttpError(404, "Material not found.");
  const body = req.body || {};
  const type = body.type === "in" ? "in" : body.type === "out" ? "out" : null;
  if (!type) throw new HttpError(400, "Movement type must be in or out.");
  const quantity = Number(body.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new HttpError(400, "Quantity must be greater than zero.");
  const date = requireDate(body.date);
  const orderId = validateReference("orders", parseId(body.orderId), "Order");
  const workerId = validateReference("workers", parseId(body.workerId), "Team member");
  const unitCost = Math.max(0, Math.round(Number(body.unitCost ?? material.unit_cost) || 0));
  if (type === "out" && quantity > Number(material.stock)) {
    throw new HttpError(400, `Only ${material.stock} ${material.unit} in stock.`);
  }

  db.exec("BEGIN");
  try {
    const newStock = type === "in" ? Number(material.stock) + quantity : Number(material.stock) - quantity;
    if (type === "in" && unitCost > 0) {
      db.prepare("UPDATE materials SET stock = ?, unit_cost = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(newStock, unitCost, id);
    } else {
      db.prepare("UPDATE materials SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(newStock, id);
    }
    const movement = db.prepare(`
      INSERT INTO material_movements (material_id, type, quantity, unit_cost, date, order_id, worker_id, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, type, quantity, unitCost, date, orderId, workerId, body.note?.trim() || null);

    let transaction = null;
    const expenseAmount = Math.round(Number(body.expenseAmount ?? quantity * unitCost) || 0);
    if (type === "in" && body.recordExpense && expenseAmount > 0) {
      const tx = db.prepare(`
        INSERT INTO transactions
          (type, amount, date, category, description, client_id, order_id, worker_id, method, reference, notes)
        VALUES ('expense', ?, ?, 'Materials', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        expenseAmount,
        date,
        `Stock received — ${material.name}`,
        deriveClientId(orderId, null),
        orderId,
        workerId,
        body.method || "Bank transfer",
        `STK-${String(id).padStart(3, "0")}-${date.replaceAll("-", "")}`,
        body.note?.trim() || null
      );
      transaction = mapTransaction(db.prepare(`${txSelect} WHERE t.id = ?`).get(Number(tx.lastInsertRowid)));
    }

    db.exec("COMMIT");
    const updated = db.prepare(`${materialSelect} WHERE m.id = ?`).get(id);
    const movementRow = db.prepare(`${movementSelect} WHERE mm.id = ?`).get(Number(movement.lastInsertRowid));
    res.status(201).json({
      material: mapMaterial(updated),
      movement: mapMovement(movementRow),
      transaction,
    });
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
});

// ——— Workers ——————————————————————————————————————————————————
app.get("/api/workers", (_req, res) => {
  const workers = db.prepare(`${workerSelect} ORDER BY CASE w.status WHEN 'active' THEN 0 WHEN 'on_leave' THEN 1 ELSE 2 END, w.name`).all().map(mapWorker);
  const departments = [...new Set(workers.map((w) => w.department))].sort();
  res.json({ workers, departments });
});

app.get("/api/workers/:id", (req, res) => {
  const id = parseId(req.params.id);
  const worker = id ? db.prepare(`${workerSelect} WHERE w.id = ?`).get(id) : null;
  if (!worker) throw new HttpError(404, "Worker not found.");
  const orders = db.prepare(`
    SELECT p.id, p.order_number, p.name, p.status, p.order_date, p.deadline, p.quote,
      c.name AS client_name,
      COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.order_id = p.id AND t.type = 'income'), 0) AS income
    FROM order_workers pw
    JOIN orders p ON p.id = pw.order_id
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE pw.worker_id = ?
    ORDER BY CASE p.status
      WHEN 'install' THEN 0 WHEN 'production' THEN 1 WHEN 'design' THEN 2
      WHEN 'new' THEN 3 WHEN 'completed' THEN 4 ELSE 5 END, p.deadline ASC
  `).all(id);
  const payments = db.prepare(`${txSelect} WHERE t.worker_id = ? AND t.type = 'expense' AND t.category = 'Payroll' ORDER BY t.date DESC LIMIT 8`).all(id).map(mapTransaction);
  const materialUsage = db.prepare(`${movementSelect} WHERE mm.worker_id = ? AND mm.type = 'out' ORDER BY mm.date DESC LIMIT 8`).all(id).map(mapMovement);
  const usageValue = db.prepare(`
    SELECT COALESCE(SUM(quantity * unit_cost), 0) AS value, COUNT(*) AS count
    FROM material_movements WHERE worker_id = ? AND type = 'out'
  `).get(id);

  res.json({
    worker: {
      ...mapWorker(worker),
      orders: orders.map((p) => ({
        id: p.id,
        orderNumber: p.order_number,
        name: p.name,
        status: p.status,
        orderDate: p.order_date,
        deadline: p.deadline,
        quote: p.quote,
        clientName: p.client_name,
        income: p.income,
      })),
      payments,
      materialUsage,
      usageValue: usageValue.value,
      usageCount: usageValue.count,
    },
  });
});

app.post("/api/workers", (req, res) => {
  const body = req.body || {};
  const name = requireString(body.name, "Full name");
  const role = requireString(body.role, "Role");
  const status = ["active", "on_leave", "inactive"].includes(body.status) ? body.status : "active";
  const result = db.prepare(`
    INSERT INTO workers (name, role, department, phone, email, salary, status, hire_date, avatar_color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    role,
    body.department?.trim() || "Operations",
    body.phone?.trim() || null,
    body.email?.trim() || null,
    Math.max(0, Math.round(Number(body.salary) || 0)),
    status,
    optionalDate(body.hireDate),
    body.avatarColor || "#2f6b4f"
  );
  const worker = db.prepare(`${workerSelect} WHERE w.id = ?`).get(Number(result.lastInsertRowid));
  res.status(201).json({ worker: mapWorker(worker) });
});

app.put("/api/workers/:id", (req, res) => {
  const id = parseId(req.params.id);
  const existing = id ? db.prepare("SELECT * FROM workers WHERE id = ?").get(id) : null;
  if (!existing) throw new HttpError(404, "Worker not found.");
  const body = req.body || {};
  db.prepare(`
    UPDATE workers SET name = ?, role = ?, department = ?, phone = ?, email = ?, salary = ?, status = ?, hire_date = ?, avatar_color = ?
    WHERE id = ?
  `).run(
    requireString(body.name ?? existing.name, "Full name"),
    requireString(body.role ?? existing.role, "Role"),
    body.department?.trim() || existing.department,
    body.phone === undefined ? existing.phone : body.phone?.trim() || null,
    body.email === undefined ? existing.email : body.email?.trim() || null,
    Math.max(0, Math.round(Number(body.salary ?? existing.salary) || 0)),
    ["active", "on_leave", "inactive"].includes(body.status) ? body.status : existing.status,
    body.hireDate === undefined ? existing.hire_date : optionalDate(body.hireDate),
    body.avatarColor || existing.avatar_color,
    id
  );
  const worker = db.prepare(`${workerSelect} WHERE w.id = ?`).get(id);
  res.json({ worker: mapWorker(worker) });
});

// ——— Clients ——————————————————————————————————————————————————
app.get("/api/clients", (_req, res) => {
  res.json({ clients: getClients() });
});

app.post("/api/clients", (req, res) => {
  const body = req.body || {};
  const result = db.prepare(`
    INSERT INTO clients (name, industry, contact_name, phone, email, address)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    requireString(body.name, "Client name"),
    body.industry?.trim() || "",
    body.contactName?.trim() || null,
    body.phone?.trim() || null,
    body.email?.trim() || null,
    body.address?.trim() || null
  );
  res.status(201).json({ client: getClients().find((c) => c.id === Number(result.lastInsertRowid)) });
});

app.put("/api/clients/:id", (req, res) => {
  const id = parseId(req.params.id);
  const existing = id ? db.prepare("SELECT * FROM clients WHERE id = ?").get(id) : null;
  if (!existing) throw new HttpError(404, "Client not found.");
  const body = req.body || {};
  db.prepare(`
    UPDATE clients SET name = ?, industry = ?, contact_name = ?, phone = ?, email = ?, address = ? WHERE id = ?
  `).run(
    requireString(body.name ?? existing.name, "Client name"),
    body.industry?.trim() || existing.industry,
    body.contactName === undefined ? existing.contact_name : body.contactName?.trim() || null,
    body.phone === undefined ? existing.phone : body.phone?.trim() || null,
    body.email === undefined ? existing.email : body.email?.trim() || null,
    body.address === undefined ? existing.address : body.address?.trim() || null,
    id
  );
  res.json({ client: getClients().find((c) => c.id === id) });
});

// ——— Bootstrap, search, health ——————————————————————————————
app.get("/api/bootstrap", (_req, res) => {
  const clients = db.prepare("SELECT id, name, industry FROM clients ORDER BY name").all();
  const orders = db.prepare("SELECT id, order_number, name, client_id, status, product, quote FROM orders ORDER BY name").all();
  const workers = db.prepare("SELECT id, name, role, department, status, avatar_color FROM workers ORDER BY name").all();
  const dbIncomeCategories = db.prepare("SELECT DISTINCT category FROM transactions WHERE type = 'income' ORDER BY category").all().map((r) => r.category);
  const dbExpenseCategories = db.prepare("SELECT DISTINCT category FROM transactions WHERE type = 'expense' ORDER BY category").all().map((r) => r.category);
  const incomeCategories = [...new Set(["Order payment", "Deposit", "Design fee", "Installation fee", "Consulting", ...dbIncomeCategories])];
  const expenseCategories = [...new Set(["Materials", "Payroll", "Workshop rent", "Printing", "Fabrication", "Installation", "Transport", "Equipment", "Utilities", "Software", "Marketing", "Taxes", ...dbExpenseCategories])];
  res.json({
    clients,
    orders: orders.map((p) => ({
      id: p.id,
      orderNumber: p.order_number,
      name: p.name,
      clientId: p.client_id,
      status: p.status,
      product: p.product,
      quote: p.quote,
    })),
    workers: workers.map((w) => ({ id: w.id, name: w.name, role: w.role, department: w.department, status: w.status, avatarColor: w.avatar_color })),
    categories: { income: incomeCategories, expense: expenseCategories },
    methods: ["Bank transfer", "Cash", "Card", "Cheque", "Other"],
    company: {
      name: "ZD REKLAMA",
      legalName: "Ziynat Design MChJ",
      address: "Kokand, Temur Malik St. 51B",
      phone: "+998 33 588 00 27",
      email: "hello@zdreklama.uz",
    },
  });
});

app.get("/api/search", (req, res) => {
  const query = String(req.query.q || "").trim();
  if (query.length < 2) return res.json({ results: [] });
  const search = `%${query}%`;

  const transactions = db.prepare(`${txSelect} WHERE t.description LIKE ? OR t.category LIKE ? OR c.name LIKE ? OR p.name LIKE ? ORDER BY t.date DESC LIMIT 4`)
    .all(search, search, search, search)
    .map((row) => ({
      type: "transaction",
      id: row.id,
      title: row.description,
      subtitle: `${row.type === "income" ? "Money in" : "Money out"} · ${row.category}`,
      txType: row.type,
      category: row.category,
      meta: row.amount,
      path: "/money",
    }));

  const orders = db.prepare(`
    SELECT p.*, c.name AS client_name FROM orders p LEFT JOIN clients c ON c.id = p.client_id
    WHERE p.order_number LIKE ? OR p.name LIKE ? OR p.site LIKE ? OR p.product LIKE ? OR c.name LIKE ?
    ORDER BY p.name LIMIT 4
  `).all(search, search, search, search, search).map((p) => ({
    type: "order",
    id: p.id,
    title: p.name,
    subtitle: `${p.order_number} · ${p.client_name ?? "Internal"} · ${p.status}`,
    orderNumber: p.order_number,
    clientName: p.client_name ?? null,
    status: p.status,
    path: `/orders?open=${p.id}`,
  }));

  const materials = db.prepare("SELECT * FROM materials WHERE name LIKE ? OR category LIKE ? OR supplier LIKE ? ORDER BY name LIMIT 4")
    .all(search, search, search)
    .map((m) => ({
      type: "material",
      id: m.id,
      title: m.name,
      subtitle: `${m.stock} ${m.unit} in stock${Number(m.stock) <= Number(m.min_stock) ? " · low stock" : ""}`,
      stock: Number(m.stock),
      unit: m.unit,
      low: Number(m.stock) <= Number(m.min_stock),
      path: "/materials",
    }));

  const workers = db.prepare("SELECT * FROM workers WHERE name LIKE ? OR role LIKE ? OR department LIKE ? ORDER BY name LIMIT 4")
    .all(search, search, search)
    .map((w) => ({
      type: "worker",
      id: w.id,
      title: w.name,
      subtitle: `${w.role} · ${w.department}`,
      role: w.role,
      department: w.department,
      path: "/team",
    }));

  const clients = db.prepare("SELECT * FROM clients WHERE name LIKE ? OR industry LIKE ? OR contact_name LIKE ? ORDER BY name LIMIT 4")
    .all(search, search, search)
    .map((c) => ({
      type: "client",
      id: c.id,
      title: c.name,
      subtitle: `${c.industry}${c.contact_name ? ` · ${c.contact_name}` : ""}`,
      industry: c.industry,
      contactName: c.contact_name ?? null,
      path: "/clients",
    }));

  res.json({ results: [...orders, ...clients, ...workers, ...materials, ...transactions] });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, company: "ZD REKLAMA" });
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
});

const distDir = path.join(__dirname, "..", "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.use((error, _req, res, _next) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error(error);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

app.listen(PORT, process.env.HOST || "0.0.0.0", () => {
  console.log(`ZD REKLAMA API running at http://localhost:${PORT}`);
});
