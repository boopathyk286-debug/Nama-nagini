# 🐍 NEON SNAKE — Arcade Edition

A production-ready, mobile-first Snake game with neon arcade UI, online leaderboard, dynamic difficulty, PWA support, and sound effects.

---

## Project Structure

```
snake-game/
├── index.html          ← Entry point, all screens
├── style.css           ← Neon arcade design system
├── game.js             ← Game engine (modular ES modules)
├── firebase.js         ← Firestore leaderboard integration
├── sw.js               ← Service Worker (PWA / offline)
├── manifest.json       ← PWA manifest
├── generate_icons.py   ← Icon generator script
└── assets/
    ├── icon-192.png    ← PWA icon
    └── icon-512.png    ← PWA icon (splash)
```

---

## Features

| Feature | Details |
|---|---|
| 🎮 Controls | Swipe, D-pad buttons, WASD / Arrow keys |
| 📱 Mobile | Fully responsive, portrait-optimized |
| 🏆 Leaderboard | Global + Today tabs via Firestore |
| 🔊 Sound | Web Audio API — eat, die, level-up, move |
| 🌈 Dynamic difficulty | Easy / Medium / Hard — speed + points scale |
| 📈 Level system | Speed increases every 5 food pickups |
| 💾 Local best | Persisted via localStorage |
| 📲 PWA | Installable, offline-capable via Service Worker |
| ✨ Animations | Snake eyes, neon glow, death flash, countdown |

---

## Setup

### 1. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a project → **Add Web App**
3. Copy the config object
4. Open `firebase.js` and replace the `firebaseConfig` object:

```js
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

5. In Firebase Console → **Build → Firestore Database** → Create Database
6. Set Firestore Rules for development:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ For production, restrict rules with authentication.

**Without Firebase config**, the game runs in offline/demo mode with sample leaderboard data.

---

### 2. Serving Locally

Because `game.js` and `firebase.js` use ES Modules (`type="module"`), you **must serve via HTTP**, not `file://`.

```bash
# Option A: Python (built-in)
python3 -m http.server 8080
# → open http://localhost:8080

# Option B: Node.js
npx serve .
# → open http://localhost:3000

# Option C: VS Code Live Server extension
# Right-click index.html → Open with Live Server
```

---

### 3. PWA Icons (optional)

```bash
pip install cairosvg
python3 generate_icons.py
```

This generates proper 192×512 PNG icons from the SVG template.

---

## Architecture

```
App (Bootstrap)
├── AudioEngine      — Web Audio API, no dependencies
├── Renderer         — Canvas 2D drawing, grid, snake, food
├── InputManager     — Keyboard + touch swipe + D-pad
├── SnakeGame        — Core loop, collision, scoring, levels
├── UIController     — Screen transitions, HUD updates
├── LeaderboardUI    — Renders Firestore data, tab switching
└── firebase.js      — Isolated Firestore module (swappable)
```

All modules are plain ES module IIFEs — zero dependencies, zero build step.

---

## Multiplayer Readiness

The architecture is designed to scale to multiplayer:

- `SnakeGame` is stateless per-call — can be extracted to a shared game tick server
- `firebase.js` is isolated — swap for a WebSocket/socket.io transport
- `InputManager` emits direction events — route to network instead of local game
- `Renderer` accepts any snake array — can render multiple snakes

To add multiplayer:
1. Replace `SnakeGame.run()` with a server-authoritative game loop
2. Stream opponent positions into `Renderer.drawSnake(opponentSnake, tick)`
3. Use Firebase Realtime Database or WebSockets for sub-100ms sync

---

## Difficulty Settings

| Level | Interval | Speed increment | Points |
|---|---|---|---|
| Easy   | 180ms | 4ms/level | ×1 |
| Medium | 130ms | 5ms/level | ×2 |
| Hard   | 90ms  | 6ms/level | ×3 |

Minimum interval is capped at 50ms to keep the game playable.

---

## Browser Support

| Browser | Support |
|---|---|
| Chrome / Edge 88+ | ✅ Full |
| Firefox 85+       | ✅ Full |
| Safari 14+ (iOS)  | ✅ Full |
| Samsung Internet  | ✅ Full |

Requires: ES Modules, Web Audio API, Canvas 2D, localStorage.
