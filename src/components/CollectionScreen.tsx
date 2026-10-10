import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { reconcileCollectionAndAchievements } from '../firebase/achievements';
import { setEquippedTitle } from '../firebase/titles';
import { ACHIEVEMENTS } from '../gameData/achievements';
import { TITLES } from '../gameData/titles';
import { ITEMS } from '../gameData/items';
import { RECIPES } from '../gameData/recipes';
import { ItemSlot } from './ItemSlot';
import type { EquipmentSlot } from '../gameData/types';

// The 48 retired "sacred_*" items (see items.ts's module comment on the
// material-Mastery overhaul) are kept as frozen legacy ItemDefs forever so a
// pre-existing stack/equip never breaks, but they can no longer be crafted
// or otherwise obtained — a character who already found one keeps it in
// their log permanently (collectedItemIds is monotonic), but one who never
// did shouldn't see a permanently-impossible entry. Identified generically
// (not a hand-typed id list): a "sacred_X" item whose de-prefixed id X is
// itself a still-craftable consolidated base item is exactly the retired
// set this overhaul produced.
const CONSOLIDATED_BASE_ITEM_IDS = new Set(Object.values(RECIPES).filter((r) => r.materialId).map((r) => r.resultItemId));
function isRetiredLegacyItem(itemId: string): boolean {
  return itemId.startsWith('sacred_') && CONSOLIDATED_BASE_ITEM_IDS.has(itemId.slice('sacred_'.length));
}

// 'ring2' is deliberately omitted — it's a second equip DESTINATION, not a
// distinct item category (every ring item's own equipSlot is always
// 'ring'), so grouping by it below would only ever find zero items.
const SLOT_ORDER: EquipmentSlot[] = [
  'weapon', 'offhand', 'chest', 'helmet', 'shoulders', 'cape', 'shirt', 'tabard', 'bracers',
  'gloves', 'belt', 'legs', 'boots', 'necklace', 'ring', 'tool', 'ammo',
];
const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: 'Weapons',
  offhand: 'Off Hand',
  chest: 'Chest',
  helmet: 'Helmets',
  gloves: 'Gloves',
  legs: 'Legs',
  boots: 'Boots',
  necklace: 'Necklaces',
  ring: 'Rings',
  ring2: 'Rings',
  tool: 'Tools',
  shoulders: 'Shoulders',
  cape: 'Capes',
  shirt: 'Shirts',
  tabard: 'Tabards',
  bracers: 'Bracers',
  belt: 'Belts',
  ammo: 'Ammo',
};

// Combines the collection log (every equipment item id ever seen in
// inventory/bank/equipped, grouped by slot) and the achievements list (see
// gameData/achievements.ts) into one screen with two tabs — a comparatively
// minor completionist feature, not worth two separate sidebar entries. Both
// lists are reconciled against current state on mount (see
// firebase/achievements.ts's reconcileCollectionAndAchievements) rather than
// eagerly at every loot/craft/quest-complete call site — opening this
// screen is what "catches up" a newly-met condition, same lazy pattern
// Phase 4's CharacterSelectScreen/roster reads already use.
export function CollectionScreen() {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [tab, setTab] = useState<'log' | 'achievements'>('log');
  const [collectedItemIds, setCollectedItemIds] = useState<string[]>([]);
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !character) return;
    void reconcileCollectionAndAchievements(user.uid, character).then((result) => {
      setCollectedItemIds(result.collectedItemIds);
      setUnlockedAchievementIds(result.unlockedAchievementIds);
      setLoading(false);
      // Refreshes the shared character state too, in case this reconcile
      // just unlocked something new — same "the write already happened,
      // this just syncs the UI" purpose as every other refetch() in this app.
      if (result.collectedItemIds.length !== character.collectedItemIds.length ||
          result.unlockedAchievementIds.length !== character.unlockedAchievementIds.length) {
        void refetch();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleSelectTitle(titleId: string) {
    if (!user) return;
    await setEquippedTitle(user.uid, titleId || null);
    await refetch();
  }

  if (!character) return null;

  const collectedSet = new Set(collectedItemIds);
  const unlockedSet = new Set(unlockedAchievementIds);
  const allEquipment = Object.values(ITEMS).filter(
    (item) => item.type === 'equipment' && (!isRetiredLegacyItem(item.id) || collectedSet.has(item.id))
  );

  return (
    <div className="collection-screen">
      <h2>Collection</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setTab('log')} style={tab === 'log' ? { fontWeight: 'bold' } : undefined}>
          Collection Log
        </button>
        <button onClick={() => setTab('achievements')} style={tab === 'achievements' ? { fontWeight: 'bold' } : undefined}>
          Achievements
        </button>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : tab === 'log' ? (
        <>
          <p>
            <small>
              {collectedItemIds.length} / {allEquipment.length} gear pieces found
            </small>
          </p>
          {SLOT_ORDER.map((slot) => {
            const itemsInSlot = allEquipment.filter((item) => item.equipSlot === slot);
            if (itemsInSlot.length === 0) return null;
            return (
              <div key={slot}>
                <h3>{SLOT_LABELS[slot]}</h3>
                <div className="item-grid">
                  {itemsInSlot.map((item) => {
                    const found = collectedSet.has(item.id);
                    return found ? (
                      <ItemSlot key={item.id} item={item} />
                    ) : (
                      <div key={item.id} className="item-slot item-slot-mystery" title="Not yet found">
                        <span className="item-slot-icon">❓</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <>
          <p>
            <small>
              {unlockedAchievementIds.length} / {ACHIEVEMENTS.length} achievements unlocked
            </small>
          </p>
          <ul>
            {ACHIEVEMENTS.map((a) => {
              const done = unlockedSet.has(a.id);
              return (
                <li key={a.id} style={{ opacity: done ? 1 : 0.5 }}>
                  <strong>{done ? '✓ ' : ''}{a.name}</strong> — {a.description}
                </li>
              );
            })}
          </ul>

          {/* Titles unlock in lockstep with their matching mastery/Master
              Blacksmith achievement above (same id, reused — see
              gameData/titles.ts) — purely cosmetic, same "equip one of
              several unlocked options" pattern ConsumablesBar's
              EquippedSlot already uses for food/potion pins. */}
          <h3>Title</h3>
          {character.unlockedTitleIds.length === 0 ? (
            <p>
              <small>No titles unlocked yet.</small>
            </p>
          ) : (
            <select value={character.equippedTitleId ?? ''} onChange={(e) => handleSelectTitle(e.target.value)}>
              <option value="">— None —</option>
              {TITLES.filter((t) => character.unlockedTitleIds.includes(t.id)).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </>
      )}
    </div>
  );
}
