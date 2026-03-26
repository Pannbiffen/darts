import "./style.css";
import { registerSW } from "virtual:pwa-register";
import {
  playClick,
  playErrorBuzz,
  playSuccessChime,
  setIsMuteEnabled,
} from "./audio";
import {
  submitScore,
  undoLastThrow,
  getState,
  loadCurrentMatch,
} from "./match";
import { renderScoreboard, initNumpad } from "./ui";
import { getStats, saveStats } from "./stats";

// Register the PWA service worker for offline support and auto-updates
registerSW({ immediate: true });

// --- Modal System ---
const modalButtons = [
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
            // Render ATC Stats
            let historyHtml =
              stats.atcHistory.length === 0
                ? `<p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2rem;">No games finished yet.</p>`
                : stats.atcHistory
                    .slice(-5)
                    .reverse()
                    .map((h) => {
                      const d = new Date(h.date);
                      return `<div style="display: flex; justify-content: space-between; font-size: 0.9rem; padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 4px;">
                            <span>${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            <span style="font-weight: 800; color: var(--accent);">${h.setsTaken} sets</span>
                          </div>`;
                    })
                    .join("");

            globalContainer.innerHTML = `
              <div style="display: flex; flex-direction: column; gap: 1rem; width: 100%;">
                <div class="stat-item" style="margin-bottom: 1rem;">
                  <div class="stat-val" style="font-size: 3rem; color: var(--accent);">${stats.bestAtcSets || "-"}</div>
                  <div class="stat-label">Personal Best (Sets)</div>
                </div>
                <div>
                  <h4 style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.5rem; text-align: left;">Recent History</h4>
                  ${historyHtml}
                </div>
              </div>
            `;
            // Remove grid style temporarily for ATC
            globalContainer.style.display = "block";
          } else {
            // Render 501 Stats
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

let resetType: "STATS" | "ALL" | null = null;

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
  });
}

if (confirmResetBtn) {
  confirmResetBtn.addEventListener("click", () => {
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

function updateClockUI() {
  const state = getClockState();
  renderClockScoreboard(state);

  if (state.status === "WON") {
    createToast("🎯", "WINNER", "You finished the clock!");
    playSuccessChime();
  }

  updateClockActions(state);
}

function handleClockHit(mult: 1 | 2 | 3) {
  const res = submitClockHit(mult);
  if (res === "GAME_SHOT" || res === "HIT") {
    updateClockUI();
  }
}

function handleClockMiss(allThree: boolean) {
  submitClockMiss(allThree);
  updateClockUI();
}

function handleClockUndo() {
  if (undoClockThrow()) {
    updateClockUI();
  } else {
    playErrorBuzz();
  }
}

function handleClockRestart() {
  initClockMatch();
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

const startGameBtn = document.getElementById("startGameBtn");
// Currently defaulting the Start button directly to Around the Clock
if (startGameBtn) {
  startGameBtn.textContent = "Start Around the Clock";
  startGameBtn.addEventListener("click", () => {
    playClick();
    initClockMatch();
    setViewMode("CLOCK");
    document.getElementById("how-to-play-modal")?.classList.add("hidden");
    updateClockUI();
  });
}

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
