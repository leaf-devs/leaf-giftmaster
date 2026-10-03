/**
 * Coerce a color value into the number discord.js expects.
 * Accepts: "0x5865F2", "#5865F2", "5865F2", 0x5865F2, 5865F2.
 */
function parseColor(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0x5865f2;

  const cleaned = value.trim().replace(/^#/, "").replace(/^0x/i, "");
  const parsed = parseInt(cleaned, 16);
  return Number.isFinite(parsed) ? parsed : 0x5865f2;
}

module.exports = { parseColor };