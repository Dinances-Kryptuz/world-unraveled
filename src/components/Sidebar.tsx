export type AppSection =
  | 'adventure'
  | 'combatSetup'
  | 'equipment'
  | 'inventory'
  | 'companions'
  | 'shop'
  | 'talents'
  | 'quests';

interface SidebarItem {
  id: AppSection;
  label: string;
}

const ITEMS: SidebarItem[] = [
  { id: 'adventure', label: 'Adventure' },
  { id: 'combatSetup', label: 'Combat Setup' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'companions', label: 'Companions' },
  { id: 'shop', label: 'Shop' },
  { id: 'talents', label: 'Talents' },
  { id: 'quests', label: 'Quests' },
];

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
      {ITEMS.filter((item) => item.id !== 'talents' || showTalents).map((item) => (
        <button
          key={item.id}
          className="sidebar-item"
          onClick={() => onSelect(item.id)}
          style={
            active === item.id
              ? { background: 'var(--zone-primary)', color: '#fff' }
              : undefined
          }
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
