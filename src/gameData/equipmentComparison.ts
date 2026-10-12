// Equipment comparison indicators — a pure, source-agnostic stat diff
// between two "effective stat" objects (a candidate item's rolls/
// statBonuses vs whatever is currently equipped in that slot). Works
// identically for a player slot or a companion slot since both store the
// exact same EquippedItemRef shape (gameData/types.ts) — callers just pass
// whichever ref's rolls (or fallback statBonuses) they resolved.
import type { BaseStat } from './classStats';

export interface StatDiffRow {
  stat: BaseStat;
  equippedValue: number;
  candidateValue: number;
  diff: number;
}

export interface EquipmentComparison {
  rows: StatDiffRow[];
  totalDiff: number;
}

// No automatic "better/worse" verdict is computed anywhere here — only raw
// per-stat and total numeric differences, per the spec's explicit "do not
// automatically label equipment as better or worse" requirement (different
// classes/specs value stats differently).
export function compareEquipmentStats(
  candidateStats: Partial<Record<BaseStat, number>> | undefined,
  equippedStats: Partial<Record<BaseStat, number>> | undefined
): EquipmentComparison {
  const stats = new Set<BaseStat>([
    ...(Object.keys(candidateStats ?? {}) as BaseStat[]),
    ...(Object.keys(equippedStats ?? {}) as BaseStat[]),
  ]);
  const rows: StatDiffRow[] = Array.from(stats)
    .sort()
    .map((stat) => {
      const equippedValue = equippedStats?.[stat] ?? 0;
      const candidateValue = candidateStats?.[stat] ?? 0;
      return { stat, equippedValue, candidateValue, diff: candidateValue - equippedValue };
    });
  const totalDiff = rows.reduce((sum, r) => sum + r.diff, 0);
  return { rows, totalDiff };
}
