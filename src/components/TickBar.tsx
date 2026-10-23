// A looping progress bar representing a repeating timed action (an attack
// interval, a craft/gather cycle). Driven by a CSS animation on the
// compositor thread, not by JS polling, so it keeps animating smoothly
// regardless of main-thread render frequency.
//
// `onIteration`, when passed, fires once per completed loop via the
// browser's native `animationiteration` event — the same compositor clock
// that drives the bar's own visual completion, not an independent JS
// `setInterval`. A caller that wants a displayed count to visually line up
// with the bar reaching 100% (e.g. "This session: N crafted" in
// CraftingScreen/GatheringScreen/FishingScreen/DisenchantingScreen) should
// recompute that count from THIS callback, not from a separate 1s poll —
// two independently-paced clocks drift against each other as soon as either
// one's callback is delayed by ordinary main-thread work, producing a lag
// that grows then suddenly resyncs, which is exactly the artifact this
// avoids by construction (there is only one clock).
export function TickBar({
  seconds,
  color,
  label,
  onIteration,
  resetKey,
}: {
  seconds: number;
  color: string;
  label: string;
  onIteration?: () => void;
  // Identifies WHAT is looping (a recipe id, gather node id, fishing hole
  // id, disenchant item id, …) — included in the key alongside `seconds`
  // so switching to a different target forces a reset even when its
  // duration happens to be numerically identical to the one just replaced
  // (e.g. every same-tier Blacksmithing recipe shares one craftSeconds
  // value — clicking Craft on a sibling recipe mid-loop used to leave the
  // bar animating from wherever the old recipe's loop already was, since
  // `seconds` alone hadn't changed). Omit for a bar with no real "target"
  // identity of its own (e.g. combat's per-character attack rhythm).
  resetKey?: string;
}) {
  return (
    <div className="tick-bar">
      <small>{label}</small>
      <div className="tick-bar-track">
        <div
          // Keyed on `seconds` (plus `resetKey`, see its own doc comment)
          // so a real duration change (a crafting/gathering screen
          // recomputes it whenever Mastery/tool/shirt speed changes,
          // typically once per ~20s autosave) forces React to mount a BRAND
          // NEW element instead of mutating animation-duration on the one
          // that's already mid-loop. Browsers don't cleanly restart a live,
          // infinitely-looping CSS animation when its duration changes —
          // they reinterpret the time already elapsed against the new
          // duration, which can fire extra animationiteration events (or
          // skip part of a loop) and desync the bar's visual pace from the
          // real elapsed-time math the onIteration callback uses. A fresh
          // element always starts its clock at 0, so the bar's pace can
          // never drift ahead of (or behind) what's actually being produced.
          key={`${resetKey ?? ''}:${seconds.toFixed(3)}`}
          className="tick-bar-fill"
          style={{ background: color, animationDuration: `${seconds}s` }}
          onAnimationIteration={onIteration}
        />
      </div>
    </div>
  );
}
