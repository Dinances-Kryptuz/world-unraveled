# Monster art

Drop a file in here named `<monsterId>.webp` or `<monsterId>.png` (the id
from `src/gameData/monsters.ts`, e.g. `highland_bandit.png` for the
`highland_bandit` monster) and it's picked up automatically — no code or
data changes needed. `MonsterPortrait.tsx` tries `.webp` first, then
`.png`; any monster without either file just keeps showing its emoji
fallback (`gameData/monsterIcons.ts`).

**Spec:**
- Square, at least 256x256px
- **Centered subject** — unlike item icons, this gets cropped to a circle
  and scaled to fill the frame edge-to-edge (no transparent padding), so
  whatever's near the edges of a non-square or off-center image may get cut
  off. A plain background behind the creature works fine; it doesn't need
  transparency.
- `.png` or `.webp`, whichever is easier to produce

Rendered at 96x96 CSS px (128x128 for bosses) in a circular frame.
