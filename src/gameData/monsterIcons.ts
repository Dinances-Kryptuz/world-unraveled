// Same "no art pipeline, emoji stands in for real art" approach as
// itemIcons.ts — but hand-picked per monster (only 35 of them, so a lookup
// table beats a keyword heuristic on quality here) rather than derived from
// naming conventions. Falls back to a generic silhouette for any monster id
// not listed, so a future zone's new monsters never render blank.
const MONSTER_ICONS: Record<string, string> = {
  greenhorn_boar: '🐗',
  forest_wolf: '🐺',
  wild_kobold: '👺',
  thornback_hare: '🐇',
  ridge_jackal: '🦊',
  craggy_goat: '🐐',
  rubble_crawler: '🦂',
  highland_bandit: '🥷',
  crag_wolf_alpha: '🐺',
  cinder_wolf: '🐕',
  ashwing_bat: '🦇',
  molten_crawler: '🦎',
  ridgeback_marauder: '🐻',
  scorched_drake: '🐉',
  kobold_chieftain: '👹',
  alpha_warlord: '🐺',
  forgemaster_kaldrun: '🧌',
  ash_wraith: '👻',
  cinder_scavenger: '🐀',
  ashforge_golem: '🗿',
  ember_stalker: '🐆',
  ruin_marauder: '🧟',
  cultist_adept: '🧙',
  living_ember: '🔥',
  scaleback_drake: '🐉',
  cultist_zealot: '🧙',
  magma_hound: '🐕',
  emberlord_cultist: '🧙',
  flamewalker: '🔥',
  charhide_behemoth: '🦏',
  ashfall_harbinger: '🦅',
  emberguard_sentinel: '🗿',
  ashen_overseer: '👹',
  molten_herald: '😈',
  pyraxis: '🐉',
  // The Tower of Infinity's 8 Guardian archetypes (gameData/tower.ts) — one
  // id per archetype, reused across every floor that cycles to it, so this
  // table (and any future /monster-art/ images) only ever needs 8 entries
  // total, not one per floor.
  tower_guardian_warden_greenhollow: '🌿',
  tower_guardian_warden_foothills: '🪨',
  tower_guardian_warden_emberfall: '🔥',
  tower_guardian_warden_cinderfall: '⚔️',
  tower_guardian_warden_moltenscar: '🌋',
  tower_guardian_warden_cinderheart: '😈',
  tower_guardian_voidtouched_warden: '👁️',
  tower_guardian_infinitybound_warden: '🗼',
};

export function getMonsterIcon(monsterId: string): string {
  return MONSTER_ICONS[monsterId] ?? '👾';
}
