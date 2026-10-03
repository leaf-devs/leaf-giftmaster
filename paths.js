const path = require("path");
const fs = require("fs");

const ROOT = __dirname;
const DASHBOARD_DIR = path.join(ROOT, "dashboard");
const FREE_DIR = path.join(ROOT, "free");
const PREMIUM_DIR = path.join(ROOT, "premium");

for (const dir of [FREE_DIR, PREMIUM_DIR]) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    console.error(`Failed to ensure ${dir}:`, err);
  }
}

module.exports = { ROOT, DASHBOARD_DIR, FREE_DIR, PREMIUM_DIR };
