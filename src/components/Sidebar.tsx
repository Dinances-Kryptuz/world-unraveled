import { ALL_PROFESSION_IDS, PROFESSION_LABELS } from '../gameData/professionTiers';
import { professionXpForLevel } from '../gameData/xpTables';
import type { Character } from '../types/character';
import type { ProfessionId } from '../gameData/types';

export type AppSection =
  | 'adventure'
  | 'combatSetup'
  | 'equipment'
  | 'inventory'
  | 'bank'
  | 'companions'
  | 'shop'
  | 'talents'
  | 'quests'
  | 'profession';

interface SidebarItem {
  id: AppSection;
  label: string;
}

const TOP_ITEMS: SidebarItem[] = [
  { id: 'adventure', label: 'Adventure' },
  { id: 'combatSetup', label: 'Combat Setup' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'bank', label: 'Bank' },
  { id: 'companions', label: 'Companions' },
  { id: 'shop', label: 'Shop' },
  { id: 'talents', label: 'Talents' },
  { id: 'quests', label: 'Quests' },
];

function NavButton({ item, active, onSelect }: { item: SidebarItem; active: AppSection; onSelect: (s: AppSection) => void }) {
  return (
    <button
      className="sidebar-item"
      onClick={() => onSelect(item.id)}
      style={active === item.id ? { background: 'var(--zone-primary)', color: '#fff' } : undefined}
    >
      {item.label}
    </button>
  );
}

// One row per profession (known or not), showing its level next to the name
// and an XP progress bar underneath — replaces the old Gathering/Fishing/
// Crafting category sub-nav, which clumped every known crafting profession's
// full recipe list onto one page. Clicking a row opens that ONE profession's
// own page (ProfessionScreen). An unlearned profession still shows (no
// level/bar) so it stays discoverable before training it.
function ProfessionNavButton({
  professionId,
  active,
  isSelected,
  character,
  onSelect,
}: {
  professionId: ProfessionId;
  active: boolean;
  isSelected: boolean;
  character: Character;
  onSelect: (id: ProfessionId) => void;
}) {
  const state = character.professions[professionId];
  const highlighted = active && isSelected;
  let progressPct = 0;
  if (state) {
    const currentLevelXp = professionXpForLevel(state.level);
    const nextLevelXp = professionXpForLevel(state.level + 1);
    const xpIntoLevel = Math.max(0, state.xp - currentLevelXp);
    const xpNeededForLevel = nextLevelXp - currentLevelXp;
    progressPct = Math.max(0, Math.min(100, (xpIntoLevel / xpNeededForLevel) * 100));
  }

  return (
    <button
      className="sidebar-item sidebar-profession-item"
      onClick={() => onSelect(professionId)}
      style={highlighted ? { background: 'var(--zone-primary)', color: '#fff' } : undefined}
    >
      <div className="sidebar-profession-row">
        <span>{PROFESSION_LABELS[professionId]}</span>
        {state ? <span className="sidebar-profession-level">Lv {state.level}</span> : <span className="sidebar-profession-level">—</span>}
      </div>
      {state && (
        <div className="sidebar-profession-bar-track">
          <div className="sidebar-profession-bar-fill" style={{ width: `${progressPct}%` }} />
        </div>
      )}
    </button>
  );
}

// A persistent left-hand nav so every screen isn't just stacked one after
// another on one infinitely-scrolling page — each section renders alone in
// the content area (see App.tsx). showTalents hides the Talents entry
// before a spec is chosen, same gate the old stacked layout used.
export function Sidebar({
  active,
  onSelect,
  showTalents,
  character,
  selectedProfessionId,
  onSelectProfession,
}: {
  active: AppSection;
  onSelect: (section: AppSection) => void;
  showTalents: boolean;
  character: Character;
  selectedProfessionId: ProfessionId;
  onSelectProfession: (id: ProfessionId) => void;
}) {
  return (
    <nav className="sidebar">
      {TOP_ITEMS.filter((item) => item.id !== 'talents' || showTalents).map((item) => (
        <NavButton key={item.id} item={item} active={active} onSelect={onSelect} />
      ))}
      <div className="sidebar-heading">Professions</div>
      {ALL_PROFESSION_IDS.map((id) => (
        <ProfessionNavButton
          key={id}
          professionId={id}
          active={active === 'profession'}
          isSelected={selectedProfessionId === id}
          character={character}
          onSelect={(pid) => {
            onSelectProfession(pid);
            onSelect('profession');
          }}
        />
      ))}
    </nav>
  );
}
