import { useEffect, useRef, useState } from 'react'
import './App.css'
import { pokemon } from './data/pokemon'
import AccountPanel from './components/AccountPanel'
import CelebrationLayer from './components/CelebrationLayer'
import ChoicePanel from './components/ChoicePanel'
import MigrationPanel from './components/MigrationPanel'
import PokemonRow from './components/PokemonRow'
import usePokedexState from './hooks/usePokedexState'
import { getSpriteSrc } from './lib/sprites'

const showOptions = [
  { value: 'all', label: 'All' },
  { value: 'caught', label: 'Caught by Both' },
  { value: 'uncaught', label: 'Still Needed' },
]

function App() {
  const [showFilter, setShowFilter] = useState('all')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsTriggerRef = useRef(null)
  const settingsPopoverRef = useRef(null)
  const {
    mode,
    currentUser,
    accessibleSaves,
    activeSaveId,
    activeSave,
    collaborators,
    tradeMode,
    setTradeMode,
    fireRedStarter,
    setFireRedStarter,
    leafGreenStarter,
    setLeafGreenStarter,
    fireRedFossil,
    setFireRedFossil,
    leafGreenFossil,
    setLeafGreenFossil,
    fireRedEeveelution,
    setFireRedEeveelution,
    leafGreenEeveelution,
    setLeafGreenEeveelution,
    fireRedHitmon,
    setFireRedHitmon,
    leafGreenHitmon,
    setLeafGreenHitmon,
    checkboxState,
    updateCheckboxState,
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
  } = usePokedexState()

  const visiblePokemon = pokemon.filter((entry) => {
    const pokemonId = String(entry.id).padStart(3, '0')
    const caughtByBoth =
      Boolean(checkboxState[`fire-red-${pokemonId}`]) &&
      Boolean(checkboxState[`leaf-green-${pokemonId}`])

    if (showFilter === 'caught') {
      return caughtByBoth
    }

    if (showFilter === 'uncaught') {
      return !caughtByBoth
    }

    return true
  })

  useEffect(() => {
    if (!settingsOpen) {
      return
    }

    function handlePointerDown(event) {
      const clickedTrigger = settingsTriggerRef.current?.contains(event.target)
      const clickedPopover = settingsPopoverRef.current?.contains(event.target)

      if (!clickedTrigger && !clickedPopover) {
        setSettingsOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setSettingsOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [settingsOpen])

  return (
    <main className={`app ${spriteFlood.length > 0 ? 'app-chaos' : ''}`}>
      <CelebrationLayer spriteFlood={spriteFlood} />

      <section className="pokedex">
        <div className="hero">
          <div className="hero-copy">
            <p className="eyebrow">FireRed + LeafGreen Tracker</p>
            <h1>Kanto Pokedex</h1>
            <p className="intro">A shared tracker for two players.</p>
          </div>

          <div className="hero-settings">
            <button
              type="button"
              ref={settingsTriggerRef}
              className={`hero-settings-trigger ${settingsOpen ? 'hero-settings-trigger-open' : ''}`}
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
              fireRedStarter={fireRedStarter}
              setFireRedStarter={setFireRedStarter}
              fireRedFossil={fireRedFossil}
              setFireRedFossil={setFireRedFossil}
              fireRedEeveelution={fireRedEeveelution}
              setFireRedEeveelution={setFireRedEeveelution}
              fireRedHitmon={fireRedHitmon}
              setFireRedHitmon={setFireRedHitmon}
              leafGreenStarter={leafGreenStarter}
              setLeafGreenStarter={setLeafGreenStarter}
              leafGreenFossil={leafGreenFossil}
              setLeafGreenFossil={setLeafGreenFossil}
              leafGreenEeveelution={leafGreenEeveelution}
              setLeafGreenEeveelution={setLeafGreenEeveelution}
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

              <label className="trade-mode-toggle">
                <input
                  type="checkbox"
                  checked={tradeMode}
                  onChange={(event) => setTradeMode(event.target.checked)}
                />
                <span>Trade Mode</span>
              </label>

              {saveError ? <p className="save-status save-status-error">{saveError}</p> : null}
            </div>
          </div>
        </div>

        <div className="tracker">
          <div className="tracker-row tracker-header">
            <span>Pokemon</span>
            <span className="fire-red-heading">Fire Red</span>
            <span className="leaf-green-heading">Leaf Green</span>
            <span className="comments-heading">Comments</span>
          </div>

          <ol className="pokemon-list">
            {visiblePokemon.map((entry) => {
              return (
                <PokemonRow
                  key={entry.name}
                  entry={entry}
                  spriteSrc={getSpriteSrc(entry.spriteSlug)}
                  isJumping={Boolean(jumpingSprites[String(entry.id).padStart(3, '0')])}
                  checkboxState={checkboxState}
                  updateCheckboxState={updateCheckboxState}
                  tradeMode={tradeMode}
                  fireRedStarter={fireRedStarter}
                  leafGreenStarter={leafGreenStarter}
                  fireRedFossil={fireRedFossil}
                  leafGreenFossil={leafGreenFossil}
                  fireRedEeveelution={fireRedEeveelution}
                  leafGreenEeveelution={leafGreenEeveelution}
                  fireRedHitmon={fireRedHitmon}
                  leafGreenHitmon={leafGreenHitmon}
                />
              )
            })}
          </ol>
        </div>
      </section>
    </main>
  )
}

export default App
