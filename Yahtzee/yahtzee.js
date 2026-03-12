// ---------------- STATE ----------------

const state = {
  players: [
    { name: "Player 1", score: 0, card: {} },
    { name: "Player 2", score: 0, card: {} }
  ],
  currentPlayer: 0,
  dice: [null,null,null,null,null],
  held: [false,false,false,false,false],
  rollsLeft: 3,
  categories: [
    "Ones","Twos","Threes","Fours","Fives","Sixes",
    "Three of a Kind","Four of a Kind","Full House",
    "Small Straight","Large Straight","Yahtzee","Chance"
  ]
};

// ---------------- LEADERBOARD STORAGE ----------------

const LB_KEY = "yahtzee_leaderboard_v1";
const HIST_KEY = "yahtzee_history_v1";

function loadLB() {
  try { return JSON.parse(localStorage.getItem(LB_KEY) || "{}"); }
  catch { return {}; }
}

function saveLB(data) {
  localStorage.setItem(LB_KEY, JSON.stringify(data));
}

function loadHist() {
  try { return JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); }
  catch { return []; }
}

function saveHist(data) {
  localStorage.setItem(HIST_KEY, JSON.stringify(data));
}

function resetStatsAll() {
  localStorage.removeItem(LB_KEY);
  localStorage.removeItem(HIST_KEY);
  renderLeaderboard();
  renderHistory();
}

// ---------------- RECORD ROUND ----------------

function recordRound({ winner, loser, p1Score, p2Score }) {
  const lb = loadLB();
  const hist = loadHist();
  const now = new Date().toISOString();

  function ensure(name) {
    if (!lb[name]) {
      lb[name] = {
        wins: 0,
        losses: 0,
        rounds: 0,
        streak: 0,
        bestStreak: 0,
        lastPlayed: null
      };
    }
  }

  ensure(winner);
  ensure(loser);

  lb[winner].wins++;
  lb[winner].rounds++;
  lb[winner].streak++;
  lb[winner].lastPlayed = now;
  if (lb[winner].streak > lb[winner].bestStreak) {
    lb[winner].bestStreak = lb[winner].streak;
  }

  lb[loser].losses++;
  lb[loser].rounds++;
  lb[loser].streak = 0;
  lb[loser].lastPlayed = now;

  hist.unshift({
    time: now,
    winner,
    loser,
    p1Score,
    p2Score
  });

  saveLB(lb);
  saveHist(hist);
  renderLeaderboard();
  renderHistory();
}

// ---------------- RENDER LEADERBOARD ----------------

function renderLeaderboard() {
  const lb = loadLB();
  const entries = Object.entries(lb).map(([name, d]) => {
    const rate = d.rounds ? Math.round((d.wins / d.rounds) * 100) : 0;
    return { name, ...d, rate };
  });

  entries.sort((a,b)=>{
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.rate !== a.rate) return b.rate - a.rate;
    return b.rounds - a.rounds;
  });

  const box = document.getElementById("leaderboard");
  if (!entries.length) {
    box.innerHTML = "<p>No games yet.</p>";
    return;
  }

  let html = `<table><tr>
    <th>Player</th><th>W</th><th>L</th><th>%</th><th>Streak</th><th>Rounds</th>
  </tr>`;

  for (const e of entries) {
    html += `<tr>
      <td>${e.name}</td>
      <td>${e.wins}</td>
      <td>${e.losses}</td>
      <td>${e.rate}</td>
      <td>${e.bestStreak}</td>
      <td>${e.rounds}</td>
    </tr>`;
  }

  html += "</table>";
  box.innerHTML = html;
}

// ---------------- RENDER HISTORY ----------------

function renderHistory() {
  const hist = loadHist();
  const box = document.getElementById("history");

  if (!hist.length) {
    box.innerHTML = "<p>No rounds yet.</p>";
    return;
  }

  box.innerHTML = hist.slice(0, 40).map(h=>{
    const date = new Date(h.time).toLocaleString();
    return `<div class="history-item">
      <strong>${h.winner}</strong> beat ${h.loser}<br>
      P1: ${h.p1Score} | P2: ${h.p2Score}<br>
      <span>${date}</span>
    </div>`;
  }).join("");
}

// ---------------- ELEMENTS ----------------

const p1Name = document.getElementById("p1Name");
const p2Name = document.getElementById("p2Name");
const p1Score = document.getElementById("p1Score");
const p2Score = document.getElementById("p2Score");

const p1Input = document.getElementById("p1Input");
const p2Input = document.getElementById("p2Input");
const saveNames = document.getElementById("saveNames");

const currentPlayerLabel = document.getElementById("currentPlayerLabel");
const rollsLeftEl = document.getElementById("rollsLeft");

const rollBtn = document.getElementById("rollBtn");
const resetGame = document.getElementById("resetGame");
const resetStats = document.getElementById("resetStats");

const diceArea = document.getElementById("diceArea");
const scorecard1 = document.getElementById("scorecard1");
const scorecard2 = document.getElementById("scorecard2");

const endOverlay = document.getElementById("endOverlay");
const endText = document.getElementById("endText");
const newGameBtn = document.getElementById("newGameBtn");

const yahtzeeOverlay = document.getElementById("yahtzeeOverlay");
const yahtzeeBack = document.getElementById("yahtzeeBack");

// ---------------- UI ----------------

function updateUI() {
  p1Name.textContent = state.players[0].name;
  p2Name.textContent = state.players[1].name;
  document.getElementById("p1NameCard").textContent = state.players[0].name;
  document.getElementById("p2NameCard").textContent = state.players[1].name;
  p1Score.textContent = state.players[0].score;
  p2Score.textContent = state.players[1].score;
  currentPlayerLabel.textContent = state.players[state.currentPlayer].name;
  rollsLeftEl.textContent = state.rollsLeft;
}

function renderDice() {
  diceArea.innerHTML = "";
  state.dice.forEach((val, i) => {
    const d = document.createElement("div");
    d.className = "die";

    if (val === null) d.classList.add("blank");
    else d.textContent = val;

    if (state.held[i]) d.classList.add("held");

    d.addEventListener("click", () => toggleHold(i));
    diceArea.appendChild(d);
  });
}

function renderScorecards() {
  scorecard1.innerHTML = "";
  scorecard2.innerHTML = "";

  renderCardForPlayer(0, scorecard1);
  renderCardForPlayer(1, scorecard2);

  highlightBestCategory();
}

function renderCardForPlayer(playerIndex, container) {
  const card = state.players[playerIndex].card;

  state.categories.forEach(cat => {
    const row = document.createElement("div");
    row.className = "score-row";
    row.dataset.player = playerIndex;
    row.dataset.category = cat;

    if (card[cat] !== undefined) row.classList.add("used");

    row.innerHTML = `
      <div class="score-name">${cat}</div>
      <div class="score-value">${card[cat] ?? ""}</div>
    `;

    if (playerIndex === state.currentPlayer && card[cat] === undefined) {
      row.addEventListener("click", () => attemptScore(cat));
    }

    container.appendChild(row);
  });
}
// ---------------- GAME LOGIC ----------------

function rollDice() {
  if (state.rollsLeft <= 0) return;

  const diceDivs = [...diceArea.children];
  diceDivs.forEach(d => d.classList.add("roll-anim"));

  setTimeout(() => {
    for (let i = 0; i < 5; i++) {
      if (!state.held[i]) {
        state.dice[i] = Math.floor(Math.random() * 6) + 1;
      }
    }

    state.rollsLeft--;
    updateUI();
    renderDice();
    renderScorecards();
  }, 300);
}

function toggleHold(i) {
  if (state.rollsLeft === 3) return;
  if (state.dice[i] === null) return;

  state.held[i] = !state.held[i];
  renderDice();
}

// ---------------- SCORING WITH 0‑POINT CONFIRMATION ----------------

function attemptScore(cat) {
  if (state.dice.some(d => d === null)) {
    alert("Roll the dice first.");
    return;
  }

  const dice = [...state.dice];
  const counts = [0,0,0,0,0,0];
  dice.forEach(d => counts[d-1]++);

  const valid = isValidCategory(cat, counts, dice);

  if (valid) {
    scoreCategory(cat, counts, dice);
    return;
  }

  const confirmZero = confirm(`Add 0 points to ${cat}?`);
  if (!confirmZero) return;

  applyScore(cat, 0);
  nextTurn();
}

function isValidCategory(cat, counts, dice) {
  if (cat === "Ones") return counts[0] > 0;
  if (cat === "Twos") return counts[1] > 0;
  if (cat === "Threes") return counts[2] > 0;
  if (cat === "Fours") return counts[3] > 0;
  if (cat === "Fives") return counts[4] > 0;
  if (cat === "Sixes") return counts[5] > 0;

  if (cat === "Three of a Kind") return counts.some(c => c >= 3);
  if (cat === "Four of a Kind") return counts.some(c => c >= 4);
  if (cat === "Full House") return counts.includes(3) && counts.includes(2);
  if (cat === "Small Straight") return hasStraight(counts, 4);
  if (cat === "Large Straight") return hasStraight(counts, 5);
  if (cat === "Yahtzee") return counts.some(c => c === 5);

  if (cat === "Chance") return true;

  return true;
}

function scoreCategory(cat, counts, dice) {
  const score = computeScore(cat, counts, dice);

  if (cat === "Yahtzee" && score === 50) {
    applyScore(cat, score);
    triggerYahtzeeCrazy();
    nextTurn();
    return;
  }

  applyScore(cat, score);
  nextTurn();
}

function applyScore(cat, score) {
  const player = state.players[state.currentPlayer];
  player.card[cat] = score;
  player.score += score;
}

function computeScore(cat, counts, dice) {
  let score = 0;

  if (cat === "Ones") score = counts[0] * 1;
  if (cat === "Twos") score = counts[1] * 2;
  if (cat === "Threes") score = counts[2] * 3;
  if (cat === "Fours") score = counts[3] * 4;
  if (cat === "Fives") score = counts[4] * 5;
  if (cat === "Sixes") score = counts[5] * 6;

  if (cat === "Three of a Kind") score = counts.some(c => c >= 3) ? dice.reduce((a,b)=>a+b,0) : 0;
  if (cat === "Four of a Kind") score = counts.some(c => c >= 4) ? dice.reduce((a,b)=>a+b,0) : 0;
  if (cat === "Full House") score = counts.includes(3) && counts.includes(2) ? 25 : 0;
  if (cat === "Small Straight") score = hasStraight(counts, 4) ? 30 : 0;
  if (cat === "Large Straight") score = hasStraight(counts, 5) ? 40 : 0;
  if (cat === "Yahtzee") score = counts.some(c => c === 5) ? 50 : 0;
  if (cat === "Chance") score = dice.reduce((a,b)=>a+b,0);

  return score;
}

function hasStraight(counts, len) {
  const seq = counts.map(c => (c > 0 ? 1 : 0)).join("");
  if (len === 4) return seq.includes("1111");
  if (len === 5) return seq.includes("11111");
  return false;
}

// ---------------- BEST CATEGORY HIGHLIGHT ----------------

function highlightBestCategory() {
  if (state.dice.some(d => d === null)) return;

  const dice = [...state.dice];
  const counts = [0,0,0,0,0,0];
  dice.forEach(d => counts[d-1]++);

  const player = state.players[state.currentPlayer];
  let bestCat = null;
  let bestScore = 0;

  state.categories.forEach(cat => {
    if (player.card[cat] !== undefined) return;
    const score = computeScore(cat, counts, dice);
    if (score > bestScore) {
      bestScore = score;
      bestCat = cat;
    }
  });

  document.querySelectorAll(".score-row").forEach(r => r.classList.remove("recommended"));

  if (!bestCat || bestScore === 0) return;

  const selector = `.score-row[data-player="${state.currentPlayer}"][data-category="${bestCat}"]`;
  const row = document.querySelector(selector);
  if (row) row.classList.add("recommended");
}

// ---------------- YAHTZEE CRAZY MODE ----------------

function triggerYahtzeeCrazy() {
  document.body.classList.add("yahtzee-crazy");
  yahtzeeOverlay.classList.remove("hidden");
  setTimeout(() => yahtzeeOverlay.classList.add("show"), 10);
  playYahtzeeSound();
}

function playYahtzeeSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(440, ctx.currentTime);
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

// ---------------- TURN + GAME END ----------------

function nextTurn() {
  if (isGameOver()) {
    endGame();
    return;
  }

  state.currentPlayer = state.currentPlayer === 0 ? 1 : 0;
  state.rollsLeft = 3;
  state.dice = [null,null,null,null,null];
  state.held = [false,false,false,false,false];

  updateUI();
  renderDice();
  renderScorecards();
}

function isGameOver() {
  return state.categories.every(cat =>
    state.players[0].card[cat] !== undefined &&
    state.players[1].card[cat] !== undefined
  );
}

function endGame() {
  const p1 = state.players[0].score;
  const p2 = state.players[1].score;

  let winner = "It's a tie!";
  if (p1 > p2) winner = `${state.players[0].name} wins!`;
  if (p2 > p1) winner = `${state.players[1].name} wins!`;

  endText.textContent = winner;

  recordRound({
    winner: winner.includes(state.players[0].name) ? state.players[0].name : state.players[1].name,
    loser: winner.includes(state.players[0].name) ? state.players[1].name : state.players[0].name,
    p1Score: p1,
    p2Score: p2
  });

  endOverlay.classList.remove("hidden");
  setTimeout(() => endOverlay.classList.add("show"), 10);
}
// ---------------- RESET + EVENTS ----------------

function resetAll() {
  state.players = [
    { name: "Player 1", score: 0, card: {} },
    { name: "Player 2", score: 0, card: {} }
  ];
  state.currentPlayer = 0;
  state.rollsLeft = 3;
  state.dice = [null,null,null,null,null];
  state.held = [false,false,false,false,false];

  document.body.classList.remove("yahtzee-crazy");
  yahtzeeOverlay.classList.add("hidden");
  yahtzeeOverlay.classList.remove("show");

  endOverlay.classList.remove("show");
  setTimeout(() => endOverlay.classList.add("hidden"), 200);

  updateUI();
  renderDice();
  renderScorecards();
}

// ---------------- EVENT LISTENERS ----------------

saveNames.addEventListener("click", () => {
  state.players[0].name = p1Input.value || "Player 1";
  state.players[1].name = p2Input.value || "Player 2";
  updateUI();
});

rollBtn.addEventListener("click", rollDice);
resetGame.addEventListener("click", resetAll);
resetStats.addEventListener("click", resetStatsAll);

newGameBtn.addEventListener("click", resetAll);

yahtzeeBack.addEventListener("click", () => {
  document.body.classList.remove("yahtzee-crazy");
  yahtzeeOverlay.classList.remove("show");
  setTimeout(() => yahtzeeOverlay.classList.add("hidden"), 200);
});

// ---------------- INIT ----------------

updateUI();
renderDice();
renderScorecards();
renderLeaderboard();
renderHistory();
