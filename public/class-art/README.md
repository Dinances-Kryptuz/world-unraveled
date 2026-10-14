# Class storybook art

Drop a file in here named `<classId>.webp` or `<classId>.png` — `warrior`,
`priest`, or `paladin` (the 3 player-creatable classes, see
`gameData/classInfo.ts`'s `CLASS_SHOWCASE`) — and it's picked up
automatically by `CharacterCreationScreen.tsx`, no code changes needed.
It tries `.webp` first, then `.png`; a class without either file just shows
its emoji icon and blurb instead (same fallback convention as
`monster-art/`).

Each page of the storybook is one class, showing both of its
specializations (so a single image per class should depict the class and
its two specs together, not one spec alone) — Warrior, then Priest, then
Paladin, arrow-navigable. Picking either spec button on a page selects
that class+spec together.

**Spec:**
- Portrait orientation works best — rendered large, centered, above the two
  spec buttons
- `.png` or `.webp`, whichever is easier to produce
- No hard pixel minimum, but higher resolution holds up better at the large
  display size this gets shown at
