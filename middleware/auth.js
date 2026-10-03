const path = require("path");
const { DASHBOARD_DIR } = require("../paths");

function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect("/");
}

module.exports = { requireLogin };