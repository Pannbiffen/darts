import type { MatchState } from "./match";
import type { ClockState } from "./clock_match";
import { playClick } from "./audio";

// Renders the players' scores, names, averages, and legs/sets
export function renderScoreboard(state: MatchState) {
  const container = document.getElementById("scoreboard-container");
  if (!container) return;

  // If we are abandoned or setup, just show empty
  if (state.status !== "PLAYING" && state.status !== "WON") {
    container.innerHTML = `<h2 style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">Match ${state.status}</h2>`;
    return;
  }

  container.innerHTML = "";

  const flexBox = document.createElement("div");
  // Flex layout dynamically sizes columns based on number of players
  flexBox.style.display = "flex";
  flexBox.style.justifyContent = "center";
  flexBox.style.gap = "1rem";
  flexBox.style.width = "100%";

  state.players.forEach((player, idx) => {
    const isCurrent =
      idx === state.currentPlayerIndex && state.status === "PLAYING";

    const col = document.createElement("div");
    col.className = `player-col ${isCurrent ? "active-player" : ""}`;

    // Using the glassmorphism logic inherited from Pitchle
    col.innerHTML = `
      <div class="player-name">${player.name}</div>
      <div class="player-score">${player.score}</div>
      
      <div class="player-stats">
        <div class="stat-row">
          <span class="stat-lbl">Sets</span>
          <span class="stat-val">${player.setsWon}</span>
        </div>
        <div class="stat-row">
          <span class="stat-lbl">Legs</span>
          <span class="stat-val">${player.legsWon}</span>
        </div>
        <div class="stat-row">
          <span class="stat-lbl">Avg</span>
          <span class="stat-val">${Math.round(player.currentAverage * 10) / 10}</span>
        </div>
      </div>
    `;

    flexBox.appendChild(col);
  });

  container.appendChild(flexBox);

  if (state.status === "WON") {
    const wName =
      state.players.find((p) => p.id === state.winnerId)?.name || "Player";
    const champ = document.createElement("h2");
    champ.className = "status-title";
    champ.style.marginTop = "1rem";
    champ.textContent = `${wName} Wins!`;
    container.appendChild(champ);
  }
}

export function initNumpad(
  onNumber: (numStr: string) => void,
  onUndo: () => void,
  onSubmit: () => void,
) {
  const container = document.getElementById("numpad-container");
  if (!container) return;

  container.innerHTML = "";

  const layout = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["UNDO", "0", "ENT"],
  ];

  layout.forEach((rowKeys) => {
    const rowDiv = document.createElement("div");
    rowDiv.className = "numpad-row";

    rowKeys.forEach((key) => {
      const btn = document.createElement("button");
      btn.className = "numpad-key";
      if (key === "UNDO") {
        btn.classList.add("action-key", "secondary");
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>`;
        btn.onclick = () => {
          playClick();
          onUndo();
        };
      } else if (key === "ENT") {
        btn.id = "numpad-enter-btn";
        btn.classList.add("action-key", "primary");
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>`;
        btn.onclick = () => {
          playClick();
          onSubmit();
        };
      } else {
        btn.textContent = key;
        btn.onclick = () => {
          playClick();
          onNumber(key);
        };
      }
      rowDiv.appendChild(btn);
    });

    container.appendChild(rowDiv);
  });
}

// --- Around the Clock UI ---

export function renderClockScoreboard(state: ClockState) {
  const container = document.getElementById("clock-scoreboard-container");
  if (!container) return;

  if (state.status !== "PLAYING" && state.status !== "WON") {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <div class="clock-board">
      <div class="clock-label">CURRENT TARGET</div>
      <div class="clock-target">${state.status === "WON" ? "DONE" : state.currentTarget}</div>
      <div class="clock-stats">
        <div class="stat-row">
          <span class="stat-lbl">Set #</span>
          <span class="stat-val">${state.currentSet}</span>
        </div>
        <div class="stat-row">
          <span class="stat-lbl">Throws Left</span>
          <span class="stat-val">${3 - state.dartsThrownInSet}</span>
        </div>
      </div>
    </div>
  `;
}

export function initClockNumpad(
  onHit: (mult: 1 | 2 | 3) => void,
  onMiss: (allThree: boolean) => void,
  onUndo: () => void,
) {
  const container = document.getElementById("clock-numpad-container");
  if (!container) return;

  container.innerHTML = `
    <div class="clock-actions">
      <button id="btn-treble" class="action-btn r-legendary">Treble (Skip 2)</button>
      <button id="btn-double" class="action-btn r-epic">Double (Skip 1)</button>
      <button id="btn-single" class="action-btn r-rare">Single</button>
      <button id="btn-miss" class="action-btn r-uncommon">Miss (1 Dart)</button>
      <button id="btn-miss-all" class="action-btn r-warning">Miss All 3</button>
      <button id="btn-undo" class="action-btn r-danger">Undo</button>
    </div>
  `;

  document.getElementById("btn-single")!.onclick = () => {
    playClick();
    onHit(1);
  };
  document.getElementById("btn-double")!.onclick = () => {
    playClick();
    onHit(2);
  };
  document.getElementById("btn-treble")!.onclick = () => {
    playClick();
    onHit(3);
  };
  document.getElementById("btn-miss")!.onclick = () => {
    playClick();
    onMiss(false);
  };
  document.getElementById("btn-miss-all")!.onclick = () => {
    playClick();
    onMiss(true);
  };
  document.getElementById("btn-undo")!.onclick = () => {
    playClick();
    onUndo();
  };
}
