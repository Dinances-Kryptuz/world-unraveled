import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyDisenchantResult } from '../firebase/enchanting';
import { getCharacter, stopActivity } from '../firebase/character';
import { getInventory } from '../firebase/inventory';
import { AUTOSAVE_INTERVAL_SECONDS } from '../gameData/activityEngine';
import { resolveDisenchantOffline, craftingColorTier, craftingXpForNextLevel, CRAFTING_COLOR_XP_PCT, DISENCHANT_SECONDS } from '../gameData/craftingEngine';
import { getProfessionState, maxSkillForUnlockedTier } from '../gameData/professionTiers';
import { disenchantRequiredSkill, disenchantXpAward, disenchantYieldRange } from '../gameData/enchanting';
import { ITEMS } from '../gameData/items';
import { ItemSlot } from './ItemSlot';
import { TickBar } from './TickBar';
import { notify } from '../utils/notifications';
import type { Character } from '../types/character';
import type { User } from 'firebase/auth';

// Disenchanting's own activity screen — same ticking/autosave shape as
// CraftingScreen, but simpler: no materials to track, no Mastery axis (see
// craftingEngine.ts's resolveDisenchantOffline doc comment), and it
// auto-stops once `disenchantQuantity` items are processed or the stack
// runs out, rather than running until manually stopped. This is what turns
// "disenchant my whole stack" from N individual clicks into one slider pick
// and an idle/AFK wait, per the design brief's explicit ask.
export function DisenchantingScreen({ itemId, instanceId }: { itemId: string; instanceId?: string }) {
  const { user } = useAuth();
  const { character: characterOrNull, refetch, applyOptimisticUpdate } = useCharacter();
  const character = characterOrNull!;
  const [, setTick] = useState(0);
  const secondsSinceSaveRef = useRef(0);

  const [sessionDisenchanted, setSessionDisenchanted] = useState(0);
  const [outOfStock, setOutOfStock] = useState(false);
  const [done, setDone] = useState(false);
  const anchorRef = useRef<Date | null>(character.currentActivity.startedAt);
  const stockRef = useRef(0);
  const remainingRequestedRef = useRef(character.currentActivity.disenchantQuantity ?? 1);

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
    anchorRef.current = character.currentActivity.startedAt;
    remainingRequestedRef.current = character.currentActivity.disenchantQuantity ?? 1;
    if (user) {
      getInventory(user.uid).then((inv) => {
        stockRef.current = instanceId ? inv.equipmentInstances?.[instanceId]?.quantity ?? 0 : inv.items[itemId] ?? 0;
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

    const maxQuantity = Math.min(remainingRequestedRef.current, stockRef.current);
    if (maxQuantity <= 0) {
      // Same convention as CraftingScreen's "out of materials" case —
      // freeze progress and tell the player, but don't auto-call
      // stopActivity (that would unmount this screen out from under them
      // before they even see the message). They click Stop when ready.
      setOutOfStock(stockRef.current <= 0);
      setDone(true);
      return;
    }

    const now = new Date();
    const prof = getProfessionState(currentCharacter.professions, 'enchanting');
    const cap = maxSkillForUnlockedTier('enchanting', prof.unlockedTier);

    const result = resolveDisenchantOffline(
      anchor,
      now,
      requiredSkill,
      baseXp,
      yieldRange.min,
      yieldRange.max,
      maxQuantity,
      prof.level,
      prof.xp,
      cap
    );

    if (result.itemsDisenchanted === 0) return;

    const previousAnchor = anchor;
    const previousStock = stockRef.current;
    const previousRemaining = remainingRequestedRef.current;

    anchorRef.current = now;
    stockRef.current -= result.itemsDisenchanted;
    remainingRequestedRef.current -= result.itemsDisenchanted;
    setSessionDisenchanted((prev) => prev + result.itemsDisenchanted);

    if (currentCharacter.notificationsEnabled) {
      notify('Disenchanted', [`${result.itemsDisenchanted}x ${item.name} -> ${result.yieldQuantity}x ${ITEMS[yieldRange.itemId]?.name ?? yieldRange.itemId}`]);
    }

    applyOptimisticUpdate((c) => ({
      ...c,
      professions: {
        ...c.professions,
        enchanting: { ...getProfessionState(c.professions, 'enchanting'), level: result.finalSkill, xp: result.finalSkillXp },
      },
    }));

    try {
      const fresh = await getCharacter(currentUser.uid);
      if (!fresh) throw new Error('Character not found during autosave');

      await applyDisenchantResult(
        currentUser.uid,
        itemId,
        {
          itemsDisenchanted: result.itemsDisenchanted,
          yieldItemId: yieldRange.itemId,
          yieldQuantity: result.yieldQuantity,
          newSkillLevel: result.finalSkill,
          newSkillXp: result.finalSkillXp,
        },
        instanceId
      );

      applyOptimisticUpdate(() => ({
        ...fresh,
        professions: {
          ...fresh.professions,
          enchanting: { ...getProfessionState(fresh.professions, 'enchanting'), level: result.finalSkill, xp: result.finalSkillXp },
        },
        currentActivity: { ...fresh.currentActivity, startedAt: now },
      }));

      if (remainingRequestedRef.current <= 0 || stockRef.current <= 0) {
        setOutOfStock(stockRef.current <= 0);
        setDone(true);
      }
    } catch (err) {
      console.error('Disenchant autosave failed, will retry next cycle:', err);
      anchorRef.current = previousAnchor;
      stockRef.current = previousStock;
      remainingRequestedRef.current = previousRemaining;
      setSessionDisenchanted((prev) => prev - result.itemsDisenchanted);
    }
  }

  async function handleStop() {
    if (!done) await autosave();
    if (userRef.current) await stopActivity(userRef.current.uid);
    await refetch();
  }

  if (!character.currentActivity.startedAt || !item || !yieldRange) return null;

  const prof = getProfessionState(character.professions, 'enchanting');
  const tier = craftingColorTier(prof.level, requiredSkill);
  const xpPct = CRAFTING_COLOR_XP_PCT[tier];
  const xpForNextLevel = craftingXpForNextLevel(prof.level);
  const requestedQuantity = character.currentActivity.disenchantQuantity ?? 1;
  const yieldItem = ITEMS[yieldRange.itemId];

  return (
    <div className="crafting-screen">
      <h2>Disenchanting: {item.name}</h2>
      <div className="item-row-main" style={{ marginBottom: 12 }}>
        <ItemSlot item={item} />
        {yieldItem && <ItemSlot item={yieldItem} />}
      </div>
      {!done && <TickBar seconds={DISENCHANT_SECONDS} color="#6b4f2a" label="Disenchanting" />}
      <p>
        This session: {sessionDisenchanted} / {requestedQuantity} disenchanted
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
      {done && !outOfStock && <p>Finished disenchanting.</p>}
      <button onClick={handleStop}>{done ? 'Continue' : 'Stop'}</button>
    </div>
  );
}
