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

  const oldFlexBox = container.querySelector(
    ".scoreboard-flex-container",
  ) as HTMLElement;
  const prevScroll = oldFlexBox ? oldFlexBox.scrollLeft : 0;
  const hasOldFlexBox = !!oldFlexBox;

  container.innerHTML = "";

  const flexBox = document.createElement("div");
  flexBox.className = "scoreboard-flex-container";

  // --- Leading spacer so first col can scroll to center ---
  const leadSpacer = document.createElement("div");
  leadSpacer.className = "scroll-spacer";
  flexBox.appendChild(leadSpacer);

  state.players.forEach((player, idx) => {
    const isCurrent =
      idx === state.currentPlayerIndex && state.status === "PLAYING";

    const col = document.createElement("div");
    col.className = `player-col ${isCurrent ? "active-player" : ""}`;

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

  // --- Trailing spacer so last col can scroll to center ---
  const trailSpacer = document.createElement("div");
  trailSpacer.className = "scroll-spacer";
  flexBox.appendChild(trailSpacer);

  container.appendChild(flexBox);

  // --- Size spacers & scroll AFTER browser has fully laid out ---
  // setTimeout guarantees layout is complete before we measure and scroll
  setTimeout(() => {
    // Only proceed if flexBox is still in the DOM
    if (!flexBox.isConnected) return;

    const firstCol = flexBox.querySelector(".player-col") as HTMLElement | null;
    if (!firstCol) return;
    const colWidth = firstCol.offsetWidth;
    const containerWidth = container.clientWidth; // use parent for stable viewport width
    const spacerWidth = Math.max(0, (containerWidth - colWidth) / 2);

    // Use explicit width + minWidth (flexBasis can be unreliable with flex shorthand)
    leadSpacer.style.width = `${spacerWidth}px`;
    leadSpacer.style.minWidth = `${spacerWidth}px`;
    trailSpacer.style.width = `${spacerWidth}px`;
    trailSpacer.style.minWidth = `${spacerWidth}px`;

    // If we're replacing an existing board, restore its scroll position instantly,
    // then trigger a smooth scroll to the active player for a buttery transition.
    if (hasOldFlexBox) {
      flexBox.scrollTo({ left: prevScroll, behavior: "auto" });
      requestAnimationFrame(() => {
        scrollToActivePlayer(flexBox, /* instant= */ false);
      });
    } else {
      // First load: instantly center the player
      scrollToActivePlayer(flexBox, /* instant= */ true);
    }
  }, 50);

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

  const isWon = state.status === "WON";
  const activePlayer =
    isWon && state.winnerId
      ? state.players.find((p) => p.id === state.winnerId) || state.players[0]
      : state.players[state.currentPlayerIndex] || state.players[0];

  let playersHtml = "";
  if (state.players.length > 1) {
    playersHtml = `<div style="display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 1.5rem; flex-wrap: wrap; width: 100%;">`;
    state.players.forEach((p, idx) => {
      const isCurrent =
        idx === state.currentPlayerIndex && state.status === "PLAYING";
      const shortName = p.name.replace("Player ", "P");
      playersHtml += `
        <div style="background: ${isCurrent ? "rgba(195, 206, 215, 0.2)" : "var(--glass-bg)"}; 
                    border: 1px solid ${isCurrent ? "var(--accent)" : "var(--glass-border)"}; 
                    border-radius: 12px; padding: 0.5rem 0.8rem; display: flex; align-items: center; gap: 0.5rem;
                    opacity: ${isCurrent ? "1" : "0.5"}; transition: all 0.3s; min-width: 75px; justify-content: center;">
          <span style="font-size: 0.85rem; font-weight: 800;">${shortName}</span>
          <span style="font-size: 1.3rem; font-weight: 800; color: ${isCurrent ? "var(--accent)" : "inherit"};">${p.currentTarget > 20 ? "W" : p.currentTarget}</span>
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
      <div class="clock-label">${isWon ? activePlayer.name + " WINS!" : state.players.length > 1 ? activePlayer.name + "'S TARGET" : "CURRENT TARGET"}</div>
      <div class="clock-target">${mainTargetText}</div>
      <div class="clock-stats">
        <div class="stat-row">
          <span class="stat-lbl">${state.players.length > 1 ? "Turns" : "Set #"}</span>
          <span class="stat-val">${activePlayer.currentSet}</span>
        </div>
        <div class="stat-row">
          <span class="stat-lbl">Throws Left</span>
          <span class="stat-val">${isWon ? 0 : 3 - activePlayer.dartsThrownInSet}</span>
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
      <button id="btn-single" class="action-btn r-rare">Single</button>
      <button id="btn-miss" class="action-btn r-uncommon">Miss 1</button>
      <button id="btn-double" class="action-btn r-epic">Double</button>
      <button id="btn-miss-all" class="action-btn r-warning">Miss 3</button>
      <button id="btn-treble" class="action-btn r-legendary">Treble</button>
      <button id="btn-undo" class="action-btn r-danger">Undo</button>
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
