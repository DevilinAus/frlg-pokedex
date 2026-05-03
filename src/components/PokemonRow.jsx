import {
  getComment,
  getPokemonDbUrl,
  getVersionTrackerState,
} from '../lib/pokedexHelpers'

const compactPostgameSpriteNames = new Set(['Deoxys', 'Ho-Oh', 'Lugia', 'Steelix'])
const pendingChoiceLabels = {
  starter: 'starter',
  fossil: 'fossil',
  hitmon: 'Hitmon',
}

function buildPendingChoiceComment(pendingChoiceTypes) {
  if (!pendingChoiceTypes.length) {
    return ''
  }

  const uniquePendingChoiceTypes = [...new Set(pendingChoiceTypes)]

  if (uniquePendingChoiceTypes.length > 1) {
    return 'Finish the pending Pokedex Decisions to unlock these greyed boxes.'
  }

  const choiceLabel = pendingChoiceLabels[uniquePendingChoiceTypes[0]]

  return pendingChoiceTypes.length > 1
    ? `Choose a ${choiceLabel} in Pokedex Decisions to unlock both greyed boxes.`
    : `Choose a ${choiceLabel} in Pokedex Decisions to unlock the greyed box.`
}

function CheckboxGroup({
  versionKey,
  pokemonId,
  checked,
  extraChecked,
  showExtraCopy,
  locked,
  lockHint,
  updateCheckboxState,
}) {
  if (showExtraCopy) {
    return (
      <div className="capture-boxes" title={lockHint || undefined}>
        <label className="capture-box" title={lockHint || undefined}>
          <span className="capture-label">1</span>
          <input
            id={`${versionKey}-${pokemonId}`}
            type="checkbox"
            checked={checked}
            onChange={(event) =>
              updateCheckboxState(`${versionKey}-${pokemonId}`, event.target.checked)
            }
            disabled={locked}
            title={lockHint || undefined}
          />
        </label>

        <label className="capture-box extra-copy-box" title={lockHint || undefined}>
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
            title={lockHint || undefined}
          />
        </label>
      </div>
    )
  }

  return (
    <div className="single-capture-box" title={lockHint || undefined}>
      <input
        id={`${versionKey}-${pokemonId}`}
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          updateCheckboxState(`${versionKey}-${pokemonId}`, event.target.checked)
        }
        disabled={locked}
        title={lockHint || undefined}
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
  const visibleStates =
    singleVersionState
      ? [singleVersionState]
      : isPairedSingleVersionRow
        ? [singleVersionKey === 'leaf-green' ? leafGreenState : fireRedState]
        : [fireRedState, leafGreenState]
  const pendingChoiceComment = buildPendingChoiceComment(
    visibleStates
      .map((state) => state.pendingChoiceType)
      .filter(Boolean),
  )
  const displayComment = comment || pendingChoiceComment

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
          title={singleVersionState.lockHint || undefined}
        >
          <CheckboxGroup
            versionKey={singleVersionKey}
            pokemonId={pokemonId}
            checked={Boolean(checkboxState[`${singleVersionKey}-${pokemonId}`])}
            extraChecked={false}
            showExtraCopy={false}
            locked={singleVersionState.locked}
            lockHint={singleVersionState.lockHint}
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
            title={
              singleVersionKey === 'fire-red'
                ? fireRedState.lockHint || undefined
                : undefined
            }
          >
            {singleVersionKey === 'fire-red' ? (
              <CheckboxGroup
                versionKey="fire-red"
                pokemonId={pokemonId}
                checked={Boolean(checkboxState[`fire-red-${pokemonId}`])}
                extraChecked={false}
                showExtraCopy={false}
                locked={fireRedState.locked}
                lockHint={fireRedState.lockHint}
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
            title={
              singleVersionKey === 'leaf-green'
                ? leafGreenState.lockHint || undefined
                : undefined
            }
          >
            {singleVersionKey === 'leaf-green' ? (
              <CheckboxGroup
                versionKey="leaf-green"
                pokemonId={pokemonId}
                checked={Boolean(checkboxState[`leaf-green-${pokemonId}`])}
                extraChecked={false}
                showExtraCopy={false}
                locked={leafGreenState.locked}
                lockHint={leafGreenState.lockHint}
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
            title={fireRedState.lockHint || undefined}
          >
            <CheckboxGroup
              versionKey="fire-red"
              pokemonId={pokemonId}
              checked={Boolean(checkboxState[`fire-red-${pokemonId}`])}
              extraChecked={Boolean(checkboxState[`fire-red-extra-${pokemonId}`])}
              showExtraCopy={fireRedState.showExtraCopy}
              locked={fireRedState.locked}
              lockHint={fireRedState.lockHint}
              updateCheckboxState={updateCheckboxState}
            />
          </div>

          <div
            className={`checkbox-cell leaf-green-cell ${
              leafGreenState.locked ? 'checkbox-cell-locked' : ''
            }`}
            title={leafGreenState.lockHint || undefined}
          >
            <CheckboxGroup
              versionKey="leaf-green"
              pokemonId={pokemonId}
              checked={Boolean(checkboxState[`leaf-green-${pokemonId}`])}
              extraChecked={Boolean(checkboxState[`leaf-green-extra-${pokemonId}`])}
              showExtraCopy={leafGreenState.showExtraCopy}
              locked={leafGreenState.locked}
              lockHint={leafGreenState.lockHint}
              updateCheckboxState={updateCheckboxState}
            />
          </div>
        </>
      )}

      <div className="comment-cell">
        {displayComment ? <span className="comment-text">{displayComment}</span> : null}
      </div>
    </li>
  )
}

export default PokemonRow
