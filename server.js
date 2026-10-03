require("dotenv").config();

const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const express = require("express");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const rateLimit = require("express-rate-limit");

const app = express();

// ------------------------------------------------------------------
// Boot checks
// ------------------------------------------------------------------
if (!process.env.SESSION_SECRET) {
  console.error("SESSION_SECRET missing in environment. Refusing to start.");
  process.exit(1);
}

const ADMIN_USER = process.env.USERNAME;
const ADMIN_PASS = process.env.PASSWORD;
if (!ADMIN_USER || !ADMIN_PASS) {
  console.error("Admin credentials missing (env username/password). Refusing to start.");
  process.exit(1);
}

// ------------------------------------------------------------------
// Paths
// ------------------------------------------------------------------
const ROOT = __dirname;
const DASHBOARD_DIR = path.join(ROOT, "dashboard");
const FREE_DIR = path.join(ROOT, "free");
const PREMIUM_DIR = path.join(ROOT, "premium");
const CONFIG_PATH = path.join(ROOT, "config.json");

// Ensure stock dirs exist
for (const dir of [FREE_DIR, PREMIUM_DIR]) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    console.error(`Failed to ensure ${dir}:`, err);
  }
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function loadConfig() {
  // Read fresh every time — no cached require.
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read config.json:", err);
    return {};
  }
}

function saveConfig(newConfig) {
  const json = JSON.stringify(newConfig, null, 2);
  fs.writeFileSync(CONFIG_PATH, json, "utf-8");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Resolve a file inside one of the two allowed stock folders.
 * Throws on traversal, invalid folder, or invalid filename.
 */
function resolveStockFile(folder, filename) {
  if (folder !== "free" && folder !== "premium") {
    throw new Error("invalid folder");
  }
  if (typeof filename !== "string" || !/^[a-zA-Z0-9_.-]+$/.test(filename)) {
    throw new Error("invalid filename");
  }
  if (filename.includes("..")) {
    throw new Error("invalid filename");
  }
  const baseDir = folder === "free" ? FREE_DIR : PREMIUM_DIR;
  const full = path.resolve(baseDir, filename);
  if (!full.startsWith(baseDir + path.sep)) {
    throw new Error("path traversal");
  }
  return full;
}

/**
 * Count non-empty lines in every .txt file in a folder.
 */
function countLinesInFolder(folderPath) {
  let files;
  try {
    files = fs.readdirSync(folderPath);
  } catch {
    return 0;
  }
  let total = 0;
  for (const file of files) {
    if (!file.endsWith(".txt")) continue;
    try {
      const content = fs.readFileSync(path.join(folderPath, file), "utf-8");
      total += content.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
    } catch {
      // skip unreadable files
    }
  }
  return total;
}

// ------------------------------------------------------------------
// Middleware
// ------------------------------------------------------------------

app.set("trust proxy", 1); // behind reverse proxies; safe to leave on

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(express.static(DASHBOARD_DIR));

app.use(
  session({
    store: new FileStore({
      path: path.join(ROOT, ".sessions"),
      retries: 0,
      logFn: () => {},
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      secure: false, // set true if you're behind HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    name: "giftmaster.sid",
  })
);

function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(403).sendFile(path.join(DASHBOARD_DIR, "accessdecline.html"));
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many login attempts. Try again later.",
});

// ------------------------------------------------------------------
// Auth
// ------------------------------------------------------------------

app.post("/login", loginLimiter, (req, res) => {
  const username = String(req.body.username || "");
  const password = String(req.body.password || "");

  const userOk = username === ADMIN_USER;
  const passOk = password === ADMIN_PASS;

  if (userOk && passOk) {
    req.session.user = { username };
    return res.redirect("/edit");
  }
  res.status(401).sendFile(path.join(DASHBOARD_DIR, "invalidlogin.html"));
});

app.get("/signout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("giftmaster.sid");
    res.redirect("/");
  });
});

// ------------------------------------------------------------------
// Static-ish pages
// ------------------------------------------------------------------

app.get("/", (req, res) => {
  res.sendFile(path.join(DASHBOARD_DIR, "login.html"));
});

// ------------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------------

app.get("/edit", requireLogin, (req, res) => {
  const freeLines = countLinesInFolder(FREE_DIR);
  const premiumLines = countLinesInFolder(PREMIUM_DIR);

  let stockFiles = [];
  let pstockFiles = [];
  try {
    stockFiles = fs.readdirSync(FREE_DIR).filter((f) => f.endsWith(".txt"));
  } catch {}
  try {
    pstockFiles = fs.readdirSync(PREMIUM_DIR).filter((f) => f.endsWith(".txt"));
  } catch {}

  const buildLinks = (folder, files) =>
    files
      .map((file) => {
        const safeFile = escapeHtml(file);
        const href = `/edit/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;
        return `<div class="file-item">
          <span class="file-icon"><i class="fa fa-file-text-o"></i></span>
          <a href="${href}" class="file-name">${safeFile}</a>
          <div class="file-actions">
            <button class="rename-button" data-folder="${folder}" data-file="${safeFile}" onclick="openRenameModal(this)">Rename</button>
            <button class="delete-button" data-folder="${folder}" data-file="${safeFile}" onclick="deleteFile('${folder}', '${safeFile}')">Delete</button>
          </div>
        </div>`;
      })
      .join("");

  const stockFileLinks = buildLinks("free", stockFiles);
  const pstockFileLinks = buildLinks("premium", pstockFiles);

  res.send(renderDashboard({
    freeLines,
    premiumLines,
    stockFileLinks,
    pstockFileLinks,
  }));
});

function renderDashboard({ freeLines, premiumLines, stockFileLinks, pstockFileLinks }) {
  return `<!doctype html>
<html>
<head>
<title>Giftmaster Dashboard</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
<link rel="icon" href="https://cdn.discordapp.com/attachments/1152538414017687684/1154710899525947422/gift.jpg" type="image/jpg">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ionicons@6.0.1/dist/css/ionicons.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/ScienceGear/giftmaster-slash@main/youcandeletethis/style.css">
</head>
<script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
<script nomodule src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"></script>
<style>
.navigation ul li a .icon ion-icon { font-size: 1.7rem; height: 55px; }
.button-container { position: absolute; top: 20px; right: 20px; text-align: center; }
.button { background-color: var(--blue); color: var(--white); border: none; border-radius: 5px; padding: 10px 20px; cursor: pointer; font-size: 1rem; transition: background-color 0.3s ease-in-out; }
.button:hover { background-color: #1e177d; }
.popup-container { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 300px; background: var(--white); padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); z-index: 9999; text-align: center; }
.popup-container h2 { font-size: 1.5rem; margin-bottom: 10px; }
.popup-title { font-size: 1.5rem; margin-bottom: 20px; color: var(--blue); }
.section-title { font-size: 1.5rem; color: var(--blue); margin-bottom: 10px; }
.files-section { margin-top: 20px; background: var(--gray); padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); }
.file-select { margin-bottom: 15px; }
.file-select select { width: 100%; padding: 10px; border-radius: 5px; border: 1px solid var(--black2); background-color: var(--white); font-size: 1rem; outline: none; transition: border-color 0.3s ease-in-out; }
.file-select select:focus { border-color: var(--blue); }
.fancy-input { position: relative; margin-bottom: 15px; }
.fancy-input input { width: 100%; padding: 10px 30px 10px 10px; border-radius: 5px; border: 1px solid var(--black2); background-color: var(--white); font-size: 1rem; outline: none; transition: border-color 0.3s ease-in-out; }
.fancy-input input:focus { border-color: var(--blue); }
.fancy-button { background-color: var(--blue); color: var(--white); border: none; border-radius: 5px; padding: 10px 20px; cursor: pointer; font-size: 1rem; transition: background-color 0.3s ease-in-out; }
.fancy-button:hover { background-color: #1e177d; }
.file-list { list-style: none; padding: 0; }
.file-list li { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 10px; background-color: var(--white); border-radius: 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); transition: background-color 0.3s ease-in-out; }
.file-list a { text-decoration: none; color: var(--blue); font-size: 1rem; transition: color 0.3s ease-in-out; }
.file-list li:hover { background-color: #f0f0f0; }
.file-list a:hover { color: var(--black1); }
.delete-button { background-color: var(--red); color: var(--black1); border: none; border-radius: 5px; padding: 5px 10px; cursor: pointer; font-size: 1rem; transition: background-color 0.3s ease-in-out; }
.delete-button:hover { background-color: #ff0000; color: var(--white); }
.file-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; background-color: var(--white); border-radius: 5px; margin-bottom: 10px; transition: background-color 0.3s ease-in-out; border: 2px solid transparent; }
.file-item .file-icon { margin-right: 10px; font-size: 24px; color: var(--blue); }
.file-item .file-name { text-decoration: none; color: var(--blue); font-size: 1rem; transition: color 0.3s ease-in-out; display: flex; align-items: center; justify-content: flex-start; flex-grow: 1; }
.file-item:nth-child(odd):hover { background-color: #f0f0f0; border-color: var(--blue); }
.file-item:nth-child(even):hover { background-color: #f0f0f0; border-color: var(--red); }
.rename-button { background-color: var(--green); color: var(--black1); border: none; border-radius: 5px; padding: 5px 10px; cursor: pointer; font-size: 1rem; margin-right: 5px; transition: background-color 0.3s ease-in-out; }
.rename-button:hover { background-color: #1e177d; color: var(--white); }
.modal { display: none; position: fixed; z-index: 1; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.7); }
.modal-content { background-color: #fff; margin: 15% auto; padding: 20px; border: 1px solid #ccc; width: 300px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.2); border-radius: 5px; }
.close { float: right; cursor: pointer; font-size: 20px; }
.close:hover { color: #f00; }
#newFileName { width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px; }
#renameButton { background-color: #007bff; color: #fff; border: none; border-radius: 4px; padding: 10px 20px; cursor: pointer; font-size: 16px; }
#renameButton:hover { background-color: #0056b3; }
.floating-heart { position: fixed; bottom: 20px; right: 20px; background-color: #ff5555; color: #fff; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color 0.3s ease; }
.floating-heart i { font-size: 24px; }
.tooltip { position: absolute; background-color: #333; color: #fff; padding: 5px 10px; border-radius: 5px; bottom: 50px; right: 50px; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
.floating-heart:hover { background-color: #ff3333; }
.floating-heart:hover .tooltip { opacity: 1; }
</style>
<body>
<div class="container">
<div class="navigation">
  <ul>
    <li><a href="#"><span class="icon"><ion-icon name="gift-sharp"></ion-icon></span><span class="title">Gift Master</span></a></li>
    <li><a href="/edit"><span class="icon"><ion-icon name="home-outline"></ion-icon></span><span class="title">Dashboard</span></a></li>
    <li><a href="/help"><span class="icon"><ion-icon name="help-outline"></ion-icon></span><span class="title">Help</span></a></li>
    <li><a href="/settings"><span class="icon"><ion-icon name="settings-outline"></ion-icon></span><span class="title">Settings</span></a></li>
    <li><a href="/signout"><span class="icon"><ion-icon name="log-out-outline"></ion-icon></span><span class="title">Sign Out</span></a></li>
  </ul>
</div>

<div class="main">
  <div class="topbar">
    <div class="toggle"><ion-icon name="menu-outline"></ion-icon></div>
  </div>

  <div class="cardBox">
    <div class="card"><div><div class="numbers">${freeLines + premiumLines}</div><div class="cardName">Total Stock</div></div><div class="iconBx"><ion-icon name="eye-outline"></ion-icon></div></div>
    <div class="card"><div><div class="numbers">${freeLines}</div><div class="cardName">Free</div></div><div class="iconBx"><ion-icon name="cart-outline"></ion-icon></div></div>
    <div class="card"><div><div class="numbers">${premiumLines}</div><div class="cardName">Premium</div></div><div class="iconBx"><ion-icon name="cash-outline"></ion-icon></div></div>
  </div>

  <div class="button-container">
    <button class="button" onclick="toggleCreateForm()">Create</button>
    <div class="popup-container" id="create-form-container">
      <form id="create-form" onsubmit="event.preventDefault(); createFile();">
        <h2 class="popup-title">Create File</h2>
        <div class="file-select">
          <select id="create-folder-select" name="folder" required>
            <option value="free">Stock</option>
            <option value="premium">Pstock</option>
          </select>
        </div>
        <div class="fancy-input">
          <input id="create-file-name" type="text" name="fileName" placeholder="File Name" required>
        </div>
        <button class="fancy-button" type="submit">Create</button>
      </form>
    </div>
  </div>

  <div class="files-section">
    <h2 class="section-title">Free Stock Files</h2>
    <ul class="file-list" id="stock-files">${stockFileLinks}</ul>
  </div>

  <div class="files-section">
    <h2 class="section-title">Premium Stock Files</h2>
    <ul class="file-list" id="pstock-files">${pstockFileLinks}</ul>
  </div>
</div>
</div>

<div id="renameModal" class="modal">
  <div class="modal-content">
    <span class="close" onclick="closeRenameModal()">&times;</span>
    <h2>Rename File</h2>
    <input type="text" id="newFileName" placeholder="New File Name">
    <button id="renameButton">Rename</button>
  </div>
</div>

<div class="floating-heart">
  <i class="fas fa-heart"></i>
  <div class="tooltip">Made with ❤️ By Science Gear</div>
</div>

<script>
const floatingHeart = document.querySelector('.floating-heart');
if (floatingHeart) {
  const tooltip = floatingHeart.querySelector('.tooltip');
  tooltip.style.display = 'none';
  floatingHeart.addEventListener('click', () => {
    tooltip.style.display = tooltip.style.display === 'block' ? 'none' : 'block';
  });
}

let list = document.querySelectorAll(".navigation li");
function activeLink() {
  list.forEach((item) => item.classList.remove("hovered"));
  this.classList.add("hovered");
}
list.forEach((item) => item.addEventListener("mouseover", activeLink));

let toggle = document.querySelector(".toggle");
let navigation = document.querySelector(".navigation");
let main = document.querySelector(".main");
toggle.onclick = function () {
  navigation.classList.toggle("active");
  main.classList.toggle("active");
};

function toggleCreateForm() {
  const el = document.getElementById("create-form-container");
  el.style.display = el.style.display === "block" ? "none" : "block";
}
window.addEventListener("click", function (event) {
  const el = document.getElementById("create-form-container");
  if (event.target === el) el.style.display = "none";
});

function createFile() {
  const folder = document.getElementById("create-folder-select").value;
  const fileName = document.getElementById("create-file-name").value;
  fetch('/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder, fileName })
  })
    .then(r => r.text())
    .then(msg => { alert(msg); location.reload(); })
    .catch(err => console.error('Error:', err));
}

function openRenameModal(button) {
  const modal = document.getElementById('renameModal');
  const input = document.getElementById('newFileName');
  const folder = button.getAttribute('data-folder');
  const fileName = button.getAttribute('data-file');
  input.value = fileName;
  document.getElementById('renameButton').onclick = function () {
    confirmRenameFile(folder, fileName);
  };
  modal.style.display = 'block';
}
function closeRenameModal() {
  document.getElementById('renameModal').style.display = 'none';
}
function confirmRenameFile(folder, fileName) {
  const newName = document.getElementById('newFileName').value.trim();
  if (!newName) return;
  fetch('/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder, oldFileName: fileName, newFileName: newName })
  })
    .then(r => r.text())
    .then(msg => { alert(msg); location.reload(); })
    .catch(err => console.error('Error:', err));
  closeRenameModal();
}

function deleteFile(folder, fileName) {
  if (!confirm('Delete ' + fileName + '?')) return;
  fetch('/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder, fileName })
  })
    .then(r => r.text())
    .then(msg => { alert(msg); location.reload(); })
    .catch(err => console.error('Error:', err));
}
</script>
</body>
</html>`;
}

// ------------------------------------------------------------------
// Help page
// ------------------------------------------------------------------

app.get("/help", requireLogin, (req, res) => {
  const freeLines = countLinesInFolder(FREE_DIR);
  const premiumLines = countLinesInFolder(PREMIUM_DIR);
  res.send(renderHelp({ freeLines, premiumLines }));
});

function renderHelp({ freeLines, premiumLines }) {
  return `<!doctype html>
<html>
<head>
<title>Giftmaster Dashboard - Help</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
<link rel="icon" href="https://cdn.discordapp.com/attachments/1152538414017687684/1154710899525947422/gift.jpg" type="image/jpg">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ionicons@6.0.1/dist/css/ionicons.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/ScienceGear/giftmaster-slash@main/youcandeletethis/style.css">
</head>
<script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
<script nomodule src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"></script>
<style>
.navigation ul li a .icon ion-icon { font-size: 1.7rem; height: 55px; }
.cardBox .card { padding: 30px; border-radius: 20px; background: var(--white); display: flex; justify-content: space-between; box-shadow: 0 7px 25px rgba(0,0,0,0.08); }
.cardBox .card .numbers { font-size: 2.5rem; font-weight: 500; color: var(--blue); }
.cardBox .card .cardName { color: var(--black2); font-size: 1.1rem; }
.cardBox .card .iconBx { font-size: 3.5rem; color: var(--black2); }
.bot-commands, .features { margin-top: 20px; padding: 20px; background: var(--gray); border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
.bot-commands h2, .features h2 { font-size: 1.5rem; color: var(--blue); margin-bottom: 10px; }
.bot-commands ul, .features ul { list-style: none; padding: 0; }
.bot-commands li, .features li { font-size: 1rem; margin-bottom: 10px; }
.bot-commands strong, .features strong { color: var(--green); }
.floating-heart { position: fixed; bottom: 20px; right: 20px; background-color: #ff5555; color: #fff; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.tooltip { position: absolute; background-color: #333; color: #fff; padding: 5px 10px; border-radius: 5px; bottom: 50px; right: 50px; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
.floating-heart:hover .tooltip { opacity: 1; }
</style>
<body>
<div class="container">
<div class="navigation">
  <ul>
    <li><a href="#"><span class="icon"><ion-icon name="gift-sharp"></ion-icon></span><span class="title">Gift Master</span></a></li>
    <li><a href="/edit"><span class="icon"><ion-icon name="home-outline"></ion-icon></span><span class="title">Dashboard</span></a></li>
    <li><a href="/help"><span class="icon"><ion-icon name="help-outline"></ion-icon></span><span class="title">Help</span></a></li>
    <li><a href="/settings"><span class="icon"><ion-icon name="settings-outline"></ion-icon></span><span class="title">Settings</span></a></li>
    <li><a href="/signout"><span class="icon"><ion-icon name="log-out-outline"></ion-icon></span><span class="title">Sign Out</span></a></li>
  </ul>
</div>

<div class="main">
  <div class="topbar"><div class="toggle"><ion-icon name="menu-outline"></ion-icon></div></div>

  <div class="cardBox">
    <div class="card"><div><div class="numbers">${freeLines + premiumLines}</div><div class="cardName">Total Stock</div></div><div class="iconBx"><ion-icon name="eye-outline"></ion-icon></div></div>
    <div class="card"><div><div class="numbers">${freeLines}</div><div class="cardName">Free</div></div><div class="iconBx"><ion-icon name="cart-outline"></ion-icon></div></div>
    <div class="card"><div><div class="numbers">${premiumLines}</div><div class="cardName">Premium</div></div><div class="iconBx"><ion-icon name="cash-outline"></ion-icon></div></div>
  </div>

  <div class="bot-commands">
    <h2>Bot Commands</h2>
    <ul>
      <li><strong>/help</strong>: Displays the help command.</li>
      <li><strong>/create</strong>: Create a new service.</li>
      <li><strong>/free</strong>: Generate a reward.</li>
      <li><strong>/add</strong>: Add a reward to the stock.</li>
      <li><strong>/stock</strong>: View the current stock.</li>
      <li><strong>/premium</strong>: Generate a premium reward.</li>
    </ul>
  </div>

  <div class="features">
    <h2>Features</h2>
    <ul>
      <li><strong>Automated Giveaways:</strong> GiftMaster automates the entire giveaway process, from start to finish.</li>
      <li><strong>Safety and Security:</strong> Anti-cheat measures to prevent fraudulent entries.</li>
      <li><strong>Easy Configuration:</strong> Intuitive setup process for every giveaway.</li>
    </ul>
  </div>
</div>
</div>

<div class="floating-heart">
  <i class="fas fa-heart"></i>
  <div class="tooltip">Made with ❤️ By Science Gear</div>
</div>

<script>
const floatingHeart = document.querySelector('.floating-heart');
if (floatingHeart) {
  const tooltip = floatingHeart.querySelector('.tooltip');
  tooltip.style.display = 'none';
  floatingHeart.addEventListener('click', () => {
    tooltip.style.display = tooltip.style.display === 'block' ? 'none' : 'block';
  });
}
let list = document.querySelectorAll(".navigation li");
function activeLink() {
  list.forEach((i) => i.classList.remove("hovered"));
  this.classList.add("hovered");
}
list.forEach((i) => i.addEventListener("mouseover", activeLink));
let toggle = document.querySelector(".toggle");
let navigation = document.querySelector(".navigation");
let main = document.querySelector(".main");
toggle.onclick = function () {
  navigation.classList.toggle("active");
  main.classList.toggle("active");
};
</script>
</body>
</html>`;
}

// ------------------------------------------------------------------
// Settings page
// ------------------------------------------------------------------

app.get("/settings", requireLogin, (req, res) => {
  const cfg = loadConfig();
  const freeLines = countLinesInFolder(FREE_DIR);
  const premiumLines = countLinesInFolder(PREMIUM_DIR);
  res.send(renderSettings({ cfg, freeLines, premiumLines }));
});

function renderSettings({ cfg, freeLines, premiumLines }) {
  const val = (k) => escapeHtml(cfg[k] ?? "");
  return `<!doctype html>
<html>
<head>
<title>Giftmaster Dashboard - Settings</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
<link rel="icon" href="https://cdn.discordapp.com/attachments/1152538414017687684/1154710899525947422/gift.jpg" type="image/jpg">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ionicons@6.0.1/dist/css/ionicons.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/ScienceGear/giftmaster-slash@main/youcandeletethis/style.css">
</head>
<script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
<script nomodule src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"></script>
<style>
.navigation ul li a .icon ion-icon { font-size: 1.7rem; height: 55px; }
.cardBox .card { padding: 30px; border-radius: 20px; background: var(--white); display: flex; justify-content: space-between; box-shadow: 0 7px 25px rgba(0,0,0,0.08); }
.cardBox .card .numbers { font-size: 2.5rem; font-weight: 500; color: var(--blue); }
.cardBox .card .cardName { color: var(--black2); font-size: 1.1rem; }
.cardBox .card .iconBx { font-size: 3.5rem; color: var(--black2); }
.settings-container { display: flex; justify-content: center; margin: 20px 0; }
#settings-form { width: 100%; padding: 20px; background-color: #fff; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
label { font-size: 1.2rem; }
input[type="text"] { width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; outline: none; }
input[type="submit"] { background-color: var(--blue); color: var(--white); border: none; border-radius: 5px; padding: 10px 20px; cursor: pointer; font-size: 1rem; }
.floating-heart { position: fixed; bottom: 20px; right: 20px; background-color: #ff5555; color: #fff; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.tooltip { position: absolute; background-color: #333; color: #fff; padding: 5px 10px; border-radius: 5px; bottom: 50px; right: 50px; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
.floating-heart:hover .tooltip { opacity: 1; }
</style>
<body>
<div class="container">
<div class="navigation">
  <ul>
    <li><a href="#"><span class="icon"><ion-icon name="gift-sharp"></ion-icon></span><span class="title">Gift Master</span></a></li>
    <li><a href="/edit"><span class="icon"><ion-icon name="home-outline"></ion-icon></span><span class="title">Dashboard</span></a></li>
    <li><a href="/help"><span class="icon"><ion-icon name="help-outline"></ion-icon></span><span class="title">Help</span></a></li>
    <li><a href="/settings"><span class="icon"><ion-icon name="settings-outline"></ion-icon></span><span class="title">Settings</span></a></li>
    <li><a href="/signout"><span class="icon"><ion-icon name="log-out-outline"></ion-icon></span><span class="title">Sign Out</span></a></li>
  </ul>
</div>

<div class="main">
  <div class="topbar"><div class="toggle"><ion-icon name="menu-outline"></ion-icon></div></div>

  <div class="cardBox">
    <div class="card"><div><div class="numbers">${freeLines + premiumLines}</div><div class="cardName">Total Stock</div></div><div class="iconBx"><ion-icon name="eye-outline"></ion-icon></div></div>
    <div class="card"><div><div class="numbers">${freeLines}</div><div class="cardName">Free</div></div><div class="iconBx"><ion-icon name="cart-outline"></ion-icon></div></div>
    <div class="card"><div><div class="numbers">${premiumLines}</div><div class="cardName">Premium</div></div><div class="iconBx"><ion-icon name="cash-outline"></ion-icon></div></div>
  </div>

  <div class="settings-container">
    <form id="settings-form">
      <label for="status">Status:</label>
      <input type="text" id="status" name="status" value="${val("status")}">
      <label for="genCooldown">General Cooldown (seconds):</label>
      <input type="text" id="genCooldown" name="genCooldown" value="${val("genCooldown")}">
      <label for="premiumCooldown">Premium Cooldown (seconds):</label>
      <input type="text" id="premiumCooldown" name="premiumCooldown" value="${val("premiumCooldown")}">
      <label for="website">Website:</label>
      <input type="text" id="website" name="website" value="${val("website")}">
      <label for="banner">Banner:</label>
      <input type="text" id="banner" name="banner" value="${val("banner")}">
      <label for="footer">Footer:</label>
      <input type="text" id="footer" name="footer" value="${val("footer")}">
      <input type="submit" value="Save Settings">
    </form>
  </div>
</div>
</div>

<div class="floating-heart">
  <i class="fas fa-heart"></i>
  <div class="tooltip">Made with ❤️ By Science Gear</div>
</div>

<script>
const floatingHeart = document.querySelector('.floating-heart');
if (floatingHeart) {
  const tooltip = floatingHeart.querySelector('.tooltip');
  tooltip.style.display = 'none';
  floatingHeart.addEventListener('click', () => {
    tooltip.style.display = tooltip.style.display === 'block' ? 'none' : 'block';
  });
}

document.getElementById("settings-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const body = {};
  formData.forEach((v, k) => { body[k] = v; });
  const r = await fetch("/save-settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  alert(r.ok ? "Settings saved successfully!" : "Failed to save settings.");
});

let list = document.querySelectorAll(".navigation li");
function activeLink() {
  list.forEach((i) => i.classList.remove("hovered"));
  this.classList.add("hovered");
}
list.forEach((i) => i.addEventListener("mouseover", activeLink));
let toggle = document.querySelector(".toggle");
let navigation = document.querySelector(".navigation");
let main = document.querySelector(".main");
toggle.onclick = function () {
  navigation.classList.toggle("active");
  main.classList.toggle("active");
};
</script>
</body>
</html>`;
}

// ------------------------------------------------------------------
// Save settings
// ------------------------------------------------------------------

const ALLOWED_SETTINGS = [
  "status",
  "genCooldown",
  "premiumCooldown",
  "website",
  "banner",
  "footer",
];

app.post("/save-settings", requireLogin, (req, res) => {
  const incoming = req.body || {};
  const cfg = loadConfig();

  for (const key of ALLOWED_SETTINGS) {
    if (!(key in incoming)) continue;
    let value = incoming[key];
    if (key === "genCooldown" || key === "premiumCooldown") {
      const n = parseInt(value, 10);
      if (!Number.isFinite(n) || n < 0) continue;
      value = n;
    } else {
      value = String(value);
    }
    cfg[key] = value;
  }

  try {
    saveConfig(cfg);
    res.json({ message: "Settings saved successfully" });
  } catch (err) {
    console.error("Save settings failed:", err);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// ------------------------------------------------------------------
// File operations
// ------------------------------------------------------------------

app.post("/create", requireLogin, async (req, res) => {
  try {
    const { folder, fileName } = req.body || {};
    if (folder !== "free" && folder !== "premium") {
      return res.status(400).send("Invalid folder selection");
    }
    if (typeof fileName !== "string" || !fileName.trim()) {
      return res.status(400).send("Invalid file name");
    }
    let name = fileName.trim();
    if (!name.endsWith(".txt")) name += ".txt";
    if (!/^[a-zA-Z0-9_.-]+\.txt$/.test(name) || name.includes("..")) {
      return res.status(400).send("Invalid file name");
    }
    const full = resolveStockFile(folder, name);
    try {
      await fsp.access(full);
      return res.status(409).send("File already exists");
    } catch {}
    await fsp.writeFile(full, "", { flag: "wx" });
    res.send("File created successfully");
  } catch (err) {
    console.error("Create failed:", err);
    res.status(500).send("Error creating file");
  }
});

app.post("/rename", requireLogin, async (req, res) => {
  try {
    const { folder, oldFileName, newFileName } = req.body || {};
    if (typeof oldFileName !== "string" || typeof newFileName !== "string") {
      return res.status(400).send("Invalid input");
    }
    const oldSafe = path.basename(oldFileName);
    let newName = newFileName.trim();
    if (newName.endsWith(".txt")) newName = newName.slice(0, -4);
    if (!/^[a-zA-Z0-9_-]+$/.test(newName) || newName.includes("..")) {
      return res.status(400).send("Invalid new file name");
    }
    newName += ".txt";

    const oldFull = resolveStockFile(folder, oldSafe);
    const newFull = resolveStockFile(folder, newName);
    await fsp.rename(oldFull, newFull);
    res.send("File renamed successfully");
  } catch (err) {
    console.error("Rename failed:", err);
    res.status(500).send("Error renaming file");
  }
});

app.post("/delete", requireLogin, async (req, res) => {
  try {
    const { folder, fileName } = req.body || {};
    if (typeof fileName !== "string") {
      return res.status(400).send("Invalid file name");
    }
    const full = resolveStockFile(folder, path.basename(fileName));
    await fsp.unlink(full);
    res.send("File deleted successfully");
  } catch (err) {
    console.error("Delete failed:", err);
    res.status(500).send("Error deleting file");
  }
});

// ------------------------------------------------------------------
// File editor
// ------------------------------------------------------------------

app.get("/edit/:folder/:filename", requireLogin, async (req, res) => {
  try {
    const { folder, filename } = req.params;
    const full = resolveStockFile(folder, filename);
    const content = await fsp.readFile(full, "utf-8");
    res.send(renderEditor({ folder, filename, content }));
  } catch (err) {
    console.error("Edit read failed:", err);
    res.status(404).send("File not found");
  }
});

app.post("/save/:folder/:filename", requireLogin, async (req, res) => {
  try {
    const { folder, filename } = req.params;
    const content = typeof req.body?.content === "string" ? req.body.content : "";
    const full = resolveStockFile(folder, filename);
    await fsp.writeFile(full, content, "utf-8");
    res.send(renderSaved({ folder, filename }));
  } catch (err) {
    console.error("Save failed:", err);
    res.status(500).send("Error saving file");
  }
});

function renderEditor({ folder, filename, content }) {
  const safeFolder = escapeHtml(folder);
  const safeFile = escapeHtml(filename);
  const safeContent = escapeHtml(content);
  return `<!doctype html>
<html>
<head>
<title>Giftmaster Editor</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
<link rel="icon" href="https://cdn.discordapp.com/attachments/1152538414017687684/1154710899525947422/gift.jpg" type="image/jpg">
<style>
body { font-family: Arial, sans-serif; background-color: #333; color: #fff; margin: 0; padding: 0; }
.navbar { background-color: #333; padding: 10px; display: flex; justify-content: space-between; align-items: center; }
.navbar button { background-color: transparent; color: #fff; border: none; cursor: pointer; font-size: 18px; }
.container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: calc(100vh - 60px); }
.editor { width: 90%; max-width: 800px; background-color: #1e1e1e; padding: 20px; border-radius: 5px; }
.editor textarea { width: 100%; min-height: 400px; background-color: #333; color: #fff; border: none; border-radius: 4px; padding: 10px; font-family: 'Courier New', monospace; font-size: 16px; }
.editor button { margin-top: 20px; padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 18px; }
.floating-heart { position: fixed; bottom: 20px; right: 20px; background-color: #ff5555; color: #fff; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.tooltip { position: absolute; background-color: #333; color: #fff; padding: 5px 10px; border-radius: 5px; bottom: 50px; right: 50px; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
.floating-heart:hover .tooltip { opacity: 1; }
</style>
</head>
<body>
<div class="navbar">
  <button onclick="history.back()"><i class="fas fa-arrow-left"></i> Back</button>
  <h1><i class="fas fa-file"></i> Edit File: ${safeFolder}/${safeFile}</h1>
  <i class="fas fa-moon"></i>
</div>
<div class="container">
  <div class="editor">
    <form action="/save/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}" method="post">
      <textarea name="content" placeholder="File Content" required>${safeContent}</textarea>
      <button type="submit">Save</button>
    </form>
  </div>
</div>
<div class="floating-heart">
  <i class="fas fa-heart"></i>
  <div class="tooltip">Made with ❤️ By Science Gear</div>
</div>
<script>
const fh = document.querySelector('.floating-heart');
if (fh) {
  const t = fh.querySelector('.tooltip');
  t.style.display = 'none';
  fh.addEventListener('click', () => { t.style.display = t.style.display === 'block' ? 'none' : 'block'; });
}
</script>
</body>
</html>`;
}

function renderSaved({ folder, filename }) {
  const safeFolder = escapeHtml(folder);
  const safeFile = escapeHtml(filename);
  return `<!doctype html>
<html>
<head>
<title>Saved</title>
<link rel="icon" href="https://cdn.discordapp.com/attachments/1152538414017687684/1154710899525947422/gift.jpg" type="image/jpg">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
<style>
body { font-family: Arial, sans-serif; text-align: center; background-color: #222; color: #fff; }
h1 { color: #4CAF50; }
.popup { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; animation: fade-in .5s ease forwards; }
@keyframes fade-in { from { opacity: 0; transform: scale(.9);} to { opacity: 1; transform: scale(1);} }
.popup-icon { font-size: 64px; color: #4CAF50; margin-bottom: 20px; }
.popup-message { font-size: 24px; margin-bottom: 20px; }
.popup-button { padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; text-decoration: none; }
.popup-button:hover { background-color: #45a049; }
.floating-heart { position: fixed; bottom: 20px; right: 20px; background-color: #ff5555; color: #fff; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
</style>
</head>
<body>
<div class="popup">
  <i class="fas fa-check-circle popup-icon"></i>
  <h1 class="popup-message">File "${safeFolder}/${safeFile}" saved successfully</h1>
  <a href="/edit" class="popup-button">Back to Editor</a>
</div>
<div class="floating-heart"><i class="fas fa-heart"></i></div>
</body>
</html>`;
}

// ------------------------------------------------------------------
// Catch-all + error handler
// ------------------------------------------------------------------

app.use((req, res) => {
  res.status(404).send("Not found");
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).send("Server error");
});

// ------------------------------------------------------------------
// Boot
// ------------------------------------------------------------------

const PORT = Number(loadConfig().port) || 3000;
app.listen(PORT, () => {
  console.log(`Dashboard listening on :${PORT}`);
});