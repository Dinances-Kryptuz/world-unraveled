# Item art

Drop a file in here named `<itemId>.webp` (the id from `src/gameData/items.ts`,
e.g. `copper_helm.webp` for the `copper_helm` item) and it's picked up
automatically — no code or data changes needed. `ItemSlot.tsx` always
requests `/item-art/<id>.webp`; any item without a file here just keeps
showing its emoji fallback (`gameData/itemIcons.ts`).

**Spec:**
- 128x128px, square
- Transparent background
- `.webp` format (PNG also works if that's easier to produce — just save it
  with a `.webp` extension, or ask Claude to re-encode a batch)

Rendered at 56x56 CSS px in-game (44x44 for the art itself, inset slightly
within the tile), so 128px gives clean headroom on retina displays without
being an oversized source file.
