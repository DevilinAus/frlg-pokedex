import { Fragment, useState } from 'react'

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
                    onUpdateHeldTradeItem?.(
                      token.versionKey,
                      token.heldItemName,
                      event.target.checked,
                    )
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

function getOverflowSections(tradeQueue) {
  return [
    {
      versionKey: 'fire-red',
      versionLabel: 'Fire Red',
      tokens: tradeQueue.unpairedByVersion['fire-red'] ?? [],
    },
    {
      versionKey: 'leaf-green',
      versionLabel: 'Leaf Green',
      tokens: tradeQueue.unpairedByVersion['leaf-green'] ?? [],
    },
  ].filter(({ tokens }) => tokens.length > 0)
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
  const [expandedOverflowByVersion, setExpandedOverflowByVersion] = useState({})
  const stablePairOrder = getStablePairOrder(pairOrder, tradeQueue.pairs)
  const visiblePairs = orderTradePairs(tradeQueue.pairs, stablePairOrder)
  const overflowSections = getOverflowSections(tradeQueue)

  function rememberVisiblePairOrder() {
    setPairOrder(visiblePairs.map(getTradePairKey))
  }

  function handleUpdateHeldTradeItem(versionKey, itemName, isOwned) {
    rememberVisiblePairOrder()
    onUpdateHeldTradeItem?.(versionKey, itemName, isOwned)
  }

  function handleToggleOverflow(versionKey) {
    setExpandedOverflowByVersion((currentState) => ({
      ...currentState,
      [versionKey]: !currentState[versionKey],
    }))
  }

  return (
    <section className={`trade-view-panel ${className}`.trim()}>
      <div className="trade-view-header">
        <h2>Trade Queue</h2>
      </div>

      <div className="trade-queue-column-labels" aria-hidden="true">
        <span className="fire-red-heading">Fire Red</span>
        <span />
        <span className="leaf-green-heading">Leaf Green</span>
        <span />
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
              tone="fire-red"
              onUpdateHeldTradeItem={handleUpdateHeldTradeItem}
            />

            <div className="trade-queue-arrow-lane" aria-hidden="true">
              <span className="trade-queue-arrow">↔</span>
            </div>

            <TradeQueuePokemonCard
              token={pair.right}
              tone="leaf-green"
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

      {overflowSections.length > 0
        ? overflowSections.map(({ versionKey, versionLabel, tokens }) => {
            const isExpanded = Boolean(expandedOverflowByVersion[versionKey])

            return (
              <p key={versionKey} className="trade-queue-overflow">
                <button
                  type="button"
                  className="trade-queue-overflow-toggle"
                  onClick={() => handleToggleOverflow(versionKey)}
                  aria-expanded={isExpanded}
                >
                  <span>{versionLabel} has </span>
                  <span className="trade-queue-overflow-accent">
                    {tokens.length} more Pokemon
                  </span>
                  <span> waiting for a match.</span>
                </button>

                {isExpanded ? (
                  <>
                    <br />
                    {tokens.map((token, index) => (
                      <Fragment key={token.key}>
                        {index > 0 ? <br /> : null}
                        {'\u2022 '}
                        {token.name}
                      </Fragment>
                    ))}
                  </>
                ) : null}
              </p>
            )
          })
        : null}
    </section>
  )
}

export default TradeQueueView
