const path = require("path");
const fs = require("fs");
const { DASHBOARD_DIR, FREE_DIR, PREMIUM_DIR } = require("../paths");
const { escapeHtml, countLinesInFolder } = require("../utils");
const { requireLogin } = require("../middleware/auth");
const { renderDashboard } = require("../views/dashboard");
const { renderHelp } = require("../views/help");

function registerDashboardRoutes(app) {
  app.get("/edit", requireLogin, (req, res) => {
    const freeLines = countLinesInFolder(FREE_DIR);
    const premiumLines = countLinesInFolder(PREMIUM_DIR);

    let stockFiles = [];
    let pstockFiles = [];
    try { stockFiles = fs.readdirSync(FREE_DIR).filter((f) => f.endsWith(".txt")); } catch {}
    try { pstockFiles = fs.readdirSync(PREMIUM_DIR).filter((f) => f.endsWith(".txt")); } catch {}

    const buildLinks = (folder, files) => files.map((file) => {
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
    }).join("");

    res.send(renderDashboard({
      freeLines, premiumLines,
      stockFileLinks: buildLinks("free", stockFiles),
      pstockFileLinks: buildLinks("premium", pstockFiles),
    }));
  });

  app.get("/help", requireLogin, (req, res) => {
    const freeLines = countLinesInFolder(FREE_DIR);
    const premiumLines = countLinesInFolder(PREMIUM_DIR);
    res.send(renderHelp({ freeLines, premiumLines }));
  });
}

module.exports = { registerDashboardRoutes };
