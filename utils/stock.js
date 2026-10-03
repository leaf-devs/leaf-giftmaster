const fs = require("fs").promises;
const path = require("path");

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function listServices(dir) {
  try {
    const files = await fs.readdir(dir);
    return files.filter((f) => f.endsWith(".txt"));
  } catch {
    return [];
  }
}

async function countLines(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return data.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
  } catch {
    return 0;
  }
}

async function getStockReport(baseDir) {
  const services = await listServices(baseDir);
  const report = [];
  for (const service of services) {
    const name = service.replace(/\.txt$/, "");
    const count = await countLines(path.join(baseDir, service));
    report.push({ name, count });
  }
  return report;
}

module.exports = { ensureDir, listServices, countLines, getStockReport };