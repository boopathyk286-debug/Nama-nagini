/**
 * game.js — Neon Snake Game Engine
 * Modular, scalable, production-ready
 *
 * Modules:
 *   AudioEngine   — Web Audio API sound effects
 *   Renderer      — Canvas 2D drawing
 *   InputManager  — Keyboard + touch/swipe + D-pad
 *   SnakeGame     — Core game logic + difficulty
 *   UIController  — Screen transitions + HUD
 *   LeaderboardUI — Leaderboard rendering
 *   App           — Bootstrap + coordination
 */

"use strict";

// ═══════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════
const DIFFICULTY = {
  easy:   { interval: 180, speedIncrement: 4,  pointsMultiplier: 1 },
  medium: { interval: 130, speedIncrement: 5,  pointsMultiplier: 2 },
  hard:   { interval:  90, speedIncrement: 6,  pointsMultiplier: 3 },
};
const GRID        = 20;        // cell size in px
let GRID_COLS = 18;
let GRID_ROWS = 32;
const screenW = window.innerWidth;
if (screenW >= 1024) {
  GRID_COLS = 21; // Desktop: 420px
  GRID_ROWS = 37; // 740px
} else if (screenW >= 768) {
  GRID_COLS = 24; // Tablet: 480px
  GRID_ROWS = 40; // 800px
} else {
  GRID_COLS = 18; // Mobile: 360px
  GRID_ROWS = 32; // 640px
}
const LEVEL_EVERY = 5;         // food pickups per level

// ═══════════════════════════════════════════════════════
//  AUDIO ENGINE
// ═══════════════════════════════════════════════════════
const AudioEngine = (() => {
  let ctx = null;
  let muted = false;

  function init() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { /* AudioContext not supported */ }
  }

  function resume() {
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  function beep({ freq = 440, type = "square", duration = 0.08, vol = 0.15, decay = 0.1 } = {}) {
    if (muted || !ctx) return;
    try {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration + decay);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration + decay + 0.05);
    } catch { /* ignore */ }
  }

  const eat   = () => { beep({ freq: 523, type: "square", duration: 0.05, vol: 0.2 });
                        setTimeout(() => beep({ freq: 659, type: "square", duration: 0.05, vol: 0.15 }), 60); };
  const die   = () => { beep({ freq: 220, type: "sawtooth", duration: 0.3, vol: 0.25, decay: 0.4 }); };
  const levelUp = () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => beep({ freq: f, type: "square", duration: 0.07, vol: 0.15 }), i * 80));
  };
  const move  = () => beep({ freq: 180, type: "sine", duration: 0.02, vol: 0.04, decay: 0.02 });
  const click = () => beep({ freq: 880, type: "square", duration: 0.04, vol: 0.1 });

  return { init, resume, eat, die, levelUp, move, click };
})();

// ═══════════════════════════════════════════════════════
//  RENDERER
// ═══════════════════════════════════════════════════════
const Renderer = (() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx    = canvas.getContext("2d");
  let W, H;

  function resize(wrapEl) {
    const rect = wrapEl.getBoundingClientRect();
    canvas.width  = GRID_COLS * GRID;
    canvas.height = GRID_ROWS * GRID;
    
    const targetRatio = GRID_COLS / GRID_ROWS;
    const containerRatio = rect.width / rect.height;
    
    let renderW, renderH;
    if (containerRatio > targetRatio) {
      renderH = rect.height;
      renderW = rect.height * targetRatio;
    } else {
      renderW = rect.width;
      renderH = rect.width / targetRatio;
    }
    
    canvas.style.width  = renderW + "px";
    canvas.style.height = renderH + "px";
    W = canvas.width;
    H = canvas.height;
  }

  function clear() {
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, W, H);
    drawGrid();
  }

  function drawGrid() {
    ctx.strokeStyle = "rgba(0,255,180,0.04)";
    ctx.lineWidth   = 0.5;
    for (let x = 0; x <= W; x += GRID) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += GRID) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  function drawFood(food, tick) {
    const pulse = 0.8 + 0.2 * Math.sin(tick * 0.15);
    const cx = food.x * GRID + GRID / 2;
    const cy = food.y * GRID + GRID / 2;
    const r  = (GRID / 2 - 2) * pulse;

    // Glow
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.5);
    grd.addColorStop(0, "rgba(255,45,120,0.5)");
    grd.addColorStop(1, "rgba(255,45,120,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = "#ff2d78";
    ctx.shadowColor = "#ff2d78";
    ctx.shadowBlur  = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawSnake(snake, tick) {
    snake.forEach((seg, i) => {
      const isHead = i === 0;
      const t = i / Math.max(snake.length - 1, 1);
      const alpha = isHead ? 1 : (1 - t * 0.5);

      // Color gradient head → tail
      const g = Math.floor(200 + 55 * (1 - t));
      const b = Math.floor(130 * (1 - t));
      ctx.fillStyle = isHead
        ? `rgba(0,255,180,${alpha})`
        : `rgba(0,${g},${b},${alpha})`;

      ctx.shadowColor = isHead ? "#00ffb4" : "#00d48a";
      ctx.shadowBlur  = isHead ? 12 : 5;

      const pad = isHead ? 1 : 2;
      roundRect(ctx,
        seg.x * GRID + pad,
        seg.y * GRID + pad,
        GRID - pad * 2,
        GRID - pad * 2,
        isHead ? 5 : 3
      );
      ctx.fill();

      // Eyes on head
      if (isHead) drawEyes(seg, snake[1]);
    });
    ctx.shadowBlur = 0;
  }

  function drawEyes(head, neck) {
    // determine direction from neck
    let dx = 0, dy = 0;
    if (neck) { dx = head.x - neck.x; dy = head.y - neck.y; }
    else      { dx = 1; }

    const cx = head.x * GRID + GRID / 2;
    const cy = head.y * GRID + GRID / 2;
    const eyeOffset = 4;
    const eyeR = 2;

    let eye1, eye2;
    if (dx !== 0) { // horizontal
      eye1 = { x: cx + dx * 2, y: cy - eyeOffset };
      eye2 = { x: cx + dx * 2, y: cy + eyeOffset };
    } else {        // vertical
      eye1 = { x: cx - eyeOffset, y: cy + dy * 2 };
      eye2 = { x: cx + eyeOffset, y: cy + dy * 2 };
    }

    ctx.fillStyle = "#fff";
    ctx.shadowBlur = 4; ctx.shadowColor = "#fff";
    [eye1, eye2].forEach(e => {
      ctx.beginPath();
      ctx.arc(e.x, e.y, eyeR, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }

  function drawFlash(alpha) {
    ctx.fillStyle = `rgba(255,45,120,${alpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  return { canvas, ctx, resize, clear, drawGrid, drawFood, drawSnake, drawFlash };
})();

// ═══════════════════════════════════════════════════════
//  INPUT MANAGER
// ═══════════════════════════════════════════════════════
const InputManager = (() => {
  const DIRS = { ArrowUp:"UP", ArrowDown:"DOWN", ArrowLeft:"LEFT", ArrowRight:"RIGHT",
                 w:"UP", s:"DOWN", a:"LEFT", d:"RIGHT" };
  let onDir = null;
  let touchX = 0, touchY = 0;

  function init(onDirection) {
    onDir = onDirection;

    // Keyboard
    document.addEventListener("keydown", e => {
      const dir = DIRS[e.key];
      if (dir) { e.preventDefault(); onDir(dir); }
    });

    // Touch swipe on canvas
    const cvs = Renderer.canvas;
    cvs.addEventListener("touchstart", e => {
      e.preventDefault();
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    }, { passive: false });

    cvs.addEventListener("touchmove", e => {
      e.preventDefault();
      const dx = e.touches[0].clientX - touchX;
      const dy = e.touches[0].clientY - touchY;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      if (Math.abs(dx) > Math.abs(dy))
        onDir(dx > 0 ? "RIGHT" : "LEFT");
      else
        onDir(dy > 0 ? "DOWN" : "UP");
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    }, { passive: false });

    // D-pad buttons
    const map = { btnUp:"UP", btnDown:"DOWN", btnLeft:"LEFT", btnRight:"RIGHT" };
    Object.entries(map).forEach(([id, dir]) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const press = e => {
        e.preventDefault();
        btn.classList.add("pressed");
        AudioEngine.click();
        onDir(dir);
        setTimeout(() => btn.classList.remove("pressed"), 120);
      };
      btn.addEventListener("touchstart", press, { passive: false });
      btn.addEventListener("mousedown",  press);
    });
  }

  return { init };
})();

// ═══════════════════════════════════════════════════════
//  CORE GAME LOGIC
// ═══════════════════════════════════════════════════════
const SnakeGame = (() => {
  // State
  let snake, dir, nextDir, food, score, length, level, tick;
  let difficulty, config;
  let alive, loopId, lastTime, interval;
  let flashAlpha = 0;
  let onScoreChange, onLevelChange, onGameOver;
  let highScore = 0;

  // ── Init ──
  function start({ diff = "medium", onScore, onLevel, onOver, best = 0 }) {
    difficulty    = diff;
    config        = DIFFICULTY[diff];
    onScoreChange = onScore;
    onLevelChange = onLevel;
    onGameOver    = onOver;
    highScore     = best;
    interval      = config.interval;
    reset();
  }

  function reset() {
    const midX = Math.floor(GRID_COLS / 2);
    const midY = Math.floor(GRID_ROWS / 2);
    snake   = [{ x: midX, y: midY }, { x: midX-1, y: midY }, { x: midX-2, y: midY }];
    dir     = "RIGHT";
    nextDir = "RIGHT";
    food    = spawnFood();
    score   = 0;
    length  = snake.length;
    level   = 1;
    tick    = 0;
    alive   = true;
    flashAlpha = 0;
    interval = config.interval;
  }

  function spawnFood() {
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * GRID_COLS),
        y: Math.floor(Math.random() * GRID_ROWS)
      };
    } while (snake.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  // ── Input ──
  function setDir(d) {
    const opp = { UP:"DOWN", DOWN:"UP", LEFT:"RIGHT", RIGHT:"LEFT" };
    if (d !== opp[dir]) nextDir = d;
  }

  // ── Loop ──
  function run() {
    if (!alive) return;
    lastTime = performance.now();
    loopId = requestAnimationFrame(frame);
  }

  function frame(now) {
    if (!alive) return;
    loopId = requestAnimationFrame(frame);
    const delta = now - lastTime;
    if (delta < interval) {
      // Still render with animations even between steps
      renderFrame();
      return;
    }
    lastTime = now;
    step();
    renderFrame();
  }

  function renderFrame() {
    tick++;
    Renderer.clear();
    Renderer.drawFood(food, tick);
    Renderer.drawSnake(snake, tick);
    if (flashAlpha > 0) {
      Renderer.drawFlash(flashAlpha);
      flashAlpha = Math.max(0, flashAlpha - 0.08);
    }
  }

  function step() {
    dir = nextDir;
    const head = { x: snake[0].x, y: snake[0].y };
    switch (dir) {
      case "UP":    head.y--; break;
      case "DOWN":  head.y++; break;
      case "LEFT":  head.x--; break;
      case "RIGHT": head.x++; break;
    }

    // Wall collision
    if (head.x < 0 || head.x >= GRID_COLS ||
        head.y < 0 || head.y >= GRID_ROWS) {
      die();
      return;
    }

    const ate = (head.x === food.x && head.y === food.y);
    const collisionSnake = ate ? snake : snake.slice(0, -1);
    
    // Self collision
    if (collisionSnake.some(s => s.x === head.x && s.y === head.y)) {
      die();
      return;
    }

    snake.unshift(head);

    if (ate) {
      // Ate food
      score += config.pointsMultiplier;
      length++;
      AudioEngine.eat();
      food = spawnFood();
      onScoreChange(score, length, level);

      // Level up
      if (length % LEVEL_EVERY === 0) {
        level++;
        interval = Math.max(50, interval - config.speedIncrement);
        AudioEngine.levelUp();
        onLevelChange(level);
      }
    } else {
      snake.pop();
      AudioEngine.move();
    }
  }

  function die() {
    alive = false;
    cancelAnimationFrame(loopId);
    flashAlpha = 0.6;
    AudioEngine.die();
    // one last render to show flash
    renderFrame();
    setTimeout(() => {
      onGameOver({ score, length, level, highScore });
    }, 700);
  }

  function stop() {
    alive = false;
    cancelAnimationFrame(loopId);
  }

  function getState() { return { score, length, level, snake, food, tick }; }

  return { start, reset, setDir, run, stop, getState };
})();

// ═══════════════════════════════════════════════════════
//  LEADERBOARD UI
// ═══════════════════════════════════════════════════════
const LeaderboardUI = (() => {
  const list    = document.getElementById("lbList");
  const tabs    = document.querySelectorAll(".lb-tab");
  let activeTab = "global";
  let cache     = { global: null, today: null };

  async function show(tab = "global") {
    activeTab = tab;
    updateTabs();
    list.innerHTML = `<div class="lb-loading">LOADING…</div>`;
    const scores = await load(tab);
    render(scores);
  }

  async function load(tab) {
    if (cache[tab]) return cache[tab];
    const data = tab === "today"
      ? await window.FirebaseAPI.fetchTodayScores(20)
      : await window.FirebaseAPI.fetchGlobalScores(20);
    cache[tab] = data;
    return data;
  }

  function invalidate() { cache = { global: null, today: null }; }

  function render(scores) {
    if (!scores || scores.length === 0) {
      list.innerHTML = `<div class="lb-loading">NO SCORES YET. BE THE FIRST!</div>`;
      return;
    }
    list.innerHTML = "";
    scores.forEach((entry, i) => {
      const el  = document.createElement("div");
      el.className = "lb-entry";
      el.style.animationDelay = `${i * 40}ms`;

      const rankClass = i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "other";
      const rankLabel = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`;
      const diff = (entry.difficulty || "easy").toLowerCase();

      el.innerHTML = `
        <span class="lb-rank ${rankClass}">${rankLabel}</span>
        <span class="lb-name">${esc(entry.name || "ANON")}</span>
        <span class="lb-diff-badge ${diff}">${diff.toUpperCase()}</span>
        <span class="lb-score">${entry.score}</span>
      `;
      list.appendChild(el);
    });
  }

  function updateTabs() {
    tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === activeTab));
  }

  function esc(str) {
    return str.replace(/[&<>"']/g, c =>
      ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  // Tab clicks
  tabs.forEach(t => t.addEventListener("click", () => {
    activeTab = t.dataset.tab;
    show(activeTab);
  }));

  return { show, invalidate };
})();

// ═══════════════════════════════════════════════════════
//  UI CONTROLLER
// ═══════════════════════════════════════════════════════
const UIController = (() => {
  const screens = {
    loading:     document.getElementById("loadingScreen"),
    start:       document.getElementById("startScreen"),
    game:        document.getElementById("gameScreen"),
    gameOver:    document.getElementById("gameOverScreen"),
    leaderboard: document.getElementById("leaderboardScreen"),
  };

  const hudScore  = document.getElementById("hudScore");
  const hudBest   = document.getElementById("hudBest");
  const hudLevel  = document.getElementById("hudLevel");

  let current = "loading";

  function show(name) {
    Object.entries(screens).forEach(([k, el]) => {
      el.classList.toggle("active", k === name);
    });
    current = name;
  }

  function updateHUD(score, length, level) {
    hudScore.textContent = score;
    hudLevel.textContent = level;
  }

  function updateHUDBest(best) {
    hudBest.textContent = best;
  }

  return { show, updateHUD, updateHUDBest };
})();

// ═══════════════════════════════════════════════════════
//  APP — BOOTSTRAP & COORDINATION
// ═══════════════════════════════════════════════════════
const App = (() => {
  // Persistent storage
  const LS = {
    get best()   { return parseInt(localStorage.getItem("neon_best") || "0"); },
    set best(v)  { localStorage.setItem("neon_best", v); },
    get name()   { return localStorage.getItem("neon_name") || ""; },
    set name(v)  { localStorage.setItem("neon_name", v); },
    get diff()   { return localStorage.getItem("neon_diff") || "medium"; },
    set diff(v)  { localStorage.setItem("neon_diff", v); },
  };

  let selectedDiff = LS.diff;
  let pendingResult = null;   // game-over data waiting for leaderboard submit

  // DOM refs
  const startBtn        = document.getElementById("startBtn");
  const leaderboardBtn  = document.getElementById("leaderboardBtn");
  const restartBtn      = document.getElementById("restartBtn");
  const goLeaderboardBtn= document.getElementById("goLeaderboardBtn");
  const goHomeBtn       = document.getElementById("goHomeBtn");
  const lbBackBtn       = document.getElementById("lbBackBtn");
  const lbPlayBtn       = document.getElementById("lbPlayBtn");
  const submitScoreBtn  = document.getElementById("submitScoreBtn");
  const playerNameInput = document.getElementById("playerName");
  const diffBtns        = document.querySelectorAll(".diff-btn");
  const menuBest        = document.getElementById("menuBest");
  const menuGlobal      = document.getElementById("menuGlobal");
  const goScore         = document.getElementById("goScore");
  const goBest          = document.getElementById("goBest");
  const goLength        = document.getElementById("goLength");
  const goLevel         = document.getElementById("goLevel");
  const newRecordBadge  = document.getElementById("newRecordBadge");
  const nameEntry       = document.getElementById("nameEntry");
  const loadBar         = document.getElementById("loadBar");
  const loadStatus      = document.getElementById("loadStatus");
  const countdownOverlay= document.getElementById("countdownOverlay");
  const countdownNum    = document.getElementById("countdownNum");
  const canvasWrap      = document.querySelector(".canvas-wrap");

  // ── INIT ──
  async function init() {
    AudioEngine.init();

    // Loading animation
    await fakeLoad();

    // Setup canvas size
    Renderer.resize(canvasWrap);
    window.addEventListener("resize", () => Renderer.resize(canvasWrap));

    // Wire difficulty buttons
    diffBtns.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.diff === selectedDiff);
      btn.addEventListener("click", () => {
        selectedDiff = btn.dataset.diff;
        LS.diff = selectedDiff;
        diffBtns.forEach(b => b.classList.toggle("active", b.dataset.diff === selectedDiff));
        AudioEngine.click();
      });
    });

    // Wire navigation
    startBtn.addEventListener("click",         () => { AudioEngine.resume(); AudioEngine.click(); startGame(); });
    leaderboardBtn.addEventListener("click",   () => { AudioEngine.resume(); AudioEngine.click(); showLeaderboard("start"); });
    restartBtn.addEventListener("click",       () => { AudioEngine.resume(); AudioEngine.click(); startGame(); });
    goLeaderboardBtn.addEventListener("click", () => { AudioEngine.resume(); AudioEngine.click(); showLeaderboard("gameOver"); });
    goHomeBtn.addEventListener("click",        () => { AudioEngine.resume(); AudioEngine.click(); SnakeGame.stop(); UIController.show("start"); });
    lbBackBtn.addEventListener("click",        () => { AudioEngine.resume(); AudioEngine.click(); UIController.show(lbBackBtn._from || "start"); });
    lbPlayBtn.addEventListener("click",        () => { AudioEngine.resume(); AudioEngine.click(); startGame(); });
    submitScoreBtn.addEventListener("click",   () => submitLeaderboard());
    playerNameInput.addEventListener("keydown", e => { if (e.key === "Enter") submitLeaderboard(); });

    // Input
    InputManager.init(dir => SnakeGame.setDir(dir));

    // Update start screen
    menuBest.textContent = LS.best || "0";
    const topScore = await window.FirebaseAPI.fetchTopScore();
    menuGlobal.textContent = topScore || "—";

    // Pre-fill name
    if (LS.name) playerNameInput.value = LS.name;

    UIController.show("start");
  }

  // ── LOADING ──
  async function fakeLoad() {
    const steps = [
      [10, "LOADING ASSETS…"],
      [30, "WIRING AUDIO…"],
      [55, "CONNECTING SERVERS…"],
      [75, "SYNCING LEADERBOARD…"],
      [90, "CALIBRATING NEON…"],
      [100,"READY!"]
    ];
    for (const [pct, msg] of steps) {
      loadBar.style.width = pct + "%";
      loadStatus.textContent = msg;
      await sleep(200 + Math.random() * 200);
    }
    await sleep(300);
  }

  // ── START GAME ──
  function startGame() {
    pendingResult = null;
    UIController.show("game");
    UIController.updateHUDBest(LS.best);
    countdown(3, () => {
      SnakeGame.start({
        diff:    selectedDiff,
        best:    LS.best,
        onScore: (score, length, level) => {
          UIController.updateHUD(score, length, level);
          if (score > LS.best) {
            LS.best = score;
            UIController.updateHUDBest(score);
          }
        },
        onLevel: level => {
          // Level-up flash in HUD handled by game
        },
        onOver: result => showGameOver(result),
      });
      SnakeGame.run();
    });
  }

  // ── COUNTDOWN ──
  function countdown(from, cb) {
    countdownOverlay.classList.remove("hidden");
    let n = from;
    countdownNum.textContent = n;

    const tick = () => {
      n--;
      if (n <= 0) {
        countdownOverlay.classList.add("hidden");
        cb();
        return;
      }
      countdownNum.style.animation = "none";
      void countdownNum.offsetWidth; // reflow
      countdownNum.style.animation = "";
      countdownNum.textContent = n;
      setTimeout(tick, 900);
    };
    setTimeout(tick, 900);
  }

  // ── GAME OVER ──
  function showGameOver(result) {
    pendingResult = result;
    const isNewRecord = result.score > 0 && result.score >= result.highScore && result.score === LS.best;

    goScore.textContent  = result.score;
    goBest.textContent   = LS.best;
    goLength.textContent = result.length;
    goLevel.textContent  = result.level;
    newRecordBadge.classList.toggle("hidden", !isNewRecord);
    nameEntry.style.display = result.score > 0 ? "flex" : "none";

    UIController.show("gameOver");
  }

  // ── SUBMIT SCORE ──
  async function submitLeaderboard() {
    if (!pendingResult || pendingResult.score <= 0) return;
    const name = (playerNameInput.value.trim() || "ANON").toUpperCase().slice(0, 12);
    LS.name = name;
    submitScoreBtn.textContent = "SUBMITTING…";
    submitScoreBtn.disabled = true;

    await window.FirebaseAPI.submitScore({
      name,
      score:      pendingResult.score,
      difficulty: selectedDiff,
      length:     pendingResult.length,
      level:      pendingResult.level,
    });

    LeaderboardUI.invalidate();
    submitScoreBtn.textContent = "✓ SUBMITTED!";
    nameEntry.style.display = "none";
    pendingResult = null;

    // Update global #1 on start screen
    window.FirebaseAPI.fetchTopScore().then(s => { menuGlobal.textContent = s || "—"; });
  }

  // ── LEADERBOARD ──
  function showLeaderboard(from = "start") {
    lbBackBtn._from = from;
    UIController.show("leaderboard");
    LeaderboardUI.show("global");
  }

  // ── HELPERS ──
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  return { init };
})();

// ── BOOT ──
document.addEventListener("DOMContentLoaded", () => App.init());

// ── SERVICE WORKER REGISTRATION ──
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(() => console.log("[SW] Registered ✓"))
      .catch(e => console.warn("[SW] Registration failed:", e));
  });
}
