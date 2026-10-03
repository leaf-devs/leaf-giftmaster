const path = require("path");
const fs = require("fs");
const { FREE_DIR, PREMIUM_DIR } = require("./paths");

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

module.exports = { escapeHtml, resolveStockFile, countLinesInFolder };
