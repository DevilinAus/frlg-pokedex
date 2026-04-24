import { getVersionTrackerState } from './pokedexHelpers.js'

function getCaughtKey(versionKey, pokemonId) {
  return `${versionKey}-${String(pokemonId).padStart(3, '0')}`
}

function isCaught(entry, versionKey, checkboxState) {
  return Boolean(checkboxState?.[getCaughtKey(versionKey, entry.id)])
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

function buildGoalCopy(goal) {
  const baseCopy = `${goal.targetEntry.name} at Lv. ${goal.targetEntry.levelEvolution}.`

  if (goal.tradeFollowUp) {
    if (goal.tradeFollowUp.tradeEvolutionItem) {
      return `${baseCopy} Then trade it holding ${goal.tradeFollowUp.tradeEvolutionItem} for ${goal.tradeFollowUp.name}.`
    }

    return `${baseCopy} Then trade it for ${goal.tradeFollowUp.name}.`
  }

  if (goal.levelFollowUp) {
    return `${baseCopy} ${goal.levelFollowUp.name} comes after that.`
  }

  return baseCopy
}

function formatGoal(goal, type) {
  if (!goal) {
    return null
  }

  return {
    type,
    key: `${type}-${goal.sourceEntry.name}-${goal.targetEntry.name}`,
    priorityBand: getPriorityBand(goal),
    sourceEntry: goal.sourceEntry,
    targetEntry: goal.targetEntry,
    tradeFollowUp: goal.tradeFollowUp,
    levelFollowUp: goal.levelFollowUp,
    badgeLabel:
      getPriorityBand(goal) === 0
        ? 'Trade unlock'
        : getPriorityBand(goal) === 1
          ? 'Trade item'
          : getPriorityBand(goal) === 2
            ? 'Chain evo'
            : 'Level evo',
    detailCopy: buildGoalCopy(goal),
  }
}

export function getVersionGoals(pokemonList, versionKey, trackerState) {
  const checkboxState = trackerState.checkboxState ?? {}
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
    partyGoal: formatGoal(partyCandidates[0] ?? null, 'party'),
    huntGoal: formatGoal(huntCandidates[0] ?? null, 'hunt'),
  }
}

export function buildGoalsByVersion(pokemonList, trackerState, versionKeys) {
  return Object.fromEntries(
    versionKeys.map((versionKey) => [versionKey, getVersionGoals(pokemonList, versionKey, trackerState)]),
  )
}
