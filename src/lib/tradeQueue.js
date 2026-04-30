import { getItemDbUrl, hasTradeQueueExtraCopy } from './pokedexHelpers.js'
import { getPairedTradeFamilyState } from './pairedTradeFamilies.js'

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

function createTradeToken(entry, versionKey, type, receivedEntry, trackerState) {
  const pokemonId = String(entry.id).padStart(3, '0')
  const isStarter = type === 'extra-copy' && Boolean(entry.starterFamily) && !entry.evolution
  const heldItemName =
    type === 'trade-evolution' ? receivedEntry.tradeEvolutionItem ?? null : null
  const heldItemUrl = heldItemName ? getItemDbUrl(heldItemName) : ''
  const heldItemOwned = heldItemName
    ? Boolean(trackerState.ownedHeldTradeItems?.[heldItemName])
    : true

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
    heldItemName,
    heldItemUrl,
    heldItemOwned,
    tagLabel:
      type === 'trade-evolution'
        ? heldItemName
          ? 'Trade item'
          : 'Trade evo'
        : isStarter
          ? 'Starter'
          : 'Extra copy',
  }
}

function withQueueNote(token, queueNote) {
  if (!queueNote) {
    return token
  }

  return {
    ...token,
    queueNote,
  }
}

function getFamilyTradeChoiceNote(familyState) {
  return `${familyState.preferredTradeName} or ${familyState.babyName}`
}

function applyPairedTradeFamilyRules(tokens, targetVersionKey, checkboxState) {
  let nextTokens = [...tokens]
  const familyTokensByKey = new Map()

  nextTokens.forEach((token) => {
    if (token.type !== 'extra-copy') {
      return
    }

    const familyState = getPairedTradeFamilyState(token.name, targetVersionKey, checkboxState)

    if (!familyState) {
      return
    }

    const existingFamily = familyTokensByKey.get(familyState.key)

    if (existingFamily) {
      existingFamily.tokens.push(token)
      return
    }

    familyTokensByKey.set(familyState.key, {
      familyState,
      tokens: [token],
    })
  })

  familyTokensByKey.forEach(({ familyState, tokens: familyTokens }) => {
    if (familyState.hasBoth) {
      return
    }

    const familyTokenKeys = new Set(familyTokens.map((token) => token.key))

    if (!familyState.hasAny) {
      const chosenToken =
        familyTokens.find((token) => token.name === familyState.preferredTradeName) ??
        familyTokens[0]

      nextTokens = nextTokens
        .filter((token) => !familyTokenKeys.has(token.key) || token.key === chosenToken.key)
        .map((token) =>
          token.key === chosenToken.key
            ? withQueueNote(
                token,
                getFamilyTradeChoiceNote(familyState),
              )
            : token,
        )

      return
    }

    nextTokens = nextTokens
      .filter(
        (token) =>
          !familyTokenKeys.has(token.key) || token.name === familyState.missingName,
      )
      .map((token) =>
        familyTokenKeys.has(token.key) && token.name === familyState.missingName
          ? withQueueNote(
              token,
              getFamilyTradeChoiceNote(familyState),
            )
          : token,
      )
  })

  return nextTokens
}

function buildTradeReadyTokensForVersion(
  versionKey,
  targetVersionKey,
  pokemonList,
  checkboxState,
  trackerState,
) {
  const tradeEvolutionSourceNames = getTradeEvolutionSourceNames(pokemonList)
  const tradeEvolutionTargets = getTradeEvolutionTargetsBySource(pokemonList)
  const tokens = []

  pokemonList.forEach((entry) => {
    const pokemonId = String(entry.id).padStart(3, '0')

    if (
      hasTradeQueueExtraCopy(entry, versionKey, trackerState) &&
      checkboxState[`${versionKey}-extra-${pokemonId}`]
    ) {
      tokens.push(createTradeToken(entry, versionKey, 'extra-copy', entry, trackerState))
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
          trackerState,
        ),
      )
    }
  })

  return applyPairedTradeFamilyRules(tokens, targetVersionKey, checkboxState).sort(
    (leftToken, rightToken) => {
      const leftBlocked = Number(!leftToken.heldItemOwned)
      const rightBlocked = Number(!rightToken.heldItemOwned)

      if (leftBlocked !== rightBlocked) {
        return leftBlocked - rightBlocked
      }

      const leftNeedsItem = Number(Boolean(leftToken.heldItemName))
      const rightNeedsItem = Number(Boolean(rightToken.heldItemName))

      if (leftNeedsItem !== rightNeedsItem) {
        return leftNeedsItem - rightNeedsItem
      }

      if (leftToken.id !== rightToken.id) {
        return leftToken.id - rightToken.id
      }

      return leftToken.name.localeCompare(rightToken.name)
    },
  )
}

function buildPair(leftToken, rightToken) {
  const missingHeldItemNames = [...new Set(
    [leftToken, rightToken]
      .filter((token) => token.heldItemName && !token.heldItemOwned)
      .map((token) => token.heldItemName),
  )]

  return {
    left: leftToken,
    right: rightToken,
    requiresHeldItem: Boolean(leftToken.heldItemName || rightToken.heldItemName),
    missingHeldItemNames,
    isReady: missingHeldItemNames.length === 0,
  }
}

function isHeldItemToken(token) {
  return Boolean(token.heldItemName)
}

function isPlainTradeEvolutionToken(token) {
  return token.type === 'trade-evolution' && !isHeldItemToken(token)
}

function isExtraCopyToken(token) {
  return token.type === 'extra-copy'
}

function isNonHeldItemToken(token) {
  return !isHeldItemToken(token)
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

function pullPairs(leftTokens, rightTokens, matchFn) {
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

    pairs.push(buildPair(leftToken, rightToken))
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
      rightVersionKey,
      pokemonList,
      checkboxState,
      trackerState,
    ),
    [rightVersionKey]: buildTradeReadyTokensForVersion(
      rightVersionKey,
      leftVersionKey,
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
    ),
    ...pullPairs(
      leftRemaining,
      rightRemaining,
      (leftToken, rightToken) => leftToken.name === rightToken.name,
    ),
    ...pullPairs(
      leftRemaining,
      rightRemaining,
      (leftToken, rightToken) =>
        isPlainTradeEvolutionToken(leftToken) &&
        isPlainTradeEvolutionToken(rightToken),
    ),
    ...pullPairs(
      leftRemaining,
      rightRemaining,
      (leftToken, rightToken) =>
        isExtraCopyToken(leftToken) && isExtraCopyToken(rightToken),
    ),
    ...pullPairs(
      leftRemaining,
      rightRemaining,
      (leftToken, rightToken) =>
        isNonHeldItemToken(leftToken) && isNonHeldItemToken(rightToken),
    ),
    ...pullPairs(
      leftRemaining,
      rightRemaining,
      (leftToken, rightToken) =>
        isHeldItemToken(leftToken) && isHeldItemToken(rightToken),
    ),
    ...pullPairs(leftRemaining, rightRemaining, () => true),
  ].sort((leftPair, rightPair) => {
    const leftBlocked = Number(!leftPair.isReady)
    const rightBlocked = Number(!rightPair.isReady)

    if (leftBlocked !== rightBlocked) {
      return leftBlocked - rightBlocked
    }

    const leftNeedsItem = Number(leftPair.requiresHeldItem)
    const rightNeedsItem = Number(rightPair.requiresHeldItem)

    if (leftNeedsItem !== rightNeedsItem) {
      return leftNeedsItem - rightNeedsItem
    }

    return 0
  })
  const readyCount = pairs.filter((pair) => pair.isReady).length
  const blockedPairs = pairs.filter((pair) => !pair.isReady)
  const blockedByVersion = {
    [leftVersionKey]: readyByVersion[leftVersionKey].filter((token) => !token.heldItemOwned),
    [rightVersionKey]: readyByVersion[rightVersionKey].filter((token) => !token.heldItemOwned),
  }

  return {
    pairs,
    blockedPairs,
    blockedByVersion,
    pairableCount: pairs.length,
    readyCount,
    blockedByHeldItemCount: blockedPairs.length,
    readyByVersion,
    unpairedByVersion: {
      [leftVersionKey]: leftRemaining,
      [rightVersionKey]: rightRemaining,
    },
  }
}
