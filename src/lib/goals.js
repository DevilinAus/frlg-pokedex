import {
  getTrackablePokemonForVersion,
  isBaseGameCompleteForVersion,
  getVersionTrackerState,
} from './pokedexHelpers.js'
import { pokemon as allPokemon } from '../data/pokemon.js'
import {
  branchBreedGoalRules,
  crossVersionBreedGoalRules,
  directBreedGoalRules,
} from './breeding.js'
import { getBreedingProgressCount } from './breedingProgress.js'

export const XP_SHARE_POKEDEX_REQUIREMENT = 50

// Until we surface location guidance in the UI, avoid recommending Celadon prize
// Pokemon as hunt targets when a regular catch is available first.
const gameCornerPrizePokemonByVersion = {
  'fire-red': new Set(['Abra', 'Clefairy', 'Dratini', 'Scyther', 'Porygon']),
  'leaf-green': new Set(['Abra', 'Clefairy', 'Pinsir', 'Dratini', 'Porygon']),
}

const versionGoalLabels = {
  'fire-red': 'Fire Red',
  'leaf-green': 'Leaf Green',
}

const allPokemonByName = new Map(allPokemon.map((entry) => [entry.name, entry]))

function getCaughtKey(versionKey, pokemonId) {
  return `${versionKey}-${String(pokemonId).padStart(3, '0')}`
}

function isCaught(entry, versionKey, checkboxState) {
  return Boolean(checkboxState?.[getCaughtKey(versionKey, entry.id)])
}

function getCaughtCount(pokemonList, versionKey, checkboxState) {
  return pokemonList.filter((entry) => isCaught(entry, versionKey, checkboxState)).length
}

function getCaughtCountByNames(names, versionKey, checkboxState) {
  return names.reduce((count, name) => {
    const entry = allPokemonByName.get(name)

    return entry && isCaught(entry, versionKey, checkboxState) ? count + 1 : count
  }, 0)
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

function getOtherVersionKey(versionKey) {
  return versionKey === 'fire-red' ? 'leaf-green' : 'fire-red'
}

function findCaughtEntryByNames(byName, names, versionKey, checkboxState) {
  for (const name of names) {
    const entry = byName.get(name)

    if (entry && isCaught(entry, versionKey, checkboxState)) {
      return entry
    }
  }

  return null
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

function isGameCornerPrizePokemon(entry, versionKey) {
  return Boolean(gameCornerPrizePokemonByVersion[versionKey]?.has(entry.name))
}

function compareHuntCandidates(leftCandidate, rightCandidate, versionKey) {
  const leftIsGameCornerPrize = isGameCornerPrizePokemon(
    leftCandidate.sourceEntry,
    versionKey,
  )
  const rightIsGameCornerPrize = isGameCornerPrizePokemon(
    rightCandidate.sourceEntry,
    versionKey,
  )

  if (leftIsGameCornerPrize !== rightIsGameCornerPrize) {
    return leftIsGameCornerPrize ? 1 : -1
  }

  return compareCandidates(leftCandidate, rightCandidate)
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
    levelLabel: goal.targetEntry.levelEvolution
      ? `Lv. ${goal.targetEntry.levelEvolution}`
      : '',
    tradeFollowUpCopy: buildTradeFollowUpCopy(goal),
  }
}

function compareBlockedItemTokens(leftToken, rightToken) {
  if (leftToken.id !== rightToken.id) {
    return leftToken.id - rightToken.id
  }

  return leftToken.name.localeCompare(rightToken.name)
}

function formatItemGoal(token) {
  if (!token) {
    return null
  }

  return {
    type: 'item',
    key: `item-${token.versionKey}-${token.pokemonId}-${token.heldItemName}`,
    versionKey: token.versionKey,
    sourceEntry: {
      id: token.id,
      name: token.name,
      spriteSlug: token.spriteSlug,
    },
    targetEntry: {
      id: Number(token.receivedPokemonId),
      name: token.receivedName,
      spriteSlug: token.receivedSpriteSlug,
    },
    heldItemName: token.heldItemName,
  }
}

function formatGoalNameList(names) {
  if (names.length <= 1) {
    return names[0] ?? ''
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`
  }

  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`
}

function buildBreedPairingLabel(goal) {
  const breederLabel = goal.breederLabel || goal.sourceEntry.name
  const parentLabel = goal.breedingItemName
    ? `${breederLabel} holding ${goal.breedingItemName}`
    : breederLabel

  return `${parentLabel} + Ditto`
}

function buildBreedInstructionCopy(goal, sourceVersionKey) {
  const steps = []

  if (goal.followUpHint) {
    steps.push(goal.followUpHint)
  }

  if (goal.destinationVersionKey !== sourceVersionKey) {
    steps.push(
      `Trade it to ${
        versionGoalLabels[goal.destinationVersionKey] ?? goal.destinationVersionKey
      }.`,
    )
  }

  return steps.join(' ')
}

function formatBreedGoal(goal, versionKey) {
  if (!goal) {
    return null
  }

  const progressCurrentCount = Math.max(
    0,
    Math.floor(Number(goal.progressCurrentCount ?? 0)),
  )
  const progressTargetCount = Math.max(
    1,
    Math.floor(Number(goal.progressTargetCount ?? 1)),
  )

  return {
    type: 'breed',
    key: `breed-${versionKey}-${goal.destinationVersionKey}-${goal.targetEntry.name}`,
    priorityBand: goal.priorityBand,
    versionKey,
    destinationVersionKey: goal.destinationVersionKey,
    sourceEntry: goal.sourceEntry,
    targetEntry: goal.targetEntry,
    breederLabel:
      goal.breederLabel ??
      (goal.sourceEntry?.name ? formatGoalNameList([goal.sourceEntry.name]) : ''),
    pairingLabel: buildBreedPairingLabel(goal),
    sourceCaughtKey: getCaughtKey(versionKey, goal.sourceEntry.id),
    targetCaughtKey: getCaughtKey(goal.destinationVersionKey, goal.targetEntry.id),
    breedingItemName: goal.breedingItemName ?? '',
    followUpHint: goal.followUpHint ?? '',
    instructionCopy: buildBreedInstructionCopy(goal, versionKey),
    progressKey: goal.progressKey ?? '',
    progressCurrentCount,
    progressTargetCount,
  }
}

function compareBreedCandidates(leftCandidate, rightCandidate) {
  if (leftCandidate.priorityBand !== rightCandidate.priorityBand) {
    return leftCandidate.priorityBand - rightCandidate.priorityBand
  }

  if (leftCandidate.targetEntry.id !== rightCandidate.targetEntry.id) {
    return leftCandidate.targetEntry.id - rightCandidate.targetEntry.id
  }

  return leftCandidate.sourceEntry.id - rightCandidate.sourceEntry.id
}

function buildBreedGoalCandidates(
  versionKey,
  trackerState,
  visibleVersionKeys,
  trackableNameSetsByVersion,
) {
  const checkboxState = trackerState.checkboxState ?? {}
  const breedingProgress = trackerState.breedingProgress ?? {}
  const localTrackerState = {
    ...trackerState,
    tradeMode: false,
  }
  const sourceTrackableNames = trackableNameSetsByVersion[versionKey] ?? new Set()
  const otherVersionKey = getOtherVersionKey(versionKey)
  const canTargetOtherVersion = visibleVersionKeys.includes(otherVersionKey)
  const candidates = []

  directBreedGoalRules.forEach((rule) => {
    const targetEntry = allPokemonByName.get(rule.targetName)
    const breederEntry = findCaughtEntryByNames(
      allPokemonByName,
      rule.breederNames,
      versionKey,
      checkboxState,
    )
    const progressKey = rule.progressKey ?? rule.targetName.toLowerCase()
    const progressCurrentCount = getBreedingProgressCount(
      breedingProgress,
      versionKey,
      progressKey,
    )

    if (!targetEntry || !breederEntry || progressCurrentCount >= 1) {
      return
    }

    if (sourceTrackableNames.has(rule.targetName) && !isCaught(targetEntry, versionKey, checkboxState)) {
      candidates.push({
        priorityBand: 0,
        sourceEntry: breederEntry,
        targetEntry,
        destinationVersionKey: versionKey,
        breederLabel: rule.breederLabel ?? formatGoalNameList(rule.breederNames),
        breedingItemName: rule.breedingItemName ?? '',
        progressKey,
        progressCurrentCount,
        progressTargetCount: 1,
      })
    }

    if (
      canTargetOtherVersion &&
      trackableNameSetsByVersion[otherVersionKey]?.has(rule.targetName) &&
      !isCaught(targetEntry, otherVersionKey, checkboxState)
    ) {
      candidates.push({
        priorityBand: 1,
        sourceEntry: breederEntry,
        targetEntry,
        destinationVersionKey: otherVersionKey,
        breederLabel: rule.breederLabel ?? formatGoalNameList(rule.breederNames),
        breedingItemName: rule.breedingItemName ?? '',
        progressKey,
        progressCurrentCount,
        progressTargetCount: 1,
      })
    }
  })

  if (canTargetOtherVersion) {
    crossVersionBreedGoalRules.forEach((rule) => {
      const targetEntry = allPokemonByName.get(rule.targetName)
      const breederEntry = findCaughtEntryByNames(
        allPokemonByName,
        rule.breederNames,
        versionKey,
        checkboxState,
      )
      const progressKey = rule.progressKey ?? rule.targetName.toLowerCase()
      const progressCurrentCount = getBreedingProgressCount(
        breedingProgress,
        versionKey,
        progressKey,
      )

      if (
        !targetEntry ||
        !breederEntry ||
        progressCurrentCount >= 1 ||
        !trackableNameSetsByVersion[otherVersionKey]?.has(rule.targetName) ||
        isCaught(targetEntry, otherVersionKey, checkboxState)
      ) {
        return
      }

      const destinationState = getVersionTrackerState(
        targetEntry,
        otherVersionKey,
        localTrackerState,
      )

      if (!destinationState.locked) {
        return
      }

      candidates.push({
        priorityBand: 2,
        sourceEntry: breederEntry,
        targetEntry,
        destinationVersionKey: otherVersionKey,
        breederLabel: rule.breederLabel ?? formatGoalNameList(rule.breederNames),
        followUpHint: rule.followUpHint ?? '',
        progressKey,
        progressCurrentCount,
        progressTargetCount: 1,
      })
    })
  }

  branchBreedGoalRules.forEach((rule) => {
    const breederEntry = findCaughtEntryByNames(
      allPokemonByName,
      rule.breederNames,
      versionKey,
      checkboxState,
    )

    if (!breederEntry) {
      return
    }

    const progressKey = rule.progressKey ?? rule.familyKey
    const progressStoredCount = getBreedingProgressCount(
      breedingProgress,
      versionKey,
      progressKey,
    )
    const caughtMemberCount = getCaughtCountByNames(
      rule.ownedMemberNames ?? rule.breederNames,
      versionKey,
      checkboxState,
    )
    const progressCurrentCount = Math.max(progressStoredCount, caughtMemberCount)
    const progressTargetCount = Math.max(
      1,
      Math.floor(Number(rule.requiredCount ?? rule.targetNames.length ?? 1)),
    )

    const missingTargetEntries = rule.targetNames
      .map((name) => allPokemonByName.get(name))
      .filter(
        (entry) =>
          entry &&
          sourceTrackableNames.has(entry.name) &&
          !isCaught(entry, versionKey, checkboxState),
      )

    if (missingTargetEntries.length === 0) {
      return
    }

    if (progressCurrentCount >= progressTargetCount) {
      return
    }

    const [targetEntry] = missingTargetEntries

    candidates.push({
      priorityBand: 3,
      sourceEntry: breederEntry,
      targetEntry,
      destinationVersionKey: versionKey,
      breederLabel: rule.breederLabel ?? formatGoalNameList(rule.breederNames),
      followUpHint: rule.followUpHints?.[targetEntry.name] ?? '',
      progressKey,
      progressCurrentCount,
      progressTargetCount,
    })
  })

  return candidates.sort(compareBreedCandidates)
}

function getVersionBreedGoal(
  pokemonList,
  versionKey,
  trackerState,
  {
    visibleVersionKeys = [versionKey],
    trackableNameSetsByVersion = {
      [versionKey]: new Set(pokemonList.map((entry) => entry.name)),
    },
  } = {},
) {
  const candidates = buildBreedGoalCandidates(
    versionKey,
    trackerState,
    visibleVersionKeys,
    trackableNameSetsByVersion,
  )

  return formatBreedGoal(candidates[0] ?? null, versionKey)
}

export function buildItemGoalsByVersion(blockedByVersion, versionKeys) {
  const itemCandidatesByVersion = Object.fromEntries(
    versionKeys.map((versionKey) => [
      versionKey,
      (blockedByVersion?.[versionKey] ?? []).filter(
        (token) => token.heldItemName && !token.heldItemOwned,
      ),
    ]),
  )

  return Object.fromEntries(
    versionKeys.map((versionKey) => {
      const sortedCandidates = [...itemCandidatesByVersion[versionKey]].sort(
        compareBlockedItemTokens,
      )

      return [versionKey, formatItemGoal(sortedCandidates[0] ?? null)]
    }),
  )
}

export function getVersionGoals(pokemonList, versionKey, trackerState, options = {}) {
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
  const huntCandidateSourceNames = new Set()

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

    if (
      !sourceEntry.evolvesFrom &&
      !sourceState.locked &&
      !sourceState.unlockedByOwnedPreEvolution &&
      sourceState.versionAvailability === 'native'
    ) {
      huntCandidates.push(candidate)
      huntCandidateSourceNames.add(sourceEntry.name)
    }
  })

  pokemonList.forEach((entry) => {
    if (
      entry.evolvesFrom ||
      entry.inGameTrade ||
      entry.specialComment ||
      isCaught(entry, versionKey, checkboxState) ||
      huntCandidateSourceNames.has(entry.name)
    ) {
      return
    }

    const entryState = getVersionTrackerState(entry, versionKey, localTrackerState)

    if (entryState.locked || entryState.versionAvailability !== 'native') {
      return
    }

    huntCandidates.push({
      sourceEntry: entry,
      targetEntry: entry,
      tradeFollowUp: null,
      levelFollowUp: getMissingLevelFollowUp(
        levelFollowUpsBySource,
        entry.name,
        versionKey,
        checkboxState,
      ),
    })
  })

  partyCandidates.sort(compareCandidates)
  huntCandidates.sort((leftCandidate, rightCandidate) =>
    compareHuntCandidates(leftCandidate, rightCandidate, versionKey),
  )

  return {
    partyGoal: xpShareUnlocked ? formatGoal(partyCandidates[0] ?? null, 'party', versionKey) : null,
    breedGoal: getVersionBreedGoal(pokemonList, versionKey, trackerState, options),
    huntGoal: formatGoal(huntCandidates[0] ?? null, 'hunt', versionKey),
    caughtCount,
    xpShareUnlocked,
    xpShareRemaining: Math.max(XP_SHARE_POKEDEX_REQUIREMENT - caughtCount, 0),
  }
}

export function buildGoalsByVersion(
  pokemonList,
  trackerState,
  versionKeys,
  blockedByVersion = {},
) {
  const itemGoalsByVersion = buildItemGoalsByVersion(blockedByVersion, versionKeys)
  const trackablePokemonByVersion = Object.fromEntries(
    versionKeys.map((versionKey) => [
      versionKey,
      typeof trackerState?.fireRedBaseGameComplete === 'boolean' ||
      typeof trackerState?.leafGreenBaseGameComplete === 'boolean'
        ? getTrackablePokemonForVersion(versionKey, trackerState)
        : pokemonList,
    ]),
  )
  const trackableNameSetsByVersion = Object.fromEntries(
    versionKeys.map((versionKey) => [
      versionKey,
      new Set(trackablePokemonByVersion[versionKey].map((entry) => entry.name)),
    ]),
  )

  return Object.fromEntries(
    versionKeys.map((versionKey) => {
      const versionPokemonList = trackablePokemonByVersion[versionKey]
      const baseGameComplete = isBaseGameCompleteForVersion(versionKey, trackerState)
      const versionGoals = getVersionGoals(versionPokemonList, versionKey, trackerState, {
        visibleVersionKeys: versionKeys,
        trackableNameSetsByVersion,
      })

      return [
        versionKey,
        {
          ...versionGoals,
          baseGameComplete,
          breedGoal: baseGameComplete ? versionGoals.breedGoal : null,
          itemGoal: itemGoalsByVersion[versionKey],
        },
      ]
    }),
  )
}
