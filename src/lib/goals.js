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

const stoneToneByItemName = {
  'Moon Stone': 'moon',
  'Leaf Stone': 'leaf',
  'Thunder Stone': 'thunder',
  'Water Stone': 'water',
  'Fire Stone': 'fire',
  'Sun Stone': 'sun',
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
  const stoneFollowUpsBySource = new Map()

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

    if (entry.stoneEvolution) {
      const existing = stoneFollowUpsBySource.get(entry.evolvesFrom) ?? []
      existing.push(entry)
      stoneFollowUpsBySource.set(entry.evolvesFrom, existing)
    }
  })

  levelFollowUpsBySource.forEach((entries) => {
    entries.sort((leftEntry, rightEntry) => leftEntry.id - rightEntry.id)
  })

  stoneFollowUpsBySource.forEach((entries) => {
    entries.sort((leftEntry, rightEntry) => leftEntry.id - rightEntry.id)
  })

  return {
    byName,
    tradeFollowUpsBySource,
    levelFollowUpsBySource,
    stoneFollowUpsBySource,
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

function getMissingStoneFollowUp(stoneFollowUpsBySource, sourceName, versionKey, checkboxState) {
  const followUps = stoneFollowUpsBySource.get(sourceName) ?? []

  return (
    followUps.find((entry) => !isCaught(entry, versionKey, checkboxState)) ?? null
  )
}

function getBranchRuleProgress(rule, versionKey, checkboxState, breedingProgress) {
  const progressKey = rule.progressKey ?? rule.familyKey
  const progressStoredCount = getBreedingProgressCount(
    breedingProgress,
    versionKey,
    progressKey,
  )
  const progressCountNames = rule.progressCountNames ?? rule.ownedMemberNames ?? rule.breederNames
  const progressCaughtCount = getCaughtCountByNames(
    progressCountNames,
    versionKey,
    checkboxState,
  )
  const availableCaughtStockRawCount = getCaughtCountByNames(
    rule.availableCaughtStockNames ?? [],
    versionKey,
    checkboxState,
  )
  const availableCaughtStockBaselineCount = Math.max(
    0,
    Math.floor(Number(rule.availableCaughtStockBaselineCount ?? 0)),
  )
  const consumedCaughtStockCount = Math.max(
    progressCaughtCount - availableCaughtStockBaselineCount,
    0,
  )
  const availableCaughtStockCount = Math.max(
    availableCaughtStockRawCount - consumedCaughtStockCount,
    0,
  )
  const progressCurrentCount = Math.max(
    progressStoredCount,
    progressCaughtCount + availableCaughtStockCount,
  )
  const availableStockCount = Math.max(progressCurrentCount - progressCaughtCount, 0)

  return {
    progressKey,
    progressCaughtCount,
    progressCurrentCount,
    availableStockCount,
  }
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

function getEvolutionFamilyKey(entry) {
  return entry.evolutionBaseName ?? entry.name
}

function buildEvolutionFamiliesByKey(pokemonList) {
  const familiesByKey = new Map()

  pokemonList.forEach((entry) => {
    const familyKey = getEvolutionFamilyKey(entry)
    const existing = familiesByKey.get(familyKey) ?? []

    existing.push(entry)
    familiesByKey.set(familyKey, existing)
  })

  familiesByKey.forEach((entries) => {
    entries.sort((leftEntry, rightEntry) => leftEntry.id - rightEntry.id)
  })

  return familiesByKey
}

function getPartyCandidateFamilyStats(
  candidate,
  familyEntriesByKey,
  versionKey,
  checkboxState,
) {
  const familyEntries =
    familyEntriesByKey.get(getEvolutionFamilyKey(candidate.sourceEntry)) ?? [
      candidate.sourceEntry,
      candidate.targetEntry,
    ]
  const familyCaughtCount = familyEntries.reduce(
    (count, entry) => count + Number(isCaught(entry, versionKey, checkboxState)),
    0,
  )
  const familyLevelCeiling = familyEntries.reduce((highestLevel, entry) => {
    if (isCaught(entry, versionKey, checkboxState) || !entry.levelEvolution) {
      return highestLevel
    }

    return Math.max(highestLevel, entry.levelEvolution)
  }, candidate.targetEntry.levelEvolution ?? 0)

  return {
    familyCaughtCount,
    familyTotalCount: familyEntries.length,
    familyLevelCeiling,
  }
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

function comparePartyCandidates(leftCandidate, rightCandidate) {
  const progressDelta =
    rightCandidate.familyCaughtCount * leftCandidate.familyTotalCount -
    leftCandidate.familyCaughtCount * rightCandidate.familyTotalCount

  if (progressDelta !== 0) {
    return progressDelta
  }

  if (leftCandidate.familyCaughtCount !== rightCandidate.familyCaughtCount) {
    return rightCandidate.familyCaughtCount - leftCandidate.familyCaughtCount
  }

  if (leftCandidate.familyLevelCeiling !== rightCandidate.familyLevelCeiling) {
    return leftCandidate.familyLevelCeiling - rightCandidate.familyLevelCeiling
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

  const isGameCornerPrize = type === 'hunt'
    ? isGameCornerPrizePokemon(goal.sourceEntry, versionKey)
    : false

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
    isGameCornerPrize,
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

function buildHatchInstructionCopy(goal, sourceVersionKey) {
  return buildBreedInstructionCopy(goal, sourceVersionKey).replace(
    /^Use a [^.]+ Stone on the hatched [^.]+\.\s*/,
    '',
  )
}

function buildHatchSourceLabel(goal) {
  const baseLabel = goal.sourceEntry?.name ?? ''

  if (!goal.hatchSequenceNumber || goal.hatchSequenceNumber <= 1) {
    return baseLabel
  }

  return `${baseLabel} (${goal.hatchSequenceNumber})`
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

function formatHatchGoal(goal, versionKey) {
  if (!goal) {
    return null
  }

  return {
    type: 'hatch',
    key: `hatch-${versionKey}-${goal.destinationVersionKey}-${goal.sourceEntry.name}-${goal.targetEntry.name}`,
    priorityBand: goal.priorityBand,
    versionKey,
    destinationVersionKey: goal.destinationVersionKey,
    sourceEntry: goal.sourceEntry,
    targetEntry: goal.targetEntry,
    sourceCaughtKey: getCaughtKey(versionKey, goal.sourceEntry.id),
    targetCaughtKey: getCaughtKey(goal.destinationVersionKey, goal.targetEntry.id),
    sourceLabel: buildHatchSourceLabel(goal),
    followUpHint: goal.followUpHint ?? '',
    instructionCopy: buildHatchInstructionCopy(goal, versionKey),
    unhatchedCount: Math.max(1, Math.floor(Number(goal.unhatchedCount ?? 1))),
  }
}

function formatStoneGoal(goal, versionKey) {
  if (!goal) {
    return null
  }

  return {
    type: 'stone',
    key: `stone-${versionKey}-${goal.sourceEntry.name}-${goal.targetEntry.name}`,
    versionKey,
    sourceEntry: goal.sourceEntry,
    targetEntry: goal.targetEntry,
    sourceCaughtKey: getCaughtKey(versionKey, goal.sourceEntry.id),
    targetCaughtKey: getCaughtKey(versionKey, goal.targetEntry.id),
    stoneItemName: goal.stoneItemName,
    stoneToneKey: goal.stoneToneKey,
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

function compareStoneCandidates(leftCandidate, rightCandidate) {
  if (leftCandidate.sourceEntry.id !== rightCandidate.sourceEntry.id) {
    return leftCandidate.sourceEntry.id - rightCandidate.sourceEntry.id
  }

  return leftCandidate.targetEntry.id - rightCandidate.targetEntry.id
}

function getBranchHatchSequenceNumber(rule, progressCaughtCount) {
  if (rule.hatchSequenceMode === 'target-progress') {
    const baselineCount = Math.max(
      0,
      Math.floor(Number(rule.hatchSequenceBaselineCount ?? 0)),
    )

    return Math.max(progressCaughtCount - baselineCount + 1, 1)
  }

  return progressCaughtCount + 1
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

    const {
      progressKey,
      progressCurrentCount,
      availableStockCount,
    } = getBranchRuleProgress(
      rule,
      versionKey,
      checkboxState,
      breedingProgress,
    )
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

    const targetIndex = rule.breedGoalSkipsAvailableStock
      ? Math.min(availableStockCount, missingTargetEntries.length - 1)
      : 0
    const targetEntry = missingTargetEntries[targetIndex]

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

function buildHatchGoalCandidates(
  versionKey,
  trackerState,
  visibleVersionKeys,
  trackableNameSetsByVersion,
) {
  const checkboxState = trackerState.checkboxState ?? {}
  const breedingProgress = trackerState.breedingProgress ?? {}
  const sourceTrackableNames = trackableNameSetsByVersion[versionKey] ?? new Set()
  const otherVersionKey = getOtherVersionKey(versionKey)
  const canTargetOtherVersion = visibleVersionKeys.includes(otherVersionKey)
  const candidates = []

  directBreedGoalRules.forEach((rule) => {
    const targetEntry = allPokemonByName.get(rule.targetName)
    const eggEntry = allPokemonByName.get(rule.eggName ?? rule.targetName)
    const progressKey = rule.progressKey ?? rule.targetName.toLowerCase()
    const progressStoredCount = getBreedingProgressCount(
      breedingProgress,
      versionKey,
      progressKey,
    )
    const sameVersionCaught = targetEntry
      ? isCaught(targetEntry, versionKey, checkboxState)
      : false
    const availableEggCount = Math.max(
      progressStoredCount - Number(sameVersionCaught),
      0,
    )

    if (!targetEntry || !eggEntry || availableEggCount < 1) {
      return
    }

    if (sourceTrackableNames.has(rule.targetName) && !sameVersionCaught) {
      candidates.push({
        priorityBand: 0,
        sourceEntry: eggEntry,
        targetEntry,
        destinationVersionKey: versionKey,
        followUpHint: '',
        unhatchedCount: availableEggCount,
      })
    }

    if (
      canTargetOtherVersion &&
      trackableNameSetsByVersion[otherVersionKey]?.has(rule.targetName) &&
      !isCaught(targetEntry, otherVersionKey, checkboxState)
    ) {
      candidates.push({
        priorityBand: 1,
        sourceEntry: eggEntry,
        targetEntry,
        destinationVersionKey: otherVersionKey,
        followUpHint: '',
        unhatchedCount: availableEggCount,
      })
    }
  })

  if (canTargetOtherVersion) {
    crossVersionBreedGoalRules.forEach((rule) => {
      const targetEntry = allPokemonByName.get(rule.targetName)
      const eggEntry = allPokemonByName.get(rule.eggName ?? rule.targetName)
      const progressKey = rule.progressKey ?? rule.targetName.toLowerCase()
      const progressStoredCount = getBreedingProgressCount(
        breedingProgress,
        versionKey,
        progressKey,
      )

      if (
        !targetEntry ||
        !eggEntry ||
        progressStoredCount < 1 ||
        !trackableNameSetsByVersion[otherVersionKey]?.has(rule.targetName) ||
        isCaught(targetEntry, otherVersionKey, checkboxState)
      ) {
        return
      }

      candidates.push({
        priorityBand: 2,
        sourceEntry: eggEntry,
        targetEntry,
        destinationVersionKey: otherVersionKey,
        followUpHint: rule.followUpHint ?? '',
        unhatchedCount: progressStoredCount,
      })
    })
  }

  branchBreedGoalRules.forEach((rule) => {
    const eggEntry = allPokemonByName.get(rule.eggName)
    const {
      progressCaughtCount,
      availableStockCount,
    } = getBranchRuleProgress(
      rule,
      versionKey,
      checkboxState,
      breedingProgress,
    )

    if (!eggEntry || availableStockCount < 1) {
      return
    }

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

    const [targetEntry] = missingTargetEntries

    candidates.push({
      priorityBand: 3,
      sourceEntry: eggEntry,
      targetEntry,
      destinationVersionKey: versionKey,
      followUpHint: rule.followUpHints?.[targetEntry.name] ?? '',
      hatchSequenceNumber: getBranchHatchSequenceNumber(rule, progressCaughtCount),
      unhatchedCount: availableStockCount,
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

function getVersionHatchGoal(
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
  const candidates = buildHatchGoalCandidates(
    versionKey,
    trackerState,
    visibleVersionKeys,
    trackableNameSetsByVersion,
  )

  return formatHatchGoal(candidates[0] ?? null, versionKey)
}

function getVersionStoneGoal(pokemonList, versionKey, trackerState) {
  const checkboxState = trackerState.checkboxState ?? {}
  const { stoneFollowUpsBySource } = createPokemonIndexes(pokemonList)
  const candidates = []

  pokemonList.forEach((sourceEntry) => {
    if (!isCaught(sourceEntry, versionKey, checkboxState)) {
      return
    }

    const targetEntry = getMissingStoneFollowUp(
      stoneFollowUpsBySource,
      sourceEntry.name,
      versionKey,
      checkboxState,
    )

    if (!targetEntry?.stoneEvolution) {
      return
    }

    candidates.push({
      sourceEntry,
      targetEntry,
      stoneItemName: targetEntry.stoneEvolution,
      stoneToneKey: stoneToneByItemName[targetEntry.stoneEvolution] ?? 'sun',
    })
  })

  candidates.sort(compareStoneCandidates)

  return formatStoneGoal(candidates[0] ?? null, versionKey)
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
  const familyEntriesByKey = buildEvolutionFamiliesByKey(pokemonList)
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
      ...getPartyCandidateFamilyStats(
        {
          sourceEntry,
          targetEntry,
        },
        familyEntriesByKey,
        versionKey,
        checkboxState,
      ),
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

  partyCandidates.sort(comparePartyCandidates)
  huntCandidates.sort((leftCandidate, rightCandidate) =>
    compareHuntCandidates(leftCandidate, rightCandidate, versionKey),
  )

  return {
    partyGoal: xpShareUnlocked ? formatGoal(partyCandidates[0] ?? null, 'party', versionKey) : null,
    breedGoal: getVersionBreedGoal(pokemonList, versionKey, trackerState, options),
    hatchGoal: getVersionHatchGoal(pokemonList, versionKey, trackerState, options),
    stoneGoal: getVersionStoneGoal(pokemonList, versionKey, trackerState),
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
          hatchGoal: baseGameComplete ? versionGoals.hatchGoal : null,
          itemGoal: itemGoalsByVersion[versionKey],
        },
      ]
    }),
  )
}
