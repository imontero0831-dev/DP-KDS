// Companion to send-test-order.mjs: removes the test order by firestoreId.
// Usage: node delete-test-order.mjs <firestoreId>
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, deleteDoc } from "firebase/firestore";

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

const id = process.argv[2];
if (!id) { console.error("need a firestoreId"); process.exit(1); }
const ref = doc(db, "orders", id);
const snap = await getDoc(ref);
if (!snap.exists()) { console.log("NOT FOUND (already gone): " + id); process.exit(0); }
const d = snap.data();
// Refuse to delete anything that isn't the marked test order.
if (d.toGoName !== "PRUEBA SISTEMA" || !String(d.id).startsWith("TEST-")) {
  console.error("REFUSING: doc " + id + " is not the test order (toGoName=" + d.toGoName + ")");
  process.exit(1);
}
await deleteDoc(ref);
console.log("DELETED " + id + " (" + d.toGoName + ")");
process.exit(0);
