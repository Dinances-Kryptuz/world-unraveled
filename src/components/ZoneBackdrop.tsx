import { zoneArtUrl, zoneTerrain } from '../gameData/zoneThemes';

// Full-viewport scene behind the app shell. When the zone has real concept
// art (see gameData/zoneThemes.ts's artUrl — the Green Field Hollow series),
// that photo fills the layer as a cover background; the particle drift and
// vignette still render on top of it for a touch of life and to keep
// foreground text readable. Any zone without art yet falls back to the
// original CSS-only scene (sky gradient, glow, three parallax silhouette
// layers) built from the --zone-* custom properties the app shell sets.
//
// Rendered once as a fixed, z-index:0 layer; `.sidebar`/`.app-main` sit at
// z-index:1 above it (see index.css) so it reads as scenery behind a glass
// shell rather than fighting the content for attention.
export function ZoneBackdrop({ zoneId }: { zoneId: string }) {
  const terrain = zoneTerrain(zoneId);
  const artUrl = zoneArtUrl(zoneId);

  return (
    <div
      className={`zone-backdrop zone-backdrop-${terrain}${artUrl ? ' zone-backdrop-art' : ''}`}
      style={artUrl ? { backgroundImage: `url(${artUrl})` } : undefined}
      aria-hidden="true"
    >
      {!artUrl && (
        <>
          <div className="zone-backdrop-glow" />
          <div className="zone-hill zone-hill-far" />
          <div className="zone-hill zone-hill-mid" />
          <div className="zone-hill zone-hill-near" />
        </>
      )}
      <div className="zone-particles">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={`zone-particle zone-particle-${i}`} />
        ))}
      </div>
      <div className="zone-backdrop-vignette" />
    </div>
  );
}
