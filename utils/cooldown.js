const active = new Map();

/**
 * Check + set a cooldown. Returns seconds remaining if on cooldown, else 0.
 */
function hit(key, seconds) {
  const now = Date.now();
  const expires = active.get(key);
  if (expires && expires > now) {
    return Math.ceil((expires - now) / 1000);
  }
  active.set(key, now + seconds * 1000);
  return 0;
}

function clear(key) {
  active.delete(key);
}

module.exports = { hit, clear };