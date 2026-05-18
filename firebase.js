import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAuE95hSCbvKPG2eq3ICTanW3dPxYvsXag",
  authDomain: "nama-game-2bb2d.firebaseapp.com",
  projectId: "nama-game-2bb2d",
  storageBucket: "nama-game-2bb2d.firebasestorage.app",
  messagingSenderId: "1051522618429",
  appId: "1:1051522618429:web:2f84101ca7abdddc948654"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
