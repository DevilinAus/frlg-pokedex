import { getItemDbUrl, getPokemonDbUrl } from '../lib/pokedexHelpers'
import { getOwnedHeldTradeItemForMode } from '../lib/heldTradeItems'
import { getSpriteSrc } from '../lib/sprites'

function GoalPokemonLink({ entry }) {
  return (
    <a
      className="goal-focus-link"
      href={getPokemonDbUrl(entry)}
      target="_blank"
      rel="noreferrer"
    >
      {entry.name}
    </a>
  )
}

function GoalItemLink({ itemName }) {
  return (
    <a
      className="goal-focus-link"
      href={getItemDbUrl(itemName)}
      target="_blank"
      rel="noreferrer"
    >
      {itemName}
    </a>
  )
}

function GoalFocusCard({
  title,
  goal,
  emptyCopy,
  tone,
  checkboxState,
  updateCheckboxState,
  ownedHeldTradeItems,
  ownedGames,
  updateOwnedHeldTradeItem,
}) {
  const actionChecked = goal
    ? goal.type === 'hunt'
      ? Boolean(checkboxState[goal.sourceCaughtKey])
      : goal.type === 'item'
        ? getOwnedHeldTradeItemForMode(
            ownedHeldTradeItems,
            goal.versionKey,
            goal.heldItemName,
            ownedGames,
          )
        : Boolean(checkboxState[goal.targetCaughtKey])
    : false
  const shouldShowBadge = Boolean(goal?.badgeLabel) && goal.type !== 'party'

  function handleActionChange(nextChecked) {
    if (!goal) {
      return
    }

    if (goal.type === 'hunt') {
      updateCheckboxState(goal.sourceCaughtKey, nextChecked)
      return
    }

    if (goal.type === 'item') {
      updateOwnedHeldTradeItem(
        ownedGames === 'both' ? 'both' : goal.versionKey,
        goal.heldItemName,
        nextChecked,
      )
      return
    }

    updateCheckboxState(goal.targetCaughtKey, nextChecked)
  }

  return (
    <section className={`goal-focus-card goal-focus-card-${tone}`}>
      <div className="goal-focus-header">
        <span className="goal-focus-title">{title}</span>
        {shouldShowBadge ? <span className="goal-focus-badge">{goal.badgeLabel}</span> : null}
      </div>

      {goal ? (
        <div className="goal-focus-main">
          <div className="goal-focus-identity">
            <div className="goal-focus-sprite-shell">
              <img
                className="goal-focus-sprite"
                src={getSpriteSrc(goal.sourceEntry.spriteSlug)}
                alt=""
                loading="lazy"
              />
            </div>

            <div className="goal-focus-copy">
              <strong>
                {goal.type === 'item' ? (
                  <GoalItemLink itemName={goal.heldItemName} />
                ) : (
                  <GoalPokemonLink entry={goal.sourceEntry} />
                )}
              </strong>

              {goal.type === 'party' ? (
                <>
                  <div className="goal-focus-evolution">
                    <span className="goal-focus-evolution-label">Next evo</span>
                    <div className="goal-focus-evolution-copy">
                      <GoalPokemonLink entry={goal.targetEntry} />
                      <span className="goal-focus-level">{goal.levelLabel}</span>
                    </div>
                  </div>
                </>
              ) : goal.type === 'item' ? (
                <>
                  <div className="goal-focus-evolution">
                    <span className="goal-focus-evolution-label">Trade unlock</span>
                    <div className="goal-focus-evolution-copy">
                      <GoalPokemonLink entry={goal.sourceEntry} />
                      <span className="goal-focus-arrow" aria-hidden="true">
                        →
                      </span>
                      <GoalPokemonLink entry={goal.targetEntry} />
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <label className={`goal-focus-action goal-focus-action-${tone}`}>
            <input
              type="checkbox"
              checked={actionChecked}
              onChange={(event) => handleActionChange(event.target.checked)}
            />
            <span>
              {goal.type === 'hunt'
                ? 'Caught'
                : goal.type === 'item'
                  ? 'Owned'
                  : 'Evolved'}
            </span>
          </label>
        </div>
      ) : (
        <p className="goal-focus-empty">{emptyCopy}</p>
      )}
    </section>
  )
}

function GoalsVersionCard({
  panel,
  checkboxState,
  updateCheckboxState,
  ownedHeldTradeItems,
  ownedGames,
  updateOwnedHeldTradeItem,
  showVersionLabel,
}) {
  return (
    <section
      className={`goals-version-card ${
        showVersionLabel ? '' : 'goals-version-card-single'
      } goals-version-card-${panel.versionKey}`.trim()}
    >
      {showVersionLabel ? <h3 className={panel.headingClass}>{panel.label}</h3> : null}

      <div className="goal-focus-grid">
        <GoalFocusCard
          title="Hunt Next"
          goal={panel.huntGoal}
          emptyCopy="No strong hunt target right now."
          tone="hunt"
          checkboxState={checkboxState}
          updateCheckboxState={updateCheckboxState}
          ownedHeldTradeItems={ownedHeldTradeItems}
          ownedGames={ownedGames}
          updateOwnedHeldTradeItem={updateOwnedHeldTradeItem}
        />

        {panel.xpShareUnlocked ? (
          <GoalFocusCard
            title="XP Share Target"
            goal={panel.partyGoal}
            emptyCopy="Nothing needs leveling right now."
            tone="party"
            checkboxState={checkboxState}
            updateCheckboxState={updateCheckboxState}
            ownedHeldTradeItems={ownedHeldTradeItems}
            ownedGames={ownedGames}
            updateOwnedHeldTradeItem={updateOwnedHeldTradeItem}
          />
        ) : null}

        {panel.itemGoal ? (
          <GoalFocusCard
            title="Retrieve Item"
            goal={panel.itemGoal}
            emptyCopy="No held item is blocking a trade right now."
            tone="item"
            checkboxState={checkboxState}
            updateCheckboxState={updateCheckboxState}
            ownedHeldTradeItems={ownedHeldTradeItems}
            ownedGames={ownedGames}
            updateOwnedHeldTradeItem={updateOwnedHeldTradeItem}
          />
        ) : null}
      </div>
    </section>
  )
}

function GoalsView({
  panels,
  className = '',
  checkboxState,
  updateCheckboxState,
  ownedHeldTradeItems,
  ownedGames,
  updateOwnedHeldTradeItem,
}) {
  const showVersionLabel = panels.length > 1

  return (
    <section className={`trade-view-panel ${className}`.trim()}>
      <div className="trade-view-header">
        <h2>Goals</h2>
      </div>

      <div className={`goals-grid ${panels.length === 1 ? 'goals-grid-single' : ''}`.trim()}>
        {panels.map((panel) => (
          <GoalsVersionCard
            key={panel.versionKey}
            panel={panel}
            checkboxState={checkboxState}
            updateCheckboxState={updateCheckboxState}
            ownedHeldTradeItems={ownedHeldTradeItems}
            ownedGames={ownedGames}
            updateOwnedHeldTradeItem={updateOwnedHeldTradeItem}
            showVersionLabel={showVersionLabel}
          />
        ))}
      </div>
    </section>
  )
}

export default GoalsView
