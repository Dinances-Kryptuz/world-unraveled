import { useState } from 'react';
import { useCharacter } from '../hooks/useCharacter';
import { CompanionScreen } from './CompanionScreen';
import { ProfessionsTrainerScreen } from './ProfessionsTrainerScreen';
import { ClassTrainerScreen } from './ClassTrainerScreen';
import { VendorScreen } from './VendorScreen';
import { GuildScreen } from './GuildScreen';
import { ExpeditionScreen } from './ExpeditionScreen';
import { RestorationScreen } from './RestorationScreen';
import { BankScreen } from './BankScreen';
import { MountTrainerScreen } from './MountTrainerScreen';
import { grandMarketStock } from '../gameData/vendors';

type DistrictId =
  | 'guildHall'
  | 'tavern'
  | 'artisan'
  | 'trainingHall'
  | 'market'
  | 'expedition'
  | 'restoration'
  | 'vault'
  | 'stables';

interface District {
  id: DistrictId;
  name: string;
  description: string;
}

const DISTRICTS: District[] = [
  { id: 'guildHall', name: 'Guild Hall', description: 'Form a guild, take on weekly contracts, and launch expeditions with other players.' },
  { id: 'tavern', name: "Wayfarer's Tavern", description: 'Meet and manage the companions who travel with you.' },
  { id: 'artisan', name: 'Artisan Quarter', description: 'Train and advance every profession you know.' },
  { id: 'trainingHall', name: 'Training Hall', description: 'Train spells, talents, and combat setup with your class trainer.' },
  { id: 'market', name: 'Grand Market', description: 'Buy and sell goods with the local merchants.' },
  { id: 'expedition', name: 'Expedition Command', description: 'Organize guild expeditions into dangerous territory.' },
  { id: 'restoration', name: 'Restoration Grounds', description: "Help rebuild Ashenfall and restore the capital's former glory." },
  { id: 'vault', name: 'The Vault', description: 'Store gear and materials safely away from your bag slots.' },
  { id: 'stables', name: 'Stables', description: 'Train faster mounts to cut down zone-travel time.' },
];

function DistrictContent({ districtId, zoneId, characterLevel }: { districtId: DistrictId; zoneId: string; characterLevel: number }) {
  switch (districtId) {
    case 'tavern':
      return <CompanionScreen />;
    case 'artisan':
      return <ProfessionsTrainerScreen />;
    case 'trainingHall':
      return <ClassTrainerScreen />;
    case 'market':
      // The Grand Market — stock aggregated across every zone the character
      // has unlocked (gameData/vendors.ts's grandMarketStock), not just
      // zoneId's own (which is always 'ashenfall' here and has no
      // VENDOR_STOCK entry of its own anyway).
      return <VendorScreen zoneId={zoneId} stockOverride={grandMarketStock(characterLevel)} title="Grand Market" />;
    case 'guildHall':
      return <GuildScreen />;
    case 'expedition':
      return <ExpeditionScreen />;
    case 'restoration':
      return <RestorationScreen />;
    case 'vault':
      return <BankScreen />;
    case 'stables':
      return <MountTrainerScreen />;
  }
}

// Ashenfall is a real travel zone (gameData/zones.ts) like any other — this
// screen is its city content, so it only renders once the character has
// actually traveled there (currentZoneId === 'ashenfall'). Opening the
// Sidebar's Ashenfall section from elsewhere just prompts a normal travel
// (reusing App.tsx's onRequestTravel, the same path TopBar's zone tabs use)
// rather than teleporting in for free. A background gather/combat/craft
// session started elsewhere keeps running untouched either way (see
// App.tsx's activityNode, which stays mounted regardless of which section
// is active).
export function CapitalScreen({ onRequestTravel }: { onRequestTravel: (zoneId: string) => void }) {
  const { character } = useCharacter();
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictId | null>(null);
  // Same misclick guard as TopBar's zone tabs (see its own comment) — this
  // is the other call site that reaches onRequestTravel.
  const [confirmingTravel, setConfirmingTravel] = useState(false);

  if (!character) return null;

  if (character.currentZoneId !== 'ashenfall') {
    return (
      <div className="capital-screen">
        <h2>Ashenfall — The Last Capital</h2>
        <p>You'll need to travel to Ashenfall to visit the capital.</p>
        {confirmingTravel ? (
          <>
            <button
              onClick={() => {
                setConfirmingTravel(false);
                onRequestTravel('ashenfall');
              }}
            >
              Confirm travel?
            </button>
            <button onClick={() => setConfirmingTravel(false)}>Cancel</button>
          </>
        ) : (
          <button onClick={() => setConfirmingTravel(true)}>Travel to Ashenfall</button>
        )}
      </div>
    );
  }

  if (selectedDistrict) {
    const district = DISTRICTS.find((d) => d.id === selectedDistrict)!;
    return (
      <div className="capital-screen">
        <button className="capital-back-button" onClick={() => setSelectedDistrict(null)}>
          ← Back to Ashenfall
        </button>
        <h2>{district.name}</h2>
        <DistrictContent districtId={selectedDistrict} zoneId={character.currentZoneId} characterLevel={character.level} />
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
