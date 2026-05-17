/**
 * firebase.js — Firebase Firestore integration
 * Neon Snake — Online Leaderboard
 *
 * SETUP: Replace the firebaseConfig below with your own Firebase project credentials.
 */

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// Default fallback API
window.FirebaseAPI = {
  submitScore: async (entry) => null,
  fetchGlobalScores: async (count = 20) => demoScores(),
  fetchTodayScores: async (count = 20) => demoScores(),
  fetchTopScore: async () => 0
};

async function initFirebase() {
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
    const { getFirestore, collection, addDoc, query, orderBy, limit, where, getDocs, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");

    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);
      console.log("[Firebase] Connected ✓");

      window.FirebaseAPI.submitScore = async (entry) => {
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
      };

      window.FirebaseAPI.fetchGlobalScores = async (count = 20) => {
        try {
          const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(count));
          const snap = await getDocs(q);
          return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (err) {
          console.error("[Firebase] fetchGlobalScores error:", err);
          return demoScores();
        }
      };

      window.FirebaseAPI.fetchTodayScores = async (count = 20) => {
        try {
          const q = query(collection(db, "scores"), where("dateKey", "==", todayKey()), orderBy("score", "desc"), limit(count));
          const snap = await getDocs(q);
          return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (err) {
          console.error("[Firebase] fetchTodayScores error:", err);
          return demoScores();
        }
      };

      window.FirebaseAPI.fetchTopScore = async () => {
        try {
          const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(1));
          const snap = await getDocs(q);
          if (snap.empty) return 0;
          return snap.docs[0].data().score || 0;
        } catch {
          return 0;
        }
      };
    } else {
      console.warn("[Firebase] No config — running in offline/demo mode.");
    }
  } catch (err) {
    console.error("[Firebase] Init error or offline:", err);
  }
}
initFirebase();

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function demoScores() {
  return [
    { name: "VIPER",  score: 4, difficulty: "hard",   length: 42, level: 8 },
    { name: "COBRA",  score: 3, difficulty: "hard",   length: 31, level: 6 },
    { name: "PYTHON", score: 2, difficulty: "medium", length: 26, level: 5 },
    { name: "ADDER",  score: 1, difficulty: "medium", length: 19, level: 4 },
    { name: "MAMBA",  score: 1, difficulty: "easy",   length: 14, level: 3 },
    { name: "BOA",    score:  9, difficulty: "easy",   length: 9,  level: 2 },
  ];
}
