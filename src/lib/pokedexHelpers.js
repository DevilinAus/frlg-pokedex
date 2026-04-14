import { getTrackablePokemon } from '../data/pokemon'
import { starterLabels } from './pokedexOptions'

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

export function isLockedByStarterChoice(entry, selectedStarter) {
  if (!entry.starterFamily) {
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

export function hasTradeQueueExtraCopy(entry, versionKey, trackerState) {
  const config = versionConfigs[versionKey] ?? versionConfigs['fire-red']
  const versionChoices = getVersionChoices(versionKey, trackerState)

  return (
    needsExtraCopy(entry, config.choiceVersion, false) ||
    needsChoiceExtraCopy(entry, versionChoices, false)
  )
}

export function getVersionTrackerState(entry, versionKey, trackerState) {
  const config = versionConfigs[versionKey] ?? versionConfigs['fire-red']
  const versionChoices = getVersionChoices(versionKey, trackerState)
  const starterLocked = isLockedByStarterChoice(entry, versionChoices.starter)
  const fossilLocked = isLockedByChoice(entry.fossilFamily, versionChoices.fossil)
  const hitmonLocked = isLockedByChoice(entry.hitmonFamily, versionChoices.hitmon)
  const versionAvailability = entry[config.availabilityKey]
  const switchEventLegendaryUnlocked =
    entry.switchEventLegendary && trackerState.switchEventUnlocks
  const locked =
    ((entry.tradeEvolution || entry.tradeEvolutionItem) && !trackerState.tradeMode) ||
    ((starterLocked || fossilLocked || hitmonLocked) && !trackerState.tradeMode) ||
    (!switchEventLegendaryUnlocked &&
      versionAvailability !== 'native' &&
      !(trackerState.tradeMode && versionAvailability === 'trade'))
  const showExtraCopy =
    needsExtraCopy(entry, config.choiceVersion, trackerState.tradeMode) ||
    needsChoiceExtraCopy(entry, versionChoices, trackerState.tradeMode)

  return {
    locked,
    showExtraCopy,
    versionAvailability,
  }
}

export function isVisibleInSingleVersion(entry, versionKey, trackerState) {
  const config = versionConfigs[versionKey] ?? versionConfigs['fire-red']
  const versionChoices = getVersionChoices(versionKey, trackerState)
  const versionAvailability = entry[config.availabilityKey]
  const switchEventLegendaryUnlocked =
    entry.switchEventLegendary && trackerState.switchEventUnlocks
  const blockedByTradeEvolution =
    (entry.tradeEvolution || entry.tradeEvolutionItem) && !trackerState.tradeMode
  const blockedByStarterChoice =
    Boolean(versionChoices.starter) &&
    entry.starterFamily &&
    entry.starterFamily !== versionChoices.starter &&
    !trackerState.tradeMode
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

export function getComment(
  entry,
  switchEventUnlocks,
  fireRedStarter,
  leafGreenStarter,
  fireRedFossil,
  leafGreenFossil,
  fireRedHitmon,
  leafGreenHitmon,
) {
  const bothStartersChosen = Boolean(fireRedStarter && leafGreenStarter)
  const starterCoversEntry =
    entry.starterFamily === fireRedStarter || entry.starterFamily === leafGreenStarter
  const bothFossilsChosen = Boolean(fireRedFossil && leafGreenFossil)
  const bothHitmonsChosen = Boolean(fireRedHitmon && leafGreenHitmon)

  if (entry.name === 'Mew') {
    return switchEventUnlocks
      ? 'Switch unlocks Lugia, Ho-Oh, and Deoxys after Hall of Fame, but not Mew'
      : 'Not catchable in FireRed/LeafGreen'
  }

  if (entry.switchEventLegendary) {
    if (switchEventUnlocks) {
      return ''
    }

    if (entry.name === 'Deoxys') {
      return 'Requires the Aurora Ticket event after Hall of Fame'
    }

    return 'Requires the Mystic Ticket event after Hall of Fame'
  }

  if (
    entry.roamingLegendary &&
    bothStartersChosen &&
    entry.starterFamily !== fireRedStarter &&
    entry.starterFamily !== leafGreenStarter
  ) {
    return `${entry.name} only appears on a completed save that chose ${starterLabels[entry.starterFamily]} as its starter. You will need another finished save or player, then trade it over.`
  }

  if (entry.roamingLegendary) {
    if (starterCoversEntry) {
      return ''
    }

    return `${entry.name} only appears on a completed save that chose ${starterLabels[entry.starterFamily]} as its starter. Only one of Raikou, Entei, or Suicune appears per save.`
  }

  if (entry.specialComment) {
    return entry.specialComment
  }

  if (entry.inGameTrade) {
    return entry.inGameTrade
  }

  if (entry.tradeEvolutionItem && entry.evolvesFrom) {
    return `Trade ${entry.evolvesFrom} holding ${entry.tradeEvolutionItem} to evolve it`
  }

  if (entry.tradeEvolution && entry.evolvesFrom) {
    return `Trade ${entry.evolvesFrom} to evolve it`
  }

  if (entry.friendshipEvolution && entry.evolvesFrom) {
    return `Level up ${entry.evolvesFrom} with high friendship`
  }

  if (entry.stoneEvolution) {
    return `Evolves via ${entry.stoneEvolution}`
  }

  if (
    entry.evolution &&
    entry.evolutionBaseName &&
    ((entry.fireRedAvailability === 'native' &&
      entry.leafGreenAvailability === 'trade') ||
      (entry.leafGreenAvailability === 'native' &&
        entry.fireRedAvailability === 'trade'))
  ) {
    return `Trade for ${entry.evolutionBaseName} and evolve it`
  }

  if (
    entry.starterFamily &&
    entry.name === starterLabels[entry.starterFamily] &&
    ((entry.starterFamily === fireRedStarter &&
      entry.starterFamily !== leafGreenStarter) ||
      (entry.starterFamily === leafGreenStarter &&
        entry.starterFamily !== fireRedStarter))
  ) {
    return `Requires breeding for a ${starterLabels[entry.starterFamily]} egg postgame`
  }

  if (
    bothStartersChosen &&
    entry.starterFamily &&
    entry.starterFamily !== fireRedStarter &&
    entry.starterFamily !== leafGreenStarter
  ) {
    return 'Requires trade from fresh game on new profile'
  }

  if (
    bothFossilsChosen &&
    entry.fossilFamily &&
    entry.fossilFamily !== fireRedFossil &&
    entry.fossilFamily !== leafGreenFossil
  ) {
    return 'Requires trade from fresh game on new profile'
  }

  if (
    bothHitmonsChosen &&
    entry.hitmonFamily &&
    entry.hitmonFamily !== fireRedHitmon &&
    entry.hitmonFamily !== leafGreenHitmon
  ) {
    return 'Requires trade from fresh game on new profile'
  }

  if (entry.levelEvolution) {
    return `Evolves at level ${entry.levelEvolution}`
  }

  return ''
}

export function getPokemonDbUrl(entry) {
  return `https://pokemondb.net/pokedex/${entry.spriteSlug}#dex-locations`
}

export function hasCompletedDex(checkboxState, versionKey, options = {}) {
  return getTrackablePokemon(options).every((entry) =>
    Boolean(checkboxState[`${versionKey}-${String(entry.id).padStart(3, '0')}`]),
  )
}
