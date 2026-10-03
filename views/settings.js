const { escapeHtml } = require('../utils');

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

module.exports = { renderSettings };
