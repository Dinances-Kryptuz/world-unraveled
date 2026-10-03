import { zoneTerrain } from '../gameData/zoneThemes';

// Full-viewport illustrated scene behind the app shell: a sky gradient, a
// sun/fire glow, three parallax silhouette layers, and a handful of
// drifting particles (pollen in Greenhollow, embers in the volcanic zones),
// all pure CSS and driven entirely by the --zone-* custom properties the
// app shell already sets from gameData/zoneThemes.ts. No image assets are
// involved — see the comment atop zoneThemes.ts for why.
//
// Rendered once as a fixed, z-index:0 layer; `.sidebar`/`.app-main` sit at
// z-index:1 above it (see index.css) so it reads as scenery behind a glass
// shell rather than fighting the content for attention.
export function ZoneBackdrop({ zoneId }: { zoneId: string }) {
  const terrain = zoneTerrain(zoneId);
  return (
    <div className={`zone-backdrop zone-backdrop-${terrain}`} aria-hidden="true">
      <div className="zone-backdrop-glow" />
      <div className="zone-hill zone-hill-far" />
      <div className="zone-hill zone-hill-mid" />
      <div className="zone-hill zone-hill-near" />
      <div className="zone-particles">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={`zone-particle zone-particle-${i}`} />
        ))}
      </div>
      <div className="zone-backdrop-vignette" />
    </div>
  );
}
