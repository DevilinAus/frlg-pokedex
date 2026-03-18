import {
  getComment,
  getPokemonDbUrl,
  isLockedByChoice,
  isLockedByStarterChoice,
  needsChoiceExtraCopy,
  needsExtraCopy,
} from '../lib/pokedexHelpers'

function CheckboxGroup({
  versionKey,
  pokemonId,
  checked,
  extraChecked,
  showExtraCopy,
  locked,
  updateCheckboxState,
}) {
  if (showExtraCopy) {
    return (
      <div className="capture-boxes">
        <label className="capture-box">
          <span className="capture-label">1</span>
          <input
            id={`${versionKey}-${pokemonId}`}
            type="checkbox"
            checked={checked}
            onChange={(event) =>
              updateCheckboxState(`${versionKey}-${pokemonId}`, event.target.checked)
            }
            disabled={locked}
          />
        </label>

        <label className="capture-box extra-copy-box">
          <span className="capture-label">2</span>
          <input
            id={`${versionKey}-extra-${pokemonId}`}
            type="checkbox"
            checked={extraChecked}
            onChange={(event) =>
              updateCheckboxState(
                `${versionKey}-extra-${pokemonId}`,
                event.target.checked,
              )
            }
            disabled={locked}
          />
        </label>
      </div>
    )
  }

  return (
    <div className="single-capture-box">
      <input
        id={`${versionKey}-${pokemonId}`}
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          updateCheckboxState(`${versionKey}-${pokemonId}`, event.target.checked)
        }
        disabled={locked}
      />
    </div>
  )
}

function PokemonRow({
  entry,
  spriteSrc,
  isJumping,
  checkboxState,
  updateCheckboxState,
  tradeMode,
  fireRedStarter,
  leafGreenStarter,
  fireRedFossil,
  leafGreenFossil,
  fireRedEeveelution,
  leafGreenEeveelution,
  fireRedHitmon,
  leafGreenHitmon,
}) {
  const pokemonId = String(entry.id).padStart(3, '0')
  const comment = getComment(
    entry,
    fireRedStarter,
    leafGreenStarter,
    fireRedFossil,
    leafGreenFossil,
    fireRedEeveelution,
    leafGreenEeveelution,
    fireRedHitmon,
    leafGreenHitmon,
  )

  const fireRedStarterLocked = isLockedByStarterChoice(entry, fireRedStarter)
  const leafGreenStarterLocked = isLockedByStarterChoice(entry, leafGreenStarter)
  const fireRedFossilLocked = isLockedByChoice(entry.fossilFamily, fireRedFossil)
  const leafGreenFossilLocked = isLockedByChoice(entry.fossilFamily, leafGreenFossil)
  const fireRedEeveelutionLocked = isLockedByChoice(
    entry.eeveelutionFamily,
    fireRedEeveelution,
  )
  const leafGreenEeveelutionLocked = isLockedByChoice(
    entry.eeveelutionFamily,
    leafGreenEeveelution,
  )
  const fireRedHitmonLocked = isLockedByChoice(entry.hitmonFamily, fireRedHitmon)
  const leafGreenHitmonLocked = isLockedByChoice(entry.hitmonFamily, leafGreenHitmon)

  const fireRedLocked =
    (entry.tradeEvolution && !tradeMode) ||
    ((fireRedStarterLocked ||
      fireRedFossilLocked ||
      fireRedEeveelutionLocked ||
      fireRedHitmonLocked) &&
      !tradeMode) ||
    (entry.fireRedAvailability !== 'native' &&
      !(tradeMode && entry.fireRedAvailability === 'trade'))
  const leafGreenLocked =
    (entry.tradeEvolution && !tradeMode) ||
    ((leafGreenStarterLocked ||
      leafGreenFossilLocked ||
      leafGreenEeveelutionLocked ||
      leafGreenHitmonLocked) &&
      !tradeMode) ||
    (entry.leafGreenAvailability !== 'native' &&
      !(tradeMode && entry.leafGreenAvailability === 'trade'))

  const showFireRedExtraCopy =
    needsExtraCopy(entry, 'fireRed', tradeMode) ||
    needsChoiceExtraCopy(
      entry,
      {
        starter: fireRedStarter,
        hitmon: fireRedHitmon,
      },
      tradeMode,
    )
  const showLeafGreenExtraCopy =
    needsExtraCopy(entry, 'leafGreen', tradeMode) ||
    needsChoiceExtraCopy(
      entry,
      {
        starter: leafGreenStarter,
        hitmon: leafGreenHitmon,
      },
      tradeMode,
    )

  return (
    <li className="tracker-row pokemon-row">
      <label className="pokemon-label" htmlFor={`fire-red-${pokemonId}`}>
        {spriteSrc ? (
          <img
            className={`pokemon-sprite ${isJumping ? 'pokemon-sprite-jump' : ''}`}
            src={spriteSrc}
            alt=""
            loading="lazy"
          />
        ) : (
          <span className="sprite-placeholder" aria-hidden="true">
            ?
          </span>
        )}

        <span className="pokemon-number">#{pokemonId}</span>
        <a
          className="pokemon-name"
          href={getPokemonDbUrl(entry)}
          target="_blank"
          rel="noreferrer"
        >
          {entry.name}
        </a>
      </label>

      <div
        className={`checkbox-cell fire-red-cell ${
          fireRedLocked ? 'checkbox-cell-locked' : ''
        }`}
      >
        <CheckboxGroup
          versionKey="fire-red"
          pokemonId={pokemonId}
          checked={Boolean(checkboxState[`fire-red-${pokemonId}`])}
          extraChecked={Boolean(checkboxState[`fire-red-extra-${pokemonId}`])}
          showExtraCopy={showFireRedExtraCopy}
          locked={fireRedLocked}
          updateCheckboxState={updateCheckboxState}
        />
      </div>

      <div
        className={`checkbox-cell leaf-green-cell ${
          leafGreenLocked ? 'checkbox-cell-locked' : ''
        }`}
      >
        <CheckboxGroup
          versionKey="leaf-green"
          pokemonId={pokemonId}
          checked={Boolean(checkboxState[`leaf-green-${pokemonId}`])}
          extraChecked={Boolean(checkboxState[`leaf-green-extra-${pokemonId}`])}
          showExtraCopy={showLeafGreenExtraCopy}
          locked={leafGreenLocked}
          updateCheckboxState={updateCheckboxState}
        />
      </div>

      <div className="comment-cell">
        {comment ? <span className="comment-text">{comment}</span> : null}
      </div>
    </li>
  )
}

export default PokemonRow
