import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyFishingResult } from '../firebase/professions';
import { stopActivity, getCharacter, advanceQuests } from '../firebase/character';
import { AUTOSAVE_INTERVAL_SECONDS } from '../gameData/activityEngine';
import {
  resolveGatheringOffline,
  gatheringColorTier,
  gatheringXpForNextLevel,
  fishingZoneMasteryPercent,
  fishingZoneMasteryEquivalentLevel,
  gatheringMasterySpeedMultiplier,
  gatheringMasteryBonusChance,
  GATHERING_COLOR_XP_PCT,
  type GatheringResourceLike,
  type GatheringOfflineResult,
  type FishingZoneOverride,
} from '../gameData/gatheringEngine';
import { getProfessionState, maxSkillForUnlockedTier } from '../gameData/professionTiers';
import { ITEMS } from '../gameData/items';
import { ZONES } from '../gameData/zones';
import { equippedItemId } from '../gameData/equipmentStats';
import { notify } from '../utils/notifications';
import { useGuildMilestoneBonuses } from '../hooks/useGuildMilestones';
import { TickBar } from './TickBar';
import type { Character } from '../types/character';
import type { User } from 'firebase/auth';
import type { FishingHole } from '../gameData/types';

// Fishing now shares gatheringEngine.ts's 1-100 XP+Mastery engine with
// Mining/Herbalism/Skinning — structurally parallel to GatheringScreen, with
// catchChance baked into the resolver as the one thing that still makes
// Fishing different ("your fish got away": no fish, no XP, no Mastery), and
// a SHARED PER-ZONE Mastery bar (not per-hole) that replaces the old
// per-hole 0-50 axis entirely — every hole in a zone (old or new) now
// contributes to and reads from the same fishingZoneMastery bucket, mapped
// onto the existing gatheringMasterySpeedMultiplier/gatheringMasteryBonusChance
// curve via fishingZoneMasteryEquivalentLevel (see gatheringEngine.ts).
// Always uses the OFFLINE/batched resolver, even for a single ~20s autosave
// chunk — same convention as GatheringScreen.
export function FishingScreen({ hole }: { hole: FishingHole }) {
  const { user } = useAuth();
  const { character: characterOrNull, refetch, applyOptimisticUpdate } = useCharacter();
  const character = characterOrNull!;
  const [, setTick] = useState(0);
  const secondsSinceSaveRef = useRef(0);

  const [bankedQuantity, setBankedQuantity] = useState(0);
  const [bankedBonusQuantity, setBankedBonusQuantity] = useState(0);
  // Updated only from TickBar's onIteration below (the bar's own compositor
  // clock) — see TickBar.tsx's doc comment for why an independent JS timer
  // would drift against the bar's visual completion.
  const [livePreview, setLivePreview] = useState<GatheringOfflineResult | null>(null);
  const anchorRef = useRef<Date | null>(character.currentActivity.startedAt);
  // How many whole units (relative to the current anchor) have already had
  // their "caught" notification fire — see CraftingScreen's matching
  // notifiedWholeRef for the full rationale.
  const notifiedWholeRef = useRef(0);

  const characterRef = useRef<Character | null>(character);
  const userRef = useRef<User | null>(user);
  // Guild Milestones (level 10/20) — read through a ref for the same
  // reason characterRef exists: autosave() runs from a setInterval
  // callback whose effect only depends on [hole.id] (below), so closing
  // over the hook's value directly would freeze it at mount time.
  const guildBonuses = useGuildMilestoneBonuses();
  const guildBonusesRef = useRef(guildBonuses);
  useEffect(() => {
    guildBonusesRef.current = guildBonuses;
  }, [guildBonuses]);
  useEffect(() => {
    characterRef.current = character;
  }, [character]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    setBankedQuantity(0);
    setBankedBonusQuantity(0);
    setLivePreview(null);
    anchorRef.current = character.currentActivity.startedAt;
    notifiedWholeRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hole.id]);

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
  }, [hole.id]);

  function resourceLike(): GatheringResourceLike {
    return {
      itemId: hole.itemId,
      baseXp: hole.baseXp,
      secondsPerAction: hole.secondsPerAction,
      requiredLevel: hole.requiredLevel,
      catchChance: hole.catchChance,
      rareBonus: hole.rareBonus,
    };
  }

  async function autosave() {
    const currentUser = userRef.current;
    const currentCharacter = characterRef.current;
    const anchor = anchorRef.current;
    if (!currentUser || !currentCharacter || !anchor) return;

    const now = new Date();
    const prof = getProfessionState(currentCharacter.professions, 'fishing');
    const cap = maxSkillForUnlockedTier('fishing', prof.unlockedTier);
    const equippedToolId = equippedItemId(currentCharacter.equipment.tool_fishing);
    const equippedTool = equippedToolId ? ITEMS[equippedToolId] : null;
    const toolBonusPct =
      (equippedTool?.toolType === 'fishing_rod' ? equippedTool.gatherBonusPct ?? 0 : 0) + guildBonusesRef.current.gatheringTimePct;

    const zoneMasteryStartingXp = currentCharacter.fishingZoneMastery?.[hole.zoneId]?.xp ?? 0;
    const fishingZoneOverride: FishingZoneOverride = { zoneMasteryStartingXp };

    const result = resolveGatheringOffline(
      anchor,
      now,
      resourceLike(),
      prof.level,
      prof.xp,
      0,
      0,
      cap,
      toolBonusPct,
      undefined,
      // Guild Milestone (level 20) — the same masteryXpPct channel a
      // profession shirt would use, see gameData/guildMilestones.ts.
      // Fishing has no shirt bonus of its own today, so this is the first
      // thing to populate this param for it.
      { masteryXpPct: guildBonusesRef.current.gatheringMasteryPct },
      fishingZoneOverride
    );

    if (result.quantityGained === 0 && result.rareBonusQuantity === 0 && result.professionXpGained === 0) return;

    const previousAnchor = anchor;
    const wholeQuantity = Math.floor(result.quantityGained);
    const wholeBonus = Math.floor(result.rareBonusQuantity);

    anchorRef.current = now;
    setBankedQuantity((prev) => prev + wholeQuantity);
    setBankedBonusQuantity((prev) => prev + wholeBonus);
    setLivePreview(null);

    // The normal case: every whole catch in this window already got its own
    // "caught" toast the instant its TickBar loop completed (see
    // handleTickIteration below) — see CraftingScreen's matching comment for
    // why this only reports whatever a tick DIDN'T already cover.
    const notYetNotified = wholeQuantity - notifiedWholeRef.current;
    if (currentCharacter.notificationsEnabled && notYetNotified > 0) {
      notify(`${ITEMS[hole.itemId]?.name ?? hole.itemId} caught`, [`${notYetNotified}x ${ITEMS[hole.itemId]?.name ?? hole.itemId}`]);
    }
    // See CraftingScreen's matching comment: left at wholeQuantity (not
    // reset to 0) until the write below actually succeeds.
    notifiedWholeRef.current = wholeQuantity;
    // Floored before display/gating — actionsThisBatch (gatheringEngine.ts)
    // is a genuinely fractional partial-action count by design (smooth
    // progress within a batch), so the raw XP delta can carry binary
    // floating-point noise (e.g. 7.000000000000001, or a near-zero leftover
    // like 0.0000001 at a batch boundary). A toast showing that noise
    // verbatim is the bug being fixed here — floor it the same way the
    // profession panel's cumulative total already floors prof.xp, and skip
    // the toast entirely when there's nothing left to show after flooring.
    const fishingXpGained = Math.floor(result.professionXpGained);
    if (currentCharacter.skillXpNotificationsEnabled && fishingXpGained > 0) {
      notify('Fishing XP gained', [`+${fishingXpGained} XP`]);
    }
    const fishingMasteryXpGained = Math.floor(result.fishingZoneMasteryXpGained ?? 0);
    if (currentCharacter.masteryXpNotificationsEnabled && fishingMasteryXpGained > 0) {
      notify('Mastery XP gained', [`+${fishingMasteryXpGained} ${ZONES[hole.zoneId]?.name ?? hole.zoneId} Mastery XP`]);
    }

    // A rough speculative estimate, superseded moments later by the
    // authoritative reconciliation below once the write succeeds. The old
    // per-hole Mastery bucket is frozen (never written) — fishingZoneMastery
    // carries the real result instead, exactly like a Herbalism primary-herb
    // node freezes professions.mastery in GatheringScreen.
    applyOptimisticUpdate((c) => ({
      ...c,
      professions: {
        ...c.professions,
        fishing: {
          ...getProfessionState(c.professions, 'fishing'),
          level: result.finalSkill,
          xp: result.finalSkillXp,
        },
      },
      fishingZoneMastery: {
        ...c.fishingZoneMastery,
        [hole.zoneId]: { xp: result.finalFishingZoneMasteryXp ?? 0 },
      },
    }));

    try {
      // One read per cycle, done up front — quests ARE reachable while this
      // runs in the background, so a stale local copy here risks silently
      // reverting a concurrent Accept/Complete Quest click.
      const fresh = await getCharacter(currentUser.uid);
      if (!fresh) throw new Error('Character not found during autosave');

      await applyFishingResult(currentUser.uid, fresh, {
        itemId: hole.itemId,
        quantity: wholeQuantity,
        rareBonusItemId: hole.rareBonus?.itemId,
        rareBonusQuantity: wholeBonus,
        newSkillLevel: result.finalSkill,
        newSkillXp: result.finalSkillXp,
        fishingZoneMastery: { zoneId: hole.zoneId, xpGained: result.fishingZoneMasteryXpGained ?? 0 },
      });

      const events = [{ type: 'gather' as const, itemId: hole.itemId, count: wholeQuantity }];
      if (hole.rareBonus && wholeBonus > 0) events.push({ type: 'gather' as const, itemId: hole.rareBonus.itemId, count: wholeBonus });
      await advanceQuests(currentUser.uid, fresh, events);

      applyOptimisticUpdate(() => ({
        ...fresh,
        professions: {
          ...fresh.professions,
          fishing: {
            ...getProfessionState(fresh.professions, 'fishing'),
            level: result.finalSkill,
            xp: result.finalSkillXp,
          },
        },
        fishingZoneMastery: {
          ...fresh.fishingZoneMastery,
          [hole.zoneId]: { xp: result.finalFishingZoneMasteryXp ?? 0 },
        },
        // Fishing never touches currentActivity.startedAt server-side, so
        // without refreshing it locally too it sits stale from whenever the
        // activity started, risking a isLongAbsence flicker.
        currentActivity: { ...fresh.currentActivity, startedAt: now },
      }));
      // The anchor durably moved to `now` — the next window starts fresh.
      notifiedWholeRef.current = 0;
    } catch (err) {
      console.error('Fishing autosave failed, will retry next cycle:', err);
      anchorRef.current = previousAnchor;
      setBankedQuantity((prev) => prev - wholeQuantity);
      setBankedBonusQuantity((prev) => prev - wholeBonus);
      setLivePreview(null);
      applyOptimisticUpdate((c) => ({
        ...c,
        professions: {
          ...c.professions,
          fishing: getProfessionState(currentCharacter.professions, 'fishing'),
        },
        fishingZoneMastery: currentCharacter.fishingZoneMastery,
      }));
    }
  }

  async function handleStop() {
    await autosave();
    if (userRef.current) await stopActivity(userRef.current.uid);
    await refetch();
  }

  if (!character.currentActivity.startedAt) return null;

  const prof = getProfessionState(character.professions, 'fishing');
  const tier = gatheringColorTier(prof.level, hole.requiredLevel);
  const xpPct = GATHERING_COLOR_XP_PCT[tier];
  const xpForNextSkillLevel = gatheringXpForNextLevel(prof.level);
  const zoneMasteryXp = character.fishingZoneMastery?.[hole.zoneId]?.xp ?? 0;
  const zoneMasteryPercent = fishingZoneMasteryPercent(zoneMasteryXp);
  const equivLevel = fishingZoneMasteryEquivalentLevel(zoneMasteryPercent);
  const speedMult = gatheringMasterySpeedMultiplier(equivLevel);
  const bonusChance = gatheringMasteryBonusChance(equivLevel);
  const zoneName = ZONES[hole.zoneId]?.name ?? hole.zoneId;

  // Recomputed from TickBar's onIteration below — fired by the bar's own
  // CSS animation completing a loop (the compositor clock), not by the
  // separate 1s setInterval that drives the real 20s autosave cadence —
  // see TickBar.tsx's doc comment for why an independent JS timer would
  // drift against the bar's visual completion.
  const previewEquippedToolId = equippedItemId(character.equipment.tool_fishing);
  const previewEquippedTool = previewEquippedToolId ? ITEMS[previewEquippedToolId] : null;
  const previewToolBonusPct =
    (previewEquippedTool?.toolType === 'fishing_rod' ? previewEquippedTool.gatherBonusPct ?? 0 : 0) + guildBonuses.gatheringTimePct;
  const cap = maxSkillForUnlockedTier('fishing', prof.unlockedTier);
  // The bar's displayed duration must fold in the tool + Guild Milestone
  // speed bonus, not just zone Mastery — see GatheringScreen's matching
  // comment for why a partial speed input here would reintroduce the exact
  // desync TickBar.tsx's key-on-seconds fix exists to prevent.
  const displaySpeedMult = speedMult * (1 + previewToolBonusPct / 100);
  function handleTickIteration() {
    if (!anchorRef.current) return;
    const preview = resolveGatheringOffline(
      anchorRef.current,
      new Date(),
      resourceLike(),
      prof.level,
      prof.xp,
      0,
      0,
      cap,
      previewToolBonusPct,
      undefined,
      { masteryXpPct: guildBonuses.gatheringMasteryPct },
      { zoneMasteryStartingXp: zoneMasteryXp }
    );
    setLivePreview(preview);
    const wholeNow = Math.floor(preview.quantityGained);
    const newly = wholeNow - notifiedWholeRef.current;
    if (newly > 0) {
      notifiedWholeRef.current = wholeNow;
      if (character.notificationsEnabled) {
        notify(`${ITEMS[hole.itemId]?.name ?? hole.itemId} caught`, [`${newly}x ${ITEMS[hole.itemId]?.name ?? hole.itemId}`]);
      }
    }
  }
  const displayQuantity = bankedQuantity + Math.floor(livePreview?.quantityGained ?? 0);
  const displayBonusQuantity = bankedBonusQuantity + Math.floor(livePreview?.rareBonusQuantity ?? 0);

  return (
    <div className="fishing-screen">
      <h2>Fishing: {hole.name}</h2>
      <TickBar seconds={hole.secondsPerAction / displaySpeedMult} color="#2a5a6b" label="Casting" onIteration={handleTickIteration} />
      <p>
        {tier[0].toUpperCase() + tier.slice(1)} — {(xpPct * 100).toFixed(0)}% profession XP, {(hole.catchChance * 100).toFixed(0)}% catch
        chance
      </p>
      <p>
        This session: {displayQuantity}x {ITEMS[hole.itemId]?.name ?? hole.itemId}
        {hole.rareBonus && displayBonusQuantity > 0
          ? `, ${displayBonusQuantity}x ${ITEMS[hole.rareBonus.itemId]?.name ?? hole.rareBonus.itemId}`
          : ''}
      </p>
      <p>
        Fishing level: {prof.level} ({Math.floor(prof.xp)} / {xpForNextSkillLevel} XP)
      </p>
      <div className="profession-xp-bar-track">
        <div className="profession-xp-bar-fill" style={{ width: `${Math.min(100, (prof.xp / xpForNextSkillLevel) * 100)}%` }} />
      </div>
      <p>
        {zoneName} Mastery: {zoneMasteryPercent.toFixed(1)}%{' — '}+{((speedMult - 1) * 100).toFixed(0)}% speed,{' '}
        {(bonusChance * 100).toFixed(0)}% bonus yield (never affects pearl chance); reach 100% for the Master Angler of {zoneName}{' '}
        title.
      </p>
      <div className="profession-xp-bar-track">
        <div className="profession-xp-bar-fill" style={{ width: `${zoneMasteryPercent}%` }} />
      </div>
      {hole.rareBonus && (
        <p>
          {(hole.rareBonus.chance * 100).toFixed(0)}% chance of a {ITEMS[hole.rareBonus.itemId]?.name ?? hole.rareBonus.itemId} per
          successful catch — fixed, never increased by Mastery, level, or speed.
        </p>
      )}
      <button onClick={handleStop}>Stop</button>
    </div>
  );
}
