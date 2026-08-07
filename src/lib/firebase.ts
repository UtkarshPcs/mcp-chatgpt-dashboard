import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDClpvK0Pcsu5oeeeqCXzLaH7Rivm6xtgY",
  authDomain: "gen-lang-client-0473620930.firebaseapp.com",
  databaseURL: "https://gen-lang-client-0473620930-default-rtdb.firebaseio.com",
  projectId: "gen-lang-client-0473620930",
  storageBucket: "gen-lang-client-0473620930.firebasestorage.app",
  messagingSenderId: "236501979139",
  appId: "1:236501979139:web:b4b3be25c4093db48e3e36",
  measurementId: "G-Q5Y98DZGT7"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
