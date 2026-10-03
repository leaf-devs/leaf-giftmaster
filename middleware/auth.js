const path = require("path");
const { DASHBOARD_DIR } = require("../paths");

function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(403).sendFile(path.join(DASHBOARD_DIR, "accessdecline.html"));
}

module.exports = { requireLogin };