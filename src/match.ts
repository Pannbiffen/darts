import { recordMatchResult, recordThrowStats } from "./stats";

export type MatchStatus = "SETUP" | "PLAYING" | "WON" | "ABANDONED";

export interface Throw {
  score: number;
  timestamp: number;
  isBust: boolean;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  legsWon: number;
  setsWon: number;
  throwHistory: Throw[];
  currentAverage: number;
}

export interface MatchConfig {
  startingScore: number;
  setsToWin: number;
  legsToWinSet: number;
  doubleOut: boolean;
}

export interface MatchState {
  config: MatchConfig;
  status: MatchStatus;
  players: Player[];
  currentPlayerIndex: number;
  winnerId: string | null;
  startTime: number;
  lastUpdateTime: number;
}

let state: MatchState = {
  config: {
    startingScore: 501,
    setsToWin: 1,
    legsToWinSet: 3,
    doubleOut: true,
  },
  status: "SETUP",
  players: [],
  currentPlayerIndex: 0,
  winnerId: null,
  startTime: 0,
  lastUpdateTime: 0,
};

// Generate a simple ID
const genId = () => Math.random().toString(36).substring(2, 9);

export function initMatch(config: MatchConfig, playerNames: string[]) {
  const players: Player[] = playerNames.map((name, idx) => ({
    id: idx === 0 ? "local_user" : genId(),
    name,
    score: config.startingScore,
    legsWon: 0,
    setsWon: 0,
    throwHistory: [],
    currentAverage: 0,
  }));

  state = {
    config,
    status: "PLAYING",
    players,
    currentPlayerIndex: 0,
    winnerId: null,
    startTime: Date.now(),
    lastUpdateTime: Date.now(),
  };

  saveState();
  return state;
}

export function getState(): MatchState {
  return state;
}

export function loadCurrentMatch(): MatchState | null {
  const saved = localStorage.getItem("darts_state");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.status === "PLAYING") {
        state = parsed;
        return state;
      }
    } catch (e) {
      console.error("Failed to load match state", e);
    }
  }
  return null;
}

function saveState() {
  state.lastUpdateTime = Date.now();
  if (state.status === "PLAYING") {
    localStorage.setItem("darts_state", JSON.stringify(state));
  } else {
    localStorage.removeItem("darts_state");
  }
}

function calculateAverage(throws: Throw[]): number {
  if (throws.length === 0) return 0;
  const totalScore = throws.reduce((sum, t) => sum + t.score, 0);
  return totalScore / throws.length;
}

export type ScoreResult = "VALID" | "BUST" | "GAME_SHOT" | "INVALID";

export function submitScore(score: number): ScoreResult {
  if (state.status !== "PLAYING") return "INVALID";
  if (score < 0 || score > 180) return "INVALID";

  const player = state.players[state.currentPlayerIndex];
  const remainingParams = player.score - score;

  let isBust = false;
  let isGameShot = false;

  if (state.config.doubleOut) {
    // Bust if score drops below 0, or drops to exactly 1 (can't double out from 1)
    if (remainingParams < 0 || remainingParams === 1) {
      isBust = true;
    } else if (remainingParams === 0) {
      isGameShot = true;
    }
  } else {
    if (remainingParams < 0) {
      isBust = true;
    } else if (remainingParams === 0) {
      isGameShot = true;
    }
  }

  // Record the throw
  player.throwHistory.push({
    score: isBust ? 0 : score, // If bust, effectively threw 0 for average/remaining purposes
    timestamp: Date.now(),
    isBust,
  });

  if (!isBust) {
    player.score = remainingParams;
    // Only track local user stats
    if (player.id === "local_user") {
      recordThrowStats(score, isGameShot);
    }
  }

  player.currentAverage = calculateAverage(player.throwHistory);

  if (isGameShot) {
    handleLegWin(player);
    saveState();
    return "GAME_SHOT";
  }

  // Next player's turn
  cyclePlayer();
  saveState();

  return isBust ? "BUST" : "VALID";
}

export function undoLastThrow() {
  if (state.status !== "PLAYING") return false;

  let prevPlayerIndex = state.currentPlayerIndex - 1;
  if (prevPlayerIndex < 0) prevPlayerIndex = state.players.length - 1;

  const prevPlayer = state.players[prevPlayerIndex];

  if (prevPlayer.throwHistory.length === 0) {
    return false; // Nobody has thrown yet in this leg
  }

  const lastThrow = prevPlayer.throwHistory.pop()!;

  if (!lastThrow.isBust) {
    prevPlayer.score += lastThrow.score;
  }

  prevPlayer.currentAverage = calculateAverage(prevPlayer.throwHistory);

  state.currentPlayerIndex = prevPlayerIndex;

  saveState();
  return true;
}

function cyclePlayer() {
  state.currentPlayerIndex =
    (state.currentPlayerIndex + 1) % state.players.length;
}

function handleLegWin(winner: Player) {
  winner.legsWon += 1;

  if (winner.legsWon >= state.config.legsToWinSet) {
    handleSetWin(winner);
  } else {
    resetLeg();
  }
}

function handleSetWin(winner: Player) {
  winner.setsWon += 1;
  winner.legsWon = 0;

  state.players.forEach((p) => {
    if (p.id !== winner.id) p.legsWon = 0;
  });

  if (winner.setsWon >= state.config.setsToWin) {
    state.status = "WON";
    state.winnerId = winner.id;
    // Record match to overall stats database
    const localPlayerIndex = state.players.findIndex(
      (p) => p.id === "local_user",
    );
    if (localPlayerIndex !== -1) {
      const isWin = state.winnerId === "local_user";
      recordMatchResult(isWin);
    }
  } else {
    resetLeg();
  }
}

function resetLeg() {
  state.players.forEach((p) => {
    p.score = state.config.startingScore;
    // We optionally keep throwHistory across legs to maintain rolling average,
    // or we could separate history array by leg. For simplicity we keep it rolling.
  });

  // Usually the player who threw second in the previous leg goes first in the new leg
  // For simplicity, we just leave it at the next player.
  cyclePlayer();
}

export function abandonMatch() {
  if (state.status === "PLAYING") {
    state.status = "ABANDONED";
    saveState();
  }
}
