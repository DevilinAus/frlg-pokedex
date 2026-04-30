import {
  getComment,
  getPokemonDbUrl,
  getVersionTrackerState,
} from '../lib/pokedexHelpers'

const compactPostgameSpriteNames = new Set(['Deoxys', 'Ho-Oh', 'Lugia', 'Steelix'])

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
  isCompactSingleVersion,
  singleVersionKey,
  tradeMode,
  unlockAll,
  switchEventUnlocks,
  fireRedBaseGameComplete,
  leafGreenBaseGameComplete,
  fireRedStarter,
  leafGreenStarter,
  fireRedFossil,
  leafGreenFossil,
  fireRedHitmon,
  leafGreenHitmon,
}) {
  const pokemonId = String(entry.id).padStart(3, '0')
  const isPairedSingleVersionRow = Boolean(singleVersionKey) && !isCompactSingleVersion
  const trackerState = {
    tradeMode,
    unlockAll,
    switchEventUnlocks,
    fireRedBaseGameComplete,
    leafGreenBaseGameComplete,
    fireRedStarter,
    leafGreenStarter,
    fireRedFossil,
    leafGreenFossil,
    fireRedHitmon,
    leafGreenHitmon,
    checkboxState,
  }
  const comment = getComment(
    entry,
    switchEventUnlocks,
    fireRedStarter,
    leafGreenStarter,
    fireRedFossil,
    leafGreenFossil,
    fireRedHitmon,
    leafGreenHitmon,
    checkboxState,
  )
  const fireRedState = getVersionTrackerState(entry, 'fire-red', trackerState)
  const leafGreenState = getVersionTrackerState(entry, 'leaf-green', trackerState)
  const singleVersionState =
    isCompactSingleVersion
      ? getVersionTrackerState(entry, singleVersionKey, trackerState)
      : null
  const singleVersionCellClass =
    singleVersionKey === 'leaf-green' ? 'leaf-green-cell' : 'fire-red-cell'

  return (
    <li
      className={`tracker-row pokemon-row ${
        isCompactSingleVersion ? 'tracker-row-single pokemon-row-single' : ''
      }`.trim()}
    >
      <div className="pokemon-label">
        {spriteSrc ? (
          entry.baseGameCompleteRequired ? (
            <span className="pokemon-sprite-frame" aria-hidden="true">
              <img
                className={`pokemon-sprite pokemon-sprite-postgame ${
                  compactPostgameSpriteNames.has(entry.name)
                    ? 'pokemon-sprite-postgame-compact'
                    : ''
                } ${
                  isJumping ? 'pokemon-sprite-jump' : ''
                }`}
                src={spriteSrc}
                alt=""
                loading="lazy"
              />
            </span>
          ) : (
            <img
              className={`pokemon-sprite ${isJumping ? 'pokemon-sprite-jump' : ''}`}
              src={spriteSrc}
              alt=""
              loading="lazy"
            />
          )
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
      </div>

      {singleVersionState ? (
        <div
          className={`checkbox-cell ${singleVersionCellClass} ${
            singleVersionState.locked ? 'checkbox-cell-locked' : ''
          }`}
        >
          <CheckboxGroup
            versionKey={singleVersionKey}
            pokemonId={pokemonId}
            checked={Boolean(checkboxState[`${singleVersionKey}-${pokemonId}`])}
            extraChecked={false}
            showExtraCopy={false}
            locked={singleVersionState.locked}
            updateCheckboxState={updateCheckboxState}
          />
        </div>
      ) : isPairedSingleVersionRow ? (
        <>
          <div
            className={`checkbox-cell fire-red-cell ${
              singleVersionKey !== 'fire-red' ? 'checkbox-cell-hidden' : ''
            } ${
              singleVersionKey === 'fire-red' && fireRedState.locked
                ? 'checkbox-cell-locked'
                : ''
            }`.trim()}
          >
            {singleVersionKey === 'fire-red' ? (
              <CheckboxGroup
                versionKey="fire-red"
                pokemonId={pokemonId}
                checked={Boolean(checkboxState[`fire-red-${pokemonId}`])}
                extraChecked={false}
                showExtraCopy={false}
                locked={fireRedState.locked}
                updateCheckboxState={updateCheckboxState}
              />
            ) : null}
          </div>

          <div
            className={`checkbox-cell leaf-green-cell ${
              singleVersionKey !== 'leaf-green' ? 'checkbox-cell-hidden' : ''
            } ${
              singleVersionKey === 'leaf-green' && leafGreenState.locked
                ? 'checkbox-cell-locked'
                : ''
            }`.trim()}
          >
            {singleVersionKey === 'leaf-green' ? (
              <CheckboxGroup
                versionKey="leaf-green"
                pokemonId={pokemonId}
                checked={Boolean(checkboxState[`leaf-green-${pokemonId}`])}
                extraChecked={false}
                showExtraCopy={false}
                locked={leafGreenState.locked}
                updateCheckboxState={updateCheckboxState}
              />
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div
            className={`checkbox-cell fire-red-cell ${
              fireRedState.locked ? 'checkbox-cell-locked' : ''
            }`}
          >
            <CheckboxGroup
              versionKey="fire-red"
              pokemonId={pokemonId}
              checked={Boolean(checkboxState[`fire-red-${pokemonId}`])}
              extraChecked={Boolean(checkboxState[`fire-red-extra-${pokemonId}`])}
              showExtraCopy={fireRedState.showExtraCopy}
              locked={fireRedState.locked}
              updateCheckboxState={updateCheckboxState}
            />
          </div>

          <div
            className={`checkbox-cell leaf-green-cell ${
              leafGreenState.locked ? 'checkbox-cell-locked' : ''
            }`}
          >
            <CheckboxGroup
              versionKey="leaf-green"
              pokemonId={pokemonId}
              checked={Boolean(checkboxState[`leaf-green-${pokemonId}`])}
              extraChecked={Boolean(checkboxState[`leaf-green-extra-${pokemonId}`])}
              showExtraCopy={leafGreenState.showExtraCopy}
              locked={leafGreenState.locked}
              updateCheckboxState={updateCheckboxState}
            />
          </div>
        </>
      )}

      <div className="comment-cell">
        {comment ? <span className="comment-text">{comment}</span> : null}
      </div>
    </li>
  )
}

export default PokemonRow
