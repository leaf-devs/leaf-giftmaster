function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(403).sendFile(require("path").join(require("../paths").DASHBOARD_DIR, "accessdecline.html"));
}

module.exports = { requireLogin };
