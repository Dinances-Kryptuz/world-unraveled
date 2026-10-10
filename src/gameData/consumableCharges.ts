// Charge-count-distinguished potion stacking — the inventory-side sibling of
// equipmentRolls.ts's canonicalInstanceId pattern. A crafted offensive/
// defensive potion's charge count is rolled once at CRAFT time from the
// crafter's then-current Alchemy zone Mastery (alchemyMastery.ts) and never
// changes again for that specific stack — using up charges doesn't mutate a
// potion in place, it moves one unit from the `c${N}` bucket to the
// `c${N-1}` bucket (or discards it entirely at c0), the same way a
// crafting-Mastery stat roll never changes after the item exists.
export function chargedInstanceId(itemId: string, remainingCharges: number): string {
  return `${itemId}:c${remainingCharges}`;
}

export interface ChargeBucket {
  remainingCharges: number;
  quantity: number;
}

// Combat only ever needs to know "how many charges does this item have
// left, in total, right now" as one plain number (computed once at the
// start of an autosave/offline batch and decremented in memory as the
// engine resolves hits) — it never needs to know the bucket shape. This is
// the one place that number gets turned back into bucket deltas, once, at
// the END of a batch — see firebase/inventory.ts's grantChargedConsumables
// for where this feeds a single Firestore write.
//
// Buckets are drained ascending by remainingCharges — finish off a
// nearly-spent potion before touching a fresher one — so a player's stack
// never ends up with more distinct partially-used buckets than necessary.
export function applyChargeConsumption(
  buckets: ChargeBucket[],
  totalChargesToConsume: number
): { newBuckets: ChargeBucket[]; chargesActuallyConsumed: number } {
  const sorted = [...buckets].filter((b) => b.quantity > 0 && b.remainingCharges > 0).sort((a, b) => a.remainingCharges - b.remainingCharges);
  const deltas = new Map<number, number>(); // remainingCharges -> quantity delta (can be negative)
  let remaining = Math.max(0, totalChargesToConsume);
  let consumed = 0;

  for (const bucket of sorted) {
    if (remaining <= 0) break;
    let unitsLeftInBucket = bucket.quantity;
    while (unitsLeftInBucket > 0 && remaining > 0) {
      // Consume exactly one charge from one unit of this bucket, moving
      // that one unit down by one charge level (or discarding it at 0).
      const chargesFromThisUnit = Math.min(remaining, bucket.remainingCharges);
      deltas.set(bucket.remainingCharges, (deltas.get(bucket.remainingCharges) ?? 0) - 1);
      const newLevel = bucket.remainingCharges - chargesFromThisUnit;
      if (newLevel > 0) deltas.set(newLevel, (deltas.get(newLevel) ?? 0) + 1);
      remaining -= chargesFromThisUnit;
      consumed += chargesFromThisUnit;
      unitsLeftInBucket--;
    }
  }

  const byLevel = new Map<number, number>();
  for (const b of buckets) byLevel.set(b.remainingCharges, (byLevel.get(b.remainingCharges) ?? 0) + b.quantity);
  for (const [level, delta] of deltas) byLevel.set(level, (byLevel.get(level) ?? 0) + delta);

  const newBuckets: ChargeBucket[] = Array.from(byLevel.entries())
    .filter(([, quantity]) => quantity > 0)
    .map(([remainingCharges, quantity]) => ({ remainingCharges, quantity }));

  return { newBuckets, chargesActuallyConsumed: consumed };
}

export function totalChargesAvailable(buckets: ChargeBucket[]): number {
  return buckets.reduce((sum, b) => sum + b.remainingCharges * b.quantity, 0);
}
