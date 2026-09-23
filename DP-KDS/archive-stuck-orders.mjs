// Archives delivered-but-never-auto-closed tickets, mirroring the app's own
// closeTable path (copy to completedOrders, delete from orders). Adapted from
// archive-ody-order.mjs (commit 9519c2d) to take ids on the command line and
// to be idempotent.
//
// Uses setDoc with a DETERMINISTIC doc id (the order's own `id` field) rather
// than addDoc. addDoc mints a new id on every call, which is how five orders
// got archived twice on 2026-09-13 when checkPendingPayments raced across
// devices. setDoc on a stable id makes re-running this harmless. This matches
// the fix now in closeTable itself.
//
// Usage: node archive-stuck-orders.mjs <firestoreId> [<firestoreId> ...]
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBQmX7bB3Of758lfRdotynqPgwt8b87rj4",
  authDomain: "dona-patys-kds.firebaseapp.com",
  projectId: "dona-patys-kds",
  storageBucket: "dona-patys-kds.firebasestorage.app",
  messagingSenderId: "861821997056",
  appId: "1:861821997056:web:43174af9611ef2be9d08e5",
  measurementId: "G-NZ7F00L6MQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ids = process.argv.slice(2);
if (!ids.length) { console.error("need at least one firestoreId"); process.exit(1); }

let archived = 0, skipped = 0, refused = 0;
for (const firestoreId of ids) {
  const ref = doc(db, "orders", firestoreId);
  const snap = await getDoc(ref);
  if (!snap.exists()) { console.log(`SKIP     ${firestoreId} - already gone`); skipped++; continue; }
  const data = snap.data();

  // Only ever archive something the floor already marked delivered.
  if (!data.delivered) {
    console.error(`REFUSED  ${firestoreId} - delivered is not true`);
    refused++;
    continue;
  }

  const completedAt = Date.now();
  const archiveId = String(data.id || firestoreId);
  await setDoc(doc(db, "completedOrders", archiveId), {
    ...data,
    completedAt,
    duration: completedAt - (data.startedAt || data.timestamp),
    closedBy: "manual-cleanup-2026-09-22",
  });
  await deleteDoc(ref);
  const who = data.toGoName || (data.table ? `mesa ${data.table}` : "?");
  console.log(`ARCHIVED ${firestoreId} (${who}, $${((data.total || 0) / 100).toFixed(2)}) -> completedOrders/${archiveId}`);
  archived++;
}
console.log(`\narchived=${archived} skipped=${skipped} refused=${refused}`);
process.exit(0);
