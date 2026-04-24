import { getSpriteSrc } from '../lib/sprites'

function GoalFocusCard({ title, goal, emptyCopy, tone }) {
  return (
    <section className={`goal-focus-card goal-focus-card-${tone}`}>
      <div className="goal-focus-header">
        <span className="goal-focus-title">{title}</span>
        {goal ? <span className="goal-focus-badge">{goal.badgeLabel}</span> : null}
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
            <strong>{goal.sourceEntry.name}</strong>
            <p>
              {goal.type === 'party'
                ? `Keep ${goal.sourceEntry.name} in the party with XP Share.`
                : `Hunt ${goal.sourceEntry.name}.`}{' '}
              {goal.detailCopy}
            </p>
          </div>
        </div>
      ) : (
        <p className="goal-focus-empty">{emptyCopy}</p>
      )}
    </section>
  )
}

function GoalsVersionCard({ panel }) {
  return (
    <section className={`goals-version-card goals-version-card-${panel.versionKey}`}>
      <h3 className={panel.headingClass}>{panel.label}</h3>

      <div className="goal-focus-grid">
        <GoalFocusCard
          title="Hunt Next"
          goal={panel.huntGoal}
          emptyCopy="No strong hunt target right now."
          tone="hunt"
        />

        <GoalFocusCard
          title="XP Share Target"
          goal={panel.partyGoal}
          emptyCopy="Nothing needs leveling right now."
          tone="party"
        />
      </div>
    </section>
  )
}

function GoalsView({ panels, className = '' }) {
  const goalCount = panels.reduce(
    (count, panel) => count + Number(Boolean(panel.huntGoal)) + Number(Boolean(panel.partyGoal)),
    0,
  )

  return (
    <section className={`trade-view-panel ${className}`.trim()}>
      <div className="trade-view-header">
        <h2>Goals</h2>
        <p>
          {goalCount > 0
            ? 'Plan the next hunt and the best XP Share target for each active save.'
            : 'No leveling goals are active right now. You are clear to keep catching, trading, or tidy up optional lines.'}
        </p>
      </div>

      <div className={`goals-grid ${panels.length === 1 ? 'goals-grid-single' : ''}`.trim()}>
        {panels.map((panel) => (
          <GoalsVersionCard key={panel.versionKey} panel={panel} />
        ))}
      </div>
    </section>
  )
}

export default GoalsView
