const path = require("path");
const fsp = require("fs").promises;
const { requireLogin } = require("../middleware/auth");
const { resolveStockFile } = require("../utils");
const { renderEditor, renderSaved } = require("../views/editor");

function registerFileRoutes(app) {
  app.post("/create", requireLogin, async (req, res) => {
    try {
      const { folder, fileName } = req.body || {};
      if (folder !== "free" && folder !== "premium") return res.status(400).send("Invalid folder selection");
      if (typeof fileName !== "string" || !fileName.trim()) return res.status(400).send("Invalid file name");
      let name = fileName.trim();
      if (!name.endsWith(".txt")) name += ".txt";
      if (!/^[a-zA-Z0-9_.-]+\.txt$/.test(name) || name.includes("..")) return res.status(400).send("Invalid file name");
      const full = resolveStockFile(folder, name);
      try { await fsp.access(full); return res.status(409).send("File already exists"); } catch {}
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
      if (typeof oldFileName !== "string" || typeof newFileName !== "string") return res.status(400).send("Invalid input");
      const oldSafe = path.basename(oldFileName);
      let newName = newFileName.trim();
      if (newName.endsWith(".txt")) newName = newName.slice(0, -4);
      if (!/^[a-zA-Z0-9_-]+$/.test(newName) || newName.includes("..")) return res.status(400).send("Invalid new file name");
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
      if (typeof fileName !== "string") return res.status(400).send("Invalid file name");
      const full = resolveStockFile(folder, path.basename(fileName));
      await fsp.unlink(full);
      res.send("File deleted successfully");
    } catch (err) {
      console.error("Delete failed:", err);
      res.status(500).send("Error deleting file");
    }
  });

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
}

module.exports = { registerFileRoutes };
