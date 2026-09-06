import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, addDoc, deleteDoc } from "firebase/firestore";

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

const firestoreId = "3RDjx7qG2oioyCgGFlzL";
const ref = doc(db, "orders", firestoreId);
const snap = await getDoc(ref);

if (!snap.exists()) {
  console.log("Order already gone -- nothing to do.");
  process.exit(0);
}

const data = snap.data();
const completedAt = Date.now();
await addDoc(collection(db, "completedOrders"), {
  ...data,
  completedAt,
  duration: completedAt - (data.startedAt || data.timestamp),
});
await deleteDoc(ref);

console.log(`Archived order ${firestoreId} (Ody, $${(data.total / 100).toFixed(2)}) to completedOrders and removed from active orders.`);
process.exit(0);
