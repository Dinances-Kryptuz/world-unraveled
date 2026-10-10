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
import { ClassTrainerScreen } from './components/ClassTrainerScreen';
import { MountTrainerScreen } from './components/MountTrainerScreen';
import { ProfessionsTrainerScreen } from './components/ProfessionsTrainerScreen';
import { CombatScreen } from './components/CombatScreen';
import { GatheringScreen } from './components/GatheringScreen';
import { FishingScreen } from './components/FishingScreen';
import { CraftingScreen } from './components/CraftingScreen';
import { DisenchantingScreen } from './components/DisenchantingScreen';
import { DungeonScreen } from './components/DungeonScreen';
import { WelcomeBackScreen, isLongAbsence } from './components/WelcomeBackScreen';
import { ProfessionScreen } from './components/professions/ProfessionScreen';
import { maxHp, resolveCurrentHp } from './gameData/combatFormulas';
import { getEquipmentStatBonuses } from './gameData/equipmentStats';
import { evaluateTalents, EMPTY_TALENT_TOTALS } from './utils/talentEvaluator';
import { characterXpForLevelV2 } from './gameData/xpTables';
import { GATHER_NODES, FISHING_HOLES } from './gameData/zones';
import { RECIPES } from './gameData/recipes';
import { zoneThemeStyle } from './gameData/zoneThemes';
import { VendorScreen } from './components/VendorScreen';
import { QuestLog } from './components/QuestLog';
import { CompanionScreen } from './components/CompanionScreen';
import { CharacterSelectScreen } from './components/CharacterSelectScreen';
import { CollectionScreen } from './components/CollectionScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { TravelScreen } from './components/TravelScreen';
import { startTravel } from './firebase/travel';
import { Sidebar, type AppSection } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ZoneBackdrop } from './components/ZoneBackdrop';
import { BugReportButton } from './components/BugReportButton';
import { NotificationToasts } from './components/NotificationToasts';
import { ErrorBoundary } from './components/ErrorBoundary';
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
  onRequestTravel,
  selectedProfessionId,
  onSelectProfession,
  hasActiveDungeon,
  children,
}: {
  character: Character;
  section: AppSection;
  onSelectSection: (s: AppSection) => void;
  onRequestTravel: (zoneId: string) => void;
  selectedProfessionId: ProfessionId;
  onSelectProfession: (id: ProfessionId) => void;
  hasActiveDungeon: boolean;
  children: ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const equipBonuses = getEquipmentStatBonuses(character.equipment, character.enchantments, character.enchantmentCharges);
  const talentTotals = character.spec ? evaluateTalents(character.spec, character.talentPicks).totals : EMPTY_TALENT_TOTALS;
  const characterMaxHp = maxHp(character.class, character.level, equipBonuses, talentTotals.hpMultPct);
  const currentHp = resolveCurrentHp(character.currentHp, characterMaxHp, character.hpCheckpointAt, new Date());

  const currentLevelXp = characterXpForLevelV2(character.level);
  const nextLevelXp = characterXpForLevelV2(character.level + 1);
  const xpIntoLevel = Math.max(0, character.xp - currentLevelXp);
  const xpNeededForLevel = nextLevelXp - currentLevelXp;
  const xpProgressPct = Math.max(0, Math.min(100, (xpIntoLevel / xpNeededForLevel) * 100));

  return (
    <div className="app-shell" style={zoneThemeStyle(character.currentZoneId) as CSSProperties}>
      <ZoneBackdrop zoneId={character.currentZoneId} />
      <Sidebar
        active={section}
        onSelect={onSelectSection}
        character={character}
        selectedProfessionId={selectedProfessionId}
        onSelectProfession={onSelectProfession}
        activityRunningInBackground={character.currentActivity.type !== null || hasActiveDungeon}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />
      <div className="app-main">
        {/* Only visible below index.css's mobile breakpoint — the sidebar
            is always visible above it, so this has nothing to toggle. */}
        <button
          type="button"
          className="mobile-nav-toggle"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open menu"
        >
          ☰ Menu
        </button>
        <TopBar
          character={character}
          currentHp={currentHp}
          characterMaxHp={characterMaxHp}
          xpIntoLevel={xpIntoLevel}
          xpNeededForLevel={xpNeededForLevel}
          xpProgressPct={xpProgressPct}
          onSelectZone={onRequestTravel}
        />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { character, loading: characterLoading, refetch } = useCharacter();
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

  // Sidebar just renders the current choice and reports clicks back up —
  // Talents' own spec gate now lives inside ClassTrainerScreen, so there's
  // no section-level redirect needed here anymore.
  const section = activeSection;

  // Captured as plain, already-non-null bindings right at this narrowed
  // point — referencing user/character directly inside the closure below
  // would lose that narrowing (TS can't prove a later-invoked closure still
  // sees them as non-null), the same reason other screens in this codebase
  // use a `characterOrNull!` style assignment once, up front.
  const uid = user.uid;
  const confirmedCharacter = character;

  function handleRequestTravel(zoneId: string) {
    // Mid-dungeon-run is the one state this guard alone can't see (a
    // dungeon run is local React state, not persisted to currentActivity) —
    // startTravel's own currentActivity check covers everything else.
    if (activeDungeonId) return;
    void startTravel(uid, confirmedCharacter, zoneId).then((result) => {
      if (result.success) void refetch();
    });
  }

  const shellProps = {
    character,
    section,
    onSelectSection: setActiveSection,
    onRequestTravel: handleRequestTravel,
    selectedProfessionId,
    onSelectProfession: setSelectedProfessionId,
    // Dungeon state is local React state (activeDungeonId), not on
    // `character`, so it's passed through separately — combined with
    // character.currentActivity inside AppShell to decide whether the
    // sidebar's Adventure tab needs its "still running" dot.
    hasActiveDungeon: !!activeDungeonId,
  };

  // A flight in progress takes over the content area before anything else
  // does — same "live activity owns the screen" rule as combat/gathering/a
  // dungeon run below, just checked first since you can't be mid-flight and
  // mid-anything-else at once (startTravel refuses to start one otherwise).
  if (character.travel) {
    return (
      <AppShell {...shellProps}>
        <TravelScreen travel={character.travel} />
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

  // A "live activity" (combat/gathering/fishing/crafting, or a dungeon run)
  // stays mounted and ticking even when the player switches to a different
  // sidebar section — its pane is just hidden via CSS unless section is
  // 'adventure' (or 'profession', when there's an activity to show — see
  // showActivityPane below), rather than unmounted, so its interval/in-
  // memory state (current monster HP, resource bars, a gathering session's
  // carried fractional progress, …) survives navigating to Equipment or
  // Settings and back instead of resetting. DungeonScreen's state lives
  // here (not in ZoneScreen, which just reports "enter this dungeon" up)
  // for the same reason.
  let activityNode: ReactNode = null;
  if (activeDungeonId) {
    activityNode = <DungeonScreen dungeonId={activeDungeonId} onExit={() => setActiveDungeonId(null)} />;
  } else if (activity.type === 'combat' && activity.targetId) {
    activityNode = <CombatScreen monsterId={activity.targetId} />;
  } else if (activity.type === 'gathering' && activity.targetId && GATHER_NODES[activity.targetId]) {
    const node = GATHER_NODES[activity.targetId];
    activityNode = <GatheringScreen node={node} />;
  } else if (activity.type === 'fishing' && activity.targetId && FISHING_HOLES[activity.targetId]) {
    activityNode = <FishingScreen hole={FISHING_HOLES[activity.targetId]} />;
  } else if (activity.type === 'crafting' && activity.targetId && RECIPES[activity.targetId]) {
    const recipe = RECIPES[activity.targetId];
    activityNode = <CraftingScreen recipe={recipe} />;
  } else if (activity.type === 'disenchanting' && activity.targetId) {
    activityNode = <DisenchantingScreen itemId={activity.targetId} instanceId={activity.disenchantInstanceId} />;
  }

  // Starting a gather/craft/fish from the Professions page used to leave the
  // player stuck looking at the Professions list with no visible sign
  // anything had started — the actual progress bar only existed inside the
  // 'adventure' pane below, reachable only by clicking over to Adventure.
  // Surface the SAME single activityNode instance here too (never a second
  // mounted copy of e.g. GatheringScreen, which would double its autosave)
  // whenever there's a live activity to show.
  const showActivityPane = section === 'adventure' || (section === 'profession' && activityNode !== null);

  return (
    <AppShell {...shellProps}>
      <div style={{ display: showActivityPane ? 'block' : 'none' }}>
        {activityNode ?? (section === 'adventure' ? <ZoneScreen selectedZoneId={character.currentZoneId} onEnterDungeon={setActiveDungeonId} /> : null)}
      </div>
      {section === 'equipment' && <EquipmentScreen />}
      {section === 'inventory' && <InventoryScreen />}
      {section === 'bank' && <BankScreen />}
      {section === 'companions' && <CompanionScreen />}
      {section === 'characters' && <CharacterSelectScreen />}
      {section === 'collection' && <CollectionScreen />}
      {section === 'shop' && <VendorScreen zoneId={character.currentZoneId} />}
      {section === 'profession' && <ProfessionScreen professionId={selectedProfessionId} zoneId={character.currentZoneId} />}
      {section === 'classTrainer' && <ClassTrainerScreen zoneId={character.currentZoneId} />}
      {section === 'mountTrainer' && <MountTrainerScreen zoneId={character.currentZoneId} />}
      {section === 'professionsTrainer' && <ProfessionsTrainerScreen />}
      {section === 'quests' && <QuestLog />}
      {section === 'settings' && <SettingsScreen />}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <CharacterProvider>
          <AppContent />
        </CharacterProvider>
      </ErrorBoundary>
      <BugReportButton />
      <NotificationToasts />
    </AuthProvider>
  );
}
