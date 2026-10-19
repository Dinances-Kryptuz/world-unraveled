# Class storybook art

Drop a file in here named `<classId>.webp` or `<classId>.png` — `warrior`,
`priest`, or `paladin` (the 3 player-creatable classes, see
`gameData/classInfo.ts`'s `CLASS_SHOWCASE`) — and it's picked up
automatically by `CharacterCreationScreen.tsx`, no code changes needed.
It tries `.webp` first, then `.png`; a class without either file just shows
its emoji icon and blurb instead (same fallback convention as
`monster-art/`).

Each page of the storybook is one class, showing both of its
specializations side by side in one wide image (left half = first spec in
that class's `CLASS_SHOWCASE` entry, right half = second), each half with
its own baked-in role name/description — Warrior, then Priest, then
Paladin, arrow-navigable. Two "Select" buttons are overlaid on the image
itself (`CharacterCreationScreen.tsx`'s `storybook-select-overlay-btn`,
positioned at left:25%/75%, top:68% of the image box), colored per spec
via `gameData/classInfo.ts`'s `SPEC_THEME` to match that half's palette.
Picking either one selects that class+spec together.

**Spec:**
- Landscape, ~16:9 (current art is 1672x941), split down the middle into
  left/right halves — one spec per half, its name/description baked into
  the bottom ~30% of its half
- `.png` or `.webp`, whichever is easier to produce
- No hard pixel minimum, but higher resolution holds up better at the large
  display size this gets shown at
- If a future class's art doesn't fit this exact split-panel layout, the
  overlay buttons' fixed top:68% position (index.css) may need adjusting to
  match where that art's own role-name panel starts
