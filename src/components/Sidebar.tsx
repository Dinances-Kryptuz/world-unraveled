import { ALL_PROFESSION_IDS, PROFESSION_LABELS } from '../gameData/professionTiers';
import { professionXpForLevel } from '../gameData/xpTables';
import type { Character } from '../types/character';
import type { ProfessionId } from '../gameData/types';

export type AppSection =
  | 'adventure'
  | 'equipment'
  | 'inventory'
  | 'bank'
  | 'companions'
  | 'characters'
  | 'collection'
  | 'shop'
  | 'talents'
  | 'quests'
  | 'settings'
  | 'profession';

interface SidebarItem {
  id: AppSection;
  label: string;
}

// Combat Setup used to be its own top-level entry here — it now lives as a
// tab inside Settings (gameplay-loadout preferences, not a thing you flip
// between mid-adventure the way the other sections are).
const TOP_ITEMS: SidebarItem[] = [
  { id: 'adventure', label: 'Adventure' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'bank', label: 'Bank' },
  { id: 'companions', label: 'Companions' },
  { id: 'characters', label: 'Characters' },
  { id: 'collection', label: 'Collection' },
  { id: 'shop', label: 'Shop' },
  { id: 'talents', label: 'Talents' },
  { id: 'quests', label: 'Quests' },
  { id: 'settings', label: 'Settings' },
];

function NavButton({
  item,
  active,
  onSelect,
  showActivityDot,
}: {
  item: SidebarItem;
  active: AppSection;
  onSelect: (s: AppSection) => void;
  showActivityDot: boolean;
}) {
  return (
    <button
      className="sidebar-item"
      onClick={() => onSelect(item.id)}
      style={active === item.id ? { background: 'var(--zone-primary)', color: '#fff' } : undefined}
    >
      {item.label}
      {showActivityDot && (
        <span className="sidebar-activity-dot" title="An activity is still running here" />
      )}
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
  activityRunningInBackground,
  mobileOpen,
  onCloseMobile,
}: {
  active: AppSection;
  onSelect: (section: AppSection) => void;
  showTalents: boolean;
  character: Character;
  selectedProfessionId: ProfessionId;
  onSelectProfession: (id: ProfessionId) => void;
  // True when a combat/gathering/fishing/crafting/dungeon session is live
  // but the player has navigated away from Adventure to look at something
  // else — shows a small dot on the Adventure tab so it's obvious there's
  // something still running back there (see App.tsx's activityNode).
  activityRunningInBackground: boolean;
  // Below the mobile breakpoint the sidebar is an off-canvas drawer instead
  // of an always-visible column (see index.css's @media block) — these two
  // only matter there; on desktop the sidebar is always visible and this
  // class/callback has no visible effect.
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  // Any nav pick closes the drawer on mobile — on desktop onCloseMobile just
  // sets state that nothing reads, since the sidebar isn't gated there.
  function selectAndClose(section: AppSection) {
    onSelect(section);
    onCloseMobile();
  }

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={onCloseMobile} />}
      <nav className={mobileOpen ? 'sidebar sidebar-open' : 'sidebar'}>
        {TOP_ITEMS.filter((item) => item.id !== 'talents' || showTalents).map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={active}
            onSelect={selectAndClose}
            showActivityDot={item.id === 'adventure' && active !== 'adventure' && activityRunningInBackground}
          />
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
              selectAndClose('profession');
            }}
          />
        ))}
      </nav>
    </>
  );
}
