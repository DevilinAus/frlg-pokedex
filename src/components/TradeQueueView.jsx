import { useState } from 'react'

import { getSpriteSrc } from '../lib/sprites'

function TradeQueuePokemonCard({ token, tone, onUpdateHeldTradeItem }) {
  const itemCopy = token.heldItemOwned ? 'Hold' : 'Needs'

  return (
    <div
      className={`trade-queue-pokemon trade-queue-pokemon-${tone} ${
        token.heldItemName ? 'trade-queue-pokemon-held-item' : ''
      } ${
        token.heldItemName && !token.heldItemOwned ? 'trade-queue-pokemon-held-item-missing' : ''
      }`.trim()}
    >
      <img
        className="trade-queue-sprite"
        src={getSpriteSrc(token.spriteSlug)}
        alt=""
        loading="lazy"
      />

      <div className="trade-queue-pokemon-copy">
        <strong>{token.name}</strong>
        {token.heldItemName ? (
          <div className="trade-queue-item-row">
            <small
              className={`trade-queue-pokemon-item ${
                token.heldItemOwned ? '' : 'trade-queue-pokemon-item-missing'
              }`.trim()}
            >
              <span>{itemCopy}</span>
              <a
                className="trade-queue-item-link"
                href={token.heldItemUrl}
                target="_blank"
                rel="noreferrer"
              >
                {token.heldItemName}
              </a>
            </small>
            {!token.heldItemOwned ? (
              <label className="trade-queue-item-toggle">
                <input
                  type="checkbox"
                  checked={Boolean(token.heldItemOwned)}
                  onChange={(event) =>
                    onUpdateHeldTradeItem?.(token.heldItemName, event.target.checked)
                  }
                />
                <span>Item acquired</span>
              </label>
            ) : null}
          </div>
        ) : null}
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

  return `${versionLabel} has ${count} more Pokemon waiting for a match.`
}

function getTradePairKey(pair) {
  return `${pair.left.key}-${pair.right.key}`
}

function getStablePairOrder(currentOrder, pairs) {
  const incomingKeys = pairs.map(getTradePairKey)
  const incomingKeySet = new Set(incomingKeys)
  const nextOrder = currentOrder.filter((key) => incomingKeySet.has(key))
  const nextOrderSet = new Set(nextOrder)

  incomingKeys.forEach((key) => {
    if (!nextOrderSet.has(key)) {
      nextOrder.push(key)
      nextOrderSet.add(key)
    }
  })

  return nextOrder
}

function orderTradePairs(pairs, pairOrder) {
  const pairsByKey = new Map(pairs.map((pair) => [getTradePairKey(pair), pair]))
  const orderedPairs = []

  pairOrder.forEach((key) => {
    const pair = pairsByKey.get(key)

    if (pair) {
      orderedPairs.push(pair)
      pairsByKey.delete(key)
    }
  })

  pairs.forEach((pair) => {
    const key = getTradePairKey(pair)

    if (pairsByKey.has(key)) {
      orderedPairs.push(pair)
      pairsByKey.delete(key)
    }
  })

  return orderedPairs
}

function TradeQueueView({
  tradeQueue,
  className = '',
  onCompleteTrade,
  onUpdateHeldTradeItem,
}) {
  const [pairOrder, setPairOrder] = useState(() => tradeQueue.pairs.map(getTradePairKey))
  const leafGreenOverflow = tradeQueue.unpairedByVersion['leaf-green'].length
  const fireRedOverflow = tradeQueue.unpairedByVersion['fire-red'].length
  const stablePairOrder = getStablePairOrder(pairOrder, tradeQueue.pairs)
  const visiblePairs = orderTradePairs(tradeQueue.pairs, stablePairOrder)
  const overflowCopy =
    getOverflowCopy('Leaf Green', leafGreenOverflow) ||
    getOverflowCopy('Fire Red', fireRedOverflow)

  function rememberVisiblePairOrder() {
    setPairOrder(visiblePairs.map(getTradePairKey))
  }

  function handleUpdateHeldTradeItem(itemName, isOwned) {
    rememberVisiblePairOrder()
    onUpdateHeldTradeItem?.(itemName, isOwned)
  }

  return (
    <section className={`trade-view-panel ${className}`.trim()}>
      <div className="trade-view-header">
        <h2>Trade Queue</h2>
      </div>

      <div className="trade-queue-column-labels" aria-hidden="true">
        <span className="leaf-green-heading">Leaf Green</span>
        <span />
        <span className="fire-red-heading">Fire Red</span>
        <span className="trade-queue-done-heading">Done</span>
      </div>

      <ol className="trade-queue-list">
        {visiblePairs.map((pair, index) => (
          <li
            key={`${pair.left.key}-${pair.right.key}`}
            className={`trade-queue-row ${
              pair.requiresHeldItem ? 'trade-queue-row-held-item' : ''
            }`.trim()}
          >
            <div className="trade-queue-row-top">
              <span className="trade-queue-row-number">{index + 1}</span>
              {pair.requiresHeldItem && !pair.isReady ? (
                <span className="trade-queue-row-flag trade-queue-row-flag-blocked">
                  Needs item
                </span>
              ) : null}
            </div>

            <TradeQueuePokemonCard
              token={pair.left}
              tone="leaf-green"
              onUpdateHeldTradeItem={handleUpdateHeldTradeItem}
            />

            <div className="trade-queue-arrow-lane" aria-hidden="true">
              <span className="trade-queue-arrow">↔</span>
            </div>

            <TradeQueuePokemonCard
              token={pair.right}
              tone="fire-red"
              onUpdateHeldTradeItem={handleUpdateHeldTradeItem}
            />

            <label className="trade-queue-complete">
              <input
                type="checkbox"
                disabled={!pair.isReady}
                onChange={(event) => {
                  if (event.target.checked) {
                    rememberVisiblePairOrder()
                    onCompleteTrade?.(pair)
                  }
                }}
              />
              <span>{pair.isReady ? 'Traded' : 'Blocked'}</span>
            </label>
          </li>
        ))}
      </ol>

      {overflowCopy ? <p className="trade-queue-overflow">{overflowCopy}</p> : null}
    </section>
  )
}

export default TradeQueueView
