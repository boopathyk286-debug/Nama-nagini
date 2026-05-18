// ══════════════════════════════════════════════════════════
//  NAMA NAGINI — game.js (complete, production-ready)
//  Mobile / Tablet / Desktop optimised
//  Leaderboard: Firebase only — no fake scores shown
// ══════════════════════════════════════════════════════════

'use strict';

// ── TAMIL GAME-OVER QUOTES ────────────────────────────────
const TAMIL_QUOTES = [
  "ஐயோ! பாம்பு சாகிட்டே! 😭",
  "என்ன ஒரு கஷ்டம்! சாப்பிட போய் சாஞ்சுட்டே! 🍎💀",
  "அம்மா! நாம நாகினி போயிட்டா! 😱",
  "டேய்! கண்ணு மூடிட்டியா? வழி தெரியலையா? 🤦",
  "Snake-உ wall-அ மடிக்கும்னு நினைச்சியா? 😂",
  "Game over? இல்ல இல்ல… இதுவே life! 🎭",
  "பாம்பே உன்னையே கடிச்சுக்கிட்டே! 🐍😵",
  "நீ நாகரீகமா விளையாடியிருக்கணும்! 😤",
  "Thala-வுக்கு ஒரு respect! நீ ஒரு நிமிஷம் கூட வாழல! 🕐",
  "இவ்வளவு சாப்பிட்டு இப்படி மடிஞ்சியா? 🍕💀",
  "கோடி ரூபா பணம் வெச்சாலும் wall bypass ஆகாது! 😂",
  "Wall-ஓட friendship பண்ண போனியா? 🧱❤️",
  "Semma effort! ஆனா result? பஜ்ஜி! 🤷",
  "100 score கூட வரலையா? Seriously? 😑",
  "மீண்டும் முயற்சி செய் — விடாமுயற்சியே வெற்றி! 💪",
  "Auto-வே போகல, game-உம் போச்சு! 🚗💨",
  "இது skill issue தான்! 😂",
  "ஒரு வழியா game over ஆயிருச்சு, ஆனா life over இல்ல! 😅",
  "உன் high score-ஐ பாரு — அழுகை வருதா? 😭",
  "Next time hard mode try பண்ணு — jokes! Easy-யே போதும்! 😂",
  "யாரு சொன்னா நீ ஆட தெரியும்னு? 😂",
  "Snake கூட உன்னை விட smart-ஆ இருக்கு! 🐍💡",
  "இன்னொரு முறை ஆடு — lucky feel வருது! 🍀",
  "Chance-ஐ miss பண்ணிட்டே, life போல! 😔",
  "உன் snake-க்கு GPS வேணும் போல! 🗺️",
];

// ── DIFFICULTY ────────────────────────────────────────────
const DIFF_CONFIG = {
  easy:   { startInterval: 180, speedStep: 4,  pointMult: 1 },
  medium: { startInterval: 130, speedStep: 5,  pointMult: 2 },
  hard:   { startInterval:  85, speedStep: 7,  pointMult: 3 },
};
const MIN_INTERVAL = 48;
const GRID = 20;

// ── GAME STATE ────────────────────────────────────────────
const state = {
  screen:         'loading',
  diff:           'easy',
  score:          0,
  best:           0,
  level:          1,
  snake:          [],
  dir:            { x: 1, y: 0 },
  nextDir:        { x: 1, y: 0 },
  food:           null,
  particles:      [],
  gameLoop:       null,
  interval:       180,
  foodEaten:      0,
  running:        false,
  paused:         false,
  scoreSubmitted: false,
};

// ── AUDIO ENGINE ──────────────────────────────────────────
let audioCtx = null;
function getAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  return audioCtx;
}
function beep(freq, dur, type = 'square', vol = 0.12) {
  const ctx = getAudio();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch (e) {}
}
function sfxEat()   { beep(440, 0.07, 'square', 0.14); setTimeout(() => beep(660, 0.07, 'square', 0.11), 55); }
function sfxDie()   { beep(220, 0.12, 'sawtooth', 0.18); setTimeout(() => beep(110, 0.28, 'sawtooth', 0.14), 90); }
function sfxLevel() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.09, 'square', 0.11), i * 75)); }
function sfxTick()  { beep(180, 0.018, 'sine', 0.035); }
function sfxCount() { beep(880, 0.07, 'square', 0.09); }

// ── DOM HELPERS ───────────────────────────────────────────
const $ = id => document.getElementById(id);

const SCREENS = {
  loading:     $('loadingScreen'),
  start:       $('startScreen'),
  game:        $('gameScreen'),
  gameover:    $('gameOverScreen'),
  leaderboard: $('leaderboardScreen'),
};

function showScreen(name) {
  Object.entries(SCREENS).forEach(([k, el]) => {
    const active = k === name;
    if (el) {
      el.classList.toggle('active', active);
      el.style.display = active ? 'flex' : 'none';
    }
  });
  state.screen = name;
}

// ── LOADING ───────────────────────────────────────────────
function runLoading() {
  const bar    = $('loadBar');
  const status = $('loadStatus');

  const steps = [
    [8,   'BOOTING SYSTEM…'],
    [22,  'WAKING THE SNAKE… 🐍'],
    [40,  'FEEDING NAGINI… 🍎'],
    [60,  'CONNECTING FIREBASE…'],
    [80,  'LOADING LEADERBOARD…'],
    [95,  'ALMOST READY…'],
    [100, 'LET\'S GOOO! 🐍🔥'],
  ];

  let i = 0;
  const next = () => {
    if (i >= steps.length) {
      setTimeout(() => {
        loadGlobalBest();
        showScreen('start');
      }, 450);
      return;
    }
    const [pct, msg] = steps[i++];
    if (bar) bar.style.width = pct + '%';
    if (status) status.textContent = msg;
    setTimeout(next, 300 + Math.random() * 280);
  };
  next();
}

async function loadGlobalBest() {
  const FB = window.NaginiFirebase;
  const menuEl = $('menuGlobal1');
  if (!menuEl) return;
  if (!FB || !FB.ready()) { menuEl.textContent = '—'; return; }
  try {
    const best = await FB.fetchGlobalBest();
    menuEl.textContent = best ? best.score : '—';
  } catch (e) {
    menuEl.textContent = '—';
  }
}

// ── CANVAS SIZING ─────────────────────────────────────────
const canvas = $('gameCanvas');
const ctx2d  = canvas ? canvas.getContext('2d') : null;

function resizeCanvas() {
  if (!canvas || !ctx2d) return;
  const wrap = canvas.parentElement;
  if (!wrap) return;
  const rect = wrap.getBoundingClientRect();
  const availW = Math.floor(rect.width);
  const availH = Math.floor(rect.height);

  if (availW <= 0 || availH <= 0) return;

  const maxSide = Math.min(availW, availH);
  const size    = Math.floor(maxSide / GRID) * GRID;

  if (size !== canvas.width || size !== canvas.height) {
    canvas.width  = size;
    canvas.height = size;
  }

  if (state.running || state.paused) draw();
}

// ── GAME INIT ─────────────────────────────────────────────
function initGame() {
  if (state.gameLoop) clearInterval(state.gameLoop);
  const cfg = DIFF_CONFIG[state.diff];
  state.score          = 0;
  state.level          = 1;
  state.foodEaten      = 0;
  state.interval       = cfg.startInterval;
  state.running        = false;
  state.paused         = false;
  state.scoreSubmitted = false;
  state.particles      = [];
  state.dir            = { x: 1, y: 0 };
  state.nextDir        = { x: 1, y: 0 };

  const mid = Math.floor(GRID / 2);
  state.snake = [
    { x: mid,     y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
  placeFood();
  updateHUD();
  draw();
}

function placeFood() {
  let pos;
  const occupied = new Set(state.snake.map(s => `${s.x},${s.y}`));
  do {
    pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (occupied.has(`${pos.x},${pos.y}`));
  state.food = pos;
}

function startGameLoop() {
  state.running = true;
  state.paused  = false;
  if (state.gameLoop) clearInterval(state.gameLoop);
  state.gameLoop = setInterval(tick, state.interval);
}

function pauseGame() {
  if (!state.running) return;
  if (state.gameLoop) clearInterval(state.gameLoop);
  state.running = false;
  state.paused  = true;
}

function resumeGame() {
  if (!state.paused) return;
  state.running = true;
  state.paused  = false;
  state.gameLoop = setInterval(tick, state.interval);
}

function tick() {
  if (!state.running) return;

  state.dir = { ...state.nextDir };

  const head = {
    x: (state.snake[0].x + state.dir.x + GRID) % GRID,
    y: (state.snake[0].y + state.dir.y + GRID) % GRID,
  };

  if (state.snake.some(s => s.x === head.x && s.y === head.y)) {
    handleGameOver();
    return;
  }

  state.snake.unshift(head);

  const ateFood = state.food && head.x === state.food.x && head.y === state.food.y;

  if (ateFood) {
    const pts = 10 * state.level * DIFF_CONFIG[state.diff].pointMult;
    state.score += pts;
    if (state.score > state.best) state.best = state.score;
    state.foodEaten++;

    sfxEat();
    spawnParticles(head.x, head.y);
    placeFood();

    if (state.foodEaten % 5 === 0) {
      state.level++;
      sfxLevel();
      state.interval = Math.max(MIN_INTERVAL, state.interval - DIFF_CONFIG[state.diff].speedStep);
      if (state.gameLoop) clearInterval(state.gameLoop);
      state.gameLoop = setInterval(tick, state.interval);
    }
  } else {
    state.snake.pop();
    if (state.foodEaten % 4 === 0) sfxTick();
  }

  updateHUD();
  updateParticles();
  draw();
}

function spawnParticles(gx, gy) {
  if (!canvas) return;
  const cell = canvas.width / GRID;
  const cx = gx * cell + cell / 2;
  const cy = gy * cell + cell / 2;
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.4;
    const speed = 1.5 + Math.random() * 2.5;
    state.particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.06 + Math.random() * 0.04,
      size: 2 + Math.random() * 3,
      color: ['#ff2d78', '#ffe600', '#00ff88', '#00e5ff'][Math.floor(Math.random() * 4)],
    });
  }
}

function updateParticles() {
  state.particles = state.particles
    .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - p.decay }))
    .filter(p => p.life > 0);
}

const foodPulse = { t: 0 };

function draw() {
  if (!canvas || !ctx2d) return;
  const c    = ctx2d;
  const W    = canvas.width;
  const H    = canvas.height;
  if (W === 0 || H === 0) return;
  const cell = W / GRID;

  c.clearRect(0, 0, W, H);

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const even = (row + col) % 2 === 0;
      c.fillStyle = even ? '#111228' : '#0f1020';
      c.fillRect(col * cell, row * cell, cell, cell);
    }
  }

  c.strokeStyle = 'rgba(0,255,136,0.07)';
  c.lineWidth   = 0.5;
  for (let i = 0; i <= GRID; i++) {
    c.beginPath(); c.moveTo(i * cell, 0);   c.lineTo(i * cell, H); c.stroke();
    c.beginPath(); c.moveTo(0, i * cell);   c.lineTo(W, i * cell); c.stroke();
  }

  c.save();
  c.strokeStyle = 'rgba(0,255,136,0.5)';
  c.lineWidth   = 2.5;
  c.shadowColor = '#00ff88';
  c.shadowBlur  = 16;
  c.strokeRect(1.5, 1.5, W - 3, H - 3);

  const ca = cell * 1.2;
  c.strokeStyle = '#00ff88';
  c.lineWidth   = 3.5;
  c.shadowBlur  = 22;
  c.beginPath(); c.moveTo(0, ca); c.lineTo(0, 0); c.lineTo(ca, 0); c.stroke();
  c.beginPath(); c.moveTo(W - ca, 0); c.lineTo(W, 0); c.lineTo(W, ca); c.stroke();
  c.beginPath(); c.moveTo(0, H - ca); c.lineTo(0, H); c.lineTo(ca, H); c.stroke();
  c.beginPath(); c.moveTo(W - ca, H); c.lineTo(W, H); c.lineTo(W, H - ca); c.stroke();
  c.shadowBlur = 0;
  c.restore();

  if (state.food) {
    foodPulse.t = (foodPulse.t + 0.08) % (Math.PI * 2);
    const scale = 0.36 + 0.06 * Math.sin(foodPulse.t);
    const fx = state.food.x * cell + cell / 2;
    const fy = state.food.y * cell + cell / 2;

    const grad = c.createRadialGradient(fx, fy, 0, fx, fy, cell * 0.7);
    grad.addColorStop(0, 'rgba(255,45,120,0.35)');
    grad.addColorStop(1, 'rgba(255,45,120,0)');
    c.fillStyle = grad;
    c.beginPath();
    c.arc(fx, fy, cell * 0.7, 0, Math.PI * 2);
    c.fill();

    c.shadowColor = '#ff2d78';
    c.shadowBlur  = 14;
    c.fillStyle   = '#ff2d78';
    c.beginPath();
    c.arc(fx, fy, cell * scale, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;

    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.beginPath();
    c.arc(fx - cell * 0.09, fy - cell * 0.09, cell * 0.1, 0, Math.PI * 2);
    c.fill();
  }

  state.snake.forEach((seg, i) => {
    const px   = seg.x * cell;
    const py   = seg.y * cell;
    const pad  = i === 0 ? 1 : 2;
    const size = cell - pad * 2;
    const r    = size * (i === 0 ? 0.44 : 0.38);

    if (i === 0) {
      c.shadowColor = '#00ff88';
      c.shadowBlur  = 14;
      c.fillStyle   = '#00ff88';
    } else {
      c.shadowBlur  = 0;
      const ratio = i / Math.max(state.snake.length - 1, 1);
      const g = Math.round(200 - ratio * 100);
      const b = Math.round(80  - ratio * 70);
      c.fillStyle = `rgb(0,${g},${b})`;
    }

    drawRoundRect(c, px + pad, py + pad, size, size, r);
    c.fill();
    c.shadowBlur = 0;

    if (i === 0) {
      c.fillStyle = 'rgba(255,255,255,0.12)';
      drawRoundRect(c, px + pad + 2, py + pad + 2, size * 0.5, size * 0.35, r * 0.5);
      c.fill();
      drawEyes(c, seg, cell);
    }
  });

  state.particles.forEach(p => {
    c.globalAlpha = p.life;
    c.fillStyle   = p.color;
    c.beginPath();
    c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    c.fill();
  });
  c.globalAlpha = 1;

  if (state.paused) {
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.fillRect(0, 0, W, H);
    c.fillStyle  = '#00ff88';
    c.font       = `bold ${cell * 2.5}px 'Teko', sans-serif`;
    c.textAlign  = 'center';
    c.textBaseline = 'middle';
    c.shadowColor = '#00ff88';
    c.shadowBlur  = 20;
    c.fillText('PAUSED', W / 2, H / 2);
    c.shadowBlur = 0;
    c.font = `${cell * 0.85}px 'Share Tech Mono', monospace`;
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.fillText('TAP TO RESUME', W / 2, H / 2 + cell * 2.2);
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
  }
}

function drawRoundRect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y,     x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h,     x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y,         x + r, y);
  c.closePath();
}

function drawEyes(c, seg, cell) {
  const cx   = seg.x * cell + cell / 2;
  const cy   = seg.y * cell + cell / 2;
  const dx   = state.dir.x;
  const dy   = state.dir.y;
  const px   = -dy;
  const py   =  dx;
  const off  = cell * 0.17;
  const fwd  = cell * 0.11;
  const er   = cell * 0.095;

  [[1], [-1]].forEach(([s]) => {
    const ex = cx + px * off * s + dx * fwd;
    const ey = cy + py * off * s + dy * fwd;

    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(ex, ey, er, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = '#111';
    c.beginPath();
    c.arc(ex + dx * er * 0.38, ey + dy * er * 0.38, er * 0.52, 0, Math.PI * 2);
    c.fill();
  });
}

function updateHUD() {
  const scoreEl = $('hudScore');
  const levelEl = $('hudLevel');
  const bestEl = $('hudBest');
  if (scoreEl) scoreEl.textContent = state.score;
  if (levelEl) levelEl.textContent = state.level;
  if (bestEl) bestEl.textContent = state.best;
}

function startCountdown(onDone) {
  const overlay  = $('countdownOverlay');
  const numEl    = $('countdownNum');
  if (!overlay || !numEl) {
    onDone();
    return;
  }
  let count = 3;

  overlay.classList.remove('hidden');
  numEl.textContent = count;
  sfxCount();

  const iv = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(iv);
      overlay.classList.add('hidden');
      onDone();
    } else {
      numEl.textContent = count;
      numEl.style.animation = 'none';
      numEl.offsetHeight;
      numEl.style.animation = 'pop 0.4s ease-out';
      sfxCount();
    }
  }, 950);
}

function handleGameOver() {
  if (state.gameLoop) clearInterval(state.gameLoop);
  state.running = false;
  state.paused  = false;
  sfxDie();

  const saved = parseInt(localStorage.getItem('nagini_best') || '0', 10);
  if (state.score > saved) localStorage.setItem('nagini_best', String(state.score));
  if (state.score > state.best) state.best = state.score;

  if (canvas) {
    canvas.style.transition = 'none';
    canvas.style.boxShadow  = '0 0 0 4px #ff2d78, 0 0 40px #ff2d78';
    setTimeout(() => { if (canvas) { canvas.style.boxShadow = ''; canvas.style.transition = ''; } }, 500);
  }

  const quoteEl = $('tamilQuote');
  if (quoteEl) quoteEl.textContent = TAMIL_QUOTES[Math.floor(Math.random() * TAMIL_QUOTES.length)];

  const goScoreEl = $('goScore');
  const goBestEl = $('goBest');
  const goLengthEl = $('goLength');
  const goLevelEl = $('goLevel');
  if (goScoreEl) goScoreEl.textContent = state.score;
  if (goBestEl) goBestEl.textContent = state.best;
  if (goLengthEl) goLengthEl.textContent = state.snake.length;
  if (goLevelEl) goLevelEl.textContent = state.level;

  const prevBest = parseInt(localStorage.getItem('nagini_best') || '0', 10);
  const isNewRecord = state.score > 0 && state.score >= prevBest && state.snake.length > 3;
  const newRecordBadge = $('newRecordBadge');
  if (newRecordBadge) newRecordBadge.classList.toggle('hidden', !isNewRecord);

  const FB = window.NaginiFirebase;
  const showEntry = FB && FB.ready() && state.score > 0 && !state.scoreSubmitted;
  const nameEntry = $('nameEntry');
  if (nameEntry) nameEntry.style.display = showEntry ? 'flex' : 'none';
  if (showEntry) {
    const playerName = $('playerName');
    const submitBtn = $('submitScoreBtn');
    if (playerName) playerName.value = '';
    if (submitBtn) {
      submitBtn.textContent = '📤 SUBMIT SCORE';
      submitBtn.disabled = false;
    }
    setTimeout(() => { if (playerName) playerName.focus(); }, 400);
  }

  showScreen('gameover');
}

async function handleSubmitScore() {
  if (state.scoreSubmitted) return;
  const nameInput = $('playerName');
  const name = (nameInput ? nameInput.value : '').trim() || 'PLAYER_1';
  const btn = $('submitScoreBtn');
  
  console.log("🎮 Submitting score:", name, state.score, state.diff);
  
  if (btn) {
    btn.textContent = '⏳ SUBMITTING…';
    btn.disabled = true;
  }

  const FB = window.NaginiFirebase;
  if (!FB || !FB.ready()) {
    console.error("Firebase not ready!");
    if (btn) btn.textContent = '❌ FIREBASE NOT CONFIGURED';
    return;
  }

  // Test connection first
  if (FB.testConnection) {
    const isConnected = await FB.testConnection();
    if (!isConnected) {
      if (btn) btn.textContent = '❌ FIREBASE ERROR - Check console';
      return;
    }
  }

  const ok = await FB.submitScore(name, state.score, state.diff);
  console.log("Submit result:", ok);
  
  state.scoreSubmitted = true;
  if (ok) {
    if (btn) btn.textContent = '✅ SCORE SAVED!';
    const nameEntry = $('nameEntry');
    if (nameEntry) nameEntry.style.display = 'none';
    loadGlobalBest();
  } else {
    if (btn) {
      btn.textContent = '❌ ERROR — TRY AGAIN';
      btn.disabled = false;
    }
    state.scoreSubmitted = false;
  }
}

async function openLeaderboard(fromScreen) {
  lbPreviousScr = fromScreen || 'start';
  lbCurrentTab = 'global';
  const tabs = document.querySelectorAll('.lb-tab');
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === 'global'));
  showScreen('leaderboard');
  await renderLeaderboard('global');
}

async function renderLeaderboard(tab) {
  const list = $('lbList');
  if (!list) return;
  list.innerHTML = '<div class="lb-loading">LOADING… 🐍</div>';

  const FB = window.NaginiFirebase;
  if (!FB || !FB.ready()) {
    list.innerHTML = `
      <div class="lb-empty">
        <span class="lb-empty-icon">🔌</span>
        <p>Firebase not connected.</p>
        <p>Add your config to <strong>firebase.js</strong> to enable the leaderboard.</p>
        <p class="lb-empty-tamil">firebase.js-ல config போடுங்க — leaderboard ready! 🐍</p>
      </div>`;
    return;
  }

  try {
    const scores = tab === 'today'
      ? await FB.fetchTodayScores()
      : await FB.fetchGlobalScores();

    if (!scores || scores.length === 0) {
      list.innerHTML = `
        <div class="lb-empty">
          <span class="lb-empty-icon">🏆</span>
          <p>${tab === 'today' ? 'No scores today yet!' : 'No scores yet!'}</p>
          <p>Be the first to play and claim the top spot!</p>
          <p class="lb-empty-tamil">முதல்ல நீயே ஆடு! முதலிடம் உனக்காக காத்திருக்கு 🐍</p>
        </div>`;
      return;
    }

    list.innerHTML = scores.map((entry, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
      const rankCls = i < 3 ? `lb-rank-${i + 1}` : 'lb-rank-n';
      const diff = entry.difficulty || 'easy';
      return `
        <div class="lb-row">
          <span class="lb-rank ${rankCls}">${medal}</span>
          <span class="lb-name">${escapeHtml(entry.name || 'UNKNOWN')}</span>
          <span class="lb-diff-badge lb-diff-${diff}">${diff.toUpperCase()}</span>
          <span class="lb-score">${Number(entry.score).toLocaleString()}</span>
        </div>`;
    }).join('');
  } catch (e) {
    console.error("Render error:", e);
    list.innerHTML = `<div class="lb-empty"><p>⚠️ Error loading scores. Please try again!</p></div>`;
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// ── INPUT: KEYBOARD ───────────────────────────────────────
const KEY_MAP = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
};
const DIR_VEC = {
  up:    { x:  0, y: -1 },
  down:  { x:  0, y:  1 },
  left:  { x: -1, y:  0 },
  right: { x:  1, y:  0 },
};

function trySetDir(d) {
  const nd = DIR_VEC[d];
  if (!nd) return;
  if (nd.x === -state.dir.x && nd.y === -state.dir.y) return;
  state.nextDir = nd;
}

document.addEventListener('keydown', e => {
  if (state.screen !== 'game') return;
  const d = KEY_MAP[e.key];
  if (d) { e.preventDefault(); trySetDir(d); return; }
  if (e.key === ' ' || e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    if (state.running) pauseGame();
    else if (state.paused) resumeGame();
  }
});

// ── INPUT: D-PAD BUTTONS ──────────────────────────────────
['Up', 'Down', 'Left', 'Right'].forEach(dir => {
  const btn = $('btn' + dir);
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      trySetDir(dir.toLowerCase());
    });
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      trySetDir(dir.toLowerCase());
    });
  }
});

// ── INPUT: TOUCH SWIPE ON CANVAS ─────────────────────────
let touchStart = null;

if (canvas) {
  canvas.addEventListener('touchstart', e => {
    if (state.screen !== 'game') return;
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  canvas.addEventListener('touchend', e => {
    if (state.screen !== 'game' || !touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    touchStart = null;
    if (Math.max(adx, ady) < 18) {
      if (state.running) pauseGame();
      else if (state.paused) resumeGame();
      return;
    }
    if (adx > ady) trySetDir(dx > 0 ? 'right' : 'left');
    else trySetDir(dy > 0 ? 'down' : 'up');
  }, { passive: true });
}

document.addEventListener('touchmove', e => {
  if (state.screen === 'game') e.preventDefault();
}, { passive: false });

// ── BUTTON WIRING ─────────────────────────────────────────
function startNewGame() {
  initGame();
  showScreen('game');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resizeCanvas();
      startCountdown(startGameLoop);
    });
  });
}

const startBtn = $('startBtn');
if (startBtn) startBtn.addEventListener('click', startNewGame);

const restartBtn = $('restartBtn');
if (restartBtn) restartBtn.addEventListener('click', startNewGame);

const lbPlayBtn = $('lbPlayBtn');
if (lbPlayBtn) lbPlayBtn.addEventListener('click', startNewGame);

const leaderboardBtn = $('leaderboardBtn');
if (leaderboardBtn) leaderboardBtn.addEventListener('click', () => openLeaderboard('start'));

const goLeaderboardBtn = $('goLeaderboardBtn');
if (goLeaderboardBtn) goLeaderboardBtn.addEventListener('click', () => openLeaderboard('gameover'));

const goHomeBtn = $('goHomeBtn');
if (goHomeBtn) {
  goHomeBtn.addEventListener('click', () => {
    if (state.gameLoop) clearInterval(state.gameLoop);
    state.running = false;
    state.paused = false;
    loadGlobalBest();
    showScreen('start');
  });
}

const lbBackBtn = $('lbBackBtn');
if (lbBackBtn) lbBackBtn.addEventListener('click', () => showScreen(lbPreviousScr));

const submitScoreBtn = $('submitScoreBtn');
if (submitScoreBtn) submitScoreBtn.addEventListener('click', handleSubmitScore);

const playerNameInput = $('playerName');
if (playerNameInput) {
  playerNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSubmitScore(); });
}

// Difficulty buttons
const diffBtns = document.querySelectorAll('.diff-btn');
diffBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    diffBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.diff = btn.dataset.diff;
  });
});

// Leaderboard tabs
const lbTabs = document.querySelectorAll('.lb-tab');
lbTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    lbTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    lbCurrentTab = tab.dataset.tab;
    renderLeaderboard(lbCurrentTab);
  });
});

// Resize handler
let resizeRaf = null;
window.addEventListener('resize', () => {
  if (state.screen !== 'game') return;
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = requestAnimationFrame(resizeCanvas);
  });
});

// ── BOOT ──────────────────────────────────────────────────
state.best = parseInt(localStorage.getItem('nagini_best') || '0', 10);
showScreen('loading');
runLoading();
