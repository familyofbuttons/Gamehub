// ---------- STATE ----------

const state = {
  setterName: "Player 1",
  guesserName: "Player 2",
  secretWord: null,
  currentRow: 0,
  currentCol: 0,
  board: Array.from({ length: 6 }, () => Array(5).fill("")),
  boardColors: Array.from({ length: 6 }, () => Array(5).fill(null)),
  gameOver: false,
  startTime: null
};

const STATS_KEY = "wordle_duel_stats_v1";

// ---------- ELEMENTS ----------

const setterNameEl = document.getElementById("setterName");
const guesserNameEl = document.getElementById("guesserName");
const setterInput = document.getElementById("setterInput");
const guesserInput = document.getElementById("guesserInput");
const saveNamesBtn = document.getElementById("saveNames");

const secretStatus = document.getElementById("secretStatus");
const setWordBtn = document.getElementById("setWordBtn");
const newRoundBtn = document.getElementById("newRoundBtn");
const resetStatsBtn = document.getElementById("resetStatsBtn");

const boardEl = document.getElementById("board");
const keyboardEl = document.getElementById("keyboard");

const wordModal = document.getElementById("wordModal");
const secretWordInput = document.getElementById("secretWordInput");
const cancelWordBtn = document.getElementById("cancelWordBtn");
const confirmWordBtn = document.getElementById("confirmWordBtn");

const endOverlay = document.getElementById("endOverlay");
const endText = document.getElementById("endText");
const closeEndBtn = document.getElementById("closeEndBtn");

const scoreboardEl = document.getElementById("scoreboard");
const bestRoundsEl = document.getElementById("bestRounds");
const historyEl = document.getElementById("history");

// ---------- STATS STORAGE ----------

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function ensurePlayerStats(stats, name) {
  if (!stats[name]) {
    stats[name] = {
      rounds: 0,
      wins: 0,
      losses: 0,
      bestGuesses: null,
      bestTime: null,
      history: []
    };
  }
}

// ---------- UI ----------

function updateNamesUI() {
  setterNameEl.textContent = state.setterName;
  guesserNameEl.textContent = state.guesserName;
}

function renderBoard() {
  boardEl.innerHTML = "";
  for (let r = 0; r < 6; r++) {
    const rowDiv = document.createElement("div");
    rowDiv.className = "row";
    for (let c = 0; c < 5; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      const letter = state.board[r][c];
      if (letter) tile.classList.add("filled");
      tile.textContent = letter;

      const color = state.boardColors?.[r]?.[c];
      if (color) tile.classList.add(color);

      rowDiv.appendChild(tile);
    }
    boardEl.appendChild(rowDiv);
  }
}

function renderKeyboard() {
  const rows = [
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm"
  ];

  keyboardEl.innerHTML = "";

  rows.forEach((row, idx) => {
    const rowDiv = document.createElement("div");
    rowDiv.className = "key-row";

    if (idx === 2) {
      const enterKey = createKey("Enter", "Enter", true);
      rowDiv.appendChild(enterKey);
    }

    for (const ch of row) {
      const key = createKey(ch, ch.toUpperCase(), false);
      rowDiv.appendChild(key);
    }

    if (idx === 2) {
      const backKey = createKey("Backspace", "⌫", true);
      rowDiv.appendChild(backKey);
    }

    keyboardEl.appendChild(rowDiv);
  });
}

function createKey(code, label, wide) {
  const btn = document.createElement("button");
  btn.className = "key unused"; // NEW: unused = light
  if (wide) btn.classList.add("wide");
  btn.textContent = label;
  btn.dataset.code = code;
  btn.addEventListener("click", () => handleVirtualKey(code));
  return btn;
}

function updateSecretStatus() {
  secretStatus.textContent = state.secretWord ? "Set" : "Not set";
}

// ---------- STATS RENDER ----------

function renderStats() {
  const stats = loadStats();
  const guesser = state.guesserName;
  ensurePlayerStats(stats, guesser);
  const s = stats[guesser];

  scoreboardEl.innerHTML = `
    <div>Total rounds: ${s.rounds}</div>
    <div>Wins: ${s.wins}</div>
    <div>Losses: ${s.losses}</div>
  `;

  const bestGuesses = s.bestGuesses ? `${s.bestGuesses} guesses` : "—";
  const bestTime = s.bestTime ? `${(s.bestTime / 1000).toFixed(1)}s` : "—";

  bestRoundsEl.innerHTML = `
    <div>Fewest guesses: ${bestGuesses}</div>
    <div>Fastest solve: ${bestTime}</div>
  `;

  const hist = s.history || [];
  if (!hist.length) {
    historyEl.innerHTML = "<p>No rounds yet.</p>";
  } else {
    historyEl.innerHTML = hist.slice(0, 40).map(h => {
      const date = new Date(h.time).toLocaleString();
      return `<div class="history-item">
        <strong>${h.result}</strong> in ${h.guesses} guesses
        ${h.timeMs ? `(${(h.timeMs/1000).toFixed(1)}s)` : ""}<br>
        Word: ${h.word}<br>
        <span>${date}</span>
      </div>`;
    }).join("");
  }
}

// ---------- ROUND CONTROL ----------

function resetRound() {
  state.secretWord = null;
  state.currentRow = 0;
  state.currentCol = 0;
  state.board = Array.from({ length: 6 }, () => Array(5).fill(""));
  state.boardColors = Array.from({ length: 6 }, () => Array(5).fill(null));
  state.gameOver = false;
  state.startTime = null;
  updateSecretStatus();
  renderBoard();
  clearKeyboardColors();
}

function clearKeyboardColors() {
  document.querySelectorAll(".key").forEach(k => {
    k.classList.remove("correct", "present", "absent", "used");
    k.classList.add("unused"); // NEW: reset to light
  });
}

// ---------- MODALS ----------

function openWordModal() {
  secretWordInput.value = "";
  wordModal.classList.remove("hidden");
  setTimeout(() => wordModal.classList.add("show"), 10);
  secretWordInput.focus();
}

function closeWordModal() {
  wordModal.classList.remove("show");
  setTimeout(() => wordModal.classList.add("hidden"), 200);
}

function openEndModal(text) {
  endText.textContent = text;
  endOverlay.classList.remove("hidden");
  setTimeout(() => endOverlay.classList.add("show"), 10);
}

function closeEndModal() {
  endOverlay.classList.remove("show");
  setTimeout(() => endOverlay.classList.add("hidden"), 200);
}

// ---------- INPUT HANDLING ----------

function handleVirtualKey(code) {
  if (state.gameOver || !state.secretWord) return;

  if (code === "Enter") {
    submitGuess();
    return;
  }
  if (code === "Backspace") {
    deleteLetter();
    return;
  }
  if (/^[a-zA-Z]$/.test(code)) {
    addLetter(code.toUpperCase());
  }
}

document.addEventListener("keydown", (e) => {
  if (wordModal.classList.contains("show")) return;
  if (state.gameOver || !state.secretWord) return;

  if (e.key === "Enter") {
    submitGuess();
  } else if (e.key === "Backspace") {
    deleteLetter();
  } else if (/^[a-zA-Z]$/.test(e.key) && e.key.length === 1) {
    addLetter(e.key.toUpperCase());
  }
});

function addLetter(letter) {
  if (state.currentCol >= 5) return;
  state.board[state.currentRow][state.currentCol] = letter;
  state.currentCol++;
  renderBoard();
}

function deleteLetter() {
  if (state.currentCol <= 0) return;
  state.currentCol--;
  state.board[state.currentRow][state.currentCol] = "";
  renderBoard();
}

function submitGuess() {
  if (state.currentCol < 5) return;

  const guess = state.board[state.currentRow].join("");
  const target = state.secretWord.toUpperCase();

  const result = scoreGuess(guess, target);
  applyGuessColors(result);

  if (!state.startTime) {
    state.startTime = Date.now();
  }

  if (guess === target) {
    const timeMs = Date.now() - state.startTime;
    handleWin(guess, state.currentRow + 1, timeMs);
    return;
  }

  if (state.currentRow === 5) {
    handleLoss(target);
    return;
  }

  state.currentRow++;
  state.currentCol = 0;
}

// ---------- SCORING ----------

function scoreGuess(guess, target) {
  const res = Array(5).fill("absent");
  const targetArr = target.split("");
  const used = Array(5).fill(false);

  // First pass: correct
  for (let i = 0; i < 5; i++) {
    if (guess[i] === target[i]) {
      res[i] = "correct";
      used[i] = true;
    }
  }

  // Second pass: present
  for (let i = 0; i < 5; i++) {
    if (res[i] === "correct") continue;
    const ch = guess[i];
    for (let j = 0; j < 5; j++) {
      if (!used[j] && targetArr[j] === ch) {
        res[i] = "present";
        used[j] = true;
        break;
      }
    }
  }

  return res;
}

function applyGuessColors(result) {
  const rowTiles = boardEl.querySelectorAll(`.row:nth-child(${state.currentRow + 1}) .tile`);
  const guess = state.board[state.currentRow];

  for (let i = 0; i < 5; i++) {
    const tile = rowTiles[i];
    tile.classList.remove("correct", "present", "absent");
    tile.classList.add(result[i]);

    state.boardColors[state.currentRow][i] = result[i];

    const letter = guess[i];
    const keyBtn = document.querySelector(`.key[data-code="${letter.toLowerCase()}"]`);
    if (!keyBtn) continue;

    keyBtn.classList.remove("unused");
    keyBtn.classList.add("used"); // NEW: dark grey for used keys

    if (result[i] === "correct") {
      keyBtn.classList.remove("present", "absent");
      keyBtn.classList.add("correct");
    } else if (result[i] === "present") {
      if (!keyBtn.classList.contains("correct")) {
        keyBtn.classList.remove("absent");
        keyBtn.classList.add("present");
      }
    } else {
      if (!keyBtn.classList.contains("correct") && !keyBtn.classList.contains("present")) {
        keyBtn.classList.add("absent");
      }
    }
  }
}

// ---------- ROUND RESULTS + STATS ----------

function handleWin(word, guesses, timeMs) {
  state.gameOver = true;

  const stats = loadStats();
  const guesser = state.guesserName;
  ensurePlayerStats(stats, guesser);
  const s = stats[guesser];

  s.rounds++;
  s.wins++;

  if (s.bestGuesses === null || guesses < s.bestGuesses) {
    s.bestGuesses = guesses;
  }
  if (s.bestTime === null || timeMs < s.bestTime) {
    s.bestTime = timeMs;
  }

  s.history.unshift({
    time: new Date().toISOString(),
    result: "Win",
    guesses,
    timeMs,
    word
  });

  saveStats(stats);
  renderStats();

  openEndModal(`${guesser} guessed "${word}" in ${guesses} guesses!`);
}

function handleLoss(word) {
  state.gameOver = true;

  const stats = loadStats();
  const guesser = state.guesserName;
  ensurePlayerStats(stats, guesser);
  const s = stats[guesser];

  s.rounds++;
  s.losses++;

  s.history.unshift({
    time: new Date().toISOString(),
    result: "Loss",
    guesses: 6,
    timeMs: null,
    word
  });

  saveStats(stats);
  renderStats();

  openEndModal(`${guesser} did not guess the word. It was "${word}".`);
}

// ---------- EVENTS ----------

saveNamesBtn.addEventListener("click", () => {
  state.setterName = setterInput.value || "Player 1";
  state.guesserName = guesserInput.value || "Player 2";
  updateNamesUI();
  renderStats();
});

setWordBtn.addEventListener("click", () => {
  openWordModal();
});

cancelWordBtn.addEventListener("click", () => {
  closeWordModal();
});

confirmWordBtn.addEventListener("click", () => {
  const word = secretWordInput.value.trim().toUpperCase();
  if (word.length !== 5 || !/^[A-Z]+$/.test(word)) {
    alert("Please enter a valid 5-letter word.");
    return;
  }
  state.secretWord = word;
  state.currentRow = 0;
  state.currentCol = 0;
  state.board = Array.from({ length: 6 }, () => Array(5).fill(""));
  state.boardColors = Array.from({ length: 6 }, () => Array(5).fill(null));
  state.gameOver = false;
  state.startTime = null;
  updateSecretStatus();
  renderBoard();
  clearKeyboardColors();
  closeWordModal();
});

newRoundBtn.addEventListener("click", () => {
  resetRound();
});

resetStatsBtn.addEventListener("click", () => {
  const stats = loadStats();
  const guesser = state.guesserName;
  if (stats[guesser]) {
    delete stats[guesser];
    saveStats(stats);
  }
  renderStats();
});

closeEndBtn.addEventListener("click", () => {
  closeEndModal();
});

// ---------- INIT ----------

updateNamesUI();
renderBoard();
renderKeyboard();
updateSecretStatus();
renderStats();
