import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyDisenchantQueueResult } from '../firebase/enchanting';
import { getCharacter, stopActivity, advanceDisenchantQueue } from '../firebase/character';
import { getInventory, isLocked } from '../firebase/inventory';
import { AUTOSAVE_INTERVAL_SECONDS } from '../gameData/activityEngine';
import {
  resolveDisenchantOffline,
  resolveDisenchantQueueOffline,
  craftingColorTier,
  craftingXpForNextLevel,
  CRAFTING_COLOR_XP_PCT,
  DISENCHANT_SECONDS,
  type DisenchantOfflineResult,
  type DisenchantQueueItemInput,
} from '../gameData/craftingEngine';
import { getProfessionState, maxSkillForUnlockedTier } from '../gameData/professionTiers';
import { disenchantRequiredSkill, disenchantXpAward, disenchantYieldRange } from '../gameData/enchanting';
import { ITEMS } from '../gameData/items';
import { getItemDisplayName } from '../gameData/equipmentSuffixes';
import { ItemSlot } from './ItemSlot';
import { TickBar } from './TickBar';
import { notify } from '../utils/notifications';
import { shirtBonusForItemId, shirtBonusPct } from '../gameData/shirts';
import type { Character } from '../types/character';
import type { User } from 'firebase/auth';
import type { BaseStat } from '../gameData/classStats';

// Resolves one item id's disenchant params — used for every entry in the
// queue (not just the current item, which already has itemId/requiredSkill/
// baseXp/yieldRange as plain component-scope values below), since a queued
// item can be a completely different base item with its own skill
// requirement/XP/yield.
function resolveItemDisenchantParams(itemId: string) {
  const item = ITEMS[itemId];
  if (!item) return null;
  return { item, requiredSkill: disenchantRequiredSkill(item), baseXp: disenchantXpAward(item), yieldRange: disenchantYieldRange(item) };
}

// Disenchanting's own activity screen — same ticking/autosave shape as
// CraftingScreen. `itemId`/`instanceId` describe only the item CURRENTLY
// being processed (CurrentActivity.targetId/disenchantInstanceId); anything
// queued after it (CurrentActivity.disenchantQueue, the Continuous
// Disenchanting Queue overhaul) is read directly off `character` here
// rather than via props, since the queue's own composition changes over
// the activity's lifetime without this component ever remounting for a
// reason other than "the current item changed" (see the reset effect's
// [itemId, instanceId] dependency — unchanged from before this feature).
export function DisenchantingScreen({ itemId, instanceId }: { itemId: string; instanceId?: string }) {
  const { user } = useAuth();
  const { character: characterOrNull, refetch, applyOptimisticUpdate } = useCharacter();
  const character = characterOrNull!;
  const [, setTick] = useState(0);
  const secondsSinceSaveRef = useRef(0);

  const [sessionDisenchanted, setSessionDisenchanted] = useState(0);
  const [outOfStock, setOutOfStock] = useState(false);
  const [done, setDone] = useState(false);
  // Updated only from TickBar's onIteration below (the bar's own compositor
  // clock) — see TickBar.tsx's doc comment for why an independent JS timer
  // would drift against the bar's visual completion. Scoped to the CURRENT
  // item only — the queue's own items don't get a live preview, only a
  // static "queued" listing (see render below).
  const [livePreview, setLivePreview] = useState<DisenchantOfflineResult | null>(null);
  const anchorRef = useRef<Date | null>(character.currentActivity.startedAt);
  // Whole items of the CURRENT item (not the queue — queued items have no
  // live preview, only a static listing, so they stay batched to autosave)
  // already notified relative to anchorRef.current — same pattern/rollback
  // safety as CraftingScreen/GatheringScreen/FishingScreen's notifiedWholeRef.
  const notifiedWholeRef = useRef(0);
  const stockRef = useRef(0);
  const remainingRequestedRef = useRef(character.currentActivity.disenchantQuantity ?? 1);
  // Continuous Disenchanting Queue overhaul — the upcoming queue (not yet
  // started) and each entry's own remaining stock, fetched ONCE per
  // current-item change alongside stockRef above (same "this activity
  // session's own bookkeeping, not live-subscribed" posture every other
  // ref here already has).
  const queueRef = useRef<{ itemId: string; instanceId?: string; quantity: number }[]>([]);
  const queueStockRef = useRef<Record<string, number>>({});
  // Display-only: the actual rolled stats (Equipment Suffix Naming
  // overhaul) of the current item and every queued entry, keyed the same
  // way queueStockRef is — fetched alongside stock in the reset effect
  // below, never read by the autosave/resolver logic itself.
  const [currentRolls, setCurrentRolls] = useState<Partial<Record<BaseStat, number>> | undefined>(undefined);
  const [queueRollsByKey, setQueueRollsByKey] = useState<Record<string, Partial<Record<BaseStat, number>>>>({});

  const characterRef = useRef<Character | null>(character);
  const userRef = useRef<User | null>(user);
  useEffect(() => {
    characterRef.current = character;
  }, [character]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const item = ITEMS[itemId];
  const requiredSkill = item ? disenchantRequiredSkill(item) : 0;
  const baseXp = item ? disenchantXpAward(item) : 0;
  const yieldRange = item ? disenchantYieldRange(item) : null;

  useEffect(() => {
    setSessionDisenchanted(0);
    setOutOfStock(false);
    setDone(false);
    setLivePreview(null);
    anchorRef.current = character.currentActivity.startedAt;
    notifiedWholeRef.current = 0;
    remainingRequestedRef.current = character.currentActivity.disenchantQuantity ?? 1;
    queueRef.current = character.currentActivity.disenchantQueue ?? [];
    if (user) {
      getInventory(user.uid).then((inv) => {
        stockRef.current = instanceId ? inv.equipmentInstances?.[instanceId]?.quantity ?? 0 : inv.items[itemId] ?? 0;
        setCurrentRolls(instanceId ? inv.equipmentInstances?.[instanceId]?.rolls : undefined);
        const stockMap: Record<string, number> = {};
        const rollsMap: Record<string, Partial<Record<BaseStat, number>>> = {};
        for (const q of queueRef.current) {
          const key = q.instanceId ?? q.itemId;
          stockMap[key] = q.instanceId ? inv.equipmentInstances?.[q.instanceId]?.quantity ?? 0 : inv.items[q.itemId] ?? 0;
          if (q.instanceId && inv.equipmentInstances?.[q.instanceId]?.rolls) {
            rollsMap[key] = inv.equipmentInstances[q.instanceId].rolls;
          }
        }
        queueStockRef.current = stockMap;
        setQueueRollsByKey(rollsMap);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, instanceId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      secondsSinceSaveRef.current += 1;
      if (secondsSinceSaveRef.current >= AUTOSAVE_INTERVAL_SECONDS) {
        secondsSinceSaveRef.current = 0;
        void autosave();
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  async function autosave() {
    const currentUser = userRef.current;
    const currentCharacter = characterRef.current;
    const anchor = anchorRef.current;
    if (!currentUser || !currentCharacter || !anchor || !item || !yieldRange || done) return;

    const current: DisenchantQueueItemInput = {
      itemId,
      instanceId,
      requiredSkill,
      baseXp,
      yieldItemId: yieldRange.itemId,
      yieldMin: yieldRange.min,
      yieldMax: yieldRange.max,
      maxQuantity: Math.min(remainingRequestedRef.current, stockRef.current),
    };
    const queueItems: DisenchantQueueItemInput[] = queueRef.current
      .map((q): DisenchantQueueItemInput | null => {
        const resolved = resolveItemDisenchantParams(q.itemId);
        if (!resolved) return null;
        const key = q.instanceId ?? q.itemId;
        const stock = queueStockRef.current[key] ?? 0;
        return {
          itemId: q.itemId,
          instanceId: q.instanceId,
          requiredSkill: resolved.requiredSkill,
          baseXp: resolved.baseXp,
          yieldItemId: resolved.yieldRange.itemId,
          yieldMin: resolved.yieldRange.min,
          yieldMax: resolved.yieldRange.max,
          maxQuantity: Math.min(q.quantity, stock),
        };
      })
      .filter((q): q is DisenchantQueueItemInput => q !== null);

    // Equipment Locking overhaul — revalidated HERE, every autosave tick,
    // right before anything is actually processed ("revalidate item
    // eligibility when a queued item is actually processed"). A locked
    // entry is simply excluded from this call: it's never consumed, and it
    // also silently falls out of the persisted queue from this point on —
    // it stays exactly where it is in inventory, just no longer
    // auto-processed; re-queuing it once unlocked starts fresh.
    const freshInventory = await getInventory(currentUser.uid);
    const eligible = [current, ...queueItems].filter((entry) => !isLocked(freshInventory, entry.instanceId ?? entry.itemId));

    const totalEligible = eligible.reduce((sum, e) => sum + e.maxQuantity, 0);
    if (totalEligible <= 0) {
      setOutOfStock(stockRef.current <= 0);
      setDone(true);
      return;
    }

    const now = new Date();
    const prof = getProfessionState(currentCharacter.professions, 'enchanting');
    const cap = maxSkillForUnlockedTier('enchanting', prof.unlockedTier);
    const salvageBonusPct = shirtBonusPct(shirtBonusForItemId(currentCharacter.currentActivity.equippedShirtItemId), 'salvage_bonus');

    const result = resolveDisenchantQueueOffline(eligible, anchor, now, prof.level, prof.xp, cap, salvageBonusPct);
    if (result.perItem.length === 0) return;

    const previousAnchor = anchor;
    const previousStock = stockRef.current;
    const previousRemaining = remainingRequestedRef.current;
    const previousQueueStock = { ...queueStockRef.current };
    const previousQueue = queueRef.current;
    const totalThisTick = result.perItem.reduce((s, e) => s + e.itemsDisenchanted, 0);

    anchorRef.current = now;
    for (const entry of result.perItem) {
      if (entry.itemId === itemId && entry.instanceId === instanceId) {
        stockRef.current -= entry.itemsDisenchanted;
        remainingRequestedRef.current -= entry.itemsDisenchanted;
      } else {
        const key = entry.instanceId ?? entry.itemId;
        queueStockRef.current[key] = (queueStockRef.current[key] ?? 0) - entry.itemsDisenchanted;
      }
    }
    setSessionDisenchanted((prev) => prev + totalThisTick);
    setLivePreview(null);

    // The current item's own whole-count may already have been reported by
    // handleTickIteration below (tick-synced, same instant the bar visually
    // completes a loop) — only report whatever a tick didn't already cover.
    // Queued items have no live preview, so they're always reported here in
    // full, same as before.
    const currentEntry = result.perItem.find((entry) => entry.itemId === itemId && entry.instanceId === instanceId);
    if (currentCharacter.notificationsEnabled) {
      const lines = result.perItem
        .map((entry) => {
          const isCurrent = entry.itemId === itemId && entry.instanceId === instanceId;
          const qty = isCurrent ? entry.itemsDisenchanted - notifiedWholeRef.current : entry.itemsDisenchanted;
          if (qty <= 0) return null;
          const srcItem = ITEMS[entry.itemId];
          const yieldItem = ITEMS[entry.yieldItemId];
          const yieldQty = isCurrent && entry.itemsDisenchanted > 0 ? entry.yieldQuantity * (qty / entry.itemsDisenchanted) : entry.yieldQuantity;
          return `${qty}x ${srcItem?.name ?? entry.itemId} -> ${Math.floor(yieldQty)}x ${yieldItem?.name ?? entry.yieldItemId}`;
        })
        .filter((line): line is string => line !== null);
      if (lines.length > 0) notify('Disenchanted', lines);
    }
    if (currentEntry) notifiedWholeRef.current = currentEntry.itemsDisenchanted;
    // Floored before display/gating — see FishingScreen's matching comment:
    // the batch-resolver's fractional partial-action math can leave float
    // noise (e.g. a near-zero leftover like 0.0000001) on this delta that
    // shouldn't be shown, or gated on, as-is.
    const disenchantXpGained = Math.floor(result.professionXpGained);
    if (currentCharacter.skillXpNotificationsEnabled && disenchantXpGained > 0) {
      notify('Enchanting XP gained', [`+${disenchantXpGained} XP`]);
    }

    // Did the item this component was rendered for (itemId/instanceId)
    // finish entirely and hand off to a different item within this same
    // tick? Compare against the resolver's own idea of what's now current.
    const newCurrent = result.remainingQueue[0];
    const sameCurrentItem = !!newCurrent && newCurrent.itemId === itemId && newCurrent.instanceId === instanceId;
    const newQueueTail = result.remainingQueue.slice(1).map((q) => ({ itemId: q.itemId, instanceId: q.instanceId, quantity: q.maxQuantity }));

    try {
      const fresh = await getCharacter(currentUser.uid);
      if (!fresh) throw new Error('Character not found during autosave');

      const upgradedGrants = await applyDisenchantQueueResult(currentUser.uid, result.perItem, result.finalSkill, result.finalSkillXp);
      // The "Disenchanted" toast above is built from each item's pre-split
      // expected yield (e.g. "-> Strange Dust") since applyDisenchantQueueResult
      // rolls its small rare upgrade chance (splitDisenchantUpgradeYield)
      // independently, inside the write itself — this is the only point
      // that knows whether an upgrade (Lesser Magic Essence, etc.) actually
      // landed this batch, so it gets its own separate, accurate callout
      // rather than being silently folded into (or missed from) the toast
      // above.
      if (currentCharacter.notificationsEnabled && upgradedGrants.length > 0) {
        notify(
          'Rare find!',
          upgradedGrants.map((g) => `${g.quantity}x ${ITEMS[g.itemId]?.name ?? g.itemId}`)
        );
      }

      // The whole queue (current item included) just finished — same
      // "freeze locally, let the player review before Stop/Continue"
      // convention a single-item disenchant has always had. No
      // currentActivity write here; handleStop below does it once clicked.
      if (!newCurrent) {
        queueRef.current = [];
        setOutOfStock(false);
        setDone(true);
      } else if (!sameCurrentItem) {
        // Hand off to the next item immediately — no player interaction
        // needed, per "the next item begins automatically." Advances the
        // server AND the local optimistic cache in the same write so
        // App.tsx re-renders this component with the new item's
        // itemId/instanceId right away; its reset effect (above) then
        // re-initializes everything fresh for it.
        await advanceDisenchantQueue(currentUser.uid, {
          targetId: newCurrent.itemId,
          zoneId: fresh.currentActivity.zoneId,
          instanceId: newCurrent.instanceId,
          quantity: newCurrent.maxQuantity,
          queue: newQueueTail,
          equippedShirtItemId: fresh.currentActivity.equippedShirtItemId,
        });
      } else {
        queueRef.current = newQueueTail;
      }

      applyOptimisticUpdate(() => ({
        ...fresh,
        professions: {
          ...fresh.professions,
          enchanting: { ...getProfessionState(fresh.professions, 'enchanting'), level: result.finalSkill, xp: result.finalSkillXp },
        },
        currentActivity: !newCurrent
          ? fresh.currentActivity
          : sameCurrentItem
            ? { ...fresh.currentActivity, startedAt: now, disenchantQueue: newQueueTail }
            : {
                ...fresh.currentActivity,
                type: 'disenchanting',
                targetId: newCurrent.itemId,
                disenchantInstanceId: newCurrent.instanceId,
                disenchantQuantity: newCurrent.maxQuantity,
                disenchantQueue: newQueueTail,
                startedAt: now,
              },
      }));
      // The anchor durably moved to `now` — the next window's whole-item
      // count (and the next tick's notification check) starts fresh from 0.
      notifiedWholeRef.current = 0;
    } catch (err) {
      console.error('Disenchant autosave failed, will retry next cycle:', err);
      // notifiedWholeRef deliberately left at currentEntry's wholeX (set
      // above) — matching anchorRef's rollback to previousAnchor below, so a
      // retry against the same anchor can't re-fire the same toast.
      anchorRef.current = previousAnchor;
      stockRef.current = previousStock;
      remainingRequestedRef.current = previousRemaining;
      queueStockRef.current = previousQueueStock;
      queueRef.current = previousQueue;
      setSessionDisenchanted((prev) => prev - totalThisTick);
      setLivePreview(null);
    }
  }

  async function handleStop() {
    if (!done) await autosave();
    if (userRef.current) await stopActivity(userRef.current.uid);
    await refetch();
  }

  // Removes an unprocessed entry from the queue (the currently-processing
  // item can't be removed this way — Cancel below stops the whole
  // activity instead, which is the closest equivalent and never destroys
  // the in-progress item since it hasn't finished disenchanting).
  async function handleRemoveFromQueue(index: number) {
    if (!userRef.current) return;
    const next = queueRef.current.filter((_, i) => i !== index);
    queueRef.current = next;
    await advanceDisenchantQueue(userRef.current.uid, {
      targetId: itemId,
      zoneId: character.currentActivity.zoneId,
      instanceId,
      quantity: character.currentActivity.disenchantQuantity ?? remainingRequestedRef.current,
      queue: next,
      equippedShirtItemId: character.currentActivity.equippedShirtItemId,
    });
    await refetch();
  }

  if (!character.currentActivity.startedAt || !item || !yieldRange) return null;

  const prof = getProfessionState(character.professions, 'enchanting');
  const tier = craftingColorTier(prof.level, requiredSkill);
  const xpPct = CRAFTING_COLOR_XP_PCT[tier];
  const xpForNextLevel = craftingXpForNextLevel(prof.level);
  const requestedQuantity = character.currentActivity.disenchantQuantity ?? 1;
  const yieldItem = ITEMS[yieldRange.itemId];
  const queue = character.currentActivity.disenchantQueue ?? [];

  const cap = maxSkillForUnlockedTier('enchanting', prof.unlockedTier);
  function handleTickIteration() {
    const previewMaxQuantity = Math.min(remainingRequestedRef.current, stockRef.current);
    if (done || !anchorRef.current || !yieldRange || previewMaxQuantity <= 0) return;
    const preview = resolveDisenchantOffline(
      anchorRef.current,
      new Date(),
      requiredSkill,
      baseXp,
      yieldRange.min,
      yieldRange.max,
      previewMaxQuantity,
      prof.level,
      prof.xp,
      cap,
      shirtBonusPct(shirtBonusForItemId(character.currentActivity.equippedShirtItemId), 'salvage_bonus')
    );
    setLivePreview(preview);
    const wholeNow = Math.floor(preview.itemsDisenchanted);
    const newly = wholeNow - notifiedWholeRef.current;
    if (newly > 0) {
      notifiedWholeRef.current = wholeNow;
      if (character.notificationsEnabled) {
        const yieldItem = ITEMS[yieldRange.itemId];
        const newlyYield = preview.itemsDisenchanted > 0 ? Math.floor(preview.yieldQuantity * (newly / preview.itemsDisenchanted)) : 0;
        notify('Disenchanted', [`${newly}x ${item.name} -> ${newlyYield}x ${yieldItem?.name ?? yieldRange.itemId}`]);
      }
    }
  }
  const displayDisenchanted = sessionDisenchanted + (livePreview?.itemsDisenchanted ?? 0);

  // Expected-rewards estimate across the whole queue (current item
  // included) without revealing any specific roll — a min..max range per
  // distinct yield material, summed across every queued item's own
  // min/max and remaining quantity.
  const expectedByMaterial = new Map<string, { min: number; max: number }>();
  const addExpected = (targetItemId: string, qty: number) => {
    const resolved = resolveItemDisenchantParams(targetItemId);
    if (!resolved || qty <= 0) return;
    const existing = expectedByMaterial.get(resolved.yieldRange.itemId) ?? { min: 0, max: 0 };
    existing.min += resolved.yieldRange.min * qty;
    existing.max += resolved.yieldRange.max * qty;
    expectedByMaterial.set(resolved.yieldRange.itemId, existing);
  };
  addExpected(itemId, Math.min(remainingRequestedRef.current, stockRef.current));
  for (const q of queue) addExpected(q.itemId, q.quantity);
  const totalRemainingQuantity = Math.min(remainingRequestedRef.current, stockRef.current) + queue.reduce((s, q) => s + q.quantity, 0);
  const etaSeconds = totalRemainingQuantity * DISENCHANT_SECONDS;

  return (
    <div className="crafting-screen">
      <h2>Disenchanting: {getItemDisplayName(item.name, currentRolls)}</h2>
      <div className="item-row-main" style={{ marginBottom: 12 }}>
        <ItemSlot item={item} statOverride={currentRolls} />
        {yieldItem && <ItemSlot item={yieldItem} />}
      </div>
      {!done && <TickBar seconds={DISENCHANT_SECONDS} color="var(--class-accent)" label="Disenchanting" onIteration={handleTickIteration} />}
      <p>
        This session: {displayDisenchanted} / {requestedQuantity} disenchanted
      </p>
      <p>
        Enchanting skill: {prof.level} ({Math.floor(prof.xp)} / {xpForNextLevel} XP)
      </p>
      <p>
        {tier[0].toUpperCase() + tier.slice(1)} — {(xpPct * 100).toFixed(0)}% profession XP
      </p>
      <div className="profession-xp-bar-track">
        <div className="profession-xp-bar-fill" style={{ width: `${Math.min(100, (prof.xp / xpForNextLevel) * 100)}%` }} />
      </div>
      {outOfStock && <p>Ran out of {item.name} — stopped.</p>}
      {done && !outOfStock && <p>Finished disenchanting{queue.length > 0 || sessionDisenchanted > 0 ? ' the queue' : ''}.</p>}
      <button onClick={handleStop}>{done ? 'Continue' : queue.length > 0 ? 'Cancel queue' : 'Stop'}</button>

      {queue.length > 0 && (
        <div className="disenchant-queue">
          <h3>
            Up next ({queue.length} more item{queue.length === 1 ? '' : 's'})
          </h3>
          <p>
            <small>Estimated total remaining time: ~{Math.ceil(etaSeconds)}s</small>
          </p>
          <ul>
            {queue.map((q, i) => {
              const qItem = ITEMS[q.itemId];
              if (!qItem) return null;
              const qRolls = queueRollsByKey[q.instanceId ?? q.itemId];
              return (
                <li key={`${q.itemId}:${q.instanceId ?? ''}:${i}`}>
                  <div className="item-row-main">
                    <ItemSlot item={qItem} quantity={q.quantity} statOverride={qRolls} />
                  </div>
                  <button onClick={() => handleRemoveFromQueue(i)}>Remove</button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {expectedByMaterial.size > 0 && (
        <p>
          <small>
            Expected rewards:{' '}
            {Array.from(expectedByMaterial, ([mId, range]) => {
              const mItem = ITEMS[mId];
              return `${range.min}-${range.max}x ${mItem?.name ?? mId}`;
            }).join(', ')}
          </small>
        </p>
      )}
    </div>
  );
}
