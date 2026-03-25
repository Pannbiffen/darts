export interface AtcGameRecord {
  date: number;
  setsTaken: number;
}

export interface DartsStats {
  matchesPlayed: number;
  matchesWon: number;
  total180s: number;
  highestCheckout: number;
  bestAtcSets: number | null;
  atcHistory: AtcGameRecord[];
}

const STATS_KEY = "darts_lifetime_stats";

const defaultStats: DartsStats = {
  matchesPlayed: 0,
  matchesWon: 0,
  total180s: 0,
  highestCheckout: 0,
  bestAtcSets: null,
  atcHistory: [],
};

export function getStats(): DartsStats {
  try {
    const saved = localStorage.getItem(STATS_KEY);
    if (saved) {
      return { ...defaultStats, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to parse stats", e);
  }
  return { ...defaultStats };
}

export function saveStats(stats: DartsStats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function recordAtcGame(setsTaken: number) {
  const stats = getStats();

  if (stats.bestAtcSets === null || setsTaken < stats.bestAtcSets) {
    stats.bestAtcSets = setsTaken;
  }

  stats.atcHistory.push({
    date: Date.now(),
    setsTaken,
  });

  // Keep only the last 50 games so localStorage doesn't bloat
  if (stats.atcHistory.length > 50) {
    stats.atcHistory.shift();
  }

  saveStats(stats);
}

export function recordMatchResult(didWin: boolean) {
  const stats = getStats();
  stats.matchesPlayed += 1;
  if (didWin) {
    stats.matchesWon += 1;
  }
  saveStats(stats);
}

export function recordThrowStats(score: number, isCheckout: boolean) {
  const stats = getStats();
  let modified = false;

  if (score === 180) {
    stats.total180s += 1;
    modified = true;
  }

  if (isCheckout && score > stats.highestCheckout) {
    stats.highestCheckout = score;
    modified = true;
  }

  if (modified) saveStats(stats);
}
