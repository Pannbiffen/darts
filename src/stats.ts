export interface AtcGameRecord {
  date: number;
  setsTaken: number;
  playerCount?: number; // defaults to 1 (solo) for backward compat
}

export interface DartsStats {
  matchesPlayed: number;
  matchesWon: number;
  total180s: number;
  highestCheckout: number;
  bestAtcSets: number | null;
  atcHistory: AtcGameRecord[];
  isMuteEnabled: boolean;
}

const STATS_KEY = "darts_lifetime_stats";

const defaultStats: DartsStats = {
  matchesPlayed: 0,
  matchesWon: 0,
  total180s: 0,
  highestCheckout: 0,
  bestAtcSets: null,
  atcHistory: [],
  isMuteEnabled: true,
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

export function recordAtcGame(
  setsTaken: number,
  /* playerCount= */ playerCount: number = 1,
) {
  const stats = getStats();

  // Only update top-level bestAtcSets for solo (backward compat)
  if (playerCount === 1) {
    if (stats.bestAtcSets === null || setsTaken < stats.bestAtcSets) {
      stats.bestAtcSets = setsTaken;
    }
  }

  stats.atcHistory.push({
    date: Date.now(),
    setsTaken,
    playerCount,
  });

  saveStats(stats);
}

/** Returns ATC history filtered by player count (entries without playerCount default to 1). */
export function getAtcHistoryForPlayerCount(
  stats: DartsStats,
  /* playerCount= */ playerCount: number,
): AtcGameRecord[] {
  return stats.atcHistory.filter((h) => (h.playerCount ?? 1) === playerCount);
}

/** Returns the personal best for a given player count, computed from history. */
export function getAtcBestForPlayerCount(
  stats: DartsStats,
  /* playerCount= */ playerCount: number,
): number | null {
  // For solo, use the stored bestAtcSets for backward compat
  if (playerCount === 1) return stats.bestAtcSets;
  const filtered = getAtcHistoryForPlayerCount(stats, playerCount);
  return filtered.length === 0
    ? null
    : Math.min(...filtered.map((h) => h.setsTaken));
}

export function removeAtcGame(index: number) {
  const stats = getStats();
  if (index < 0 || index >= stats.atcHistory.length) return;

  const removed = stats.atcHistory[index];
  const removedPlayerCount = removed.playerCount ?? 1;
  stats.atcHistory.splice(index, 1);

  // Recalculate personal best for the affected player count
  if (removedPlayerCount === 1) {
    const soloHistory = getAtcHistoryForPlayerCount(stats, 1);
    stats.bestAtcSets =
      soloHistory.length === 0
        ? null
        : Math.min(...soloHistory.map((h) => h.setsTaken));
  }

  saveStats(stats);
}

/**
 * Injects test ATC data with dates spread across past day, past week, and past month+
 * for verifying the average calculations. Call from browser console if needed.
 */
export function injectTestAtcData(/* playerCount= */ playerCount: number = 1) {
  const stats = getStats();
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const testEntries: AtcGameRecord[] = [
    // Today
    { date: now - 1 * 60 * 60 * 1000, setsTaken: 4, playerCount },
    { date: now - 3 * 60 * 60 * 1000, setsTaken: 3, playerCount },
    // 3 days ago (within week)
    { date: now - 3 * DAY, setsTaken: 5, playerCount },
    { date: now - 3 * DAY - 2 * 60 * 60 * 1000, setsTaken: 6, playerCount },
    // 5 days ago (within week)
    { date: now - 5 * DAY, setsTaken: 4, playerCount },
    // 10 days ago (within month, outside week)
    { date: now - 10 * DAY, setsTaken: 7, playerCount },
    { date: now - 12 * DAY, setsTaken: 8, playerCount },
    // 20 days ago (within month)
    { date: now - 20 * DAY, setsTaken: 5, playerCount },
    // 40 days ago (outside month)
    { date: now - 40 * DAY, setsTaken: 9, playerCount },
    { date: now - 45 * DAY, setsTaken: 10, playerCount },
    // 60 days ago (outside month)
    { date: now - 60 * DAY, setsTaken: 12, playerCount },
    { date: now - 90 * DAY, setsTaken: 11, playerCount },
  ];

  stats.atcHistory.push(...testEntries);
  // Sort by date
  stats.atcHistory.sort((a, b) => a.date - b.date);

  // Recalculate solo best
  if (playerCount === 1) {
    const soloHistory = getAtcHistoryForPlayerCount(stats, 1);
    stats.bestAtcSets =
      soloHistory.length === 0
        ? null
        : Math.min(...soloHistory.map((h) => h.setsTaken));
  }

  saveStats(stats);
  console.log(
    `Injected ${testEntries.length} test ATC entries for ${playerCount}-player mode.`,
  );
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
