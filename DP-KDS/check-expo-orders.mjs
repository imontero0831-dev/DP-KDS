import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

const snap = await getDocs(collection(db, "orders"));
const orders = [];
snap.forEach((d) => orders.push({ firestoreId: d.id, ...d.data() }));

const expoVisible = orders.filter(
  (o) => o.kitchenReady && o.drinksReady && !o.delivered && !o.cancelled
);

console.log(`Total active orders: ${orders.length}`);
console.log(`Orders currently visible on Expo (ready, not delivered, not cancelled): ${expoVisible.length}`);
console.log("--- ALL active orders ---");
for (const o of orders) {
  console.log(JSON.stringify({
    firestoreId: o.firestoreId,
    table: o.table,
    isToGo: o.isToGo,
    isBar: o.isBar,
    isPatio: o.isPatio,
    kitchenReady: o.kitchenReady,
    drinksReady: o.drinksReady,
    delivered: o.delivered,
    allReadyAt: o.allReadyAt,
    itemsCount: Array.isArray(o.items) ? o.items.length : undefined,
  }, null, 0));
}
process.exit(0);
