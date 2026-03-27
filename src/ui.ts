import type { MatchState } from "./match";
import type { ClockState } from "./clock_match";
import { playClick } from "./audio";

// Centers the active player column in the scroll container
function scrollToActivePlayer(
  container: HTMLElement,
  /* instant= */ instant: boolean,
) {
  const activeCol = container.querySelector(
    ".active-player",
  ) as HTMLElement | null;
  if (!activeCol) return;

  // Center of column should align with center of visible container
  const scrollTarget =
    activeCol.offsetLeft -
    container.offsetWidth / 2 +
    activeCol.offsetWidth / 2;
  container.scrollTo({
    left: scrollTarget,
    behavior: instant ? "auto" : "smooth",
  });
}

// Renders the players' scores, names, averages, and legs/sets
export function renderScoreboard(state: MatchState) {
  const container = document.getElementById("scoreboard-container");
  if (!container) return;

  // If we are abandoned or setup, just show empty
  if (state.status !== "PLAYING" && state.status !== "WON") {
    container.innerHTML = `<h2 style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">Match ${state.status}</h2>`;
    return;
  }

  let flexBox = container.querySelector(
    ".scoreboard-flex-container",
  ) as HTMLElement | null;
  const playerCount = state.players.length;

  // Check if we can reuse the existing board
  const existingCols = flexBox ? flexBox.querySelectorAll(".player-col") : [];
  const canReuse = flexBox && existingCols.length === playerCount;

  if (!canReuse) {
    // Initial build or player count changed
    container.innerHTML = "";
    flexBox = document.createElement("div");
    flexBox.className = "scoreboard-flex-container";

    // Leading spacer
    const leadSpacer = document.createElement("div");
    leadSpacer.className = "scroll-spacer";
    flexBox.appendChild(leadSpacer);

    state.players.forEach(() => {
      const col = document.createElement("div");
      col.className = "player-col";
      flexBox!.appendChild(col);
    });

    // Trailing spacer
    const trailSpacer = document.createElement("div");
    trailSpacer.className = "scroll-spacer";
    flexBox.appendChild(trailSpacer);

    container.appendChild(flexBox);
  }

  // Update all player columns in place
  const playerCols = flexBox!.querySelectorAll(".player-col");
  state.players.forEach((player, idx) => {
    const col = playerCols[idx] as HTMLElement;
    const isCurrent =
      idx === state.currentPlayerIndex && state.status === "PLAYING";

    // Update active class
    if (isCurrent) {
      col.classList.add("active-player");
    } else {
      col.classList.remove("active-player");
    }

    // Update content (only if changed or first load)
    // For simplicity in vanilla JS, we just re-sync the innerHTML of the column
    // This is safe because it doesn't affect the scroller's position.
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
  });

  // Ensure spacers are correct (only really needed on first load or resize)
  const firstCol = playerCols[0] as HTMLElement | null;
  if (firstCol) {
    const leadSpacer = flexBox!.querySelector(".scroll-spacer") as HTMLElement;
    const trailSpacer = flexBox!.querySelectorAll(
      ".scroll-spacer",
    )[1] as HTMLElement;

    const colWidth = firstCol.offsetWidth || 160;
    const containerWidth = container.clientWidth || 420;
    const spacerWidth = Math.max(0, (containerWidth - colWidth) / 2);

    leadSpacer.style.width = `${spacerWidth}px`;
    leadSpacer.style.minWidth = `${spacerWidth}px`;
    trailSpacer.style.width = `${spacerWidth}px`;
    trailSpacer.style.minWidth = `${spacerWidth}px`;
  }

  // Handle centering
  requestAnimationFrame(() => {
    if (!flexBox || !flexBox.isConnected) return;

    if (canReuse) {
      // Smooth slide to the next player
      scrollToActivePlayer(flexBox, /* instant= */ false);
    } else {
      // First load: snap to center
      scrollToActivePlayer(flexBox, /* instant= */ true);
    }
  });

  // Winner Message
  if (state.status === "WON") {
    // Only add if not already present
    if (!container.querySelector(".status-title")) {
      const wName =
        state.players.find((p) => p.id === state.winnerId)?.name || "Player";
      const champ = document.createElement("h2");
      champ.className = "status-title";
      champ.style.marginTop = "1rem";
      champ.style.textAlign = "center";
      champ.textContent = `${wName} Wins!`;
      container.appendChild(champ);
    }
  } else {
    // Remove if game restarted
    container.querySelector(".status-title")?.remove();
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
        btn.classList.add("action-key");
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

  const isWon = state.status === "WON";
  const activePlayer =
    isWon && state.winnerId
      ? state.players.find((p) => p.id === state.winnerId) || state.players[0]
      : state.players[state.currentPlayerIndex] || state.players[0];

  let playersHtml = "";
  if (state.players.length > 1) {
    playersHtml = `<div style="display: flex; gap: 0.4rem; justify-content: center; margin-bottom: 0.75rem; flex-wrap: wrap; width: 100%;">`;
    state.players.forEach((p, idx) => {
      const isCurrent =
        idx === state.currentPlayerIndex && state.status === "PLAYING";
      const shortName = p.name.replace("Player ", "P");
      playersHtml += `
        <div style="background: ${isCurrent ? "rgba(195, 206, 215, 0.2)" : "var(--glass-bg)"}; 
                    border: 1px solid ${isCurrent ? "var(--accent)" : "var(--glass-border)"}; 
                    border-radius: 12px; padding: 0.4rem 0.6rem; display: flex; align-items: center; gap: 0.4rem;
                    opacity: ${isCurrent ? "1" : "0.5"}; transition: all 0.3s; min-width: 65px; justify-content: center;">
          <span style="font-size: 0.8rem; font-weight: 800;">${shortName}</span>
          <span style="font-size: 1.1rem; font-weight: 800; color: ${isCurrent ? "var(--accent)" : "inherit"};">${p.currentTarget > 20 ? "W" : p.currentTarget}</span>
        </div>
      `;
    });
    playersHtml += `</div>`;
  }

  let mainTargetText = isWon ? "DONE" : activePlayer.currentTarget.toString();
  if (activePlayer.currentTarget > 20) mainTargetText = "DONE";

  container.innerHTML = `
    <div class="clock-board">
      ${playersHtml}
      <div class="set-indicator">SET: ${activePlayer.currentSet}</div>
      <div class="clock-label">${isWon ? activePlayer.name + " WINS!" : state.players.length > 1 ? activePlayer.name + "'S TARGET" : "CURRENT TARGET"}</div>
      <div class="clock-target">${mainTargetText}</div>
      <div class="clock-stats">
        <div class="stat-row">
          <span class="stat-lbl">DARTS LEFT</span>
          <div class="dart-indicator-container">
            ${[0, 1, 2]
              .map((i) => {
                const isUsed = 2 - i < activePlayer.dartsThrownInSet;
                const isActive =
                  2 - i === activePlayer.dartsThrownInSet && !isWon;
                return `
                <svg viewBox="0 0 512 512" fill="currentColor" class="dart-icon ${isUsed ? "used" : ""} ${isActive ? "pulse" : ""}">
                  <path d="M134.745 22.098c-4.538-.146-9.08 1.43-14.893 7.243-5.586 5.586-11.841 21.725-15.248 35.992-.234.979-.444 1.907-.654 2.836l114.254 105.338c-7.18-28.538-17.555-59.985-29.848-86.75-11.673-25.418-25.249-46.657-37.514-57.024-6.132-5.183-11.56-7.488-16.097-7.635zM92.528 82.122L82.124 92.526 243.58 267.651l24.072-24.072L92.528 82.122zm-24.357 21.826c-.929.21-1.857.42-2.836.654-14.267 3.407-30.406 9.662-35.993 15.248-5.813 5.813-7.39 10.355-7.244 14.893.147 4.538 2.452 9.965 7.635 16.098 10.367 12.265 31.608 25.842 57.025 37.515 26.766 12.293 58.211 22.669 86.749 29.848L68.17 103.948zM280.899 255.79l-25.107 25.107 73.265 79.469 31.31-31.31L280.9 255.79zm92.715 85.476l-32.346 32.344 2.07 2.246c.061.058 4.419 4.224 10.585 6.28 6.208 2.069 12.71 2.88 21.902-6.313 9.192-9.192 8.38-15.694 6.31-21.902-2.057-6.174-6.235-10.54-6.283-10.59l-2.238-2.065zm20.172 41.059a46.23 46.23 0 0 1-5.233 6.226 46.241 46.241 0 0 1-6.226 5.235L489.91 489.91l-96.125-107.586z"/>
                </svg>
              `;
              })
              .join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initClockNumpad(
  onHit: (mult: 1 | 2 | 3) => void,
  onMiss: (allThree: boolean) => void,
  onUndo: () => void,
  onRestart: () => void,
) {
  const container = document.getElementById("clock-numpad-container");
  if (!container) return;

  container.innerHTML = `
    <div class="clock-actions-grid">
      <button id="btn-single" class="action-btn r-success">Single</button>
      <button id="btn-miss" class="action-btn r-error">Miss 1</button>
      <button id="btn-double" class="action-btn r-success">Double</button>
      <button id="btn-miss-all" class="action-btn r-error">Miss 3</button>
      <button id="btn-treble" class="action-btn r-success">Treble</button>
      <button id="btn-undo" class="action-btn r-error">Undo</button>
    </div>
    <button id="btn-restart-clock" class="action-btn r-primary hidden" style="margin-top: 1rem;">Start New Game</button>
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
  document.getElementById("btn-restart-clock")!.onclick = () => {
    playClick();
    onRestart();
  };
}

export function updateClockActions(state: ClockState) {
  const btn = document.getElementById("btn-restart-clock");
  if (!btn) return;
  if (state.status === "WON") {
    btn.classList.remove("hidden");
  } else {
    btn.classList.add("hidden");
  }
}
