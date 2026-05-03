import { useEffect, useRef, useState } from 'react'
import './App.css'
import { getTrackablePokemon, heldTradeItemNames } from './data/pokemon'
import AccountPanel from './components/AccountPanel'
import CelebrationLayer from './components/CelebrationLayer'
import ChoicePanel from './components/ChoicePanel'
import GoalsView from './components/GoalsView'
import MigrationPanel from './components/MigrationPanel'
import OnboardingSplash from './components/OnboardingSplash'
import PokemonRow from './components/PokemonRow'
import TradeQueueView from './components/TradeQueueView'
import trackerSettingsCog from './assets/tracker-settings-cog.png'
import usePokedexState from './hooks/usePokedexState'
import {
  getOwnedHeldTradeItemForMode,
} from './lib/heldTradeItems'
import { getItemDbUrl, isVisibleInSingleVersion } from './lib/pokedexHelpers'
import { ownedGameLabels, primaryGameOptions } from './lib/pokedexOptions'
import { buildGoalsByVersion } from './lib/goals'
import { getSpriteSrc } from './lib/sprites'
import { buildTradeQueue, getTradeConsumptionKey } from './lib/tradeQueue'

const themeStorageKey = 'lgfr-theme'

const versionLabels = {
  'fire-red': {
    label: 'Fire Red',
    shortLabel: 'FR',
    headingClass: 'fire-red-heading',
  },
  'leaf-green': {
    label: 'Leaf Green',
    shortLabel: 'LG',
    headingClass: 'leaf-green-heading',
  },
}

function getVersionCaughtCount(versionKey, pokemonList, checkboxState) {
  return pokemonList.filter((entry) => {
    const pokemonId = String(entry.id).padStart(3, '0')

    return Boolean(checkboxState[`${versionKey}-${pokemonId}`])
  }).length
}

function isBaseGameCompleteForVersion(versionKey, trackerState) {
  return versionKey === 'leaf-green'
    ? trackerState.leafGreenBaseGameComplete
    : trackerState.fireRedBaseGameComplete
}

function getViewerBaseGameComplete(ownedGames, primaryGame, trackerState) {
  if (ownedGames === 'fire-red' || ownedGames === 'leaf-green') {
    return isBaseGameCompleteForVersion(ownedGames, trackerState)
  }

  if (primaryGame === 'fire-red' || primaryGame === 'leaf-green') {
    return isBaseGameCompleteForVersion(primaryGame, trackerState)
  }

  return false
}

function getOtherVersionKey(versionKey) {
  return versionKey === 'leaf-green' ? 'fire-red' : 'leaf-green'
}

function getLinkedProgressMeta(activeSave, collaborators) {
  if (activeSave?.role === 'collaborator' && activeSave.ownerUsername) {
    return activeSave.ownerUsername
  }

  if (collaborators.length === 1) {
    return collaborators[0].username
  }

  if (collaborators.length > 1) {
    return `${collaborators.length} linked players`
  }

  return ''
}

function getTradeCompletionUpdates(pair) {
  const updates = [
    {
      key: `${pair.left.versionKey}-${pair.right.receivedPokemonId}`,
      checked: true,
    },
    {
      key: `${pair.right.versionKey}-${pair.left.receivedPokemonId}`,
      checked: true,
    },
  ]

  ;[pair.left, pair.right].forEach((token) => {
    if (token.type === 'extra-copy') {
      updates.push({
        key: `${token.versionKey}-extra-${token.pokemonId}`,
        checked: false,
      })
      return
    }

    updates.push({
      key: getTradeConsumptionKey(token.versionKey, token.pokemonId),
      checked: true,
    })
  })

  return updates
}

function formatPercent(caughtCount, totalCount) {
  if (totalCount === 0) {
    return '0%'
  }

  return `${Math.round((caughtCount / totalCount) * 100)}%`
}

function normalizeNewGameConfirmation(value) {
  return value.trim().toLowerCase()
}

function getInitialTheme() {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const storedTheme = window.localStorage.getItem(themeStorageKey)

  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getTradeHeroCopy(readyCount) {
  return `${readyCount} ${readyCount === 1 ? 'TRADE' : 'TRADES'} READY`
}

function App() {
  const [showFilter, setShowFilter] = useState('all')
  const [activeTrackerView, setActiveTrackerView] = useState('tracker')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [newGameConfirmOpen, setNewGameConfirmOpen] = useState(false)
  const [newGameConfirmationText, setNewGameConfirmationText] = useState('')
  const [isResettingGame, setIsResettingGame] = useState(false)
  const [trackerSettingsOpen, setTrackerSettingsOpen] = useState(false)
  const [themeMode, setThemeMode] = useState(() => getInitialTheme())
  const settingsTriggerRef = useRef(null)
  const settingsPopoverRef = useRef(null)
  const trackerSettingsTriggerRef = useRef(null)
  const trackerSettingsPopoverRef = useRef(null)
  const {
    mode,
    currentUser,
    accessibleSaves,
    activeSaveId,
    activeSave,
    collaborators,
    ownedGames,
    trackerLayout,
    onboardingComplete,
    completeOnboarding,
    tradeMode,
    showSecondaryProgress,
    setShowSecondaryProgress,
    unlockAll,
    setUnlockAll,
    primaryGame,
    setPrimaryGame,
    switchEventUnlocks,
    setSwitchEventUnlocks,
    fireRedBaseGameComplete,
    setFireRedBaseGameComplete,
    leafGreenBaseGameComplete,
    setLeafGreenBaseGameComplete,
    fireRedStarter,
    setFireRedStarter,
    leafGreenStarter,
    setLeafGreenStarter,
    fireRedFossil,
    setFireRedFossil,
    leafGreenFossil,
    setLeafGreenFossil,
    fireRedHitmon,
    setFireRedHitmon,
    leafGreenHitmon,
    setLeafGreenHitmon,
    ownedHeldTradeItems,
    updateOwnedHeldTradeItem,
    checkboxState,
    updateCheckboxState,
    updateCheckboxStates,
    jumpingSprites,
    spriteFlood,
    saveError,
    authError,
    authNotice,
    shareError,
    generatedShareCode,
    migrationConflict,
    signUp,
    logIn,
    logOut,
    switchActiveSave,
    keepCloudVersion,
    replaceCloudWithLocalProgress,
    joinSharedSave,
    generateShareCodeForActiveSave,
    removeCollaboratorFromActiveSave,
    resetTrackerState,
  } = usePokedexState()

  const trackerState = {
    tradeMode,
    unlockAll,
    primaryGame,
    switchEventUnlocks,
    fireRedBaseGameComplete,
    leafGreenBaseGameComplete,
    fireRedStarter,
    leafGreenStarter,
    fireRedFossil,
    leafGreenFossil,
    fireRedHitmon,
    leafGreenHitmon,
    ownedHeldTradeItems,
    checkboxState,
  }
  const baseGameComplete = getViewerBaseGameComplete(ownedGames, primaryGame, trackerState)
  function setBaseGameComplete(nextValue) {
    if (ownedGames === 'leaf-green') {
      setLeafGreenBaseGameComplete(nextValue)
      return
    }

    if (ownedGames === 'fire-red') {
      setFireRedBaseGameComplete(nextValue)
      return
    }

    if (primaryGame === 'leaf-green') {
      setLeafGreenBaseGameComplete(nextValue)
      return
    }

    if (primaryGame === 'fire-red') {
      setFireRedBaseGameComplete(nextValue)
      return
    }
  }
  const shouldShowOnboarding = mode !== 'loading' && (!onboardingComplete || setupOpen)
  const isSingleDexAcrossBothGames = ownedGames === 'both' && Boolean(primaryGame)
  const isLinkedDualSave = ownedGames !== 'both' && trackerLayout === 'dual'
  const hasToggleableSecondaryProgress =
    isSingleDexAcrossBothGames || isLinkedDualSave
  const isSoloSingleVersionView =
    ownedGames !== 'both' && trackerLayout === 'single'
  const isPairedSingleVersionView =
    hasToggleableSecondaryProgress && !showSecondaryProgress
  const isSingleVersionView =
    isSoloSingleVersionView || isPairedSingleVersionView
  const singleVersionKey = isSingleVersionView
    ? isSingleDexAcrossBothGames
      ? primaryGame
      : ownedGames
    : null
  const trackablePokemon = getTrackablePokemon({
    baseGameComplete,
  })
  const singleVersionTrackablePokemon = singleVersionKey
    ? getTrackablePokemon({
        baseGameComplete,
      })
    : []
  const trackerPokemon = isSingleVersionView
    ? singleVersionTrackablePokemon.filter((entry) =>
        isVisibleInSingleVersion(entry, singleVersionKey, trackerState),
      )
    : trackablePokemon
  const showOptions = isSingleVersionView
    ? [
        { value: 'all', label: 'All' },
        { value: 'caught', label: 'Caught' },
        { value: 'uncaught', label: 'Still Needed' },
      ]
    : [
        { value: 'all', label: 'All' },
        { value: 'caught', label: 'Caught in Both' },
        { value: 'uncaught', label: 'Still Needed' },
      ]
  const visiblePokemon = trackerPokemon.filter((entry) => {
    const pokemonId = String(entry.id).padStart(3, '0')
    const isCaughtInView = isSingleVersionView
      ? Boolean(checkboxState[`${singleVersionKey}-${pokemonId}`])
      : Boolean(checkboxState[`fire-red-${pokemonId}`]) &&
        Boolean(checkboxState[`leaf-green-${pokemonId}`])

    if (showFilter === 'caught') {
      return isCaughtInView
    }

    if (showFilter === 'uncaught') {
      return !isCaughtInView
    }

    return true
  })
  const fireRedCaughtCount = getVersionCaughtCount(
    'fire-red',
    trackablePokemon,
    checkboxState,
  )
  const leafGreenCaughtCount = getVersionCaughtCount(
    'leaf-green',
    trackablePokemon,
    checkboxState,
  )
  const singleVersionCaughtCount = isSingleVersionView
    ? getVersionCaughtCount(singleVersionKey, trackerPokemon, checkboxState)
    : 0
  const isDarkMode = themeMode === 'dark'
  const canConfirmNewGame =
    normalizeNewGameConfirmation(newGameConfirmationText) === 'new game'
  const shouldShowMainGameSetting =
    ownedGames === 'both' && (Boolean(primaryGame) || tradeMode)
  const shouldShowTradeReadyCard = trackerLayout === 'dual'
  const secondaryProgressLabel = isSingleDexAcrossBothGames
    ? 'View Secondary Pokedex'
    : 'View Partner Progress'
  const secondaryProgressMeta = isSingleDexAcrossBothGames
    ? ownedGameLabels[getOtherVersionKey(primaryGame)]
    : getLinkedProgressMeta(activeSave, collaborators)
  const secondaryProgressAriaLabel = secondaryProgressMeta
    ? `${secondaryProgressLabel}: ${secondaryProgressMeta}`
    : secondaryProgressLabel
  const tradeQueue = shouldShowTradeReadyCard
    ? buildTradeQueue(trackablePokemon, checkboxState, trackerState, {
        leftVersionKey: 'fire-red',
        rightVersionKey: 'leaf-green',
      })
    : {
        pairs: [],
        blockedPairs: [],
        blockedByVersion: {
          'leaf-green': [],
          'fire-red': [],
        },
        pairableCount: 0,
        readyCount: 0,
        blockedByHeldItemCount: 0,
        readyByVersion: {
          'leaf-green': [],
          'fire-red': [],
        },
        unpairedByVersion: {
          'leaf-green': [],
          'fire-red': [],
        },
      }
  const tradePairCount = tradeQueue.pairableCount
  const tradeReadyCount = tradeQueue.readyCount
  const heldTradeItemEditorVersionKey = ownedGames === 'both' ? 'both' : ownedGames
  const ownedHeldTradeItemCount = heldTradeItemEditorVersionKey
    ? heldTradeItemNames.filter((itemName) =>
        getOwnedHeldTradeItemForMode(
          ownedHeldTradeItems,
          ownedGames === 'both' ? 'fire-red' : heldTradeItemEditorVersionKey,
          itemName,
          ownedGames,
        ),
      ).length
    : 0
  const goalVersionKeys =
    ownedGames === 'both'
      ? ['fire-red', 'leaf-green']
      : [ownedGames]
  const goalsByVersion = buildGoalsByVersion(
    trackablePokemon,
    trackerState,
    goalVersionKeys,
    tradeQueue.blockedByVersion,
  )
  const goalPanels = goalVersionKeys.map((versionKey) => ({
    versionKey,
    label: versionLabels[versionKey].label,
    headingClass: versionLabels[versionKey].headingClass,
    ...goalsByVersion[versionKey],
  }))
  const goalCount = goalPanels.reduce(
    (count, panel) =>
      count +
      Number(Boolean(panel.huntGoal)) +
      Number(Boolean(panel.partyGoal)) +
      Number(Boolean(panel.itemGoal)),
    0,
  )
  const effectiveTrackerView =
    activeTrackerView === 'trade' && !(shouldShowTradeReadyCard && tradePairCount > 0)
      ? 'tracker'
      : activeTrackerView
  const isTradeViewActive = effectiveTrackerView === 'trade'
  const isGoalsViewActive = effectiveTrackerView === 'goals'

  useEffect(() => {
    if (!settingsOpen && !trackerSettingsOpen) {
      return
    }

    function handlePointerDown(event) {
      const clickedTrigger = settingsTriggerRef.current?.contains(event.target)
      const clickedPopover = settingsPopoverRef.current?.contains(event.target)
      const clickedTrackerTrigger = trackerSettingsTriggerRef.current?.contains(event.target)
      const clickedTrackerPopover = trackerSettingsPopoverRef.current?.contains(event.target)

      if (!clickedTrigger && !clickedPopover) {
        setSettingsOpen(false)
      }

      if (!clickedTrackerTrigger && !clickedTrackerPopover) {
        setTrackerSettingsOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setSettingsOpen(false)
        setTrackerSettingsOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [settingsOpen, trackerSettingsOpen])

  useEffect(() => {
    window.localStorage.setItem(themeStorageKey, themeMode)
    document.documentElement.style.colorScheme = themeMode
  }, [themeMode])

  async function handleConfirmNewGame() {
    if (!canConfirmNewGame || isResettingGame) {
      return
    }

    setIsResettingGame(true)
    const result = await resetTrackerState()
    setIsResettingGame(false)

    if (!result?.ok) {
      return
    }

    setNewGameConfirmationText('')
    setNewGameConfirmOpen(false)
    setTrackerSettingsOpen(false)
    setSettingsOpen(false)
    setSetupOpen(false)
  }

  return (
    <main
      className={`app ${spriteFlood.length > 0 ? 'app-chaos' : ''} ${
        isDarkMode ? 'app-theme-dark' : 'app-theme-light'
      }`.trim()}
    >
      <CelebrationLayer spriteFlood={spriteFlood} />

      {shouldShowOnboarding ? (
        <OnboardingSplash
          authError={authError}
          authNotice={authNotice}
          key={`${ownedGames}-${trackerLayout}-${tradeMode}-${primaryGame}-${switchEventUnlocks}-${setupOpen}`}
          canClose={onboardingComplete}
          currentUser={currentUser}
          joinSharedSave={joinSharedSave}
          logIn={logIn}
          mode={mode}
          onClose={() => setSetupOpen(false)}
          onComplete={(setup) => {
            completeOnboarding(setup)
            setSetupOpen(false)
          }}
          signUp={signUp}
        />
      ) : null}

      {newGameConfirmOpen ? (
        <div
          className="danger-dialog-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-game-title"
        >
          <div
            className="danger-dialog-backdrop"
            aria-hidden="true"
            onClick={() => {
              if (!isResettingGame) {
                setNewGameConfirmOpen(false)
                setNewGameConfirmationText('')
              }
            }}
          />

          <section className="danger-dialog">
            <h2 id="new-game-title">Start a new game?</h2>
            <p className="danger-dialog-warning">
              This will wipe your current save file and return you to the setup flow.
            </p>
            <p className="danger-dialog-copy">
              Type <strong>New Game</strong> below to continue.
            </p>

            <input
              type="text"
              className="danger-dialog-input"
              value={newGameConfirmationText}
              onChange={(event) => setNewGameConfirmationText(event.target.value)}
              name="new-game-confirmation"
              placeholder="Type New Game"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              data-form-type="other"
              data-lpignore="true"
              data-1p-ignore="true"
              disabled={isResettingGame}
            />

            <div className="danger-dialog-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setNewGameConfirmOpen(false)
                  setNewGameConfirmationText('')
                }}
                disabled={isResettingGame}
              >
                Cancel
              </button>

              <button
                type="button"
                className="danger-button"
                onClick={handleConfirmNewGame}
                disabled={!canConfirmNewGame || isResettingGame}
              >
                {isResettingGame ? 'Starting...' : 'Start New Game'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <section className="pokedex">
        <div className="hero">
          <div className="hero-copy">
            <div className="hero-copy-top">
              <p className="eyebrow">FireRed + LeafGreen Tracker</p>
              <h1>Kanto Pokedex</h1>
            </div>

            <div className="hero-stats">
              {isSoloSingleVersionView ? (
                <>
                  <div className="hero-stat-card">
                    <span className="hero-stat-label">
                      {ownedGameLabels[singleVersionKey]} Progress
                    </span>
                    <strong>
                      {singleVersionCaughtCount} / {trackerPokemon.length}
                    </strong>
                    <span className="hero-stat-meta">
                      {formatPercent(singleVersionCaughtCount, trackerPokemon.length)}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="hero-stat-card hero-stat-card-button"
                    onClick={() =>
                      setActiveTrackerView((currentView) =>
                        currentView === 'goals' ? 'tracker' : 'goals',
                      )
                    }
                  >
                    <span className="hero-stat-label">Goals</span>
                    <strong>{goalCount > 0 ? `${goalCount} ACTIVE GOALS` : 'ALL CLEAR'}</strong>
                    <span className="hero-stat-meta hero-stat-link">
                      {isGoalsViewActive ? 'BACK TO TRACKER' : 'CLICK TO VIEW'}
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <div className="hero-stat-card">
                    <span className="hero-stat-label">Fire Red Progress</span>
                    <strong>
                      {fireRedCaughtCount} / {trackablePokemon.length}
                    </strong>
                    <span className="hero-stat-meta">
                      {formatPercent(fireRedCaughtCount, trackablePokemon.length)}
                    </span>
                  </div>

                  <div className="hero-stat-card">
                    <span className="hero-stat-label">Leaf Green Progress</span>
                    <strong>
                      {leafGreenCaughtCount} / {trackablePokemon.length}
                    </strong>
                    <span className="hero-stat-meta">
                      {formatPercent(leafGreenCaughtCount, trackablePokemon.length)}
                    </span>
                  </div>

                  {shouldShowTradeReadyCard ? (
                    tradePairCount > 0 ? (
                      <button
                        type="button"
                        className="hero-stat-card hero-stat-card-trade hero-stat-card-button"
                        onClick={() =>
                          setActiveTrackerView((currentView) =>
                            currentView === 'trade' ? 'tracker' : 'trade',
                          )
                        }
                      >
                        <span className="hero-stat-label">Trade Queue</span>
                        <strong>{getTradeHeroCopy(tradeReadyCount)}</strong>
                        <span className="hero-stat-meta hero-stat-link">
                          {isTradeViewActive ? 'BACK TO TRACKER' : 'CLICK TO VIEW'}
                        </span>
                      </button>
                    ) : (
                      <div className="hero-stat-card hero-stat-card-trade">
                        <span className="hero-stat-label">Trade Queue</span>
                        <strong>{getTradeHeroCopy(tradeReadyCount)}</strong>
                      </div>
                    )
                  ) : null}

                  <button
                    type="button"
                    className="hero-stat-card hero-stat-card-button"
                    onClick={() =>
                      setActiveTrackerView((currentView) =>
                        currentView === 'goals' ? 'tracker' : 'goals',
                      )
                    }
                  >
                    <span className="hero-stat-label">Goals</span>
                    <strong>{goalCount > 0 ? `${goalCount} ACTIVE GOALS` : 'ALL CLEAR'}</strong>
                    <span className="hero-stat-meta hero-stat-link">
                      {isGoalsViewActive ? 'BACK TO TRACKER' : 'CLICK TO VIEW'}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="hero-settings">
            <div className="hero-settings-row">
              <button
                type="button"
                ref={settingsTriggerRef}
                className={`hero-settings-trigger ${
                  settingsOpen ? 'hero-settings-trigger-open' : ''
                }`}
                aria-expanded={settingsOpen}
                aria-label="Open account and cloud save settings"
                onClick={() => setSettingsOpen((currentState) => !currentState)}
              >
                <span className={`mode-badge mode-badge-${mode}`}>
                  {mode === 'loading'
                    ? 'Loading'
                    : mode === 'guest'
                      ? 'LOCAL STORAGE'
                      : 'CLOUD SAVE'}
                </span>
                <span className="hero-settings-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M10.8 2.4c.4-1 1.9-1 2.4 0l.5 1.4c.1.3.4.6.7.7l1.3.5c1 .4 1.1 1.8.2 2.4l-1.1.8c-.3.2-.4.6-.4.9l.2 1.5c.2 1-.9 1.8-1.9 1.3l-1.3-.7a1 1 0 0 0-1 0l-1.3.7c-.9.5-2-.2-1.9-1.3l.2-1.5c0-.3-.1-.7-.4-.9l-1.1-.8c-.9-.6-.8-2 .2-2.4l1.3-.5c.3-.1.6-.4.7-.7l.5-1.4ZM12 9.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Z" />
                    <path d="M4.9 13.2c.4-.9 1.6-1 2.2-.2l.7 1c.2.3.5.4.8.4l1.2-.1c1-.1 1.7.9 1.2 1.8l-.5 1.1c-.1.3-.1.7.1 1l.7 1c.6.8 0 2-.9 2l-1.3.1c-.3 0-.6.2-.8.5l-.7 1c-.6.8-1.9.6-2.3-.3l-.4-1.2c-.1-.3-.4-.6-.7-.7l-1.2-.4c-.9-.3-1.2-1.6-.4-2.3l1-.7c.3-.2.4-.5.4-.9l-.1-1.2c-.1-.9 1-1.6 1.8-1.2Z" />
                    <path d="M19.1 13.2c.8-.4 1.9.3 1.8 1.2l-.1 1.2c0 .4.1.7.4.9l1 .7c.8.7.6 2-.4 2.3l-1.2.4c-.3.1-.6.4-.7.7l-.4 1.2c-.4.9-1.7 1.1-2.3.3l-.7-1a1 1 0 0 0-.8-.5l-1.3-.1c-.9 0-1.5-1.2-.9-2l.7-1c.2-.3.2-.7.1-1l-.5-1.1c-.4-.9.2-1.9 1.2-1.8l1.2.1c.3 0 .6-.1.8-.4l.7-1c.6-.8 1.8-.7 2.2.2Z" />
                  </svg>
                </span>
              </button>

              <div className="tracker-settings tracker-settings-hero">
                <button
                  type="button"
                  ref={trackerSettingsTriggerRef}
                  className={`hero-tracker-settings-trigger ${
                    trackerSettingsOpen ? 'hero-tracker-settings-trigger-open' : ''
                  }`}
                  aria-expanded={trackerSettingsOpen}
                  aria-label="Open tracker settings"
                  onClick={() => setTrackerSettingsOpen((currentState) => !currentState)}
                >
                  <span className="hero-tracker-settings-label">Settings</span>
                  <span className="hero-settings-icon" aria-hidden="true">
                    <img
                      src={trackerSettingsCog}
                      alt=""
                      className="hero-settings-icon-image"
                    />
                  </span>
                </button>

                {trackerSettingsOpen ? (
                  <div className="tracker-settings-popover" ref={trackerSettingsPopoverRef}>
                    <label className="trade-mode-toggle">
                      <input
                        type="checkbox"
                        checked={unlockAll}
                        onChange={(event) => setUnlockAll(event.target.checked)}
                      />
                      <span>Unlock all</span>
                    </label>

                    <label className="trade-mode-toggle">
                      <input
                        type="checkbox"
                        checked={switchEventUnlocks}
                        onChange={(event) => setSwitchEventUnlocks(event.target.checked)}
                      />
                      <span>Switch event unlocks</span>
                    </label>

                    <label className="trade-mode-toggle">
                      <input
                        type="checkbox"
                        checked={isDarkMode}
                        onChange={(event) => setThemeMode(event.target.checked ? 'dark' : 'light')}
                      />
                      <span>Dark Mode</span>
                    </label>

                    {shouldShowMainGameSetting ? (
                      <>
                        <label className="filter-control">
                          <span>Main game</span>
                          <select
                            value={primaryGame}
                            onChange={(event) => setPrimaryGame(event.target.value)}
                          >
                            {primaryGameOptions.map((option) => (
                              <option key={option.value || 'blank'} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        {!primaryGame ? (
                          <p className="save-status">
                            Choose a main game so future trade suggestions stay focused.
                          </p>
                        ) : null}
                      </>
                    ) : null}

                    <div className="tracker-settings-section">
                      <div className="tracker-settings-section-header">
                        <span className="tracker-settings-section-title">Owned Items</span>
                        <span className="tracker-settings-section-count">
                          {ownedHeldTradeItemCount}/{heldTradeItemNames.length}
                        </span>
                      </div>

                      <p className="tracker-settings-section-copy">
                        {ownedGames === 'both'
                          ? 'Track held-trade items you can access across both games.'
                          : `Track held-trade items for ${versionLabels[heldTradeItemEditorVersionKey].label}.`}
                      </p>

                      <div className="tracker-settings-item-list">
                        {heldTradeItemNames.map((itemName) => (
                          <div
                            className="tracker-settings-item"
                            key={`${heldTradeItemEditorVersionKey}-${itemName}`}
                          >
                            <label className="tracker-settings-item-main">
                              <input
                                type="checkbox"
                                checked={getOwnedHeldTradeItemForMode(
                                  ownedHeldTradeItems,
                                  ownedGames === 'both'
                                    ? 'fire-red'
                                    : heldTradeItemEditorVersionKey,
                                  itemName,
                                  ownedGames,
                                )}
                                onChange={(event) =>
                                  updateOwnedHeldTradeItem(
                                    heldTradeItemEditorVersionKey,
                                    itemName,
                                    event.target.checked,
                                  )
                                }
                              />
                              <span>{itemName}</span>
                            </label>

                            <a
                              className="tracker-settings-item-link"
                              href={getItemDbUrl(itemName)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Wiki
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="secondary-button setup-launcher"
                      onClick={() => {
                        setNewGameConfirmationText('')
                        setNewGameConfirmOpen(true)
                        setTrackerSettingsOpen(false)
                      }}
                    >
                      New Game Setup
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {settingsOpen ? (
              <div className="hero-settings-popover" ref={settingsPopoverRef}>
                <AccountPanel
                  mode={mode}
                  currentUser={currentUser}
                  activeSave={activeSave}
                  accessibleSaves={accessibleSaves}
                  activeSaveId={activeSaveId}
                  authError={authError}
                  authNotice={authNotice}
                  shareError={shareError}
                  collaborators={collaborators}
                  generatedShareCode={generatedShareCode}
                  logIn={logIn}
                  signUp={signUp}
                  logOut={logOut}
                  switchActiveSave={switchActiveSave}
                  joinSharedSave={joinSharedSave}
                  generateShareCodeForActiveSave={generateShareCodeForActiveSave}
                  removeCollaboratorFromActiveSave={removeCollaboratorFromActiveSave}
                  className="account-panel-popover"
                />
              </div>
            ) : null}
          </div>
        </div>

        {migrationConflict ? (
          <MigrationPanel
            keepCloudVersion={keepCloudVersion}
            replaceCloudWithLocalProgress={replaceCloudWithLocalProgress}
          />
        ) : null}

        <div className="controls">
          <div className="controls-left">
            <ChoicePanel
              ownedGames={ownedGames}
              trackerLayout={trackerLayout}
              baseGameComplete={baseGameComplete}
              setBaseGameComplete={setBaseGameComplete}
              fireRedStarter={fireRedStarter}
              setFireRedStarter={setFireRedStarter}
              fireRedFossil={fireRedFossil}
              setFireRedFossil={setFireRedFossil}
              fireRedHitmon={fireRedHitmon}
              setFireRedHitmon={setFireRedHitmon}
              leafGreenStarter={leafGreenStarter}
              setLeafGreenStarter={setLeafGreenStarter}
              leafGreenFossil={leafGreenFossil}
              setLeafGreenFossil={setLeafGreenFossil}
              leafGreenHitmon={leafGreenHitmon}
              setLeafGreenHitmon={setLeafGreenHitmon}
            />
          </div>

          <div className="controls-right">
            <div className="utility-panel">
              <label className="filter-control">
                <span>Show</span>
                <select
                  value={showFilter}
                  onChange={(event) => setShowFilter(event.target.value)}
                >
                  {showOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {hasToggleableSecondaryProgress ? (
                <button
                  type="button"
                  className={`trade-mode-toggle ${
                    showSecondaryProgress ? 'trade-mode-toggle-combined' : ''
                  }`}
                  role="switch"
                  aria-checked={showSecondaryProgress}
                  aria-label={secondaryProgressAriaLabel}
                  onClick={() => setShowSecondaryProgress(!showSecondaryProgress)}
                >
                  <span className="trade-mode-toggle-copy">
                    <span className="trade-mode-toggle-label">
                      {secondaryProgressLabel}
                    </span>
                    {secondaryProgressMeta ? (
                      <span className="trade-mode-toggle-meta">
                        {secondaryProgressMeta}
                      </span>
                    ) : null}
                  </span>
                  <span className="trade-mode-toggle-track" aria-hidden="true">
                    <span className="trade-mode-toggle-thumb" />
                  </span>
                </button>
              ) : null}

              {saveError ? <p className="save-status save-status-error">{saveError}</p> : null}
            </div>

          </div>
        </div>

        {isTradeViewActive ? (
          <TradeQueueView
            tradeQueue={tradeQueue}
            className="trade-view-panel-main"
            onCompleteTrade={(pair) => updateCheckboxStates(getTradeCompletionUpdates(pair))}
            onUpdateHeldTradeItem={(versionKey, itemName, checked) =>
              updateOwnedHeldTradeItem(
                ownedGames === 'both' ? 'both' : versionKey,
                itemName,
                checked,
              )
            }
          />
        ) : isGoalsViewActive ? (
          <GoalsView
            panels={goalPanels}
            className="trade-view-panel-main"
            checkboxState={checkboxState}
            updateCheckboxState={updateCheckboxState}
            ownedHeldTradeItems={ownedHeldTradeItems}
            ownedGames={ownedGames}
            updateOwnedHeldTradeItem={updateOwnedHeldTradeItem}
          />
        ) : (
          <div className={`tracker ${isSoloSingleVersionView ? 'tracker-single' : ''}`}>
            <div
              className={`tracker-row tracker-header ${
                isSoloSingleVersionView ? 'tracker-row-single' : ''
              }`.trim()}
            >
              <span>Pokemon</span>
              {isSoloSingleVersionView ? (
                <span className={versionLabels[singleVersionKey].headingClass}>
                  <span className="label-full">{versionLabels[singleVersionKey].label}</span>
                  <span className="label-short">
                    {versionLabels[singleVersionKey].shortLabel}
                  </span>
                </span>
              ) : isPairedSingleVersionView ? (
                <>
                  <span
                    className={`fire-red-heading ${
                      singleVersionKey !== 'fire-red' ? 'tracker-version-hidden' : ''
                    }`.trim()}
                    aria-hidden={singleVersionKey !== 'fire-red'}
                  >
                    <span className="label-full">Fire Red</span>
                    <span className="label-short">FR</span>
                  </span>
                  <span
                    className={`leaf-green-heading ${
                      singleVersionKey !== 'leaf-green' ? 'tracker-version-hidden' : ''
                    }`.trim()}
                    aria-hidden={singleVersionKey !== 'leaf-green'}
                  >
                    <span className="label-full">Leaf Green</span>
                    <span className="label-short">LG</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="fire-red-heading">
                    <span className="label-full">Fire Red</span>
                    <span className="label-short">FR</span>
                  </span>
                  <span className="leaf-green-heading">
                    <span className="label-full">Leaf Green</span>
                    <span className="label-short">LG</span>
                  </span>
                </>
              )}
              <span className="comments-heading">Comments</span>
            </div>

            <ol className="pokemon-list">
              {visiblePokemon.map((entry) => (
                <PokemonRow
                  key={entry.name}
                  entry={entry}
                  spriteSrc={getSpriteSrc(entry.spriteSlug)}
                  isJumping={Boolean(jumpingSprites[String(entry.id).padStart(3, '0')])}
                  checkboxState={checkboxState}
                  updateCheckboxState={updateCheckboxState}
                  isCompactSingleVersion={isSoloSingleVersionView}
                  singleVersionKey={singleVersionKey}
                  tradeMode={tradeMode}
                  unlockAll={unlockAll}
                  switchEventUnlocks={switchEventUnlocks}
                  fireRedBaseGameComplete={trackerState.fireRedBaseGameComplete}
                  leafGreenBaseGameComplete={trackerState.leafGreenBaseGameComplete}
                  fireRedStarter={fireRedStarter}
                  leafGreenStarter={leafGreenStarter}
                  fireRedFossil={fireRedFossil}
                  leafGreenFossil={leafGreenFossil}
                  fireRedHitmon={fireRedHitmon}
                  leafGreenHitmon={leafGreenHitmon}
                />
              ))}
            </ol>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
