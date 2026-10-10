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
}: {
  seconds: number;
  color: string;
  label: string;
  onIteration?: () => void;
}) {
  return (
    <div className="tick-bar">
      <small>{label}</small>
      <div className="tick-bar-track">
        <div
          className="tick-bar-fill"
          style={{ background: color, animationDuration: `${seconds}s` }}
          onAnimationIteration={onIteration}
        />
      </div>
    </div>
  );
}
