// Staff PIN check for the Inventory page.
//
// PINs live only in server-side env vars (STAFF_PINS), never in the client
// bundle and never in Firestore. The tablet POSTs the 6 digits here and gets
// back WHO that is plus a signature it stores on every record it writes.
//
// Why the signature: Firestore is open to any browser running this app, so a
// record's "submittedBy" field alone proves nothing -- anyone could write any
// name. sig = HMAC(STAFF_SIGNING_SECRET, "id|role|issuedAt") can only be produced
// here, after a correct PIN, so a record carrying a valid sig really did come
// from a session that person opened, with that role. Re-compute it to audit a disputed entry.
//
// CommonJS on purpose (unlike clover.js): src/setupProxy.js require()s this
// same file so the PIN check also works under `npm start`.
const crypto = require("crypto");

// Keep in sync with ROLE_CAN in src/Inventory.js.
const ROLES = ["admin", "cook", "prep", "waitress"];

function loadStaff() {
  const raw = process.env.STAFF_PINS || "";
  const staff = raw.split(",").map(s => s.trim()).filter(Boolean).map(entry => {
    const [id, name, role, pin] = entry.split(":").map(p => p.trim());
    return { id, name, role, pin };
  });
  const bad = staff.find(s => !s.id || !s.name || !s.role || !/^\d{6}$/.test(s.pin || ""));
  if (bad) throw new Error("STAFF_PINS has a malformed entry");
  if (staff.some(s => !ROLES.includes(s.role))) throw new Error("STAFF_PINS has an unknown role");
  // Two people sharing a PIN would make every record ambiguous -- refuse to
  // run at all rather than silently attribute to whoever is listed first.
  if (new Set(staff.map(s => s.pin)).size !== staff.length) throw new Error("STAFF_PINS has duplicate PINs");
  if (new Set(staff.map(s => s.id)).size !== staff.length) throw new Error("STAFF_PINS has duplicate ids");
  return staff;
}

function sign(secret, id, role, issuedAt) {
  return crypto.createHmac("sha256", secret).update(`${id}|${role}|${issuedAt}`).digest("hex");
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.STAFF_SIGNING_SECRET;
  let staff;
  try {
    staff = loadStaff();
  } catch (err) {
    console.error("staff-auth config error:", err.message);
    return res.status(500).json({ error: "not_configured" });
  }
  if (!secret || staff.length === 0) {
    return res.status(500).json({ error: "not_configured" });
  }

  const pin = String((req.body || {}).pin || "");
  // Compare against every entry in constant time so response timing doesn't
  // leak which PINs are close.
  let match = null;
  for (const s of staff) {
    const a = Buffer.from(s.pin);
    const b = Buffer.from(pin.padEnd(6, "x").slice(0, 6));
    if (pin.length === 6 && crypto.timingSafeEqual(a, b)) match = s;
  }

  if (!match) {
    // Slows down guessing; the tablet also locks itself after 5 misses.
    await sleep(600);
    return res.status(401).json({ error: "bad_pin" });
  }

  const issuedAt = Date.now();
  return res.status(200).json({
    id: match.id,
    name: match.name,
    role: match.role,
    issuedAt,
    sig: sign(secret, match.id, match.role, issuedAt),
  });
};
