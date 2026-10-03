const { escapeHtml } = require('../utils');

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

module.exports = { renderEditor, renderSaved };
