import { recordAtcGame } from "./stats";

export type ClockStatus = "SETUP" | "PLAYING" | "WON" | "ABANDONED";

export interface ClockState {
  status: ClockStatus;
  currentTarget: number;
  currentSet: number;
  dartsThrownInSet: number;
  undoStack: ClockStateSnapshot[];
  startTime: number;
  lastUpdateTime: number;
}

export interface ClockStateSnapshot {
  currentTarget: number;
  currentSet: number;
  dartsThrownInSet: number;
}

let state: ClockState = {
  status: "SETUP",
  currentTarget: 1,
  currentSet: 1,
  dartsThrownInSet: 0,
  undoStack: [],
  startTime: 0,
  lastUpdateTime: 0,
};

export function initClockMatch(): ClockState {
  state = {
    status: "PLAYING",
    currentTarget: 1,
    currentSet: 1,
    dartsThrownInSet: 0,
    undoStack: [],
    startTime: Date.now(),
    lastUpdateTime: Date.now(),
  };
  saveClockState();
  return state;
}

export function getClockState(): ClockState {
  return state;
}

export function loadCurrentClockMatch(): ClockState | null {
  const saved = localStorage.getItem("darts_clock_state");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.status === "PLAYING") {
        state = parsed;
        return state;
      }
    } catch (e) {
      console.error("Failed to load clock state", e);
    }
  }
  return null;
}

function saveClockState() {
  state.lastUpdateTime = Date.now();
  if (state.status === "PLAYING") {
    localStorage.setItem("darts_clock_state", JSON.stringify(state));
  } else {
    localStorage.removeItem("darts_clock_state");
  }
}

function pushUndoContext() {
  state.undoStack.push({
    currentTarget: state.currentTarget,
    currentSet: state.currentSet,
    dartsThrownInSet: state.dartsThrownInSet,
  });
}

function advanceDart() {
  state.dartsThrownInSet += 1;
  if (state.dartsThrownInSet >= 3) {
    state.currentSet += 1;
    state.dartsThrownInSet = 0;
  }
}

export type ClockResult = "HIT" | "MISS" | "GAME_SHOT" | "INVALID";

export function submitClockHit(multiplier: 1 | 2 | 3): ClockResult {
  if (state.status !== "PLAYING") return "INVALID";
  if (multiplier < 1 || multiplier > 3) return "INVALID";

  pushUndoContext();

  state.currentTarget += multiplier;

  if (state.currentTarget > 20) {
    state.currentTarget = 20; // Cap it so we don't display "Target: 22"
    // Just increment the dart count for this set, don't advance the set itself
    state.dartsThrownInSet += 1;
    handleClockWin();
    return "GAME_SHOT";
  }

  advanceDart();
  saveClockState();
  return "HIT";
}

export function submitClockMiss(allThree: boolean = false): ClockResult {
  if (state.status !== "PLAYING") return "INVALID";

  pushUndoContext();

  if (allThree) {
    state.currentSet += 1;
    state.dartsThrownInSet = 0;
  } else {
    advanceDart();
  }

  saveClockState();
  return "MISS";
}

export function undoClockThrow(): boolean {
  if (state.status !== "PLAYING") return false;
  if (state.undoStack.length === 0) return false;

  const prev = state.undoStack.pop()!;
  state.currentTarget = prev.currentTarget;
  state.currentSet = prev.currentSet;
  state.dartsThrownInSet = prev.dartsThrownInSet;

  saveClockState();
  return true;
}

function handleClockWin() {
  state.status = "WON";
  recordAtcGame(state.currentSet);
  saveClockState();
}

export function abandonClockMatch() {
  if (state.status === "PLAYING") {
    state.status = "ABANDONED";
    saveClockState();
  }
}
