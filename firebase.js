# Complete Firebase Leaderboard JavaScript

```javascript
// ===============================
// FIREBASE IMPORTS
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===============================
// FIREBASE CONFIG
// ===============================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "XXXXXXXX",
  appId: "YOUR_APP_ID"
};

// ===============================
// INITIALIZE FIREBASE
// ===============================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===============================
// TODAY DATE KEY
// ===============================
function todayKey() {
  const d = new Date();

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// ===============================
// SAVE SCORE
// ===============================
async function saveScore(playerName, playerScore) {
  try {

    // BASIC VALIDATION
    if (!playerName || playerName.trim() === '') {
      alert('Enter player name');
      return;
    }

    if (playerScore < 0) {
      return;
    }

    // LIMIT SCORE
    if (playerScore > 500) {
      console.log('Fake score blocked');
      return;
    }

    // SAVE TO FIRESTORE
    await addDoc(collection(db, 'scores'), {
      name: playerName.trim().substring(0, 10).toUpperCase(),
      score: Number(playerScore),
      dateKey: todayKey(),
      createdAt: serverTimestamp()
    });

    console.log('Score saved successfully');

    // REFRESH LEADERBOARD
    loadLeaderboard();

  } catch (error) {
    console.error('Error saving score:', error);
  }
}

// ===============================
// LOAD LEADERBOARD
// ===============================
async function loadLeaderboard() {

  try {

    const leaderboardBody = document.getElementById('leaderboardBody');

    if (!leaderboardBody) {
      return;
    }

    leaderboardBody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

    // FIRESTORE QUERY
    const q = query(
      collection(db, 'scores'),
      where('dateKey', '==', todayKey()),
      orderBy('score', 'desc'),
      limit(10)
    );

    const querySnapshot = await getDocs(q);

    leaderboardBody.innerHTML = '';

    // NO DATA
    if (querySnapshot.empty) {
      leaderboardBody.innerHTML = `
        <tr>
          <td colspan="3">No scores today</td>
        </tr>
      `;
      return;
    }

    let rank = 1;

    querySnapshot.forEach((doc) => {

      const data = doc.data();

      const row = document.createElement('tr');

      row.innerHTML = `
        <td>#${rank}</td>
        <td>${data.name}</td>
        <td>${data.score}</td>
      `;

      leaderboardBody.appendChild(row);

      rank++;
    });

  } catch (error) {

    console.error('Leaderboard error:', error);

    const leaderboardBody = document.getElementById('leaderboardBody');

    if (leaderboardBody) {
      leaderboardBody.innerHTML = `
        <tr>
          <td colspan="3">Leaderboard failed</td>
        </tr>
      `;
    }
  }
}

// ===============================
// GAME OVER FUNCTION
// ===============================
async function gameOver(finalScore) {

  const playerName = prompt('Enter Your Name');

  if (!playerName) {
    return;
  }

  await saveScore(playerName, finalScore);
}

// ===============================
// AUTO LOAD LEADERBOARD
// ===============================
window.addEventListener('DOMContentLoaded', () => {
  loadLeaderboard();
});

// ===============================
// EXAMPLE BUTTON
// ===============================
const testButton = document.getElementById('testSubmit');

if (testButton) {

  testButton.addEventListener('click', () => {
    saveScore('TEST', Math.floor(Math.random() * 100));
  });
}
```

---

# HTML TABLE REQUIRED

```html
<table>
  <thead>
    <tr>
      <th>Rank</th>
      <th>Name</th>
      <th>Score</th>
    </tr>
  </thead>

  <tbody id="leaderboardBody">
  </tbody>
</table>
```

---

# FIRESTORE RULES

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /scores/{document} {
      allow read: if true;

      allow create: if
        request.resource.data.name is string &&
        request.resource.data.score is number &&
        request.resource.data.score <= 500;
    }
  }
}
```

---

# REQUIRED COMPOSITE INDEX

Collection:

```txt
scores
```

Fields:

```txt
dateKey    Ascending
score      Descending
```
