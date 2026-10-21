import { db, initSchema } from "./db.js";
import { pathToFileURL } from "node:url";

const clients = [
  { name: "Yuksak Travel", industry: "Travel", contact: "Dilshod Akramov", phone: "+998 90 555 14 08", email: "info@yuksaktravel.uz", address: "Kokand, Temur Malik St. 14" },
  { name: "Magnit Market", industry: "Retail", contact: "Mohira Usmonova", phone: "+998 91 600 22 40", email: "marketing@magnit.uz", address: "Kokand, Furqat St. 8" },
  { name: "Zor'Pizza", industry: "HoReCa", contact: "Bekzod Sattorov", phone: "+998 93 400 77 12", email: "hello@zorpizza.uz", address: "Kokand, Muqimiy St. 22" },
  { name: "Qo'qon SXF Mall", industry: "Retail", contact: "Nigora Yuldasheva", phone: "+998 90 180 33 55", email: "info@sxfmall.uz", address: "Kokand, Ahmed Yasawi St. 1" },
  { name: "HADID MOTO", industry: "Automotive", contact: "Sardor Qodirov", phone: "+998 94 710 09 18", email: "sales@hadidmoto.uz", address: "Kokand, Fergana road" },
  { name: "F98 Pharmacy", industry: "Healthcare", contact: "Aziza Karimova", phone: "+998 95 300 48 80", email: "f98@pharmacy.uz", address: "Kokand, Chorsu St. 31" },
  { name: "Agrobank", industry: "Banking", contact: "Javohir Tursunov", phone: "+998 71 200 40 40", email: "brand@agrobank.uz", address: "Kokand, Istiqlol St. 5" },
  { name: "PepsiCo", industry: "FMCG", contact: "Kamila Saidova", phone: "+998 71 140 66 00", email: "marketing@pepsico.uz", address: "Tashkent regional office" },
];

const workers = [
  { name: "Rustam Karimov", role: "Founder / Director", department: "Management", phone: "+998 90 900 12 34", email: "rustam@zdreklama.uz", salary: 8000000, status: "active", hire: "2017-03-11", color: "#2f6b4f" },
  { name: "Madina Yusupova", role: "Finance Manager", department: "Finance", phone: "+998 91 450 88 20", email: "madina@zdreklama.uz", salary: 5000000, status: "active", hire: "2020-01-15", color: "#b16a3e" },
  { name: "Dilnoza Azimova", role: "Art Director", department: "Design", phone: "+998 90 088 31 72", email: "dilnoza@zdreklama.uz", salary: 6000000, status: "active", hire: "2019-11-08", color: "#4d7868" },
  { name: "Kamola Nazarova", role: "Designer", department: "Design", phone: "+998 88 909 63 15", email: "kamola@zdreklama.uz", salary: 3500000, status: "active", hire: "2024-02-12", color: "#798c3f" },
  { name: "Jasur Toshpulatov", role: "Production Lead", department: "Production", phone: "+998 93 210 77 51", email: "jasur@zdreklama.uz", salary: 5000000, status: "active", hire: "2018-06-02", color: "#496d9c" },
  { name: "Bekzod Rahimov", role: "Print Operator", department: "Production", phone: "+998 94 330 51 09", email: "bekzod@zdreklama.uz", salary: 4000000, status: "active", hire: "2021-02-14", color: "#a07d2f" },
  { name: "Aziz Khodjaev", role: "CNC & Fabrication", department: "Production", phone: "+998 90 744 20 12", email: "aziz@zdreklama.uz", salary: 4500000, status: "active", hire: "2020-05-25", color: "#8a5d3b" },
  { name: "Sardor Mirzaev", role: "Lead Installer", department: "Installation", phone: "+998 99 808 17 43", email: "sardor@zdreklama.uz", salary: 4000000, status: "active", hire: "2022-04-17", color: "#aa5b4e" },
  { name: "Nilufar Saidova", role: "Account Manager", department: "Sales", phone: "+998 97 770 46 18", email: "nilufar@zdreklama.uz", salary: 4500000, status: "active", hire: "2020-09-21", color: "#8f5883" },
  { name: "Malika Ergasheva", role: "Sales Executive", department: "Sales", phone: "+998 95 202 39 60", email: "malika@zdreklama.uz", salary: 3500000, status: "on_leave", hire: "2023-08-01", color: "#61718a" },
];

const orders = [
  {
    number: "ZD-2026-041",
    name: "Illuminated letters for Yuksak Travel",
    client: 0,
    product: "Volumetric letters",
    status: "production",
    quote: 110000000,
    order: "2026-08-26",
    deadline: "2026-10-28",
    site: "Kokand, Temur Malik St. 14",
    manager: 8,
    priority: "high",
    notes: "Front-lit acrylic letters, 60 cm, warm white. Facade length 6.4 m. Install after 18:00.",
  },
  {
    number: "ZD-2026-042",
    name: "Magnit Market — full facade",
    client: 1,
    product: "Facade sign",
    status: "install",
    quote: 168000000,
    order: "2026-09-04",
    deadline: "2026-10-22",
    site: "Kokand, Furqat St. 8",
    manager: 8,
    priority: "high",
    notes: "Composite cladding across a 12 m facade, letters and logo. Night installation, street access confirmed.",
  },
  {
    number: "ZD-2026-043",
    name: "Zor'Pizza — entrance lightbox",
    client: 2,
    product: "Lightbox",
    status: "production",
    quote: 52000000,
    order: "2026-09-18",
    deadline: "2026-10-26",
    site: "Kokand, Muqimiy St. 22",
    manager: 8,
    priority: "normal",
    notes: "Double-sided lightbox, 160 × 60 cm. Client supplied the logo; print is ready.",
  },
  {
    number: "ZD-2026-044",
    name: "SXF Mall — entrance stela",
    client: 3,
    product: "Stela / pylon",
    status: "design",
    quote: 240000000,
    order: "2026-10-02",
    deadline: "2026-11-30",
    site: "Kokand, Ahmed Yasawi St. 1",
    manager: 8,
    priority: "normal",
    notes: "6 m pylon with illuminated logo and tenant panel. Structural drawing and city approval in progress.",
  },
  {
    number: "ZD-2026-045",
    name: "HADID MOTO — showroom lettering",
    client: 4,
    product: "Volumetric letters",
    status: "completed",
    quote: 88000000,
    order: "2026-06-10",
    deadline: "2026-07-05",
    site: "Kokand, Fergana road",
    manager: 8,
    priority: "normal",
    notes: "Brushed metal letters with halo lighting. Handed over with a 12-month warranty.",
  },
  {
    number: "ZD-2026-046",
    name: "F98 Pharmacy — pylon sign",
    client: 5,
    product: "Stela / pylon",
    status: "completed",
    quote: 126000000,
    order: "2026-05-14",
    deadline: "2026-06-18",
    site: "Kokand, Chorsu St. 31",
    manager: 8,
    priority: "high",
    notes: "Double-sided pylon with LED cross. Installation completed ahead of the pharmacy opening.",
  },
  {
    number: "ZD-2026-047",
    name: "Agrobank — branch facade",
    client: 6,
    product: "Facade sign",
    status: "new",
    quote: 190000000,
    order: "2026-10-14",
    deadline: "2026-12-05",
    site: "Kokand, Istiqlol St. 5",
    manager: 8,
    priority: "normal",
    notes: "New branch. Waiting for the final facade measurements and brand package from head office.",
  },
  {
    number: "ZD-2026-048",
    name: "PepsiCo — retail interior branding",
    client: 7,
    product: "Interior signage",
    status: "production",
    quote: 96000000,
    order: "2026-08-19",
    deadline: "2026-10-30",
    site: "Kokand and Fergana retail outlets",
    manager: 8,
    priority: "normal",
    notes: "Interior counter graphics and shelf strips for 14 outlets. Packing by city route.",
  },
  {
    number: "ZD-2026-049",
    name: "SXF Mall — LED media facade",
    client: 3,
    product: "LED display",
    status: "cancelled",
    quote: 280000000,
    order: "2026-07-08",
    deadline: "2026-10-15",
    site: "Kokand, Ahmed Yasawi St. 1",
    manager: 0,
    priority: "low",
    notes: "Client postponed the media facade to 2027. Concept and structural survey completed.",
  },
  {
    number: "ZD-2026-050",
    name: "Yuksak Travel — window banners",
    client: 0,
    product: "Banner / print",
    status: "completed",
    quote: 28000000,
    order: "2026-04-20",
    deadline: "2026-05-06",
    site: "Kokand, Temur Malik St. 14",
    manager: 8,
    priority: "normal",
    notes: "Window banner set, print and eyelets. Client installed in-house.",
  },
  {
    number: "ZD-2026-051",
    name: "HADID MOTO — fleet branding",
    client: 4,
    product: "Car branding",
    status: "install",
    quote: 58000000,
    order: "2026-09-25",
    deadline: "2026-10-24",
    site: "Kokand service center",
    manager: 8,
    priority: "normal",
    notes: "Partial wrap for six service vehicles. Two vehicles completed, four scheduled this week.",
  },
  {
    number: "ZD-2026-052",
    name: "PepsiCo — summer banner set",
    client: 7,
    product: "Banner / print",
    status: "completed",
    quote: 72000000,
    order: "2026-05-28",
    deadline: "2026-06-20",
    site: "Fergana valley retail routes",
    manager: 8,
    priority: "normal",
    notes: "Seasonal banner set for 22 retail points. Delivered in three batches.",
  },
  {
    number: "ZD-2026-053",
    name: "Magnit Market — seasonal banners",
    client: 1,
    product: "Banner / print",
    status: "completed",
    quote: 52000000,
    order: "2026-07-02",
    deadline: "2026-07-24",
    site: "Kokand, Furqat St. 8",
    manager: 8,
    priority: "normal",
    notes: "Summer promotion banners and window stickers. Repeat order for the autumn season expected.",
  },
  {
    number: "ZD-2026-054",
    name: "F98 Pharmacy — interior signs",
    client: 5,
    product: "Interior signage",
    status: "completed",
    quote: 40000000,
    order: "2026-08-06",
    deadline: "2026-09-02",
    site: "Kokand, Chorsu St. 31",
    manager: 8,
    priority: "normal",
    notes: "Department signs, wayfinding and counter plates for the new floor.",
  },
];

const crews = [
  [2, 4, 5],
  [2, 4, 6, 7],
  [3, 5, 6],
  [2, 6],
  [2, 4, 7],
  [2, 4, 6, 7],
  [8],
  [3, 5, 7],
  [0, 2, 4],
  [3, 5],
  [2, 5, 7],
  [3, 5],
  [3, 5, 7],
  [3, 5],
];

const materials = [
  { name: "Cast vinyl — 1.27m × 50m", category: "Vinyl", unit: "roll", stock: 14, min: 8, cost: 3450000, supplier: "Uzprint Materials", location: "Warehouse A" },
  { name: "Flex banner 440g", category: "Banner", unit: "sqm", stock: 620, min: 250, cost: 58000, supplier: "Tashkent Banner Co.", location: "Warehouse A" },
  { name: "UV print ink — cyan", category: "Ink", unit: "litre", stock: 8, min: 12, cost: 980000, supplier: "Durst Central Asia", location: "Print room" },
  { name: "UV print ink — magenta", category: "Ink", unit: "litre", stock: 11, min: 12, cost: 980000, supplier: "Durst Central Asia", location: "Print room" },
  { name: "UV print ink — yellow", category: "Ink", unit: "litre", stock: 6, min: 10, cost: 980000, supplier: "Durst Central Asia", location: "Print room" },
  { name: "LED module 12V", category: "Electrical", unit: "pcs", stock: 340, min: 200, cost: 42000, supplier: "Lightbox Systems", location: "Warehouse B" },
  { name: "Aluminium frame profile", category: "Hardware", unit: "m", stock: 180, min: 120, cost: 96000, supplier: "MetalPro", location: "Warehouse B" },
  { name: "Eyelets & tensioners", category: "Hardware", unit: "set", stock: 75, min: 100, cost: 24000, supplier: "Uzprint Materials", location: "Warehouse A" },
  { name: "Acrylic sheet 3mm", category: "Substrate", unit: "sheet", stock: 22, min: 10, cost: 720000, supplier: "Plast Asia", location: "Warehouse B" },
  { name: "Composite panel 3mm", category: "Substrate", unit: "sheet", stock: 16, min: 8, cost: 680000, supplier: "Plast Asia", location: "Warehouse B" },
  { name: "LED power supply 12V", category: "Electrical", unit: "pcs", stock: 28, min: 20, cost: 145000, supplier: "Lightbox Systems", location: "Warehouse B" },
  { name: "Mounting tape", category: "Consumables", unit: "roll", stock: 26, min: 15, cost: 78000, supplier: "Uzprint Materials", location: "Warehouse A" },
];

const directCostMix = [
  { category: "Materials", description: "Production materials", pct: 0.16, at: 0.28 },
  { category: "Printing", description: "Large-format print", pct: 0.06, at: 0.42 },
  { category: "Fabrication", description: "CNC, welding and assembly", pct: 0.05, at: 0.6 },
  { category: "Installation", description: "Install crew and lift", pct: 0.035, at: 0.86 },
  { category: "Transport", description: "Delivery and site transport", pct: 0.015, at: 0.92 },
];

const paymentPlans = {
  completed: [
    { pct: 0.4, at: 0.08, label: "Deposit" },
    { pct: 0.4, at: 0.6, label: "Progress payment" },
    { pct: 0.2, at: 1.02, label: "Final payment" },
  ],
  install: [
    { pct: 0.4, at: 0.08, label: "Deposit" },
    { pct: 0.4, at: 0.6, label: "Progress payment" },
  ],
  production: [
    { pct: 0.4, at: 0.08, label: "Deposit" },
    { pct: 0.3, at: 0.62, label: "Progress payment" },
  ],
  design: [{ pct: 0.3, at: 0.08, label: "Design deposit" }],
  new: [],
  cancelled: [],
};

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261020);

function pad(n) {
  return String(n).padStart(2, "0");
}

function iso(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

function inMonth(monthOffset, day) {
  const base = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const cap = monthOffset === 0 ? Math.max(1, today.getDate() - 1) : lastDay;
  return iso(new Date(base.getFullYear(), base.getMonth(), Math.min(Math.max(1, day), cap)));
}

function roundMoney(value, step = 100000) {
  return Math.max(step, Math.round(value / step) * step);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + Math.round(days));
  return iso(date);
}

function between(start, end, fraction) {
  const a = new Date(`${start}T00:00:00`).getTime();
  const b = new Date(`${end}T00:00:00`).getTime();
  return iso(new Date(a + (b - a) * fraction));
}

function notFuture(date) {
  return date <= iso(today);
}

let referenceSeq = 1;

function addTransaction(type, amount, date, category, description, opts = {}) {
  const prefix = type === "income" ? "INV" : "EXP";
  const ref = opts.reference || `${prefix}-${date.slice(0, 4)}${date.slice(5, 7)}-${String(referenceSeq++).padStart(3, "0")}`;
  db.prepare(`
    INSERT INTO transactions
      (type, amount, date, category, description, client_id, order_id, worker_id, method, reference, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    type,
    roundMoney(amount),
    date,
    category,
    description,
    opts.clientId ?? null,
    opts.orderId ?? null,
    opts.workerId ?? null,
    opts.method || "Bank transfer",
    ref,
    opts.notes ?? null
  );
}

function seedData() {
  initSchema();

  const insertClient = db.prepare(`
    INSERT INTO clients (name, industry, contact_name, phone, email, address)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const clientIds = clients.map((c) =>
    Number(insertClient.run(c.name, c.industry, c.contact, c.phone, c.email, c.address).lastInsertRowid)
  );

  const insertWorker = db.prepare(`
    INSERT INTO workers (name, role, department, phone, email, salary, status, hire_date, avatar_color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const workerIds = workers.map((w) =>
    Number(insertWorker.run(w.name, w.role, w.department, w.phone, w.email, w.salary, w.status, w.hire, w.color).lastInsertRowid)
  );

  const insertOrder = db.prepare(`
    INSERT INTO orders
      (order_number, name, client_id, product, status, quote, site, order_date, deadline, priority, manager_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const orderIds = orders.map((o) =>
    Number(
      insertOrder.run(
        o.number,
        o.name,
        clientIds[o.client],
        o.product,
        o.status,
        o.quote,
        o.site,
        o.order,
        o.deadline,
        o.priority,
        workerIds[o.manager],
        o.notes
      ).lastInsertRowid
    )
  );

  const insertCrew = db.prepare("INSERT INTO order_workers (order_id, worker_id) VALUES (?, ?)");
  crews.forEach((crew, index) => {
    crew.forEach((workerIndex) => insertCrew.run(orderIds[index], workerIds[workerIndex]));
  });

  const insertMaterial = db.prepare(`
    INSERT INTO materials (name, category, unit, stock, min_stock, unit_cost, supplier, location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const materialIds = materials.map((m) =>
    Number(insertMaterial.run(m.name, m.category, m.unit, m.stock, m.min, m.cost, m.supplier, m.location).lastInsertRowid)
  );

  const monthName = (offset) =>
    new Date(today.getFullYear(), today.getMonth() - offset, 1).toLocaleString("en-US", { month: "long" });

  // Seven months of operating history.
  for (let offset = 6; offset >= 0; offset -= 1) {
    const label = monthName(offset);

    workers.forEach((worker, index) => {
      addTransaction(
        "expense",
        worker.salary,
        inMonth(offset, 5),
        "Payroll",
        `${label} salary — ${worker.name}`,
        {
          workerId: workerIds[index],
          method: "Bank transfer",
          reference: `PAY-${iso(new Date(today.getFullYear(), today.getMonth() - offset, 1)).slice(0, 7).replace("-", "")}-${pad(index + 1)}`,
          notes: "Monthly payroll",
        }
      );
    });

    addTransaction("expense", 12000000, inMonth(offset, 3), "Workshop rent", "Workshop and office rent", { method: "Bank transfer" });
    addTransaction("expense", roundMoney(2400000 + rand() * 900000, 100000), inMonth(offset, 8), "Utilities", "Electricity, water and internet", { method: "Bank transfer" });
    addTransaction("expense", 1800000, inMonth(offset, 11), "Software", "Design, CRM and accounting subscriptions", { method: "Card" });
    addTransaction("expense", roundMoney(5800000 + rand() * 900000, 100000), inMonth(offset, 19), "Taxes", "Payroll and social contributions", { method: "Bank transfer" });

    if (offset % 2 === 0) {
      addTransaction("expense", roundMoney(3000000 + rand() * 1500000, 100000), inMonth(offset, 16), "Marketing", "Instagram content and local promotion", { method: "Card" });
    }
    if (offset % 3 === 0) {
      addTransaction("expense", 2200000, inMonth(offset, 23), "Equipment", "CNC and printer maintenance", { method: "Cash" });
    }
  }

  orders.forEach((order, index) => {
    const orderId = orderIds[index];
    const clientId = clientIds[order.client];

    (paymentPlans[order.status] || []).forEach((payment) => {
      const date = between(order.order, order.deadline, payment.at);
      if (!notFuture(date)) return;
      addTransaction(
        "income",
        order.quote * payment.pct,
        date,
        "Order payment",
        `${payment.label} — ${order.name}`,
        { clientId, orderId, method: rand() > 0.2 ? "Bank transfer" : "Cash" }
      );
    });

    if (order.status === "new" || order.status === "cancelled") return;

    const progress =
      order.status === "completed" ? 1 : order.status === "install" ? 0.92 : order.status === "design" ? 0.2 : 0.68;
    directCostMix.forEach((cost) => {
      if (cost.at > progress) return;
      const date = between(order.order, order.deadline, cost.at);
      if (!notFuture(date)) return;
      addTransaction(
        "expense",
        order.quote * cost.pct,
        date,
        cost.category,
        `${cost.description} — ${order.name}`,
        { clientId, orderId, method: cost.category === "Installation" || cost.category === "Transport" ? "Cash" : "Bank transfer" }
      );
    });
  });

  const movementData = [
    { material: 8, type: "out", qty: 6, days: 18, order: 0, worker: 6, note: "Acrylic faces for Yuksak letters", at: 0.3 },
    { material: 5, type: "out", qty: 60, days: 18, order: 0, worker: 4, note: "LED modules for letters", at: 0.4 },
    { material: 10, type: "out", qty: 4, days: 15, order: 0, worker: 4, note: "Power supplies for letters", at: 0.45 },
    { material: 9, type: "out", qty: 10, days: 10, order: 1, worker: 6, note: "Composite cladding for Magnit facade", at: 0.3 },
    { material: 6, type: "out", qty: 55, days: 10, order: 1, worker: 6, note: "Aluminium frame for facade", at: 0.35 },
    { material: 5, type: "out", qty: 90, days: 7, order: 1, worker: 4, note: "Backlit modules for Magnit", at: 0.5 },
    { material: 1, type: "out", qty: 14, days: 12, order: 2, worker: 5, note: "Lightbox print run", at: 0.4 },
    { material: 8, type: "out", qty: 2, days: 12, order: 2, worker: 6, note: "Lightbox acrylic faces", at: 0.45 },
    { material: 5, type: "out", qty: 20, days: 9, order: 2, worker: 4, note: "Lightbox LED modules", at: 0.5 },
    { material: 9, type: "out", qty: 8, days: 5, order: 3, worker: 6, note: "Composite samples for SXF pylon", at: 0.2 },
    { material: 0, type: "out", qty: 3, days: 30, order: 4, worker: 5, note: "HADID showroom vinyl", at: 0.3 },
    { material: 5, type: "out", qty: 40, days: 29, order: 4, worker: 4, note: "Halo lighting modules", at: 0.5 },
    { material: 9, type: "out", qty: 6, days: 110, order: 5, worker: 6, note: "Pylon cladding", at: 0.4 },
    { material: 5, type: "out", qty: 50, days: 108, order: 5, worker: 4, note: "Pylon LED modules", at: 0.5 },
    { material: 0, type: "out", qty: 2.5, days: 34, order: 7, worker: 5, note: "PepsiCo counter graphics", at: 0.4 },
    { material: 1, type: "out", qty: 30, days: 32, order: 7, worker: 5, note: "Interior banner panels", at: 0.45 },
    { material: 0, type: "out", qty: 5, days: 14, order: 10, worker: 5, note: "Fleet wrap vinyl", at: 0.3 },
    { material: 1, type: "out", qty: 80, days: 135, order: 9, worker: 5, note: "Yuksak window banners", at: 0.5 },
    { material: 7, type: "out", qty: 30, days: 134, order: 9, worker: 4, note: "Banner eyelets", at: 0.55 },
    { material: 1, type: "out", qty: 90, days: 95, order: 11, worker: 5, note: "PepsiCo summer banners", at: 0.5 },
    { material: 7, type: "out", qty: 40, days: 94, order: 11, worker: 4, note: "Banner finishing hardware", at: 0.55 },
    { material: 1, type: "out", qty: 70, days: 72, order: 12, worker: 5, note: "Magnit seasonal banners", at: 0.5 },
    { material: 7, type: "out", qty: 28, days: 71, order: 12, worker: 4, note: "Magnit banner eyelets", at: 0.55 },
    { material: 0, type: "out", qty: 1.5, days: 48, order: 13, worker: 5, note: "Interior vinyl for F98", at: 0.4 },
    { material: 8, type: "out", qty: 2, days: 47, order: 13, worker: 6, note: "Acrylic counter plates", at: 0.5 },
    { material: 2, type: "in", qty: 10, days: 20, order: null, worker: 1, note: "Monthly ink replenishment", supplier: "Durst Central Asia" },
    { material: 3, type: "in", qty: 10, days: 20, order: null, worker: 1, note: "Monthly ink replenishment", supplier: "Durst Central Asia" },
    { material: 4, type: "in", qty: 10, days: 20, order: null, worker: 1, note: "Monthly ink replenishment", supplier: "Durst Central Asia" },
    { material: 1, type: "in", qty: 200, days: 22, order: null, worker: 1, note: "Banner stock delivery", supplier: "Tashkent Banner Co." },
    { material: 0, type: "in", qty: 8, days: 25, order: null, worker: 1, note: "Cast vinyl restock", supplier: "Uzprint Materials" },
    { material: 8, type: "in", qty: 10, days: 26, order: null, worker: 1, note: "Acrylic sheet delivery", supplier: "Plast Asia" },
    { material: 7, type: "in", qty: 100, days: 28, order: null, worker: 1, note: "Eyelet restock", supplier: "Uzprint Materials" },
  ];

  const insertMovement = db.prepare(`
    INSERT INTO material_movements (material_id, type, quantity, unit_cost, date, order_id, worker_id, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  movementData.forEach((m) => {
    let date;
    if (m.order === null) {
      date = inMonth(0, Math.max(1, today.getDate() - m.days));
    } else {
      const order = orders[m.order];
      date = between(order.order, order.deadline, m.at);
      if (!notFuture(date)) date = iso(today);
    }
    insertMovement.run(
      materialIds[m.material],
      m.type,
      m.qty,
      materials[m.material].cost,
      date,
      m.order === null ? null : orderIds[m.order],
      m.worker === undefined ? null : workerIds[m.worker],
      m.note
    );
  });
}

export function seedDatabase({ reset = false } = {}) {
  initSchema();
  if (reset) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      DELETE FROM material_movements;
      DELETE FROM transactions;
      DELETE FROM order_workers;
      DELETE FROM orders;
      DELETE FROM materials;
      DELETE FROM workers;
      DELETE FROM clients;
      DELETE FROM sqlite_sequence;
      PRAGMA foreign_keys = ON;
    `);
  }
  const count = db.prepare("SELECT COUNT(*) AS count FROM clients").get().count;
  if (count === 0) seedData();
}

export function seedIfEmpty() {
  seedDatabase();
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  seedDatabase({ reset: true });
  const counts = {
    clients: db.prepare("SELECT COUNT(*) AS c FROM clients").get().c,
    orders: db.prepare("SELECT COUNT(*) AS c FROM orders").get().c,
    workers: db.prepare("SELECT COUNT(*) AS c FROM workers").get().c,
    materials: db.prepare("SELECT COUNT(*) AS c FROM materials").get().c,
    transactions: db.prepare("SELECT COUNT(*) AS c FROM transactions").get().c,
    movements: db.prepare("SELECT COUNT(*) AS c FROM material_movements").get().c,
  };
  console.log("Database seeded:", counts);
}
