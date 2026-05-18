import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const leaderboardRef = collection(db, "leaderboard");

export async function saveScore(name, score, difficulty) {
  console.log("💰 saveScore called with:", { name, score, difficulty });
  try {
    const docData = {
      name: name || "PLAYER_1",
      score: parseInt(score) || 0,
      difficulty: difficulty || "easy",
      created: Date.now(),
      timestamp: new Date().toISOString()
    };
    console.log("📝 Saving doc:", docData);
    
    const docRef = await addDoc(leaderboardRef, docData);
    console.log("✅ Score saved! Doc ID:", docRef.id);
    return true;
  } catch (err) {
    console.error("❌ Error saving score:", err);
    console.error("Error code:", err.code);
    console.error("Error message:", err.message);
    
    // Show specific error messages
    if (err.code === 'permission-denied') {
      console.error("⚠️ PERMISSION DENIED! Check Firestore rules in Firebase Console");
      alert("Firebase permission denied. Please check Firestore rules.");
    } else if (err.code === 'unavailable') {
      console.error("⚠️ Firebase unavailable. Check your internet connection.");
    } else if (err.code === 'not-found') {
      console.error("⚠️ Database not found. Check if Firestore is enabled.");
    }
    
    return false;
  }
}

export async function loadGlobalLeaderboard() {
  try {
    const q = query(leaderboardRef, orderBy("score", "desc"), limit(20));
    const snap = await getDocs(q);
    const results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log("📊 Global scores loaded:", results.length);
    return results;
  } catch (err) {
    console.error("❌ Error loading global:", err);
    return [];
  }
}

export async function loadTodayLeaderboard() {
  try {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const q = query(leaderboardRef, orderBy("score", "desc"), limit(50));
    const snap = await getDocs(q);
    const allScores = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const todayScores = allScores.filter(s => s.created && s.created > oneDayAgo);
    console.log("📅 Today's scores loaded:", todayScores.length);
    return todayScores.slice(0, 20);
  } catch (err) {
    console.error("❌ Error loading today:", err);
    return [];
  }
}

export async function getGlobalBest() {
  try {
    const q = query(leaderboardRef, orderBy("score", "desc"), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data();
  } catch (err) {
    console.error("❌ Error getting best:", err);
    return null;
  }
}
