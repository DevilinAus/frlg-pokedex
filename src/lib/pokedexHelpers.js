import { getTrackablePokemon, pokemon } from '../data/pokemon.js'
import { starterLabels } from './pokedexOptions.js'
import {
  getPairedTradeFamilyState,
  getTradeVersionLabel,
} from './pairedTradeFamilies.js'

const versionConfigs = {
  'fire-red': {
    availabilityKey: 'fireRedAvailability',
    starterKey: 'fireRedStarter',
    fossilKey: 'fireRedFossil',
    hitmonKey: 'fireRedHitmon',
    choiceVersion: 'fireRed',
  },
  'leaf-green': {
    availabilityKey: 'leafGreenAvailability',
    starterKey: 'leafGreenStarter',
    fossilKey: 'leafGreenFossil',
    hitmonKey: 'leafGreenHitmon',
    choiceVersion: 'leafGreen',
  },
}

const starterBasePokemonIds = {
  bulbasaur: '001',
  charmander: '004',
  squirtle: '007',
}

const pokemonIdByName = new Map(
  pokemon.map((entry) => [entry.name, String(entry.id).padStart(3, '0')]),
)

function isStarterLine(entry) {
  return Boolean(entry.starterFamily) && !entry.roamingLegendary
}

function isStarterBaseCaught(entry, versionKey, checkboxState) {
  if (!isStarterLine(entry)) {
    return false
  }

  const basePokemonId = starterBasePokemonIds[entry.starterFamily]

  return Boolean(checkboxState?.[`${versionKey}-${basePokemonId}`])
}

export function isLockedByStarterChoice(entry, selectedStarter, versionKey, checkboxState) {
  if (!entry.starterFamily) {
    return false
  }

  if (entry.roamingLegendary) {
    if (!selectedStarter) {
      return true
    }

    return entry.starterFamily !== selectedStarter
  }

  if (isStarterBaseCaught(entry, versionKey, checkboxState)) {
    return false
  }

  if (!selectedStarter) {
    return true
  }

  return entry.starterFamily !== selectedStarter
}

export function isLockedByChoice(entryValue, selectedValue) {
  if (!entryValue) {
    return false
  }

  if (!selectedValue) {
    return true
  }

  return entryValue !== selectedValue
}

export function needsExtraCopy(entry, version, tradeMode) {
  if (tradeMode || entry.evolution) {
    return false
  }

  if (version === 'fireRed') {
    return (
      entry.fireRedAvailability === 'native' &&
      entry.leafGreenAvailability === 'trade'
    )
  }

  return (
    entry.leafGreenAvailability === 'native' &&
    entry.fireRedAvailability === 'trade'
  )
}

export function needsChoiceExtraCopy(entry, versionChoices, tradeMode) {
  if (tradeMode || entry.evolution) {
    return false
  }

  const starterLabel = starterLabels[versionChoices.starter]
  const isSelectedStarterBase =
    entry.starterFamily === versionChoices.starter && entry.name === starterLabel
  const isSelectedHitmon =
    entry.hitmonFamily && entry.hitmonFamily === versionChoices.hitmon

  return isSelectedStarterBase || isSelectedHitmon
}

function getVersionChoices(versionKey, trackerState) {
  const config = versionConfigs[versionKey] ?? versionConfigs['fire-red']

  return {
    starter: trackerState[config.starterKey],
    fossil: trackerState[config.fossilKey],
    hitmon: trackerState[config.hitmonKey],
  }
}

function isCaughtInVersion(entry, versionKey, checkboxState) {
  return Boolean(
    checkboxState?.[`${versionKey}-${String(entry.id).padStart(3, '0')}`],
  )
}

function isPokemonNameCaughtInVersion(name, versionKey, checkboxState) {
  const pokemonId = pokemonIdByName.get(name)

  if (!pokemonId) {
    return false
  }

  return Boolean(checkboxState?.[`${versionKey}-${pokemonId}`])
}

function hasCaughtEvolutionSourceInVersion(entry, versionKey, checkboxState) {
  if (!entry.evolvesFrom) {
    return false
  }

  if (entry.tradeEvolution || entry.tradeEvolutionItem) {
    return false
  }

  return isPokemonNameCaughtInVersion(entry.evolvesFrom, versionKey, checkboxState)
}

function getOtherVersionKey(versionKey) {
  return versionKey === 'fire-red' ? 'leaf-green' : 'fire-red'
}

function shouldShowExtraCopy(entry, versionKey, trackerState, tradeMode = trackerState.tradeMode) {
  const config = versionConfigs[versionKey] ?? versionConfigs['fire-red']
  const versionChoices = getVersionChoices(versionKey, trackerState)
  const otherVersionKey = getOtherVersionKey(versionKey)
  const otherVersionAlreadyHasSpecies = isCaughtInVersion(
    entry,
    otherVersionKey,
    trackerState.checkboxState,
  )

  if (otherVersionAlreadyHasSpecies) {
    return false
  }

  return (
    needsExtraCopy(entry, config.choiceVersion, tradeMode) ||
    needsChoiceExtraCopy(entry, versionChoices, tradeMode)
  )
}

export function hasTradeQueueExtraCopy(entry, versionKey, trackerState) {
  return shouldShowExtraCopy(entry, versionKey, trackerState, false)
}

export function getVersionTrackerState(entry, versionKey, trackerState) {
  const config = versionConfigs[versionKey] ?? versionConfigs['fire-red']
  const versionChoices = getVersionChoices(versionKey, trackerState)
  const caughtInVersion = isCaughtInVersion(
    entry,
    versionKey,
    trackerState.checkboxState,
  )
  const unlockedByOwnedPreEvolution = hasCaughtEvolutionSourceInVersion(
    entry,
    versionKey,
    trackerState.checkboxState,
  )
  const starterLocked = isLockedByStarterChoice(
    entry,
    versionChoices.starter,
    versionKey,
    trackerState.checkboxState,
  )
  const fossilLocked = isLockedByChoice(entry.fossilFamily, versionChoices.fossil)
  const hitmonLocked = isLockedByChoice(entry.hitmonFamily, versionChoices.hitmon)
  const versionAvailability = entry[config.availabilityKey]
  const switchEventLegendaryUnlocked =
    entry.switchEventLegendary && trackerState.switchEventUnlocks
  const blockedByAvailability =
    !unlockedByOwnedPreEvolution &&
    !switchEventLegendaryUnlocked &&
    versionAvailability !== 'native' &&
    !(trackerState.tradeMode && versionAvailability === 'trade')
  const locked = trackerState.unlockAll || caughtInVersion
    ? false
    : ((entry.tradeEvolution || entry.tradeEvolutionItem) && !trackerState.tradeMode) ||
      ((starterLocked || fossilLocked || hitmonLocked) && !trackerState.tradeMode) ||
      blockedByAvailability
  const showExtraCopy = shouldShowExtraCopy(entry, versionKey, trackerState)

  return {
    locked,
    showExtraCopy,
    versionAvailability,
  }
}

export function isVisibleInSingleVersion(entry, versionKey, trackerState) {
  if (
    trackerState.unlockAll ||
    isCaughtInVersion(entry, versionKey, trackerState.checkboxState)
  ) {
    return true
  }

  const config = versionConfigs[versionKey] ?? versionConfigs['fire-red']
  const versionChoices = getVersionChoices(versionKey, trackerState)
  const versionAvailability = entry[config.availabilityKey]
  const switchEventLegendaryUnlocked =
    entry.switchEventLegendary && trackerState.switchEventUnlocks
  const unlockedByOwnedPreEvolution = hasCaughtEvolutionSourceInVersion(
    entry,
    versionKey,
    trackerState.checkboxState,
  )
  const blockedByTradeEvolution =
    (entry.tradeEvolution || entry.tradeEvolutionItem) && !trackerState.tradeMode
  const blockedByStarterChoice =
    !trackerState.tradeMode &&
    isLockedByStarterChoice(
      entry,
      versionChoices.starter,
      versionKey,
      trackerState.checkboxState,
    )
  const blockedByFossilChoice =
    Boolean(versionChoices.fossil) &&
    entry.fossilFamily &&
    entry.fossilFamily !== versionChoices.fossil &&
    !trackerState.tradeMode
  const blockedByHitmonChoice =
    Boolean(versionChoices.hitmon) &&
    entry.hitmonFamily &&
    entry.hitmonFamily !== versionChoices.hitmon &&
    !trackerState.tradeMode
  const blockedByAvailability =
    !unlockedByOwnedPreEvolution &&
    !switchEventLegendaryUnlocked &&
    versionAvailability !== 'native' &&
    !(trackerState.tradeMode && versionAvailability === 'trade')

  return !(
    blockedByTradeEvolution ||
    blockedByStarterChoice ||
    blockedByFossilChoice ||
    blockedByHitmonChoice ||
    blockedByAvailability
  )
}

function combineComments(...comments) {
  return comments.filter(Boolean).join(' ')
}

function getTradeTargetVersionKey(entry) {
  if (
    entry.leafGreenAvailability === 'native' &&
    entry.fireRedAvailability === 'trade'
  ) {
    return 'fire-red'
  }

  if (
    entry.fireRedAvailability === 'native' &&
    entry.leafGreenAvailability === 'trade'
  ) {
    return 'leaf-green'
  }

  return null
}

function getPairedTradeFamilyComment(entry, checkboxState) {
  const targetVersionKey = getTradeTargetVersionKey(entry)

  if (!targetVersionKey) {
    return ''
  }

  const familyState = getPairedTradeFamilyState(entry.name, targetVersionKey, checkboxState)

  if (!familyState || familyState.hasBoth) {
    return ''
  }

  const targetLabel = getTradeVersionLabel(targetVersionKey)
  const breedingRequirementLabel = familyState.breedingRequirementLabel ?? ''

  if (!familyState.hasAny) {
    return `${targetLabel} only needs one ${familyState.familyTradeLabel} handoff. ${familyState.preferredTradeName} is the default trade, but ${familyState.babyName} works too if you already bred one${breedingRequirementLabel}.`
  }

  if (familyState.hasAdult) {
    return `${targetLabel} already has ${familyState.adultSeedLabel}. Another family trade is optional now, and ${familyState.babyName} would only save breeding${breedingRequirementLabel} there.`
  }

  return `${targetLabel} already has ${familyState.babyName}. Another family trade is optional now, and ${familyState.adultName} would only save evolving there.`
}

export function getComment(
  entry,
  switchEventUnlocks,
  fireRedStarter,
  leafGreenStarter,
  fireRedFossil,
  leafGreenFossil,
  fireRedHitmon,
  leafGreenHitmon,
  checkboxState,
) {
  const bothStartersChosen = Boolean(fireRedStarter && leafGreenStarter)
  const starterCoversEntry =
    entry.starterFamily === fireRedStarter || entry.starterFamily === leafGreenStarter
  const bothFossilsChosen = Boolean(fireRedFossil && leafGreenFossil)
  const bothHitmonsChosen = Boolean(fireRedHitmon && leafGreenHitmon)
  const familyComment = getPairedTradeFamilyComment(entry, checkboxState)

  if (entry.name === 'Mew') {
    return combineComments(
      switchEventUnlocks
        ? 'Switch unlocks Lugia, Ho-Oh, and Deoxys after Hall of Fame, but not Mew'
        : 'Not catchable in FireRed/LeafGreen',
      familyComment,
    )
  }

  if (entry.switchEventLegendary) {
    if (switchEventUnlocks) {
      return familyComment
    }

    if (entry.name === 'Deoxys') {
      return combineComments(
        'Requires the Aurora Ticket event after Hall of Fame',
        familyComment,
      )
    }

    return combineComments(
      'Requires the Mystic Ticket event after Hall of Fame',
      familyComment,
    )
  }

  if (
    entry.roamingLegendary &&
    bothStartersChosen &&
    entry.starterFamily !== fireRedStarter &&
    entry.starterFamily !== leafGreenStarter
  ) {
    return combineComments(
      `${entry.name} only appears on a completed save that chose ${starterLabels[entry.starterFamily]} as its starter. You will need another finished save or player, then trade it over.`,
      familyComment,
    )
  }

  if (entry.roamingLegendary) {
    if (starterCoversEntry) {
      return familyComment
    }

    return combineComments(
      `${entry.name} only appears on a completed save that chose ${starterLabels[entry.starterFamily]} as its starter. Only one of Raikou, Entei, or Suicune appears per save.`,
      familyComment,
    )
  }

  if (entry.specialComment) {
    return combineComments(entry.specialComment, familyComment)
  }

  if (entry.inGameTrade) {
    return combineComments(entry.inGameTrade, familyComment)
  }

  if (entry.tradeEvolutionItem && entry.evolvesFrom) {
    return combineComments(
      `Trade ${entry.evolvesFrom} holding ${entry.tradeEvolutionItem} to evolve it`,
      familyComment,
    )
  }

  if (entry.tradeEvolution && entry.evolvesFrom) {
    return combineComments(
      `Trade ${entry.evolvesFrom} to evolve it`,
      familyComment,
    )
  }

  if (entry.friendshipEvolution && entry.evolvesFrom) {
    return combineComments(
      `Level up ${entry.evolvesFrom} with high friendship`,
      familyComment,
    )
  }

  if (entry.stoneEvolution) {
    return combineComments(`Evolves via ${entry.stoneEvolution}`, familyComment)
  }

  if (
    entry.evolution &&
    entry.evolutionBaseName &&
    ((entry.fireRedAvailability === 'native' &&
      entry.leafGreenAvailability === 'trade') ||
      (entry.leafGreenAvailability === 'native' &&
        entry.fireRedAvailability === 'trade'))
  ) {
    const targetVersionKey = getTradeTargetVersionKey(entry)
    const targetAlreadyHasEntry =
      targetVersionKey &&
      isCaughtInVersion(entry, targetVersionKey, checkboxState)
    const targetAlreadyHasEvolutionBase =
      targetVersionKey &&
      isPokemonNameCaughtInVersion(
        entry.evolutionBaseName,
        targetVersionKey,
        checkboxState,
      )

    if (!targetAlreadyHasEntry && !targetAlreadyHasEvolutionBase) {
      return combineComments(
        `Trade for ${entry.evolutionBaseName} and evolve it`,
        familyComment,
      )
    }
  }

  if (
    entry.starterFamily &&
    entry.name === starterLabels[entry.starterFamily] &&
    ((entry.starterFamily === fireRedStarter &&
      entry.starterFamily !== leafGreenStarter) ||
      (entry.starterFamily === leafGreenStarter &&
        entry.starterFamily !== fireRedStarter))
  ) {
    return combineComments(
      `Requires breeding for a ${starterLabels[entry.starterFamily]} egg postgame`,
      familyComment,
    )
  }

  if (
    bothStartersChosen &&
    entry.starterFamily &&
    entry.starterFamily !== fireRedStarter &&
    entry.starterFamily !== leafGreenStarter
  ) {
    return combineComments('Requires trade from fresh game on new profile', familyComment)
  }

  if (
    bothFossilsChosen &&
    entry.fossilFamily &&
    entry.fossilFamily !== fireRedFossil &&
    entry.fossilFamily !== leafGreenFossil
  ) {
    return combineComments('Requires trade from fresh game on new profile', familyComment)
  }

  if (
    bothHitmonsChosen &&
    entry.hitmonFamily &&
    entry.hitmonFamily !== fireRedHitmon &&
    entry.hitmonFamily !== leafGreenHitmon
  ) {
    return combineComments('Requires trade from fresh game on new profile', familyComment)
  }

  if (entry.levelEvolution) {
    return combineComments(`Evolves at level ${entry.levelEvolution}`, familyComment)
  }

  return familyComment
}

export function getPokemonDbUrl(entry) {
  return `https://pokemondb.net/pokedex/${entry.spriteSlug}#dex-locations`
}

const itemDbSlugOverrides = {
  'Up-Grade': 'upgrade',
}

export function getItemDbUrl(itemName) {
  const slug =
    itemDbSlugOverrides[itemName] ??
    String(itemName || '')
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/\s+/g, '-')

  return `https://pokemondb.net/item/${slug}`
}

export function hasCompletedDex(checkboxState, versionKey, options = {}) {
  return getTrackablePokemon(options).every((entry) =>
    Boolean(checkboxState[`${versionKey}-${String(entry.id).padStart(3, '0')}`]),
  )
}
