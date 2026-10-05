# Item art

Drop a file in here named `<itemId>.webp` or `<itemId>.png` (the id from
`src/gameData/items.ts`, e.g. `copper_helm.png` for the `copper_helm` item)
and it's picked up automatically — no code or data changes needed.
`ItemSlot.tsx` tries `.webp` first, then `.png`; any item without either
file just keeps showing its emoji fallback (`gameData/itemIcons.ts`).

**Spec:**
- 128x128px, square
- Transparent background
- `.png` is the easy path — just "Save As" PNG from whatever you're using.
  `.webp` also works and makes smaller files if your tool can export it,
  but it's not required.

Rendered at 56x56 CSS px in-game (44x44 for the art itself, inset slightly
within the tile), so 128px gives clean headroom on retina displays without
being an oversized source file.
