const { FREE_DIR, PREMIUM_DIR } = require("../paths");
const { loadConfig, saveConfig } = require("../config");
const { countLinesInFolder } = require("../utils");
const { requireLogin } = require("../middleware/auth");
const { renderSettings } = require("../views/settings");

const ALLOWED_SETTINGS = ["status", "genCooldown", "premiumCooldown", "website", "banner", "footer"];

function registerSettingsRoutes(app) {
  app.get("/settings", requireLogin, (req, res) => {
    const cfg = loadConfig();
    const freeLines = countLinesInFolder(FREE_DIR);
    const premiumLines = countLinesInFolder(PREMIUM_DIR);
    res.send(renderSettings({ cfg, freeLines, premiumLines }));
  });

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
}

module.exports = { registerSettingsRoutes };
