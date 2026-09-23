// One-off: sends a clearly-marked TEST order so we can watch it land on all
// three kiosk screens, then delete it. Firestore ONLY -- cloverOrderId is
// null and sendOrderToClover() is deliberately NOT called, so this creates
// no order on the live Clover POS and leaves nothing to void.
// Items are chosen to light up every station: a food item (Kitchen), and
// GUACAMOLE, which DRINKS_RULES routes to the Drinks screen via "guacamol".
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

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

const order = {
  id: "TEST-" + Date.now(),
  table: null,
  isToGo: true,
  toGoName: "PRUEBA SISTEMA",
  toGoSlot: null,
  isBar: false,
  isPatio: false,
  items: [
    { id: "test-taco",  name: "TACO ASADA", price: 399, qty: 1 },
    { id: "test-guaca", name: "GUACAMOLE",  price: 299, qty: 1 },
  ],
  note: "PEDIDO DE PRUEBA - BORRAR",
  total: 698,
  timestamp: Date.now(),
  status: "new",
  editHistory: [],
  cloverOrderId: null,
  kitchenReady: false,
  drinksReady: false,
  allReady: false,
  createdAt: serverTimestamp(),
};

const ref = await addDoc(collection(db, "orders"), order);
console.log("CREATED firestoreId=" + ref.id);
process.exit(0);
