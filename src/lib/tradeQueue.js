import { hasTradeQueueExtraCopy } from './pokedexHelpers'

function getTradeEvolutionTargetsBySource(pokemonList) {
  const targets = new Map()

  pokemonList.forEach((entry) => {
    if ((entry.tradeEvolution || entry.tradeEvolutionItem) && entry.evolvesFrom) {
      targets.set(entry.evolvesFrom, entry)
    }
  })

  return targets
}

export function getTradeConsumptionKey(versionKey, pokemonId) {
  return `${versionKey}-trade-consumed-${pokemonId}`
}

function getTradeEvolutionSourceNames(pokemonList) {
  const names = new Set(pokemonList.map((entry) => entry.name))
  const sources = new Set()

  pokemonList.forEach((entry) => {
    if ((entry.tradeEvolution || entry.tradeEvolutionItem) && entry.evolvesFrom && names.has(entry.evolvesFrom)) {
      sources.add(entry.evolvesFrom)
    }
  })

  return sources
}

function createTradeToken(entry, versionKey, type, receivedEntry) {
  const pokemonId = String(entry.id).padStart(3, '0')
  const isStarter = type === 'extra-copy' && Boolean(entry.starterFamily) && !entry.evolution

  return {
    key: `${versionKey}-${type}-${pokemonId}`,
    pokemonId,
    versionKey,
    type,
    id: entry.id,
    name: entry.name,
    spriteSlug: entry.spriteSlug,
    isStarter,
    receivedPokemonId: String(receivedEntry.id).padStart(3, '0'),
    receivedName: receivedEntry.name,
    receivedSpriteSlug: receivedEntry.spriteSlug,
    tagLabel:
      type === 'trade-evolution'
        ? 'Trade evo'
        : isStarter
          ? 'Starter'
          : 'Extra copy',
  }
}

function buildTradeReadyTokensForVersion(versionKey, pokemonList, checkboxState, trackerState) {
  const tradeEvolutionSourceNames = getTradeEvolutionSourceNames(pokemonList)
  const tradeEvolutionTargets = getTradeEvolutionTargetsBySource(pokemonList)
  const tokens = []

  pokemonList.forEach((entry) => {
    const pokemonId = String(entry.id).padStart(3, '0')

    if (
      hasTradeQueueExtraCopy(entry, versionKey, trackerState) &&
      checkboxState[`${versionKey}-extra-${pokemonId}`]
    ) {
      tokens.push(createTradeToken(entry, versionKey, 'extra-copy', entry))
    }

    if (
      tradeEvolutionSourceNames.has(entry.name) &&
      checkboxState[`${versionKey}-${pokemonId}`] &&
      !checkboxState[getTradeConsumptionKey(versionKey, pokemonId)]
    ) {
      tokens.push(
        createTradeToken(
          entry,
          versionKey,
          'trade-evolution',
          tradeEvolutionTargets.get(entry.name) ?? entry,
        ),
      )
    }
  })

  return tokens.sort((leftToken, rightToken) => {
    if (leftToken.id !== rightToken.id) {
      return leftToken.id - rightToken.id
    }

    return leftToken.name.localeCompare(rightToken.name)
  })
}

function buildPair(leftToken, rightToken, reason) {
  return {
    left: leftToken,
    right: rightToken,
    reason,
  }
}

function isBetterCandidate(candidate, bestCandidate) {
  if (!bestCandidate) {
    return true
  }

  if (candidate.score !== bestCandidate.score) {
    return candidate.score < bestCandidate.score
  }

  if (candidate.leftToken.id !== bestCandidate.leftToken.id) {
    return candidate.leftToken.id < bestCandidate.leftToken.id
  }

  if (candidate.rightToken.id !== bestCandidate.rightToken.id) {
    return candidate.rightToken.id < bestCandidate.rightToken.id
  }

  return candidate.leftToken.name.localeCompare(bestCandidate.leftToken.name) < 0
}

function pullPairs(leftTokens, rightTokens, matchFn, reason) {
  const pairs = []

  while (true) {
    let bestCandidate = null

    leftTokens.forEach((leftToken, leftIndex) => {
      rightTokens.forEach((rightToken, rightIndex) => {
        if (!matchFn(leftToken, rightToken)) {
          return
        }

        const candidate = {
          leftIndex,
          rightIndex,
          leftToken,
          rightToken,
          score: Math.abs(leftToken.id - rightToken.id),
        }

        if (isBetterCandidate(candidate, bestCandidate)) {
          bestCandidate = candidate
        }
      })
    })

    if (!bestCandidate) {
      return pairs
    }

    const { leftIndex, rightIndex, leftToken, rightToken } = bestCandidate

    pairs.push(
      buildPair(
        leftToken,
        rightToken,
        typeof reason === 'function' ? reason(leftToken, rightToken) : reason,
      ),
    )
    leftTokens.splice(leftIndex, 1)
    rightTokens.splice(rightIndex, 1)
  }
}

export function buildTradeQueue(
  pokemonList,
  checkboxState,
  trackerState,
  {
    leftVersionKey = 'leaf-green',
    rightVersionKey = 'fire-red',
  } = {},
) {
  const readyByVersion = {
    [leftVersionKey]: buildTradeReadyTokensForVersion(
      leftVersionKey,
      pokemonList,
      checkboxState,
      trackerState,
    ),
    [rightVersionKey]: buildTradeReadyTokensForVersion(
      rightVersionKey,
      pokemonList,
      checkboxState,
      trackerState,
    ),
  }
  const leftRemaining = [...readyByVersion[leftVersionKey]]
  const rightRemaining = [...readyByVersion[rightVersionKey]]
  const pairs = [
    ...pullPairs(
      leftRemaining,
      rightRemaining,
      (leftToken, rightToken) => leftToken.isStarter && rightToken.isStarter,
      'Starter swap',
    ),
    ...pullPairs(
      leftRemaining,
      rightRemaining,
      (leftToken, rightToken) => leftToken.name === rightToken.name,
      'Same Pokemon',
    ),
    ...pullPairs(leftRemaining, rightRemaining, () => true, 'Closest dex match'),
  ]

  return {
    pairs,
    pairableCount: pairs.length,
    readyByVersion,
    unpairedByVersion: {
      [leftVersionKey]: leftRemaining,
      [rightVersionKey]: rightRemaining,
    },
  }
}
