import { useState, type CSSProperties } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { CharacterProvider, useCharacter } from './hooks/useCharacter';
import { LoginScreen } from './components/LoginScreen';
import { CharacterCreationScreen } from './components/CharacterCreationScreen';
import { ZoneScreen } from './components/ZoneScreen';
import { EquipmentScreen } from './components/EquipmentScreen';
import { InventoryScreen } from './components/InventoryScreen';
import { TalentScreen } from './components/TalentScreen';
import { CombatSetupScreen } from './components/CombatSetupScreen';
import { maxHp, resolveCurrentHp } from './gameData/combatFormulas';
import { getEquipmentStatBonuses } from './gameData/equipmentStats';
import { evaluateTalents, EMPTY_TALENT_TOTALS } from './utils/talentEvaluator';
import { characterXpForLevelV2 } from './gameData/xpTables';
import { DEFAULT_ZONE_ID } from './gameData/zones';
import { zoneThemeStyle } from './gameData/zoneThemes';
import { VendorScreen } from './components/VendorScreen';
import { QuestLog } from './components/QuestLog';
import { CompanionScreen } from './components/CompanionScreen';
import { Sidebar, type AppSection } from './components/Sidebar';
import { TopBar } from './components/TopBar';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { character, loading: characterLoading } = useCharacter();
  const [selectedZoneId, setSelectedZoneId] = useState(DEFAULT_ZONE_ID);
  const [activeSection, setActiveSection] = useState<AppSection>('adventure');

  if (authLoading) {
    return <div className="loading-screen">Loading…</div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (characterLoading) {
    return <div className="loading-screen">Loading your character…</div>;
  }

  if (!character) {
    return <CharacterCreationScreen />;
  }

  const equipBonuses = getEquipmentStatBonuses(character.equipment, character.enchantments);
  const talentTotals = character.spec ? evaluateTalents(character.spec, character.talentPicks).totals : EMPTY_TALENT_TOTALS;
  const characterMaxHp = maxHp(character.class, character.level, equipBonuses, talentTotals.hpMultPct);
  const currentHp = resolveCurrentHp(character.currentHp, characterMaxHp, character.hpCheckpointAt, new Date());

  const currentLevelXp = characterXpForLevelV2(character.level);
  const nextLevelXp = characterXpForLevelV2(character.level + 1);
  const xpIntoLevel = Math.max(0, character.xp - currentLevelXp);
  const xpNeededForLevel = nextLevelXp - currentLevelXp;
  const xpProgressPct = Math.max(0, Math.min(100, (xpIntoLevel / xpNeededForLevel) * 100));

  // Section visibility/selection lives here rather than in Sidebar, same as
  // before (ZoneScreen already owned selectedZoneId) — Sidebar just renders
  // the current choice and reports clicks back up.
  const section = activeSection === 'talents' && !character.spec ? 'adventure' : activeSection;

  return (
    <div className="app-shell" style={zoneThemeStyle(selectedZoneId) as CSSProperties}>
      <Sidebar active={section} onSelect={setActiveSection} showTalents={!!character.spec} />
      <div className="app-main">
        <TopBar
          character={character}
          currentHp={currentHp}
          characterMaxHp={characterMaxHp}
          xpIntoLevel={xpIntoLevel}
          xpNeededForLevel={xpNeededForLevel}
          xpProgressPct={xpProgressPct}
        />
        <main className="app-content">
          {section === 'adventure' && <ZoneScreen selectedZoneId={selectedZoneId} onSelectZone={setSelectedZoneId} />}
          {section === 'combatSetup' && <CombatSetupScreen />}
          {section === 'equipment' && <EquipmentScreen />}
          {section === 'inventory' && <InventoryScreen />}
          {section === 'companions' && <CompanionScreen zoneId={selectedZoneId} />}
          {section === 'shop' && <VendorScreen zoneId={selectedZoneId} />}
          {section === 'talents' && character.spec && <TalentScreen />}
          {section === 'quests' && <QuestLog />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CharacterProvider>
        <AppContent />
      </CharacterProvider>
    </AuthProvider>
  );
}
