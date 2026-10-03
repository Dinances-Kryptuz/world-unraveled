import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { reconcileCollectionAndAchievements } from '../firebase/achievements';
import { ACHIEVEMENTS } from '../gameData/achievements';
import { ITEMS } from '../gameData/items';
import { ItemSlot } from './ItemSlot';
import type { EquipmentSlot } from '../gameData/types';

const SLOT_ORDER: EquipmentSlot[] = ['weapon', 'chest', 'helmet', 'gloves', 'legs', 'boots', 'ring', 'tool'];
const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: 'Weapons',
  chest: 'Chest',
  helmet: 'Helmets',
  gloves: 'Gloves',
  legs: 'Legs',
  boots: 'Boots',
  ring: 'Rings',
  tool: 'Tools',
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

  if (!character) return null;

  const collectedSet = new Set(collectedItemIds);
  const unlockedSet = new Set(unlockedAchievementIds);
  const allEquipment = Object.values(ITEMS).filter((item) => item.type === 'equipment');

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
        </>
      )}
    </div>
  );
}
