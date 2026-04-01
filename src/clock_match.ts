import { recordAtcGame } from "./stats";

export type ClockStatus = "SETUP" | "PLAYING" | "WON" | "ABANDONED";

export interface ClockPlayer {
  id: string;
  name: string;
  currentTarget: number;
  currentSet: number;
  dartsThrownInSet: number;
}

export interface ClockState {
  status: ClockStatus;
  players: ClockPlayer[];
  currentPlayerIndex: number;
  winnerId: string | null;
  undoStack: ClockStateSnapshot[];
  startTime: number;
  lastUpdateTime: number;
}

export interface ClockStateSnapshot {
  playerIndex: number;
  currentTarget: number;
  currentSet: number;
  dartsThrownInSet: number;
}

let state: ClockState = {
  status: "SETUP",
  players: [],
  currentPlayerIndex: 0,
  winnerId: null,
  undoStack: [],
  startTime: 0,
  lastUpdateTime: 0,
};

const genId = () => Math.random().toString(36).substring(2, 9);

export function initClockMatch(
  playerNames: string[] = ["Player 1"],
): ClockState {
  const players: ClockPlayer[] = playerNames.map((name, idx) => ({
    id: idx === 0 ? "local_user" : genId(),
    name,
    currentTarget: 1,
    currentSet: 1,
    dartsThrownInSet: 0,
  }));

  state = {
    status: "PLAYING",
    players,
    currentPlayerIndex: 0,
    winnerId: null,
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
  const p = state.players[state.currentPlayerIndex];
  state.undoStack.push({
    playerIndex: state.currentPlayerIndex,
    currentTarget: p.currentTarget,
    currentSet: p.currentSet,
    dartsThrownInSet: p.dartsThrownInSet,
  });
}

function advanceDart() {
  const p = state.players[state.currentPlayerIndex];
  p.dartsThrownInSet += 1;
  if (p.dartsThrownInSet >= 3) {
    p.currentSet += 1;
    p.dartsThrownInSet = 0;
    cyclePlayer();
  }
}

function cyclePlayer() {
  state.currentPlayerIndex =
    (state.currentPlayerIndex + 1) % state.players.length;
}

export type ClockResult = "HIT" | "MISS" | "GAME_SHOT" | "INVALID";

export function submitClockHit(multiplier: 1 | 2 | 3): ClockResult {
  if (state.status !== "PLAYING") return "INVALID";
  if (multiplier < 1 || multiplier > 3) return "INVALID";

  const p = state.players[state.currentPlayerIndex];

  pushUndoContext();

  p.currentTarget += multiplier;

  if (p.currentTarget > 20) {
    p.currentTarget = 20; // Cap it so we don't display "Target: 22"
    p.dartsThrownInSet += 1;
    handleClockWin(p);
    return "GAME_SHOT";
  }

  advanceDart();
  saveClockState();
  return "HIT";
}

export function submitClockMiss(allThree: boolean = false): ClockResult {
  if (state.status !== "PLAYING") return "INVALID";

  const p = state.players[state.currentPlayerIndex];
  pushUndoContext();

  if (allThree) {
    p.currentSet += 1;
    p.dartsThrownInSet = 0;
    cyclePlayer();
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
  state.currentPlayerIndex = prev.playerIndex;

  const p = state.players[state.currentPlayerIndex];
  p.currentTarget = prev.currentTarget;
  p.currentSet = prev.currentSet;
  p.dartsThrownInSet = prev.dartsThrownInSet;

  saveClockState();
  return true;
}

function handleClockWin(winner: ClockPlayer) {
  state.status = "WON";
  state.winnerId = winner.id;
  if (winner.id === "local_user") {
    recordAtcGame(winner.currentSet, /* playerCount= */ state.players.length);
  }
  saveClockState();
}

export function abandonClockMatch() {
  if (state.status === "PLAYING") {
    state.status = "ABANDONED";
    saveClockState();
  }
}
