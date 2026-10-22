// Password login for the dashboard: one or more users stored with scrypt
// hashes in server/data/auth.json, sessions kept in an HMAC-signed cookie.
//
// Manage users from the shell:
//   node server/auth.js set-password <username>   (prompts, or reads AUTH_PASSWORD)
//   node server/auth.js list
//   node server/auth.js remove <username>
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, "data", "auth.json");
const COOKIE = "zd_session";
const SESSION_DAYS = 30;

function loadStore() {
  try {
    return JSON.parse(fs.readFileSync(AUTH_FILE, "utf8"));
  } catch {
    return { secret: crypto.randomBytes(32).toString("hex"), users: {} };
  }
}

function saveStore(store) {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify(store, null, 2), { mode: 0o600 });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

export function setPassword(username, password) {
  const store = loadStore();
  store.users[username] = hashPassword(password);
  saveStore(store);
}

function checkPassword(username, password) {
  const user = loadStore().users[username];
  // Hash even for unknown users so timing does not reveal which names exist.
  const { hash } = hashPassword(password, user?.salt || "0".repeat(32));
  if (!user) return false;
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.hash, "hex"));
}

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function makeToken(username) {
  const { secret } = loadStore();
  const payload = Buffer.from(
    JSON.stringify({ u: username, exp: Date.now() + SESSION_DAYS * 86400e3 }),
  ).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

function readSession(req) {
  const cookie = (req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`));
  if (!cookie) return null;
  const [payload, mac] = cookie.slice(COOKIE.length + 1).split(".");
  if (!payload || !mac) return null;
  const store = loadStore();
  const expected = sign(payload, store.secret);
  if (mac.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.exp < Date.now() || !store.users[data.u]) return null;
    return { username: data.u };
  } catch {
    return null;
  }
}

function cookieHeader(value, maxAgeSeconds) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

// Simple per-IP throttle: 10 failed attempts per 15 minutes.
const failures = new Map();
function tooManyFailures(ip) {
  const entry = failures.get(ip);
  if (!entry || entry.until < Date.now()) return false;
  return entry.count >= 10;
}
function recordFailure(ip) {
  const entry = failures.get(ip);
  if (!entry || entry.until < Date.now()) {
    failures.set(ip, { count: 1, until: Date.now() + 15 * 60e3 });
  } else {
    entry.count += 1;
  }
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function loginPage(error = "", username = "") {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign in · ZD REKLAMA</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px;
    background: #14171a; color: #eef0e7; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  form { width: 100%; max-width: 360px; background: #1d2125; border: 1px solid rgba(255,255,255,.08);
    border-radius: 14px; padding: 28px; }
  h1 { margin: 0 0 4px; font-size: 20px; letter-spacing: .02em; }
  p { margin: 0 0 22px; color: rgba(238,240,231,.55); font-size: 13px; }
  label { display: block; font-size: 12px; font-weight: 600; margin: 0 0 6px; color: rgba(238,240,231,.75); }
  input { width: 100%; padding: 11px 12px; margin: 0 0 16px; border-radius: 9px; font: inherit;
    border: 1px solid rgba(255,255,255,.12); background: #14171a; color: inherit; }
  input:focus { outline: 2px solid #d98a4e; outline-offset: 1px; }
  button { width: 100%; padding: 11px; border: 0; border-radius: 9px; font: inherit; font-weight: 700;
    background: #d98a4e; color: #14171a; cursor: pointer; }
  .error { background: rgba(220,80,70,.14); color: #f0a49c; border-radius: 8px; padding: 9px 12px;
    font-size: 13px; margin: 0 0 16px; }
</style>
</head>
<body>
<form method="post" action="/login">
  <h1>ZD REKLAMA</h1>
  <p>Sign in to the operations dashboard</p>
  ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
  <label for="username">Username</label>
  <input id="username" name="username" autocomplete="username" required autofocus value="${escapeHtml(username)}">
  <label for="password">Password</label>
  <input id="password" name="password" type="password" autocomplete="current-password" required>
  <button type="submit">Sign in</button>
</form>
</body>
</html>`;
}

// Paths reachable without a session (login page and its favicon).
const PUBLIC_PATHS = new Set(["/login", "/favicon.svg", "/api/health"]);

export function installAuth(app, express) {
  app.use(express.urlencoded({ extended: false, limit: "10kb" }));

  app.get("/login", (req, res) => {
    if (readSession(req)) return res.redirect("/");
    res.type("html").send(loginPage());
  });

  app.post("/login", (req, res) => {
    const ip = req.ip;
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");
    if (tooManyFailures(ip)) {
      return res.status(429).type("html").send(loginPage("Too many attempts. Try again in 15 minutes.", username));
    }
    if (!username || !password || !checkPassword(username, password)) {
      recordFailure(ip);
      return res.status(401).type("html").send(loginPage("Wrong username or password.", username));
    }
    failures.delete(ip);
    res.setHeader("Set-Cookie", cookieHeader(makeToken(username), SESSION_DAYS * 86400));
    res.redirect("/");
  });

  app.all("/logout", (_req, res) => {
    res.setHeader("Set-Cookie", cookieHeader("", 0));
    res.redirect("/login");
  });

  app.use((req, res, next) => {
    if (PUBLIC_PATHS.has(req.path)) return next();
    const session = readSession(req);
    if (session) {
      req.user = session;
      return next();
    }
    if (req.path.startsWith("/api/")) {
      return res.status(401).json({ error: "Please sign in again." });
    }
    res.redirect("/login");
  });

  app.get("/api/me", (req, res) => {
    res.json({ username: req.user.username });
  });
}

// CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, username] = process.argv.slice(2);
  if (command === "set-password" && username) {
    let password = process.env.AUTH_PASSWORD;
    if (!password) {
      const readline = await import("node:readline/promises");
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      password = await rl.question(`New password for ${username}: `);
      rl.close();
    }
    if (!password || password.length < 8) {
      console.error("Password must be at least 8 characters.");
      process.exit(1);
    }
    setPassword(username, password);
    console.log(`Password set for ${username}.`);
  } else if (command === "list") {
    console.log(Object.keys(loadStore().users).join("\n") || "(no users)");
  } else if (command === "remove" && username) {
    const store = loadStore();
    delete store.users[username];
    saveStore(store);
    console.log(`Removed ${username}.`);
  } else {
    console.log("Usage: node server/auth.js set-password <user> | list | remove <user>");
  }
}
