// ---------------- STATE ----------------

const state = {
  players: [
    { name: "Player 1", score: 0 },
    { name: "Player 2", score: 0 }
  ],
  setter: 0,
  guesser: 1,
  phrase: [],
  revealed: [],
  used: new Set(),
  livesMax: 6,
  lives: 6,
  active: false
};

const animals = ["🐋","🐬","🐕","🐈","🐁","🐞","🐜"];

// ---------------- ELEMENTS ----------------

const p1Name = document.getElementById("p1Name");
const p2Name = document.getElementById("p2Name");
const p1Score = document.getElementById("p1Score");
const p2Score = document.getElementById("p2Score");

const setterLabel = document.getElementById("setterLabel");

const phraseInput = document.getElementById("phraseInput");
const togglePhrase = document.getElementById("togglePhrase");

const livesInput = document.getElementById("livesInput");
const startBtn = document.getElementById("startBtn");

const animal = document.getElementById("animal");
const livesText = document.getElementById("livesText");

const phraseDisplay = document.getElementById("phraseDisplay");
const keyboard = document.getElementById("keyboard");

const fullGuess = document.getElementById("fullGuess");
const fullGuessBtn = document.getElementById("fullGuessBtn");

const roundMsg = document.getElementById("roundMsg");

const winOverlay = document.getElementById("winOverlay");
const loseOverlay = document.getElementById("loseOverlay");
const winText = document.getElementById("winText");
const loseText = document.getElementById("loseText");
const winNext = document.getElementById("winNext");
const loseNext = document.getElementById("loseNext");

const leaderboard = document.getElementById("leaderboard");
const history = document.getElementById("history");

const resetStats = document.getElementById("resetStats");

// ---------------- LEADERBOARD + HISTORY ----------------

const LB_KEY = "hangman_leaderboard_v2";
const HIST_KEY = "hangman_history_v2";

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

function resetAllStats() {
  localStorage.removeItem(LB_KEY);
  localStorage.removeItem(HIST_KEY);
  state.players[0].score = 0;
  state.players[1].score = 0;
  updateUI();
  renderLeaderboard();
  renderHistory();
}

// ---------------- RECORD ROUND ----------------

function recordRound({ winner, loser, setter, guesser, phrase, livesLeft, fullGuess }) {
  const lb = loadLB();
  const hist = loadHist();
  const now = new Date().toISOString();

  function ensure(name) {
    if (!lb[name]) {
      lb[name] = {
        wins: 0,
        losses: 0,
        rounds: 0,
        bestStreak: 0,
        streak: 0,
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
    setter,
    guesser,
    winner,
    loser,
    phrase,
    livesLeft,
    fullGuess
  });

  saveLB(lb);
  saveHist(hist);
  renderLeaderboard();
  renderHistory();
}

// ---------------- RENDER LB + HISTORY ----------------

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

  if (!entries.length) {
    leaderboard.innerHTML = "<p>No games yet.</p>";
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
  leaderboard.innerHTML = html;
}

function renderHistory() {
  const hist = loadHist();
  if (!hist.length) {
    history.innerHTML = "<p>No rounds yet.</p>";
    return;
  }

  history.innerHTML = hist.slice(0, 40).map(h=>{
    const date = new Date(h.time).toLocaleString();
    return `<div class="history-item">
      <strong>${h.winner}</strong> beat ${h.loser}
      (${h.fullGuess ? "Full guess" : "Letters"}, ${h.livesLeft} lives left)<br>
      Phrase: "${h.phrase}"<br>
      <span>${date}</span>
    </div>`;
  }).join("");
}

// ---------------- HELPERS ----------------

function updateUI() {
  p1Name.textContent = state.players[0].name;
  p2Name.textContent = state.players[1].name;
  p1Score.textContent = state.players[0].score;
  p2Score.textContent = state.players[1].score;
  setterLabel.textContent = state.players[state.setter].name;
}

function updateAnimal() {
  const ratio = state.lives / state.livesMax;
  let idx = Math.floor((1 - ratio) * animals.length);
  if (idx < 0) idx = 0;
  if (idx >= animals.length) idx = animals.length - 1;
  animal.textContent = animals[idx];
  livesText.textContent = state.lives > 0 ? `${state.lives} lives left` : "No lives left";
}

function parsePhrase(str) {
  const arr = [];
  for (let ch of str.toUpperCase()) {
    if (/[A-Z]/.test(ch)) arr.push({char: ch, letter: true});
    else if (ch === " ") arr.push({char: " ", space: true});
    else arr.push({char: ch, symbol: true});
  }
  return arr;
}

function buildPhrase() {
  phraseDisplay.innerHTML = "";
  state.phrase.forEach((p,i)=>{
    const span = document.createElement("span");
    if (p.letter) {
      span.classList.add("letter");
      span.textContent = state.revealed[i] ? p.char : "";
    } else {
      span.textContent = p.char;
    }
    phraseDisplay.appendChild(span);
  });
}

function buildKeyboard() {
  keyboard.innerHTML = "";
  const rows = ["QWERTYUIOP","ASDFGHJKL","ZXCVBNM"];
  rows.forEach(r=>{
    const rowDiv = document.createElement("div");
    rowDiv.classList.add("kb-row");
    for (let ch of r) {
      const btn = document.createElement("button");
      btn.className = "key-btn";
      btn.textContent = ch;
      btn.addEventListener("click", () => guessLetter(ch));
      rowDiv.appendChild(btn);
    }
    keyboard.appendChild(rowDiv);
  });
}

function updateKeyboard() {
  document.querySelectorAll(".key-btn").forEach(btn=>{
    if (state.used.has(btn.textContent)) btn.classList.add("used");
  });
}

function revealAll() {
  state.revealed = state.revealed.map(()=>true);
  buildPhrase();
}

// ---------------- GAME LOGIC ----------------

function startRound() {
  const phrase = phraseInput.value.trim();
  if (!phrase) {
    alert("Enter a phrase.");
    return;
  }

  const livesVal = parseInt(livesInput.value, 10);
  if (isNaN(livesVal) || livesVal < 3 || livesVal > 10) {
    alert("Lives must be between 3 and 10.");
    return;
  }

  state.livesMax = livesVal;
  state.lives = state.livesMax;

  state.phrase = parsePhrase(phrase);
  state.revealed = state.phrase.map(p=>!p.letter);
  state.used.clear();
  state.active = true;

  phraseInput.value = "";
  roundMsg.textContent = `${state.players[state.guesser].name}, start guessing!`;

  buildPhrase();
  buildKeyboard();
  updateAnimal();
}

function guessLetter(ch) {
  if (!state.active) return;
  if (state.used.has(ch)) return;

  state.used.add(ch);
  updateKeyboard();

  let found = false;
  state.phrase.forEach((p,i)=>{
    if (p.letter && p.char === ch) {
      state.revealed[i] = true;
      found = true;
    }
  });

  if (found) {
    buildPhrase();
    roundMsg.textContent = `"${ch}" is in the phrase!`;
    if (state.revealed.every(x=>x)) win(false);
  } else {
    state.lives--;
    updateAnimal();
    roundMsg.textContent = `"${ch}" is not in the phrase.`;
    if (state.lives <= 0) lose();
  }
}

function guessFull() {
  if (!state.active) return;
  const guess = fullGuess.value.trim().toUpperCase();
  if (!guess) return;
  fullGuess.value = "";

  const target = state.phrase.filter(p=>p.letter).map(p=>p.char).join("");
  const guessLetters = guess.replace(/[^A-Z]/g,"");

  if (guessLetters === target && target.length > 0) {
    revealAll();
    win(true);
  } else {
    state.lives--;
    updateAnimal();
    roundMsg.textContent = "Wrong full guess!";
    if (state.lives <= 0) lose();
  }
}

// ---------------- WIN / LOSE ----------------

function win(full) {
  state.active = false;
  const g = state.players[state.guesser];
  const s = state.players[state.setter];

  g.score += full ? 2 : 1;
  updateUI();

  const phrase = state.phrase.map(p=>p.char).join("");

  recordRound({
    winner: g.name,
    loser: s.name,
    setter: s.name,
    guesser: g.name,
    phrase,
    livesLeft: state.lives,
    fullGuess: full
  });

  winText.textContent = `${g.name} guessed the phrase: "${phrase}"`;
  winOverlay.classList.remove("hidden");
  setTimeout(()=>winOverlay.classList.add("show"),10);
}

function lose() {
  state.active = false;
  const g = state.players[state.guesser];
  const s = state.players[state.setter];

  s.score++;
  updateUI();

  const phrase = state.phrase.map(p=>p.char).join("");

  recordRound({
    winner: s.name,
    loser: g.name,
    setter: s.name,
    guesser: g.name,
    phrase,
    livesLeft: 0,
    fullGuess: false
  });

  loseText.textContent = `${s.name}'s phrase was: "${phrase}"`;
  loseOverlay.classList.remove("hidden");
  setTimeout(()=>loseOverlay.classList.add("show"),10);
}

function nextRound() {
  winOverlay.classList.remove("show");
  loseOverlay.classList.remove("show");
  setTimeout(()=>{
    winOverlay.classList.add("hidden");
    loseOverlay.classList.add("hidden");
  },200);

  const t = state.setter;
  state.setter = state.guesser;
  state.guesser = t;

  updateUI();
  state.active = false;
  phraseDisplay.innerHTML = "";
  keyboard.innerHTML = "";
  roundMsg.textContent = "";
  state.lives = state.livesMax;
  updateAnimal();
}

// ---------------- EVENTS ----------------

document.getElementById("saveNames").addEventListener("click", () => {
  state.players[0].name = document.getElementById("p1Input").value || "Player 1";
  state.players[1].name = document.getElementById("p2Input").value || "Player 2";
  updateUI();
});

startBtn.addEventListener("click", startRound);
fullGuessBtn.addEventListener("click", guessFull);

winNext.addEventListener("click", nextRound);
loseNext.addEventListener("click", nextRound);

resetStats.addEventListener("click", resetAllStats);

togglePhrase.addEventListener("click", () => {
  if (phraseInput.type === "password") {
    phraseInput.type = "text";
    togglePhrase.textContent = "Hide";
  } else {
    phraseInput.type = "password";
    togglePhrase.textContent = "Show";
  }
});

document.addEventListener("keydown", e => {
  if (!state.active) return;
  const key = e.key.toUpperCase();
  if (/^[A-Z]$/.test(key)) {
    guessLetter(key);
  } else if (e.key === "Enter") {
    guessFull();
  }
});

// ---------------- INIT ----------------

updateUI();
updateAnimal();
renderLeaderboard();
renderHistory();
