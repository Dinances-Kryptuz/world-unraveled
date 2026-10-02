export type AppSection =
  | 'adventure'
  | 'combatSetup'
  | 'equipment'
  | 'inventory'
  | 'companions'
  | 'shop'
  | 'talents'
  | 'quests'
  | 'professionsGathering'
  | 'professionsFishing'
  | 'professionsCrafting';

interface SidebarItem {
  id: AppSection;
  label: string;
}

// Rendered top to bottom. Professions is a non-clickable heading followed
// by its three categories (gameData/professionTiers.ts's ProfessionCategory
// — 'production' displays as "Crafting") as indented sub-items, instead of
// gathering/fishing/crafting all being stacked inside the Adventure page.
const TOP_ITEMS: SidebarItem[] = [
  { id: 'adventure', label: 'Adventure' },
  { id: 'combatSetup', label: 'Combat Setup' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'companions', label: 'Companions' },
  { id: 'shop', label: 'Shop' },
];

const PROFESSION_ITEMS: SidebarItem[] = [
  { id: 'professionsGathering', label: 'Gathering' },
  { id: 'professionsFishing', label: 'Fishing' },
  { id: 'professionsCrafting', label: 'Crafting' },
];

const BOTTOM_ITEMS: SidebarItem[] = [
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

// A persistent left-hand nav so every screen isn't just stacked one after
// another on one infinitely-scrolling page — each section renders alone in
// the content area (see App.tsx). showTalents hides the Talents entry
// before a spec is chosen, same gate the old stacked layout used.
export function Sidebar({
  active,
  onSelect,
  showTalents,
}: {
  active: AppSection;
  onSelect: (section: AppSection) => void;
  showTalents: boolean;
}) {
  return (
    <nav className="sidebar">
      {TOP_ITEMS.map((item) => (
        <NavButton key={item.id} item={item} active={active} onSelect={onSelect} />
      ))}
      <div className="sidebar-heading">Professions</div>
      {PROFESSION_ITEMS.map((item) => (
        <NavButton key={item.id} item={item} active={active} onSelect={onSelect} />
      ))}
      {BOTTOM_ITEMS.filter((item) => item.id !== 'talents' || showTalents).map((item) => (
        <NavButton key={item.id} item={item} active={active} onSelect={onSelect} />
      ))}
    </nav>
  );
}
