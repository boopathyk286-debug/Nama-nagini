/**
 * firebase.js — Firebase Firestore integration
 * Neon Snake — Online Leaderboard
 *
 * SETUP: Replace the firebaseConfig below with your own Firebase project credentials.
 * 1. Go to https://console.firebase.google.com
 * 2. Create a project → Add a Web App
 * 3. Copy the config object and paste it below
 * 4. Enable Firestore in your project (Build → Firestore Database)
 * 5. Set Firestore rules to allow read/write (for dev), or add auth rules for prod
 *
 * Firestore Rules (for development):
 *   rules_version = '2';
 *   service cloud.firestore {
 *     match /databases/{database}/documents {
 *       match /{document=**} {
 *         allow read, write: if true;
 *       }
 *     }
 *   }
 *
 * Collections used:
 *   scores/          — all-time global leaderboard entries
 *   scores_today/    — today's scores (auto-cleaned by date field)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ──────────────────────────────────────────
//  🔥 REPLACE THIS WITH YOUR FIREBASE CONFIG
// ──────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
// ──────────────────────────────────────────

let db = null;
let firebaseEnabled = false;

// Gracefully initialize — game works offline if Firebase isn't configured
try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    firebaseEnabled = true;
    console.log("[Firebase] Connected ✓");
  } else {
    console.warn("[Firebase] No config — running in offline/demo mode.");
  }
} catch (err) {
  console.error("[Firebase] Init error:", err);
}

/**
 * Submit a score entry to Firestore.
 * @param {Object} entry  { name, score, difficulty, length, level }
 * @returns {Promise<string|null>}  document id or null on failure
 */
export async function submitScore(entry) {
  if (!firebaseEnabled || !db) return null;
  try {
    const payload = {
      name:       (entry.name || "ANON").toUpperCase().slice(0, 12),
      score:      Number(entry.score)      || 0,
      difficulty: entry.difficulty         || "easy",
      length:     Number(entry.length)     || 0,
      level:      Number(entry.level)      || 1,
      ts:         serverTimestamp(),
      dateKey:    todayKey()
    };
    const docRef = await addDoc(collection(db, "scores"), payload);
    return docRef.id;
  } catch (err) {
    console.error("[Firebase] submitScore error:", err);
    return null;
  }
}

/**
 * Fetch global all-time top scores.
 * @param {number} count  how many entries to fetch (default 20)
 * @returns {Promise<Array>}
 */
export async function fetchGlobalScores(count = 20) {
  if (!firebaseEnabled || !db) return demoScores();
  try {
    const q = query(
      collection(db, "scores"),
      orderBy("score", "desc"),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("[Firebase] fetchGlobalScores error:", err);
    return demoScores();
  }
}

/**
 * Fetch today's top scores.
 * @param {number} count
 * @returns {Promise<Array>}
 */
export async function fetchTodayScores(count = 20) {
  if (!firebaseEnabled || !db) return demoScores();
  try {
    const q = query(
      collection(db, "scores"),
      where("dateKey", "==", todayKey()),
      orderBy("score", "desc"),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("[Firebase] fetchTodayScores error:", err);
    return demoScores();
  }
}

/**
 * Fetch the #1 global score (for the start screen preview).
 * @returns {Promise<number>}
 */
export async function fetchTopScore() {
  if (!firebaseEnabled || !db) return 0;
  try {
    const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return 0;
    return snap.docs[0].data().score || 0;
  } catch {
    return 0;
  }
}

// ── Helpers ──────────────────────────────

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/** Demo data shown when Firebase isn't configured */
function demoScores() {
  return [
    { name: "VIPER",  score: 420, difficulty: "hard",   length: 42, level: 8 },
    { name: "COBRA",  score: 310, difficulty: "hard",   length: 31, level: 6 },
    { name: "PYTHON", score: 260, difficulty: "medium", length: 26, level: 5 },
    { name: "ADDER",  score: 185, difficulty: "medium", length: 19, level: 4 },
    { name: "MAMBA",  score: 140, difficulty: "easy",   length: 14, level: 3 },
    { name: "BOA",    score:  90, difficulty: "easy",   length: 9,  level: 2 },
  ];
}

export { firebaseEnabled };
