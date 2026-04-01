import "./style.css";
import { registerSW } from "virtual:pwa-register";
import {
  playClick,
  playErrorBuzz,
  playSuccessChime,
  setIsMuteEnabled,
} from "./audio";
import {
  initMatch,
  submitScore,
  undoLastThrow,
  getState,
  loadCurrentMatch,
} from "./match";
import { renderScoreboard, initNumpad } from "./ui";
import {
  getStats,
  saveStats,
  removeAtcGame,
  getAtcHistoryForPlayerCount,
  getAtcBestForPlayerCount,
  injectTestAtcData,
} from "./stats";

// Register the PWA service worker for offline support and auto-updates
registerSW({ immediate: true });

// Expose test helpers on window for console access during development
(window as any).injectTestAtcData = injectTestAtcData;

// Enable :active pseudo-class on iOS Safari
document.body.addEventListener("touchstart", () => {}, { passive: true });

// Prevent vertical bounce in PWA mode on iOS while preserving allowed scroll areas
document.body.addEventListener(
  "touchmove",
  (e) => {
    const target = e.target as HTMLElement;
    // Allow horizontal scrolling on scoreboard and vertical scrolling on modal bodies
    if (
      target.closest(".scoreboard-flex-container") ||
      target.closest(".modal-body")
    ) {
      return;
    }
    e.preventDefault();
  },
  { passive: false },
);

// --- Modal System ---
const modalButtons = [
  { btnId: "newGameBtn", modalId: "game-mode-modal" },
  { btnId: "howToPlayBtn", modalId: "how-to-play-modal" },
  { btnId: "settingsBtn", modalId: "settings-modal" },
  { btnId: "statsBtn", modalId: "stats-modal" },
];

modalButtons.forEach(({ btnId, modalId }) => {
  const btn = document.getElementById(btnId);
  const modal = document.getElementById(modalId);

  if (btn && modal) {
    btn.addEventListener("click", () => {
      playClick();

      // If opening stats, refresh the data first
      if (btnId === "statsBtn") {
        const stats = getStats();
        const globalContainer = document.getElementById(
          "global-stats-container",
        );
        const isClock = !document
          .getElementById("clock-scoreboard-container")
          ?.classList.contains("hidden");

        if (globalContainer) {
          if (isClock) {
            // Determine player count from the current/latest clock game
            const clockState = getClockState();
            const atcPlayerCount = clockState.players.length || 1;

            // Render ATC Stats filtered by player count
            const history = getAtcHistoryForPlayerCount(stats, atcPlayerCount);
            const best = getAtcBestForPlayerCount(stats, atcPlayerCount);

            // Compute averages
            const computeAvg = (arr: typeof history) =>
              arr.length === 0
                ? null
                : Math.round(
                    (arr.reduce((s, h) => s + h.setsTaken, 0) / arr.length) *
                      10,
                  ) / 10;

            const now = Date.now();
            const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
            const ONE_MONTH = 30 * 24 * 60 * 60 * 1000;

            const lifetimeAvg = computeAvg(history);
            const last10Avg = computeAvg(history.slice(-10));
            const weekAvg = computeAvg(
              history.filter((h) => now - h.date < ONE_WEEK),
            );
            const monthAvg = computeAvg(
              history.filter((h) => now - h.date < ONE_MONTH),
            );
            const fmtAvg = (v: number | null) =>
              v === null ? "-" : v.toString();

            // Build context label for the header
            const modeLabel =
              atcPlayerCount === 1 ? "Solo" : `${atcPlayerCount}-Player`;

            // History entries in reverse-chronological order
            // We need real indices into stats.atcHistory for deletion
            const realIndices: number[] = [];
            stats.atcHistory.forEach((h, idx) => {
              if ((h.playerCount ?? 1) === atcPlayerCount) {
                realIndices.push(idx);
              }
            });

            let historyHtml =
              history.length === 0
                ? `<p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 1rem;">No games finished yet.</p>`
                : [...history]
                    .map((_, displayIdx) => {
                      // displayIdx is 0..N-1 in chronological order
                      return { displayIdx, realIdx: realIndices[displayIdx] };
                    })
                    .reverse()
                    .map(({ displayIdx, realIdx }) => {
                      const h = history[displayIdx];
                      const d = new Date(h.date);
                      return `<div class="atc-history-entry" data-atc-idx="${realIdx}" style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; padding: 0.5rem 0.6rem; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 4px; cursor: pointer; transition: background 0.15s;">
                            <span>${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            <span style="font-weight: 800; color: var(--accent);">${h.setsTaken} sets</span>
                          </div>`;
                    })
                    .join("");

            // Update the modal title with context
            const statsModalTitle = document
              .getElementById("stats-modal")
              ?.querySelector("h2");
            if (statsModalTitle) {
              statsModalTitle.textContent = `ATC Stats · ${modeLabel}`;
            }

            globalContainer.innerHTML = `
              <div style="display: flex; flex-direction: column; gap: 1rem; width: 100%;">
                <div class="stat-item">
                  <div style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; margin-bottom: 0.25rem;">${history.length} game${history.length !== 1 ? "s" : ""} played</div>
                  <div class="stat-val" style="font-size: 3rem; color: var(--accent);">${best ?? "-"}</div>
                  <div class="stat-label">Personal Best (Sets)</div>
                </div>
                <div class="atc-averages-grid">
                  <div class="stat-item">
                    <div class="stat-val" style="font-size: 1.5rem;">${fmtAvg(lifetimeAvg)}</div>
                    <div class="stat-label">Lifetime Avg</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-val" style="font-size: 1.5rem;">${fmtAvg(last10Avg)}</div>
                    <div class="stat-label">Last 10 Avg</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-val" style="font-size: 1.5rem;">${fmtAvg(weekAvg)}</div>
                    <div class="stat-label">Past Week</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-val" style="font-size: 1.5rem;">${fmtAvg(monthAvg)}</div>
                    <div class="stat-label">Past Month</div>
                  </div>
                </div>
                <div>
                  <h4 style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.5rem; text-align: left;">History</h4>
                  <div class="atc-history-list">
                    ${historyHtml}
                  </div>
                </div>
              </div>
            `;

            // Bind delete handlers to history entries
            globalContainer
              .querySelectorAll(".atc-history-entry")
              .forEach((entry) => {
                entry.addEventListener("click", () => {
                  const idx = parseInt(
                    (entry as HTMLElement).dataset.atcIdx || "0",
                    10,
                  );
                  pendingAtcDeleteIdx = idx;
                  showAtcDeleteConfirm(idx);
                });
              });

            // Remove grid style temporarily for ATC
            globalContainer.style.display = "block";
          } else {
            // Render 501 Stats — restore title
            const statsModalTitle = document
              .getElementById("stats-modal")
              ?.querySelector("h2");
            if (statsModalTitle) {
              statsModalTitle.textContent = "Lifetime Stats";
            }

            const pct =
              stats.matchesPlayed === 0
                ? 0
                : Math.round((stats.matchesWon / stats.matchesPlayed) * 100);
            globalContainer.innerHTML = `
                <div class="stat-item">
                  <div id="stat-played" class="stat-val">${stats.matchesPlayed}</div>
                  <div class="stat-label">Matches</div>
                </div>
                <div class="stat-item">
                  <div id="stat-winpct" class="stat-val">${pct}%</div>
                  <div class="stat-label">Win %</div>
                </div>
                <div class="stat-item">
                  <div id="stat-180" class="stat-val">${stats.total180s}</div>
                  <div class="stat-label">Total 180s</div>
                </div>
                <div class="stat-item">
                  <div id="stat-high" class="stat-val">${stats.highestCheckout}</div>
                  <div class="stat-label">High Checkout</div>
                </div>
            `;
            // Restore grid
            globalContainer.style.display = "grid";
            globalContainer.style.gridTemplateColumns = "1fr 1fr";
            globalContainer.style.gap = "1rem";
          }
        }
      }

      if (btnId === "howToPlayBtn") {
        const rulesContent = document.getElementById("rules-content");
        const isClock = !document
          .getElementById("clock-scoreboard-container")
          ?.classList.contains("hidden");
        if (rulesContent) {
          if (isClock) {
            rulesContent.innerHTML = `
              <p style="margin-bottom: 1rem; font-size: 1.1rem; color: var(--accent);"><strong>Around the Clock</strong></p>
              <ul style="padding-left: 1.2rem; color: var(--text-secondary); line-height: 1.6; font-size: 0.95rem;">
                <li style="margin-bottom: 0.75rem">Hit numbers 1 through 20 in numerical order.</li>
                <li style="margin-bottom: 0.75rem">Singles advance you 1 number, Doubles advance 2, Trebles advance 3.</li>
                <li style="margin-bottom: 0.75rem">In Multiplayer, each player throws 3 darts per turn.</li>
              </ul>
            `;
          } else {
            rulesContent.innerHTML = `
              <p style="margin-bottom: 1rem; font-size: 1.1rem; color: var(--accent);"><strong>X01 (301, 501, 701)</strong></p>
              <ul style="padding-left: 1.2rem; color: var(--text-secondary); line-height: 1.6; font-size: 0.95rem;">
                <li style="margin-bottom: 0.75rem">Every player starts at the chosen score.</li>
                <li style="margin-bottom: 0.75rem">Enter the total score of your 3 darts each turn.</li>
                <li style="margin-bottom: 0.75rem">You must finish exactly on zero, typically by hitting a "Double" (Double Out).</li>
                <li style="margin-bottom: 0.75rem">If you exceed the remaining score, or drop to exactly 1, you "bust" and score 0 for that turn.</li>
              </ul>
            `;
          }
        }
      }

      modal.classList.remove("hidden");
    });
  }
});

// Generic Modal Closing
document.querySelectorAll(".close-modal").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const modal = (e.target as HTMLElement).closest(".modal-overlay");
    if (modal) modal.classList.add("hidden");
  });
});

document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.add("hidden");
    }
  });
});

// Settings Confirm Reset Actions
const resetAchievementsBtn = document.getElementById("resetAchievementsBtn");
const resetProgressLink = document.getElementById("resetProgressLink");
const confirmModal = document.getElementById("confirm-modal");
const cancelResetBtn = document.getElementById("cancelResetBtn");
const confirmResetBtn = document.getElementById("confirmResetBtn");
const settingsModal = document.getElementById("settings-modal");

let resetType: "STATS" | "ALL" | "ATC_DELETE" | null = null;
let pendingAtcDeleteIdx: number | null = null;

function showAtcDeleteConfirm(idx: number) {
  const stats = getStats();
  const entry = stats.atcHistory[idx];
  if (!entry || !confirmModal) return;

  resetType = "ATC_DELETE";
  const title = confirmModal.querySelector("h3");
  const body = confirmModal.querySelector("p");
  const actionBtn = confirmModal.querySelector("#confirmResetBtn");

  const d = new Date(entry.date);
  const dateStr = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  if (title && body && actionBtn) {
    title.textContent = "Remove Entry?";
    body.textContent = `Delete the game from ${dateStr} (${entry.setsTaken} sets) from your history?`;
    actionBtn.textContent = "Remove";
  }

  confirmModal.classList.remove("hidden");
}

function showConfirmModal(type: "STATS" | "ALL") {
  resetType = type;
  if (confirmModal) {
    const title = confirmModal.querySelector("h3");
    const body = confirmModal.querySelector("p");
    const actionBtn = confirmModal.querySelector("#confirmResetBtn");

    if (title && body && actionBtn) {
      if (type === "STATS") {
        title.textContent = "Reset Statistics?";
        body.textContent =
          "This will permanently wipe your lifetime statistics and best scores. This cannot be undone.";
        actionBtn.textContent = "Reset Stats";
      } else {
        title.textContent = "Reset All Game Data?";
        body.textContent =
          "This will permanently wipe all matches, statistics, and settings. This cannot be undone.";
        actionBtn.textContent = "Delete All";
      }
    }

    if (settingsModal) settingsModal.classList.add("hidden");
    confirmModal.classList.remove("hidden");
  }
}

if (resetAchievementsBtn) {
  resetAchievementsBtn.addEventListener("click", () => {
    playClick();
    showConfirmModal("STATS");
  });
}

if (resetProgressLink) {
  resetProgressLink.addEventListener("click", (e) => {
    e.preventDefault();
    playClick();
    showConfirmModal("ALL");
  });
}

if (cancelResetBtn) {
  cancelResetBtn.addEventListener("click", () => {
    playClick();
    if (confirmModal) confirmModal.classList.add("hidden");
    resetType = null;
    pendingAtcDeleteIdx = null;
  });
}

if (confirmResetBtn) {
  confirmResetBtn.addEventListener("click", () => {
    if (resetType === "ATC_DELETE" && pendingAtcDeleteIdx !== null) {
      removeAtcGame(pendingAtcDeleteIdx);
      pendingAtcDeleteIdx = null;
      resetType = null;
      if (confirmModal) confirmModal.classList.add("hidden");
      // Re-trigger the stats modal to refresh the list
      document.getElementById("statsBtn")?.click();
      return;
    }
    if (resetType === "ALL") {
      localStorage.removeItem("darts_lifetime_stats");
      localStorage.removeItem("darts_state");
      localStorage.removeItem("darts_clock_state");
    } else if (resetType === "STATS") {
      localStorage.removeItem("darts_lifetime_stats");
    }
    window.location.reload();
  });
}

// --- Toast System ---
let toastQueue = 0;

export function dismissToast(toast: HTMLElement) {
  const computed = window.getComputedStyle(toast);
  const currentOpacity = computed.opacity;
  const currentTransform = computed.transform;

  toast.style.opacity = currentOpacity;
  toast.style.transform = currentTransform;
  toast.style.animation = "none";
  toast.style.pointerEvents = "none";

  void toast.offsetHeight;

  toast.style.transition = "opacity 0.5s ease, transform 0.5s ease";
  toast.style.opacity = "0";
  toast.style.transform = "translateY(-15px) scale(0.9)";

  setTimeout(() => {
    toast.style.maxHeight = toast.offsetHeight + "px";
    toast.style.overflow = "hidden";
    void toast.offsetHeight;
    toast.style.transition =
      "max-height 0.3s ease, margin 0.3s ease, padding 0.3s ease";
    toast.style.maxHeight = "0";
    toast.style.marginTop = "0";
    toast.style.marginBottom = "0";
    toast.style.paddingTop = "0";
    toast.style.paddingBottom = "0";

    setTimeout(() => toast.remove(), 350);
  }, 350);
}

export function createToast(icon: string, label: string, title: string) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "achievement-toast";
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-content">
      <div class="toast-label">${label}</div>
      <div class="toast-title">${title}</div>
    </div>
  `;
  toast.style.animation =
    "toastSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards";
  toast.style.cursor = "pointer";
  toast.title = "Click to dismiss";

  const delay = toastQueue * 600;
  toastQueue++;

  setTimeout(() => {
    let dismissed = false;
    const doDismiss = () => {
      if (dismissed) return;
      dismissed = true;
      dismissToast(toast);
      toastQueue = Math.max(0, toastQueue - 1);
    };

    toast.onclick = doDismiss;
    container.appendChild(toast);
    // Play a chime here later

    setTimeout(doDismiss, 4000);
  }, delay);
}

// --- Game Loop (501) ---
let currentInput = "";

function updateInputDisplay(isError = false) {
  const display = document.getElementById("score-input-display");
  if (!display) return;
  display.textContent = currentInput || "0";

  if (isError) {
    display.classList.remove("error");
    void display.offsetWidth; // trigger reflow
    display.classList.add("error");
    playErrorBuzz();
  } else {
    display.classList.remove("error");
  }
}

function handleNumberInput(numStr: string) {
  if (getState().status !== "PLAYING") return;

  const potential = currentInput + numStr;
  const val = parseInt(potential, 10);

  // Can't throw more than 180 total
  if (potential.length > 3 || val > 180) {
    updateInputDisplay(true);
    return;
  }

  currentInput = potential;
  updateInputDisplay();
}

function handleUndo() {
  if (getState().status !== "PLAYING") return;

  if (currentInput.length > 0) {
    currentInput = currentInput.slice(0, -1);
    updateInputDisplay();
  } else {
    if (undoLastThrow()) {
      renderScoreboard(getState());
    } else {
      updateInputDisplay(true);
    }
  }
}

function handleSubmit() {
  const state = getState();
  if (state.status !== "PLAYING") return;

  const val = currentInput === "" ? 0 : parseInt(currentInput, 10);
  const res = submitScore(val);

  if (res === "INVALID") {
    updateInputDisplay(true);
  } else {
    currentInput = "";
    updateInputDisplay();
    renderScoreboard(getState());

    if (res === "BUST") {
      createToast("❌", "BUST", "No score");
      playErrorBuzz();
    } else if (res === "GAME_SHOT") {
      createToast("🎯", "GAME SHOT", "Leg won!");
      playSuccessChime();
    }
  }
}

// Initialize the 501 input pad
initNumpad(handleNumberInput, handleUndo, handleSubmit);

// --- Game Loop (Around the Clock) ---
import {
  initClockMatch,
  submitClockHit,
  submitClockMiss,
  undoClockThrow,
  getClockState,
  loadCurrentClockMatch,
} from "./clock_match";
import {
  renderClockScoreboard,
  initClockNumpad,
  updateClockActions,
} from "./ui";

let lastClockDartsThrown = 0;
let clockRefillTimeout: number | null = null;

function updateClockUI(isUndo = false, hitMultiplier?: number) {
  const state = getClockState();
  const activePlayer = state.players[state.currentPlayerIndex];
  const currentDarts = activePlayer?.dartsThrownInSet ?? 0;

  // If a new update comes in while we are waiting for a refill, cancel that timer
  if (clockRefillTimeout) {
    clearTimeout(clockRefillTimeout);
    clockRefillTimeout = null;
  }

  // Detect turn turnover (2 -> 0)
  const isTurnOver = !isUndo && currentDarts === 0 && lastClockDartsThrown > 0;

  if (isTurnOver) {
    // Show 3 dimmed darts first
    renderClockScoreboard(state, {
      isRefilling: true,
      lastHitType: hitMultiplier,
    });

    // After a short delay, trigger the actual refill animation
    clockRefillTimeout = window.setTimeout(() => {
      clockRefillTimeout = null;
      renderClockScoreboard(state, {
        isRefilling: false,
        lastHitType: hitMultiplier,
      });
    }, 400);
  } else {
    renderClockScoreboard(state, { isUndo, lastHitType: hitMultiplier });
  }

  if (state.status === "WON") {
    createToast("🎯", "WINNER", "You finished the clock!");
    playSuccessChime();
  }

  updateClockActions(state);
  lastClockDartsThrown = currentDarts;
}

function handleClockHit(mult: 1 | 2 | 3) {
  const res = submitClockHit(mult);
  if (res === "GAME_SHOT" || res === "HIT") {
    updateClockUI(/* isUndo= */ false, mult);
  }
}

function handleClockMiss(allThree: boolean) {
  submitClockMiss(allThree);
  updateClockUI();
}

function handleClockUndo() {
  if (undoClockThrow()) {
    updateClockUI(/* isUndo= */ true);
  } else {
    playErrorBuzz();
  }
}

function handleClockRestart() {
  const state = getClockState();
  const playerNames = state.players.map((p) => p.name);
  initClockMatch(playerNames.length > 0 ? playerNames : undefined);
  updateClockUI();
}

initClockNumpad(
  handleClockHit,
  handleClockMiss,
  handleClockUndo,
  handleClockRestart,
);

// --- Initialization ---

const stats = getStats();
setIsMuteEnabled(stats.isMuteEnabled);

const muteToggle = document.getElementById("muteToggle") as HTMLInputElement;
if (muteToggle) {
  muteToggle.checked = stats.isMuteEnabled;
  muteToggle.addEventListener("change", () => {
    const isMuted = muteToggle.checked;
    setIsMuteEnabled(isMuted);
    const updatedStats = getStats();
    updatedStats.isMuteEnabled = isMuted;
    saveStats(updatedStats);
  });
}

function setViewMode(mode: "501" | "CLOCK") {
  const score501 = document.getElementById("scoreboard-container");
  const dsp501 = document.getElementById("score-input-display");
  const num501 = document.getElementById("numpad-container");

  const scoreClock = document.getElementById("clock-scoreboard-container");
  const numClock = document.getElementById("clock-numpad-container");

  if (mode === "501") {
    score501?.classList.remove("hidden");
    dsp501?.classList.remove("hidden");
    num501?.classList.remove("hidden");

    scoreClock?.classList.add("hidden");
    numClock?.classList.add("hidden");
  } else {
    score501?.classList.add("hidden");
    dsp501?.classList.add("hidden");
    num501?.classList.add("hidden");

    scoreClock?.classList.remove("hidden");
    numClock?.classList.remove("hidden");
  }
}

// --- Game Mode Selection Logic ---
let selectedPlayers = 1;
const countDisplay = document.getElementById("playerCountDisplay");

document.getElementById("playerMinusBtn")?.addEventListener("click", () => {
  playClick();
  if (selectedPlayers > 1) {
    selectedPlayers--;
    if (countDisplay) countDisplay.textContent = selectedPlayers.toString();
  }
});

document.getElementById("playerPlusBtn")?.addEventListener("click", () => {
  playClick();
  if (selectedPlayers < 6) {
    selectedPlayers++;
    if (countDisplay) countDisplay.textContent = selectedPlayers.toString();
  }
});

document.querySelectorAll(".btn-gamemode").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    playClick();
    const mode = (e.currentTarget as HTMLButtonElement).dataset.mode;

    // Generate player names
    const playerNames: string[] = [];
    if (selectedPlayers === 1) {
      playerNames.push("Player 1");
    } else {
      for (let i = 1; i <= selectedPlayers; i++) {
        playerNames.push(`Player ${i}`);
      }
    }

    if (mode === "ATC") {
      initClockMatch(playerNames);
      setViewMode("CLOCK");
      updateClockUI();
    } else {
      const startingScore = parseInt(mode || "501", 10);
      initMatch(
        { startingScore, setsToWin: 1, legsToWinSet: 3, doubleOut: true },
        playerNames,
      );
      setViewMode("501");
      renderScoreboard(getState());
      updateInputDisplay();
    }

    document.getElementById("game-mode-modal")?.classList.add("hidden");
  });
});

// Try loading an existing match on boot (Priority to Clock right now)
const existingClockMatch = loadCurrentClockMatch();
if (existingClockMatch) {
  setViewMode("CLOCK");
  updateClockUI();
} else {
  const existing501Match = loadCurrentMatch();
  if (existing501Match) {
    setViewMode("501");
    renderScoreboard(existing501Match);
    updateInputDisplay();
  } else {
    // Show the setup modal if no game is running
    document.getElementById("how-to-play-modal")?.classList.remove("hidden");
  }
}
