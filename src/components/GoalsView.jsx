import { getPokemonDbUrl } from '../lib/pokedexHelpers'
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

function GoalFocusCard({
  title,
  goal,
  emptyCopy,
  tone,
  checkboxState,
  updateCheckboxState,
}) {
  const actionChecked = goal
    ? Boolean(
        checkboxState[goal.type === 'hunt' ? goal.sourceCaughtKey : goal.targetCaughtKey],
      )
    : false

  return (
    <section className={`goal-focus-card goal-focus-card-${tone}`}>
      <div className="goal-focus-header">
        <span className="goal-focus-title">{title}</span>
        {goal?.badgeLabel ? <span className="goal-focus-badge">{goal.badgeLabel}</span> : null}
      </div>

      {goal ? (
        <div className="goal-focus-body">
          <img
            className="goal-focus-sprite"
            src={getSpriteSrc(goal.sourceEntry.spriteSlug)}
            alt=""
            loading="lazy"
          />

          <div className="goal-focus-copy">
            <strong>
              <GoalPokemonLink entry={goal.sourceEntry} />
            </strong>

            {goal.type === 'hunt' ? (
              <label className="goal-focus-toggle">
                <input
                  type="checkbox"
                  checked={actionChecked}
                  onChange={(event) =>
                    updateCheckboxState(goal.sourceCaughtKey, event.target.checked)
                  }
                />
                <span>Caught</span>
              </label>
            ) : (
              <>
                <div className="goal-focus-evolution">
                  <div className="goal-focus-evolution-copy">
                    <GoalPokemonLink entry={goal.targetEntry} />
                    <span className="goal-focus-level">{goal.levelLabel}</span>
                  </div>

                  <label className="goal-focus-toggle">
                    <input
                      type="checkbox"
                      checked={actionChecked}
                      onChange={(event) =>
                        updateCheckboxState(goal.targetCaughtKey, event.target.checked)
                      }
                    />
                    <span>Evolved</span>
                  </label>
                </div>

                {goal.tradeFollowUpCopy ? (
                  <p className="goal-focus-note">{goal.tradeFollowUpCopy}</p>
                ) : null}
              </>
            )}
          </div>
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
  showVersionLabel,
}) {
  const partyEmptyCopy = panel.xpShareUnlocked
    ? 'Nothing needs leveling right now.'
    : `XP Share unlocks after 50 Pokemon. Catch ${panel.xpShareRemaining} more first.`

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
        />

        <GoalFocusCard
          title="XP Share Target"
          goal={panel.partyGoal}
          emptyCopy={partyEmptyCopy}
          tone="party"
          checkboxState={checkboxState}
          updateCheckboxState={updateCheckboxState}
        />
      </div>
    </section>
  )
}

function GoalsView({ panels, className = '', checkboxState, updateCheckboxState }) {
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
            showVersionLabel={showVersionLabel}
          />
        ))}
      </div>
    </section>
  )
}

export default GoalsView
