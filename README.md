# ZD REKLAMA — Signage Production OS

A single operations platform for **ZD REKLAMA**, the signage workshop of **Ziynat Design MChJ** in Kokand. It connects the money ledger, production orders, material stock, crew payroll, and client accounts so every number can be traced back to the job that produced it.

Built for signage work — volumetric letters, facade signs, pylons, lightboxes, LED displays, vehicle branding, banners, and interior signage. Currency is **UZS**.

A 45-second product reel is generated from the running app — see [`video/`](video/README.md).

```bash
npm run dev    # in one terminal
npm run video  # in another → video/zdreklama-demo.mp4
```

## What it does

- **Dashboard** — current-month money in/out, net profit and margin, a six-month cash-flow chart, expense mix, open-order pulse, recent ledger entries, low-stock watch, and crew snapshot.
- **Money** — the central income/expense ledger. Filter by type, month, or order; search descriptions and references; create, edit, and delete entries; export the filtered view to CSV.
- **Orders** — a production board for every job, with quote value, collected payments, direct costs, balance due, crew, material movements, and recent ledger entries. Create and edit orders, assign a manager and crew, record payments and expenses, and move jobs through production.
- **Materials** — stock levels, unit costs, reorder thresholds, low-stock alerts, intake and usage, and a movement log linked to orders and workers. Receiving stock can create a `Materials` expense in the same database transaction.
- **Team** — worker profiles with department, contact details, salary, hire date, order assignments, payroll history, material usage, and a one-click **Pay salary** flow.
- **Clients** — brand accounts with contacts, industry, money received, order history, active orders, and last payment date.
- **Command palette** — press `⌘K` / `Ctrl+K` to jump to any page or search orders, clients, materials, workers, and ledger entries.

## Order workflow

```text
New request → In design → In production → Ready to install → Completed
                                                     ↘ Cancelled
```

The order board sorts active work by urgency: `install`, `production`, `design`, `new`, then `completed` and `cancelled`. Each order keeps:

- order number (`ZD-YYYY-NNN`, generated automatically), client, product, quote, site, order date, and deadline
- priority, manager, assigned crew, and production notes
- linked income and expenses from the central ledger
- linked material movements and their quantities, costs, orders, and workers

Order economics are calculated from the ledger: `profit = linked income − linked expenses`, and `balance = quote − linked income` (cancelled orders show a zero balance).

## Stack

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, custom component CSS, Recharts, TanStack Query, React Router
- **Backend:** Express 5
- **Database:** SQLite through Node's built-in `node:sqlite` module
- **Fonts:** Manrope and DM Mono, bundled locally with Fontsource

No external services or credentials are required.

## Getting started

Requirements:

- Node.js **22.12+** (Node 24 recommended; the built-in SQLite module is still marked experimental)
- npm

```bash
npm install
npm run seed     # optional: reset the database and load the demo workshop
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

`npm run dev` starts both processes:

- Vite frontend on `http://localhost:5173`
- Express API on `http://localhost:4000`

Vite proxies `/api` to the API server. If the database is empty, the API seeds it automatically on first start.

## Demo dataset

The seed is an **October 2026 operating snapshot** of the workshop:

| Record | Count |
| --- | ---: |
| Clients | 8 |
| Orders | 14 |
| Workers | 10 |
| Materials | 12 |
| Ledger entries | 183 |
| Stock movements | 32 |

Orders are split across the production flow: 1 new, 1 in design, 3 in production, 2 ready to install, 6 completed, and 1 cancelled. The dataset includes realistic Kokand signage work, payroll, workshop overhead, supplier deliveries, and material usage.

For a clean reset:

```bash
npm run seed
```

This deletes the operational tables and reloads the demo data. There is no migration layer in this project; if the schema changes, delete `server/data/zdreklama.db` and reseed.

> The seed is a demonstration snapshot. Replace the demo clients, workers, orders, and figures with your own records before using the system for live company data.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start API and frontend together with file watching |
| `npm run dev:api` | Start only the Express API |
| `npm run dev:web` | Start only Vite |
| `npm run build` | Type-check and build the frontend into `dist/` |
| `npm start` | Run the production Express server and serve `dist/` |
| `npm run seed` | Reset the database and reload the demo dataset |
| `npm run video` | Capture the running app and compose `video/zdreklama-demo.mp4` |

## Production

```bash
npm run build
npm start
```

The API serves the built frontend from `dist/` when it exists, so the whole app runs on `http://localhost:4000`. Set `PORT` to use another port:

```bash
PORT=8080 npm start
```

SQLite data lives at `server/data/zdreklama.db` and is ignored by Git. Back up that file to preserve company data. Deleting it (or running `npm run seed`) resets the system to the demo dataset.

## Users and login

The dashboard is behind a sign-in page. Users live in `server/data/auth.json` (scrypt-hashed passwords, ignored by Git); sessions are HMAC-signed cookies valid for 30 days. Ten failed attempts from one IP lock it out for 15 minutes.

```bash
node server/auth.js set-password admin   # create a user or change their password
node server/auth.js list                 # list users
node server/auth.js remove admin         # delete a user
```

Create at least one user before first use, or nobody can sign in. `/api/health` and `/login` are the only public routes.

## Data model

| Table | Purpose |
| --- | --- |
| `clients` | Brand accounts, contacts, industry, address |
| `orders` | Order number, quote, product, status, dates, site, priority, manager, notes |
| `order_workers` | Many-to-many crew assignments |
| `workers` | Crew profiles, role, department, salary, employment status |
| `materials` | Stock on hand, reorder level, unit cost, supplier, location |
| `material_movements` | Stock in/out events linked to orders and workers |
| `transactions` | Money in/out ledger linked to clients, orders, and workers |

### Money and payroll

- The ledger is cash-basis: an entry is money actually received or paid on its `date`.
- Payroll is a normal ledger expense with category `Payroll`, linked to the worker. It appears in the worker’s paid-to-date total and in order economics when linked to an order.
- Deleting a ledger entry removes it from order, client, and worker rollups. Operational records (orders, clients, workers, materials) are intentionally not deletable from the UI so production history is not lost.

### Materials

- Stock value is `stock × unit cost`.
- Receiving stock updates the stock level and, when a unit cost is supplied, the material’s current cost basis.
- A receipt can create a `Materials` expense atomically with the stock update. Zero-cost receipts can still update stock without creating a zero-value ledger entry.
- Material usage deducts stock and records the movement at the material’s current cost basis. Usage itself does not create a second ledger expense; the purchase is expensed when the stock is received.
- Usage above available stock is rejected with a `400` response.

## API overview

All routes return JSON. Errors use `{ "error": "..." }` with an appropriate HTTP status.

```text
GET    /api/health
GET    /api/dashboard
GET    /api/bootstrap
GET    /api/search?q=

GET    /api/transactions
POST   /api/transactions
PUT    /api/transactions/:id
DELETE /api/transactions/:id

GET    /api/orders
GET    /api/orders/:id
POST   /api/orders
PUT    /api/orders/:id

GET    /api/materials
POST   /api/materials
PUT    /api/materials/:id
POST   /api/materials/:id/movements

GET    /api/workers
GET    /api/workers/:id
POST   /api/workers
PUT    /api/workers/:id

GET    /api/clients
POST   /api/clients
PUT    /api/clients/:id
```

Referenced clients, orders, and workers are validated before writes. Invalid dates, non-positive amounts, over-stock usage, and missing references return `400` rather than a database error.

Order statuses are `new`, `design`, `production`, `install`, `completed`, and `cancelled`. Product types are `Volumetric letters`, `Facade sign`, `Stela / pylon`, `Lightbox`, `LED display`, `Car branding`, `Banner / print`, `Interior signage`, and `Other`.

## Project layout

```text
server/
  index.js        Express API, queries, validation, static serving
  db.js           SQLite connection and schema
  seed.js         Demo dataset and reset
  data/           SQLite database (ignored by Git)
src/
  pages/          Dashboard, Money, Orders, Materials, Team, Clients
  components/     Layout, sheets, drawers, dialogs, palette, shared UI
  api.ts          Typed API client
  types.ts        Shared frontend types
  index.css       Design system and responsive rules
  lib/            Formatting, date, and query invalidation helpers
video/
  capture.mjs     Puppeteer capture for the demo reel
  compose.mjs     ffmpeg assembly of the MP4
  studio/         Branded title, caption, and closing cards
```

## Assumptions and scope

- Every page and API route requires a password login (see **Users and login**). There is no role-based access: all users see everything.
- Currency is UZS, dates use the local operating timezone, and the workshop is based in Kokand, Uzbekistan.
- Demo people, order history, and figures are fictional. Client names are used only to make the demo dataset feel like real signage work.
- There is no migration system. Schema changes require a database reset.
- The frontend is a single-page app intended for a trusted internal network or a single-company deployment.

## Company

**ZD REKLAMA** — Ziynat Design MChJ  
Kokand, Temur Malik St. 51B  
+998 33 588 00 27  
hello@zdreklama.uz
