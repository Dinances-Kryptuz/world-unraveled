import { CLASS_NAME_COLORS, type ClassId } from '../gameData/classStats';

// A character or companion's name, tinted by class (warrior brown, priest
// white, paladin pink, mage cyan — see classStats.ts's CLASS_NAME_COLORS).
// Checked contrast of each color against this game's light parchment
// backgrounds (#e2d9c8/#f4efe4/#efe9dd): white/pink/cyan all land at a
// contrast ratio of ~1.1-1.9, which is well below WCAG AA's 4.5 minimum —
// effectively unreadable, not just "a bit soft." A thin dark outline
// (stacked directional text-shadows, the standard "colored text over a
// variable background" trick, same idea as a game's unit nameplates) fixes
// this for every color at once rather than needing a different hex per
// class, so the user's exact named colors (brown/white/pink/cyan) stay
// unchanged and still read clearly.
const OUTLINE = [-1, 0, 1].flatMap((x) => [-1, 0, 1].filter((y) => x || y).map((y) => `${x}px ${y}px 0 rgba(0,0,0,0.75)`)).join(', ');

export function ClassColoredName({ name, cls }: { name: string; cls: ClassId }) {
  return (
    <span style={{ color: CLASS_NAME_COLORS[cls], textShadow: OUTLINE }}>
      {name}
    </span>
  );
}
