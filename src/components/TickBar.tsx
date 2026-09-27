// A looping progress bar representing a repeating timed action (an attack
// interval, a craft/gather cycle). Purely visual — driven by a CSS
// animation, not tied to the actual resolver timing — so it keeps
// animating smoothly regardless of render frequency.
export function TickBar({ seconds, color, label }: { seconds: number; color: string; label: string }) {
  return (
    <div className="tick-bar">
      <small>{label}</small>
      <div className="tick-bar-track">
        <div className="tick-bar-fill" style={{ background: color, animationDuration: `${seconds}s` }} />
      </div>
    </div>
  );
}
