'use strict';

/**
 * Extracts a JSON array from a string using three fallback strategies:
 *   1. Bare JSON parse (handles well-formed responses)
 *   2. Slice between first [ and last ] (handles leading/trailing junk)
 *   3. Slice between first { and last } (handles object-wrapped arrays)
 * Returns the array or null if all strategies fail.
 */
function extractArray(t) {
  // 1. Bare valid JSON
  try {
    const p = JSON.parse(t);
    if (Array.isArray(p)) return p;
    if (p && Array.isArray(p.transactions)) return p.transactions;
  } catch {}

  // 2. Slice from first [ to last ]
  const aStart = t.indexOf('[');
  const aEnd   = t.lastIndexOf(']');
  if (aStart !== -1 && aEnd > aStart) {
    try {
      const p = JSON.parse(t.slice(aStart, aEnd + 1));
      if (Array.isArray(p)) return p;
    } catch {}
  }

  // 3. Slice from first { to last } (model wrapped in an object)
  const oStart = t.indexOf('{');
  const oEnd   = t.lastIndexOf('}');
  if (oStart !== -1 && oEnd > oStart) {
    try {
      const p = JSON.parse(t.slice(oStart, oEnd + 1));
      if (Array.isArray(p)) return p;
      if (p && Array.isArray(p.transactions)) return p.transactions;
    } catch {}
  }

  return null;
}

module.exports = { extractArray };
