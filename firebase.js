// ══════════════════════════════════════════
//  NAMA NAGINI — firebase.js
//  Leaderboard: Firestore only (no fake data)
// ══════════════════════════════════════════

// ⚠️  REPLACE WITH YOUR OWN FIREBASE CONFIG
// Go to https://console.firebase.google.com
// → Your project → Project Settings → Web App
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// ── INIT ────────────────────────────────────
let db = null;
let firebaseReady = false;

try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    firebaseReady = true;
    console.log('[Firebase] Connected ✅');
  }
} catch (e) {
  console.warn('[Firebase] Init failed — offline mode:', e.message);
}

// ── SUBMIT SCORE ─────────────────────────────
async function submitScore(name, score, difficulty) {
  if (!firebaseReady || !db) {
    console.warn('[Firebase] Not connected — score not saved');
    return false;
  }
  try {
    await db.collection('scores').add({
      name:       name.toUpperCase().trim().slice(0, 12),
      score:      Number(score),
      difficulty: difficulty,
      timestamp:  firebase.firestore.FieldValue.serverTimestamp(),
      date:       new Date().toISOString().split('T')[0]   // YYYY-MM-DD
    });
    console.log('[Firebase] Score submitted ✅');
    return true;
  } catch (e) {
    console.error('[Firebase] Submit error:', e);
    return false;
  }
}

// ── FETCH GLOBAL TOP 20 ───────────────────────
async function fetchGlobalScores() {
  if (!firebaseReady || !db) return [];
  try {
    const snap = await db.collection('scores')
      .orderBy('score', 'desc')
      .limit(20)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('[Firebase] Fetch global error:', e);
    return [];
  }
}

// ── FETCH TODAY'S TOP 20 ──────────────────────
async function fetchTodayScores() {
  if (!firebaseReady || !db) return [];
  try {
    const today = new Date().toISOString().split('T')[0];
    const snap = await db.collection('scores')
      .where('date', '==', today)
      .orderBy('score', 'desc')
      .limit(20)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('[Firebase] Fetch today error:', e);
    return [];
  }
}

// ── FETCH GLOBAL #1 ───────────────────────────
async function fetchGlobalBest() {
  if (!firebaseReady || !db) return null;
  try {
    const snap = await db.collection('scores')
      .orderBy('score', 'desc')
      .limit(1)
      .get();
    if (snap.empty) return null;
    return snap.docs[0].data();
  } catch (e) {
    return null;
  }
}

// Expose globally
window.NaginiFirebase = {
  ready: () => firebaseReady,
  submitScore,
  fetchGlobalScores,
  fetchTodayScores,
  fetchGlobalBest,
};
