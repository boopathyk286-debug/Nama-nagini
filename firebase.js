// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAuE95hSCbvKPG2eq3ICTanW3dPxYvsXag",
  authDomain: "nama-game-2bb2d.firebaseapp.com",
  projectId: "nama-game-2bb2d",
  storageBucket: "nama-game-2bb2d.firebasestorage.app",
  messagingSenderId: "1051522618429",
  appId: "1:1051522618429:web:2f84101ca7abdddc948654",
  measurementId: "G-8LZERLFEDD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
const analytics = getAnalytics(app);
const db = getFirestore(app);
const realtimeDB = getDatabase(app);
const auth = getAuth(app);

// Export
export { app, analytics, db, realtimeDB, auth };
