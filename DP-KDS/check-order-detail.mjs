import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

const ref = doc(db, "orders", "3RDjx7qG2oioyCgGFlzL");
const snap = await getDoc(ref);
console.log(JSON.stringify(snap.data(), null, 2));
process.exit(0);
