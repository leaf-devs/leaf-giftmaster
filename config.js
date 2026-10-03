const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const CONFIG_PATH = path.join(ROOT, "config.json");

function loadConfig() {
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

module.exports = { CONFIG_PATH, loadConfig, saveConfig };
