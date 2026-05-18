import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const db = getFirestore(app);
const leaderboardRef = collection(db, "leaderboard");

// Test Firebase connection
console.log("🔥 Firebase initializing...");
console.log("Project ID:", firebaseConfig.projectId);

// Direct test function
async function testFirebaseConnection() {
  try {
    console.log("Testing Firebase connection...");
    const testDoc = await addDoc(leaderboardRef, {
      name: "TEST",
      score: 999,
      difficulty: "easy",
      created: Date.now()
    });
    console.log("✅ Firebase WORKING! Test doc ID:", testDoc.id);
    return true;
  } catch (err) {
    console.error("❌ Firebase FAILED:", err);
    console.error("Error details:", err.message);
    return false;
  }
}

let leaderboardAPI = null;

async function getLeaderboard() {
  if (!leaderboardAPI) {
    const module = await import('./leaderboard.js');
    leaderboardAPI = module;
  }
  return leaderboardAPI;
}

window.NaginiFirebase = {
  ready: () => true,
  
  testConnection: testFirebaseConnection,
  
  submitScore: async (name, score, difficulty) => {
    console.log("📤 Submitting score:", { name, score, difficulty });
    try {
      const { saveScore } = await getLeaderboard();
      const result = await saveScore(name, score, difficulty);
      console.log("Submit result:", result);
      return result;
    } catch (e) {
      console.error("Submit score error:", e);
      return false;
    }
  },
  
  fetchGlobalScores: async () => {
    try {
      const { loadGlobalLeaderboard } = await getLeaderboard();
      return await loadGlobalLeaderboard();
    } catch (e) {
      console.error("Fetch global error:", e);
      return [];
    }
  },
  
  fetchTodayScores: async () => {
    try {
      const { loadTodayLeaderboard } = await getLeaderboard();
      return await loadTodayLeaderboard();
    } catch (e) {
      console.error("Fetch today error:", e);
      return [];
    }
  },
  
  fetchGlobalBest: async () => {
    try {
      const { getGlobalBest } = await getLeaderboard();
      return await getGlobalBest();
    } catch (e) {
      console.error("Fetch best error:", e);
      return null;
    }
  }
};

// Run test on load
setTimeout(() => {
  testFirebaseConnection();
}, 2000);

export { db, leaderboardRef };
