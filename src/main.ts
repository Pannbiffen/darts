import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { playClick, playErrorBuzz, playSuccessChime } from "./audio";
import { initMatch, submitScore, undoLastThrow, getState, loadCurrentMatch } from "./match";
import { renderScoreboard, initNumpad } from "./ui";

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
const resetProgressLink = document.getElementById("resetProgressLink");
const confirmModal = document.getElementById("confirm-modal");
const cancelResetBtn = document.getElementById("cancelResetBtn");
const confirmResetBtn = document.getElementById("confirmResetBtn");
const settingsModal = document.getElementById("settings-modal");

if (resetProgressLink && confirmModal && cancelResetBtn && confirmResetBtn) {
  resetProgressLink.addEventListener("click", (e) => {
    e.preventDefault();
    if (settingsModal) settingsModal.classList.add("hidden");
    confirmModal.classList.remove("hidden");
  });

  cancelResetBtn.addEventListener("click", () => {
    confirmModal.classList.add("hidden");
  });

  confirmResetBtn.addEventListener("click", () => {
    // Wipe local storage when implemented
    localStorage.removeItem("darts_stats");
    localStorage.removeItem("darts_state");
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

// --- Game Loop ---
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
    // Delete typed char
    currentInput = currentInput.slice(0, -1);
    updateInputDisplay();
  } else {
    // Attempt to undo last throw if input is empty
    if (undoLastThrow()) {
      renderScoreboard(getState());
    } else {
      updateInputDisplay(true); // Can't undo further
    }
  }
}

function handleSubmit() {
  const state = getState();
  if (state.status !== "PLAYING") return;
  
  // 0 is valid for a completely missed/busted throw where they enter nothing and press enter
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

// Initialize the input pad
initNumpad(handleNumberInput, handleUndo, handleSubmit);

// --- Initialization ---

const startGameBtn = document.getElementById("startGameBtn");
if (startGameBtn) {
  startGameBtn.addEventListener("click", () => {
    playClick();
    // Start standard 501 match with 2 players for now
    const config = {
      startingScore: 501,
      setsToWin: 1,
      legsToWinSet: 3,
      doubleOut: true
    };
    initMatch(config, ["Player 1", "Player 2"]);
    document.getElementById("how-to-play-modal")?.classList.add("hidden");
    currentInput = "";
    updateInputDisplay();
    renderScoreboard(getState());
  });
}

// Try loading an existing match on boot
const existingMatch = loadCurrentMatch();
if (existingMatch) {
  renderScoreboard(existingMatch);
  updateInputDisplay();
} else {
  // Show the setup modal if no game is running
  document.getElementById("how-to-play-modal")?.classList.remove("hidden");
}
