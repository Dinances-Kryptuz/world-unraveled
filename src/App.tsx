import { useState, type CSSProperties, type ReactNode } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { CharacterProvider, useCharacter } from './hooks/useCharacter';
import { LoginScreen } from './components/LoginScreen';
import { CharacterCreationScreen } from './components/CharacterCreationScreen';
import { SpecSelectionScreen } from './components/SpecSelectionScreen';
import { ZoneScreen } from './components/ZoneScreen';
import { EquipmentScreen } from './components/EquipmentScreen';
import { InventoryScreen } from './components/InventoryScreen';
import { BankScreen } from './components/BankScreen';
import { TalentScreen } from './components/TalentScreen';
import { CombatSetupScreen } from './components/CombatSetupScreen';
import { CombatScreen } from './components/CombatScreen';
import { GatheringScreen } from './components/GatheringScreen';
import { FishingScreen } from './components/FishingScreen';
import { CraftingScreen } from './components/CraftingScreen';
import { DungeonScreen } from './components/DungeonScreen';
import { WelcomeBackScreen, isLongAbsence } from './components/WelcomeBackScreen';
import { ProfessionScreen } from './components/professions/ProfessionScreen';
import { maxHp, resolveCurrentHp } from './gameData/combatFormulas';
import { getEquipmentStatBonuses } from './gameData/equipmentStats';
import { evaluateTalents, EMPTY_TALENT_TOTALS } from './utils/talentEvaluator';
import { characterXpForLevelV2 } from './gameData/xpTables';
import { DEFAULT_ZONE_ID, GATHER_NODES, FISHING_HOLES } from './gameData/zones';
import { RECIPES } from './gameData/recipes';
import { zoneThemeStyle } from './gameData/zoneThemes';
import { VendorScreen } from './components/VendorScreen';
import { QuestLog } from './components/QuestLog';
import { CompanionScreen } from './components/CompanionScreen';
import { Sidebar, type AppSection } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ALL_PROFESSION_IDS } from './gameData/professionTiers';
import type { Character } from './types/character';
import type { ProfessionId } from './gameData/types';

// Wraps the sidebar + top bar shell around whatever's in the content area —
// shared by both the normal per-section view and every "live activity"
// takeover below, so a dungeon run or an active gather/craft/fight still
// shows the sidebar and top bar around it instead of a bare full-page
// screen (and the zone-tinted theme still applies).
function AppShell({
  character,
  section,
  onSelectSection,
  selectedZoneId,
  onSelectZone,
  selectedProfessionId,
  onSelectProfession,
  children,
}: {
  character: Character;
  section: AppSection;
  onSelectSection: (s: AppSection) => void;
  selectedZoneId: string;
  onSelectZone: (zoneId: string) => void;
  selectedProfessionId: ProfessionId;
  onSelectProfession: (id: ProfessionId) => void;
  children: ReactNode;
}) {
  const equipBonuses = getEquipmentStatBonuses(character.equipment, character.enchantments);
  const talentTotals = character.spec ? evaluateTalents(character.spec, character.talentPicks).totals : EMPTY_TALENT_TOTALS;
  const characterMaxHp = maxHp(character.class, character.level, equipBonuses, talentTotals.hpMultPct);
  const currentHp = resolveCurrentHp(character.currentHp, characterMaxHp, character.hpCheckpointAt, new Date());

  const currentLevelXp = characterXpForLevelV2(character.level);
  const nextLevelXp = characterXpForLevelV2(character.level + 1);
  const xpIntoLevel = Math.max(0, character.xp - currentLevelXp);
  const xpNeededForLevel = nextLevelXp - currentLevelXp;
  const xpProgressPct = Math.max(0, Math.min(100, (xpIntoLevel / xpNeededForLevel) * 100));

  return (
    <div className="app-shell" style={zoneThemeStyle(selectedZoneId) as CSSProperties}>
      <Sidebar
        active={section}
        onSelect={onSelectSection}
        showTalents={!!character.spec}
        character={character}
        selectedProfessionId={selectedProfessionId}
        onSelectProfession={onSelectProfession}
      />
      <div className="app-main">
        <TopBar
          character={character}
          currentHp={currentHp}
          characterMaxHp={characterMaxHp}
          xpIntoLevel={xpIntoLevel}
          xpNeededForLevel={xpNeededForLevel}
          xpProgressPct={xpProgressPct}
          selectedZoneId={selectedZoneId}
          onSelectZone={onSelectZone}
        />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { character, loading: characterLoading } = useCharacter();
  const [selectedZoneId, setSelectedZoneId] = useState(DEFAULT_ZONE_ID);
  const [selectedProfessionId, setSelectedProfessionId] = useState<ProfessionId>(ALL_PROFESSION_IDS[0]);
  const [activeSection, setActiveSection] = useState<AppSection>('adventure');
  const [activeDungeonId, setActiveDungeonId] = useState<string | null>(null);
  const [dismissedWelcomeBack, setDismissedWelcomeBack] = useState(false);

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

  if (character.level >= 5 && character.spec === null) {
    return <SpecSelectionScreen />;
  }

  // Section visibility/selection — Sidebar just renders the current choice
  // and reports clicks back up.
  const section = activeSection === 'talents' && !character.spec ? 'adventure' : activeSection;

  const shellProps = {
    character,
    section,
    onSelectSection: setActiveSection,
    selectedZoneId,
    onSelectZone: setSelectedZoneId,
    selectedProfessionId,
    onSelectProfession: setSelectedProfessionId,
  };

  // A "live activity" (combat/gathering/fishing/crafting, or a dungeon run)
  // takes over the content area regardless of which sidebar section is
  // selected — there's only ever one of these happening at a time, and it
  // wouldn't make sense to let a player navigate to e.g. Equipment and lose
  // sight of a fight in progress. DungeonScreen's state lives here (not in
  // ZoneScreen, which just reports "enter this dungeon" up) for the same
  // reason: it needs to keep rendering no matter what section is active.
  if (activeDungeonId) {
    return (
      <AppShell {...shellProps}>
        <DungeonScreen dungeonId={activeDungeonId} onExit={() => setActiveDungeonId(null)} />
      </AppShell>
    );
  }

  const activity = character.currentActivity;
  const showWelcomeBack = !dismissedWelcomeBack && activity.type !== null && isLongAbsence(activity);
  if (showWelcomeBack) {
    return (
      <AppShell {...shellProps}>
        <WelcomeBackScreen character={character} onContinue={() => setDismissedWelcomeBack(true)} />
      </AppShell>
    );
  }

  if (activity.type === 'combat' && activity.targetId) {
    return (
      <AppShell {...shellProps}>
        <CombatScreen monsterId={activity.targetId} />
      </AppShell>
    );
  }

  if (activity.type === 'gathering' && activity.targetId) {
    const node = GATHER_NODES[activity.targetId];
    if (node) {
      return (
        <AppShell {...shellProps}>
          <GatheringScreen node={node} />
        </AppShell>
      );
    }
  }

  if (activity.type === 'fishing' && activity.targetId) {
    const hole = FISHING_HOLES[activity.targetId];
    if (hole) {
      return (
        <AppShell {...shellProps}>
          <FishingScreen hole={hole} />
        </AppShell>
      );
    }
  }

  if (activity.type === 'crafting' && activity.targetId) {
    const recipe = RECIPES[activity.targetId];
    if (recipe) {
      return (
        <AppShell {...shellProps}>
          <CraftingScreen recipe={recipe} />
        </AppShell>
      );
    }
  }

  return (
    <AppShell {...shellProps}>
      {section === 'adventure' && <ZoneScreen selectedZoneId={selectedZoneId} onEnterDungeon={setActiveDungeonId} />}
      {section === 'combatSetup' && <CombatSetupScreen />}
      {section === 'equipment' && <EquipmentScreen />}
      {section === 'inventory' && <InventoryScreen />}
      {section === 'bank' && <BankScreen />}
      {section === 'companions' && <CompanionScreen />}
      {section === 'shop' && <VendorScreen zoneId={selectedZoneId} />}
      {section === 'profession' && <ProfessionScreen professionId={selectedProfessionId} zoneId={selectedZoneId} />}
      {section === 'talents' && character.spec && <TalentScreen />}
      {section === 'quests' && <QuestLog />}
    </AppShell>
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
