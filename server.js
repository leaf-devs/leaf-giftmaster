require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const FileStore = require("session-file-store")(session);

const { ROOT, DASHBOARD_DIR } = require("./paths");
const { loadConfig } = require("./config");
const { registerAuthRoutes } = require("./routes/auth");
const { registerDashboardRoutes } = require("./routes/dashboard");
const { registerSettingsRoutes } = require("./routes/settings");
const { registerFileRoutes } = require("./routes/files");

if (!process.env.SESSION_SECRET) {
  console.error("SESSION_SECRET missing in environment. Refusing to start.");
  process.exit(1);
}

if (!process.env.USERNAME || !process.env.PASSWORD) {
  console.error("Admin credentials missing (env username/password). Refusing to start.");
  process.exit(1);
}

const app = express();

app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(express.static(DASHBOARD_DIR));

app.use(session({
  store: new FileStore({
    path: path.join(ROOT, ".sessions"),
    retries: 0,
    logFn: () => {},
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
  name: "giftmaster.sid",
}));

registerAuthRoutes(app);
registerDashboardRoutes(app);
registerSettingsRoutes(app);
registerFileRoutes(app);

app.use((req, res) => res.status(404).send("Not found"));

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).send("Server error");
});

const PORT = Number(loadConfig().port) || 3000;
app.listen(PORT, () => console.log(`Dashboard listening on :${PORT}`));

module.exports = app;
