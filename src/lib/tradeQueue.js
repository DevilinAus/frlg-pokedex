import { getItemDbUrl, hasTradeQueueExtraCopy } from './pokedexHelpers.js'
import {
  getPairedTradeFamilyState,
  getTradeVersionLabel,
} from './pairedTradeFamilies.js'

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
  const heldItemName =
    type === 'trade-evolution' ? receivedEntry.tradeEvolutionItem ?? null : null
  const heldItemUrl = heldItemName ? getItemDbUrl(heldItemName) : ''

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

function getFamilySeedQueueNote(token, familyState, targetVersionKey) {
  const targetLabel = getTradeVersionLabel(targetVersionKey)
  const breedingRequirementLabel = familyState.breedingRequirementLabel ?? ''

  if (token.name === familyState.babyName) {
    return `Seeds this family. ${targetLabel} can skip trading ${familyState.preferredTradeName} and evolve this instead.`
  }

  return `Seeds this family. ${targetLabel} can breed ${familyState.babyName}${breedingRequirementLabel} after this instead of trading one over.`
}

function getFamilyShortcutQueueNote(token, familyState, targetVersionKey) {
  const targetLabel = getTradeVersionLabel(targetVersionKey)
  const breedingRequirementLabel = familyState.breedingRequirementLabel ?? ''

  if (token.name === familyState.babyName) {
    return `Optional shortcut. ${targetLabel} already has ${familyState.adultSeedLabel}, so this only saves breeding${breedingRequirementLabel} there.`
  }

  return `Optional shortcut. ${targetLabel} already has ${familyState.babyName}, so this only saves evolving there.`
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
                getFamilySeedQueueNote(token, familyState, targetVersionKey),
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
              getFamilyShortcutQueueNote(token, familyState, targetVersionKey),
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

  return applyPairedTradeFamilyRules(tokens, targetVersionKey, checkboxState).sort(
    (leftToken, rightToken) => {
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
  return {
    left: leftToken,
    right: rightToken,
    requiresHeldItem: Boolean(leftToken.heldItemName || rightToken.heldItemName),
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
    ...pullPairs(leftRemaining, rightRemaining, () => true),
  ].sort((leftPair, rightPair) => {
    const leftNeedsItem = Number(leftPair.requiresHeldItem)
    const rightNeedsItem = Number(rightPair.requiresHeldItem)

    if (leftNeedsItem !== rightNeedsItem) {
      return leftNeedsItem - rightNeedsItem
    }

    return 0
  })

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
