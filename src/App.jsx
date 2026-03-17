import './App.css'
import { pokemon } from './data/pokemon'
import CelebrationLayer from './components/CelebrationLayer'
import ChoicePanel from './components/ChoicePanel'
import PokemonRow from './components/PokemonRow'
import usePokedexState from './hooks/usePokedexState'
import { sprites } from './lib/sprites'

function App() {
  const {
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
  } = usePokedexState()

  return (
    <main className={`app ${spriteFlood.length > 0 ? 'app-chaos' : ''}`}>
      <CelebrationLayer spriteFlood={spriteFlood} />

      <section className="pokedex">
        <div className="hero">
          <p className="eyebrow">FireRed + LeafGreen Tracker</p>
          <h1>Kanto Pokedex</h1>
          <p className="intro">
            A simple shared list for two players. Tick each box when that
            version has caught the Pokemon.
          </p>
        </div>

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

        <div className="tracker">
          <div className="tracker-row tracker-header">
            <span>Pokemon</span>
            <span className="fire-red-heading">Fire Red</span>
            <span className="leaf-green-heading">Leaf Green</span>
            <span className="comments-heading">Comments</span>
          </div>

          <ol className="pokemon-list">
            {pokemon.map((entry) => {
              return (
                <PokemonRow
                  key={entry.name}
                  entry={entry}
                  spriteSrc={sprites[entry.spriteSlug]}
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
