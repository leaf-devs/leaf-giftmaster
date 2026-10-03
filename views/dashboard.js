const { escapeHtml } = require('../utils');

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

module.exports = { renderDashboard };
