import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "zdreklama.db"));
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      industry TEXT NOT NULL DEFAULT '',
      contact_name TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT NOT NULL DEFAULT 'Operations',
      phone TEXT,
      email TEXT,
      salary INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      hire_date TEXT,
      avatar_color TEXT NOT NULL DEFAULT '#2f6b4f',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      product TEXT NOT NULL DEFAULT 'Volumetric letters',
      status TEXT NOT NULL DEFAULT 'new',
      quote INTEGER NOT NULL DEFAULT 0,
      site TEXT,
      order_date TEXT,
      deadline TEXT,
      priority TEXT NOT NULL DEFAULT 'normal',
      manager_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_workers (
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
      PRIMARY KEY (order_id, worker_id)
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Other',
      unit TEXT NOT NULL DEFAULT 'pcs',
      stock REAL NOT NULL DEFAULT 0,
      min_stock REAL NOT NULL DEFAULT 0,
      unit_cost INTEGER NOT NULL DEFAULT 0,
      supplier TEXT,
      location TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      amount INTEGER NOT NULL CHECK (amount > 0),
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
      method TEXT NOT NULL DEFAULT 'Bank transfer',
      reference TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS material_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('in', 'out')),
      quantity REAL NOT NULL CHECK (quantity > 0),
      unit_cost INTEGER NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions(order_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_worker ON transactions(worker_id);
    CREATE INDEX IF NOT EXISTS idx_movements_material ON material_movements(material_id);
    CREATE INDEX IF NOT EXISTS idx_movements_date ON material_movements(date);
  `);
}
