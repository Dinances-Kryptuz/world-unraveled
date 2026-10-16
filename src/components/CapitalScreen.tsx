import { useState } from 'react';
import { useCharacter } from '../hooks/useCharacter';
import { CompanionScreen } from './CompanionScreen';
import { ProfessionsTrainerScreen } from './ProfessionsTrainerScreen';
import { VendorScreen } from './VendorScreen';
import { GuildScreen } from './GuildScreen';
import { ExpeditionScreen } from './ExpeditionScreen';

type DistrictId = 'guildHall' | 'tavern' | 'artisan' | 'market' | 'expedition' | 'restoration';

interface District {
  id: DistrictId;
  name: string;
  description: string;
}

const DISTRICTS: District[] = [
  { id: 'guildHall', name: 'Guild Hall', description: 'Form a guild, take on weekly contracts, and launch expeditions with other players.' },
  { id: 'tavern', name: "Wayfarer's Tavern", description: 'Meet and manage the companions who travel with you.' },
  { id: 'artisan', name: 'Artisan Quarter', description: 'Train and advance every profession you know.' },
  { id: 'market', name: 'Grand Market', description: 'Buy and sell goods with the local merchants.' },
  { id: 'expedition', name: 'Expedition Command', description: 'Organize guild expeditions into dangerous territory.' },
  { id: 'restoration', name: 'Restoration Grounds', description: "Help rebuild Ashenfall and restore the capital's former glory." },
];

function ComingSoonPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="capital-placeholder">
      <h3>{title}</h3>
      <p>{description}</p>
      <p className="capital-placeholder-note">Coming soon.</p>
    </div>
  );
}

function DistrictContent({ districtId, zoneId }: { districtId: DistrictId; zoneId: string }) {
  switch (districtId) {
    case 'tavern':
      return <CompanionScreen />;
    case 'artisan':
      return <ProfessionsTrainerScreen />;
    case 'market':
      return <VendorScreen zoneId={zoneId} />;
    case 'guildHall':
      return <GuildScreen />;
    case 'expedition':
      return <ExpeditionScreen />;
    case 'restoration':
      return (
        <ComingSoonPanel
          title="Restoration Grounds"
          description="Contribute materials to rebuild and restore the capital's districts."
        />
      );
  }
}

// Zone-0 hub: a Sidebar section like Journal/Companions, not a travel zone —
// opening it never changes currentZoneId, so a background gather/combat/craft
// session started elsewhere keeps running untouched (see App.tsx's
// activityNode, which stays mounted regardless of which section is active).
export function CapitalScreen() {
  const { character } = useCharacter();
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictId | null>(null);

  if (!character) return null;

  if (selectedDistrict) {
    const district = DISTRICTS.find((d) => d.id === selectedDistrict)!;
    return (
      <div className="capital-screen">
        <button className="capital-back-button" onClick={() => setSelectedDistrict(null)}>
          ← Back to Ashenfall
        </button>
        <h2>{district.name}</h2>
        <DistrictContent districtId={selectedDistrict} zoneId={character.currentZoneId} />
      </div>
    );
  }

  return (
    <div className="capital-screen">
      <h2>Ashenfall — The Last Capital</h2>
      <div className="capital-district-grid">
        {DISTRICTS.map((district) => (
          <button
            key={district.id}
            className="capital-district-tile"
            onClick={() => setSelectedDistrict(district.id)}
          >
            <span className="capital-district-name">{district.name}</span>
            <span className="capital-district-description">{district.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
