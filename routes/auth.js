const path = require("path");
const rateLimit = require("express-rate-limit");
const { DASHBOARD_DIR } = require("../paths");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many login attempts. Try again later.",
});

function registerAuthRoutes(app) {
  app.post("/login", loginLimiter, (req, res) => {
    const ADMIN_USER = process.env.USERNAME;
    const ADMIN_PASS = process.env.PASSWORD;

    const username = String(req.body.username || "");
    const password = String(req.body.password || "");

    const userOk = username === ADMIN_USER;
    const passOk = password === ADMIN_PASS;

    if (userOk && passOk) {
      req.session.user = { username };
      return res.redirect("/edit");
    }

    res.status(401).sendFile(path.join(DASHBOARD_DIR, "invalidlogin.html"));
  });

  app.get("/signout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("giftmaster.sid");
      res.redirect("/");
    });
  });

  app.get("/", (req, res) => {
    res.sendFile(path.join(DASHBOARD_DIR, "login.html"));
  });
}

module.exports = { registerAuthRoutes };