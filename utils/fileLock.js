const locks = new Map();

/**
 * Acquire a lock for a given key. Runs `fn` after any prior holder releases.
 * Returns whatever `fn` returns.
 */
async function withLock(key, fn) {
  const prior = locks.get(key) || Promise.resolve();

  let release;
  const next = new Promise((resolve) => {
    release = resolve;
  });

  locks.set(key, prior.then(() => next));

  try {
    await prior;
  } catch {
    // swallow: prior holder's rejection should not affect us
  }

  try {
    return await fn();
  } finally {
    release();
    if (locks.get(key) === next) locks.delete(key);
  }
}

module.exports = { withLock };