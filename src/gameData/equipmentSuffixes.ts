// Dynamic equipment-suffix naming — identifies a randomized armor piece's
// rolled 2-stat combination (gameData/equipmentRolls.ts's rollArmorStats)
// with a classic "of the Beast" suffix, purely for display. No new static
// item definitions are created for this: the displayed name is always
// `${baseItem.name} ${suffix}` computed on the fly from whatever `rolls` the
// caller already has in hand (an Inventory.equipmentInstances entry, an
// EquippedItemRef, a chargedConsumables-adjacent lookup — anything shaped
// like Partial<Record<BaseStat, number>>). An item with no `rolls` (a plain
// stackable, a unique/quest item, anything not itemized through
// rollArmorStats) is untouched and keeps its own static name exactly as
// before — this is what "preserves unique names for exempt equipment" means
// in practice: exemption is just "this item never has `rolls`."
import type { BaseStat } from './classStats';

// Keyed by the two rolled stats sorted alphabetically and joined, so stat
// order never matters ({STR:4,STA:6} and {STA:6,STR:4} both resolve to the
// same 'STA,STR' key). All 10 of the C(5,2) pairs over the 5 BaseStats are
// covered — see equipmentRolls.ts's ARMOR_STATS for why there are exactly 5.
const SUFFIX_TABLE: Record<string, string> = {
  'AGI,STR': 'of the Tiger',
  'AGI,INT': 'of the Falcon',
  'AGI,SPI': 'of the Wolf',
  'AGI,STA': 'of the Monkey',
  'INT,STR': 'of the Gorilla',
  'INT,SPI': 'of the Owl',
  'INT,STA': 'of the Eagle',
  'SPI,STR': 'of the Boar',
  'SPI,STA': 'of the Whale',
  'STA,STR': 'of the Bear',
};

// null for anything that isn't exactly a 2-distinct-stat roll (0/1 stats —
// shouldn't happen for a freshly rolled item, but guards old/malformed data
// — or somehow >2, which never happens today but costs nothing to guard).
export function equipmentSuffixFor(rolls: Partial<Record<BaseStat, number>> | undefined): string | null {
  if (!rolls) return null;
  const stats = Object.keys(rolls) as BaseStat[];
  if (stats.length !== 2) return null;
  const key = stats.slice().sort().join(',');
  return SUFFIX_TABLE[key] ?? null;
}

// The single choke point every screen should call instead of reading
// `item.name` directly whenever a randomized instance's rolls might be in
// scope. Accepts just the base item's name (not a full ItemDef) so call
// sites that only have a name string handy (notification text, etc.) don't
// need to thread an entire item object through.
export function getItemDisplayName(baseName: string, rolls?: Partial<Record<BaseStat, number>>): string {
  const suffix = equipmentSuffixFor(rolls);
  return suffix ? `${baseName} ${suffix}` : baseName;
}
