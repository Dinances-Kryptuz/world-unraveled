import type { ItemDef } from './types';

// There's no art pipeline in this project — these are deliberately chosen
// emoji (crisp at any size, zero asset loading, huge existing variety)
// standing in for real icon art, the same role Melvor Idle/Rock Idle's flat
// icons play. Matched by item.type/equipSlot/armorType first, then by
// keyword against the item's id — the game's material naming is
// systematic enough (every ore ends "_ore", every bar "_bar", etc.) that
// this covers the whole 230+ item catalog without a per-item table to keep
// in sync as new items are added.
export function getItemIcon(item: ItemDef): string {
  const id = item.id;

  if (item.type === 'equipment') {
    if (item.equipSlot === 'weapon') {
      if (/hammer|mace/.test(id)) return '🔨';
      if (/axe|hatchet/.test(id)) return '🪓';
      if (/staff|wand|rod|scepter|focus/.test(id)) return '🪄';
      if (/dagger|shiv|cleaver/.test(id)) return '🗡️';
      if (/bow/.test(id)) return '🏹';
      return '⚔️';
    }
    if (item.equipSlot === 'ring') return '💍';
    if (item.equipSlot === 'tool') {
      if (/pick/.test(id)) return '⛏️';
      if (/knife/.test(id)) return '🔪';
      if (/rod/.test(id)) return '🎣';
      return '🛠️';
    }
    if (item.equipSlot === 'helmet') {
      return item.armorType === 'plate' ? '🪖' : item.armorType === 'mail' ? '⛑️' : '🧢';
    }
    if (item.equipSlot === 'chest') {
      return item.armorType === 'plate' ? '🛡️' : item.armorType === 'cloth' ? '👕' : '🥋';
    }
    if (item.equipSlot === 'legs') return '👖';
    if (item.equipSlot === 'gloves') return '🧤';
    if (item.equipSlot === 'boots') return item.armorType === 'cloth' ? '👢' : '🥾';
    return '🎽';
  }

  if (item.type === 'recipe') return '📜';
  if (item.type === 'enchant_scroll') return '🧻';

  if (item.type === 'consumable') {
    if (item.consumableEffect?.bagCapacityBonus) return '🎒';
    if (/bread|stew|roast|fillet|chowder|skewer|feast/.test(id)) return '🍖';
    if (/juice/.test(id)) return '🧃';
    return '🧪';
  }

  // Materials — the naming convention does almost all the work.
  if (/_damaged$/.test(id)) return '🔧';
  if (/meat$/.test(id)) return '🍖';
  if (/shiv$|dagger$/.test(id)) return '🗡️';
  if (/foot$|ash$/.test(id)) return '✨';
  if (/ore$/.test(id)) return '🪨';
  if (/_bar$/.test(id)) return '🧱';
  if (/cloth|thread/.test(id)) return '🧵';
  if (/hide|leather|pelt|fur|scale$|scrap/.test(id)) return '🦬';
  if (/fang|tusk|horn|claw|tooth/.test(id)) return '🦴';
  if (/shard|gem|crystal|quartz|opal|starforge/.test(id)) return '💎';
  if (/dust|essence/.test(id)) return '✨';
  if (/bloom|petal|sage|root|leaf|weed|cap$/.test(id)) return '🌿';
  if (/trout|char|eel|carp|darter|koi/.test(id)) return '🐟';
  if (/pouch|coin/.test(id)) return '💰';
  if (/chunk|flint|heart$/.test(id)) return '🪨';

  return '📦';
}
