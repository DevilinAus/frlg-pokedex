import { getSpriteSrc } from '../lib/sprites'

function TradeQueuePokemonCard({ token, tone }) {
  return (
    <div className={`trade-queue-pokemon trade-queue-pokemon-${tone}`}>
      <img
        className="trade-queue-sprite"
        src={getSpriteSrc(token.spriteSlug)}
        alt=""
        loading="lazy"
      />

      <div className="trade-queue-pokemon-copy">
        <strong>{token.name}</strong>
        <span className="trade-queue-pokemon-tag">{token.tagLabel}</span>
        {token.queueNote ? (
          <small className="trade-queue-pokemon-note">{token.queueNote}</small>
        ) : null}
      </div>
    </div>
  )
}

function getOverflowCopy(versionLabel, count) {
  if (count <= 0) {
    return ''
  }

  return `${versionLabel} has ${count} more ready Pokemon waiting for a match.`
}

function TradeQueueView({ tradeQueue, className = '', onCompleteTrade }) {
  const pairCount = tradeQueue.pairableCount
  const leafGreenOverflow = tradeQueue.unpairedByVersion['leaf-green'].length
  const fireRedOverflow = tradeQueue.unpairedByVersion['fire-red'].length
  const overflowCopy =
    getOverflowCopy('Leaf Green', leafGreenOverflow) ||
    getOverflowCopy('Fire Red', fireRedOverflow)

  return (
    <section className={`trade-view-panel ${className}`.trim()}>
      <div className="trade-view-header">
        <h2>Trade Queue</h2>
        <p>
          {pairCount} {pairCount === 1 ? 'trade is' : 'trades are'} ready to complete.
        </p>
      </div>

      <div className="trade-queue-column-labels" aria-hidden="true">
        <span className="leaf-green-heading">Leaf Green</span>
        <span />
        <span className="fire-red-heading">Fire Red</span>
        <span className="trade-queue-done-heading">Done</span>
      </div>

      <ol className="trade-queue-list">
        {tradeQueue.pairs.map((pair, index) => (
          <li key={`${pair.left.key}-${pair.right.key}`} className="trade-queue-row">
            <div className="trade-queue-row-top">
              <span className="trade-queue-row-number">{index + 1}</span>
            </div>

            <TradeQueuePokemonCard token={pair.left} tone="leaf-green" />

            <div className="trade-queue-arrow-lane" aria-hidden="true">
              <span className="trade-queue-arrow">↔</span>
            </div>

            <TradeQueuePokemonCard token={pair.right} tone="fire-red" />

            <label className="trade-queue-complete">
              <input
                type="checkbox"
                onChange={(event) => {
                  if (event.target.checked) {
                    onCompleteTrade?.(pair)
                  }
                }}
              />
              <span>Traded</span>
            </label>
          </li>
        ))}
      </ol>

      {overflowCopy ? <p className="trade-queue-overflow">{overflowCopy}</p> : null}
    </section>
  )
}

export default TradeQueueView
