import { ALL_PROFESSION_IDS, PROFESSION_LABELS, PROFESSION_CATEGORY, maxSkillForUnlockedTier } from '../gameData/professionTiers';
import { usesMasteryEngine, masteryProfessionXpForNextLevel } from '../gameData/masteryEngine';
import { gatheringXpForNextLevel } from '../gameData/gatheringEngine';
import type { Character } from '../types/character';
import type { ProfessionId } from '../gameData/types';

export type AppSection =
  | 'adventure'
  | 'shop'
  | 'equipment'
  | 'inventory'
  | 'bank'
  | 'companions'
  | 'quests'
  | 'classTrainer'
  | 'mountTrainer'
  | 'professionsTrainer'
  | 'characters'
  | 'collection'
  | 'settings'
  | 'profession';

interface SidebarItem {
  id: AppSection;
  label: string;
}

// Talents and Combat Setup used to be their own top-level entries here —
// both now live as sub-tabs inside Class Trainer (gameplay-build concerns
// grouped with the new Spells & Abilities training page, rather than
// scattered across the sidebar). 'shop' keeps its old id for minimal
// plumbing churn; only its displayed label changed to Shopkeeper.
const TOP_ITEMS: SidebarItem[] = [
  { id: 'adventure', label: 'Adventure' },
  { id: 'shop', label: 'Shopkeeper' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'bank', label: 'Bank' },
  { id: 'companions', label: 'Companions' },
  { id: 'quests', label: 'Quests' },
  { id: 'classTrainer', label: 'Class Trainer' },
  { id: 'mountTrainer', label: 'Mount Trainer' },
  { id: 'professionsTrainer', label: 'Professions Trainer' },
  { id: 'characters', label: 'Characters' },
  { id: 'collection', label: 'Collection' },
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
  // Every profession is a flat skill number (0-300 for crafting, 1-100 for
  // gathering/fishing) against the ceiling of its currently unlocked rank —
  // this bar is that tier-progress, separate from the XP-to-next-level bar
  // below.
  const cap = state ? maxSkillForUnlockedTier(professionId, state.unlockedTier) : 0;
  const progressPct = state ? Math.max(0, Math.min(100, (state.level / cap) * 100)) : 0;

  // Smithing (the lone remaining Mastery-engine crafting profession — see
  // masteryEngine.ts) and all 4 gathering/fishing professions (now on
  // gatheringEngine.ts's 1-100 XP curve) track real XP toward the next
  // level; the other 5 crafting professions level up via a discrete
  // per-action skill-up chance with no XP counter at all (see
  // applyCraftingResult's "not XP toward a curve" comment), so there's
  // nothing meaningful to show them beyond the tier-progress bar above.
  const isMastery = usesMasteryEngine(professionId);
  const isGathering = PROFESSION_CATEGORY[professionId] !== 'production';
  const xpForNextLevel = state
    ? isMastery
      ? masteryProfessionXpForNextLevel(state.level)
      : isGathering
        ? gatheringXpForNextLevel(state.level)
        : null
    : null;
  const xpProgressPct = xpForNextLevel ? Math.max(0, Math.min(100, (state!.xp / xpForNextLevel) * 100)) : 0;

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
      {xpForNextLevel !== null && (
        <>
          <div className="sidebar-profession-bar-track sidebar-profession-xp-track">
            <div className="sidebar-profession-bar-fill sidebar-profession-xp-fill" style={{ width: `${xpProgressPct}%` }} />
          </div>
          <div className="sidebar-profession-xp-label">
            {Math.floor(state!.xp)} / {xpForNextLevel} XP
          </div>
        </>
      )}
    </button>
  );
}

// A persistent left-hand nav so every screen isn't just stacked one after
// another on one infinitely-scrolling page — each section renders alone in
// the content area (see App.tsx). Talents is no longer a top-level entry
// here (it's a Class Trainer sub-tab — see ClassTrainerScreen.tsx, which
// hides that option itself before a spec is chosen), so this component no
// longer needs a spec gate of its own.
export function Sidebar({
  active,
  onSelect,
  character,
  selectedProfessionId,
  onSelectProfession,
  activityRunningInBackground,
  mobileOpen,
  onCloseMobile,
}: {
  active: AppSection;
  onSelect: (section: AppSection) => void;
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
        {TOP_ITEMS.map((item) => (
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
