import { getVersionTrackerState } from './pokedexHelpers.js'

export const XP_SHARE_POKEDEX_REQUIREMENT = 50

function getCaughtKey(versionKey, pokemonId) {
  return `${versionKey}-${String(pokemonId).padStart(3, '0')}`
}

function isCaught(entry, versionKey, checkboxState) {
  return Boolean(checkboxState?.[getCaughtKey(versionKey, entry.id)])
}

function getCaughtCount(pokemonList, versionKey, checkboxState) {
  return pokemonList.filter((entry) => isCaught(entry, versionKey, checkboxState)).length
}

function createPokemonIndexes(pokemonList) {
  const byName = new Map()
  const tradeFollowUpsBySource = new Map()
  const levelFollowUpsBySource = new Map()

  pokemonList.forEach((entry) => {
    byName.set(entry.name, entry)

    if (!entry.evolvesFrom) {
      return
    }

    if (entry.tradeEvolution || entry.tradeEvolutionItem) {
      tradeFollowUpsBySource.set(entry.evolvesFrom, entry)
    }

    if (entry.levelEvolution) {
      const existing = levelFollowUpsBySource.get(entry.evolvesFrom) ?? []
      existing.push(entry)
      levelFollowUpsBySource.set(entry.evolvesFrom, existing)
    }
  })

  levelFollowUpsBySource.forEach((entries) => {
    entries.sort((leftEntry, rightEntry) => leftEntry.id - rightEntry.id)
  })

  return {
    byName,
    tradeFollowUpsBySource,
    levelFollowUpsBySource,
  }
}

function getMissingLevelFollowUp(levelFollowUpsBySource, sourceName, versionKey, checkboxState) {
  const followUps = levelFollowUpsBySource.get(sourceName) ?? []

  return (
    followUps.find((entry) => !isCaught(entry, versionKey, checkboxState)) ?? null
  )
}

function getPriorityBand(candidate) {
  if (candidate.tradeFollowUp?.tradeEvolution) {
    return 0
  }

  if (candidate.tradeFollowUp?.tradeEvolutionItem) {
    return 1
  }

  if (candidate.levelFollowUp) {
    return 2
  }

  return 3
}

function compareCandidates(leftCandidate, rightCandidate) {
  const leftBand = getPriorityBand(leftCandidate)
  const rightBand = getPriorityBand(rightCandidate)

  if (leftBand !== rightBand) {
    return leftBand - rightBand
  }

  if (leftCandidate.sourceEntry.id !== rightCandidate.sourceEntry.id) {
    return leftCandidate.sourceEntry.id - rightCandidate.sourceEntry.id
  }

  return leftCandidate.targetEntry.id - rightCandidate.targetEntry.id
}

function buildTradeFollowUpCopy(goal) {
  if (goal.tradeFollowUp) {
    if (goal.tradeFollowUp.tradeEvolutionItem) {
      return `Then trade it holding ${goal.tradeFollowUp.tradeEvolutionItem} for ${goal.tradeFollowUp.name}.`
    }

    return `Then trade it for ${goal.tradeFollowUp.name}.`
  }

  return ''
}

function formatGoal(goal, type, versionKey) {
  if (!goal) {
    return null
  }

  return {
    type,
    key: `${type}-${goal.sourceEntry.name}-${goal.targetEntry.name}`,
    priorityBand: getPriorityBand(goal),
    versionKey,
    sourceEntry: goal.sourceEntry,
    targetEntry: goal.targetEntry,
    tradeFollowUp: goal.tradeFollowUp,
    levelFollowUp: goal.levelFollowUp,
    sourceCaughtKey: getCaughtKey(versionKey, goal.sourceEntry.id),
    targetCaughtKey: getCaughtKey(versionKey, goal.targetEntry.id),
    levelLabel: `Lv. ${goal.targetEntry.levelEvolution}`,
    badgeLabel:
      getPriorityBand(goal) === 1
        ? 'Trade item'
        : getPriorityBand(goal) === 3
          ? 'Level evo'
          : '',
    tradeFollowUpCopy: buildTradeFollowUpCopy(goal),
  }
}

export function getVersionGoals(pokemonList, versionKey, trackerState) {
  const checkboxState = trackerState.checkboxState ?? {}
  const caughtCount = getCaughtCount(pokemonList, versionKey, checkboxState)
  const xpShareUnlocked = caughtCount >= XP_SHARE_POKEDEX_REQUIREMENT
  const localTrackerState = {
    ...trackerState,
    tradeMode: false,
  }
  const { byName, tradeFollowUpsBySource, levelFollowUpsBySource } =
    createPokemonIndexes(pokemonList)
  const partyCandidates = []
  const huntCandidates = []

  pokemonList.forEach((targetEntry) => {
    if (!targetEntry.levelEvolution || !targetEntry.evolvesFrom) {
      return
    }

    if (isCaught(targetEntry, versionKey, checkboxState)) {
      return
    }

    const sourceEntry = byName.get(targetEntry.evolvesFrom)

    if (!sourceEntry) {
      return
    }

    const sourceCaught = isCaught(sourceEntry, versionKey, checkboxState)
    const sourceState = getVersionTrackerState(sourceEntry, versionKey, localTrackerState)
    const tradeFollowUp = tradeFollowUpsBySource.get(targetEntry.name) ?? null
    const levelFollowUp = getMissingLevelFollowUp(
      levelFollowUpsBySource,
      targetEntry.name,
      versionKey,
      checkboxState,
    )
    const candidate = {
      sourceEntry,
      targetEntry,
      tradeFollowUp:
        tradeFollowUp && !isCaught(tradeFollowUp, versionKey, checkboxState)
          ? tradeFollowUp
          : null,
      levelFollowUp,
    }

    if (sourceCaught) {
      partyCandidates.push(candidate)
      return
    }

    if (!sourceState.locked && sourceState.versionAvailability === 'native') {
      huntCandidates.push(candidate)
    }
  })

  partyCandidates.sort(compareCandidates)
  huntCandidates.sort(compareCandidates)

  return {
    partyGoal: xpShareUnlocked ? formatGoal(partyCandidates[0] ?? null, 'party', versionKey) : null,
    huntGoal: formatGoal(huntCandidates[0] ?? null, 'hunt', versionKey),
    caughtCount,
    xpShareUnlocked,
    xpShareRemaining: Math.max(XP_SHARE_POKEDEX_REQUIREMENT - caughtCount, 0),
  }
}

export function buildGoalsByVersion(pokemonList, trackerState, versionKeys) {
  return Object.fromEntries(
    versionKeys.map((versionKey) => [versionKey, getVersionGoals(pokemonList, versionKey, trackerState)]),
  )
}
