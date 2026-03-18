import { getTrackablePokemon } from '../data/pokemon'
import { starterLabels } from './pokedexOptions'

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

export function getComment(
  entry,
  switchEventUnlocks,
  fireRedStarter,
  leafGreenStarter,
  fireRedFossil,
  leafGreenFossil,
  fireRedEeveelution,
  leafGreenEeveelution,
  fireRedHitmon,
  leafGreenHitmon,
) {
  const bothStartersChosen = Boolean(fireRedStarter && leafGreenStarter)
  const bothFossilsChosen = Boolean(fireRedFossil && leafGreenFossil)
  const bothEeveelutionsChosen = Boolean(
    fireRedEeveelution && leafGreenEeveelution,
  )
  const bothHitmonsChosen = Boolean(fireRedHitmon && leafGreenHitmon)

  if (entry.name === 'Mew') {
    return switchEventUnlocks
      ? 'Switch unlocks Lugia, Ho-Oh, and Deoxys after Hall of Fame, but not Mew'
      : 'Not catchable in FireRed/LeafGreen'
  }

  if (entry.switchEventLegendary) {
    if (entry.name === 'Deoxys') {
      return switchEventUnlocks
        ? 'Switch unlocks Aurora Ticket after Hall of Fame'
        : 'Requires the Aurora Ticket event after Hall of Fame'
    }

    return switchEventUnlocks
      ? 'Switch unlocks Mystic Ticket after Hall of Fame'
      : 'Requires the Mystic Ticket event after Hall of Fame'
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

  if (
    bothEeveelutionsChosen &&
    entry.eeveelutionFamily &&
    entry.eeveelutionFamily !== fireRedEeveelution &&
    entry.eeveelutionFamily !== leafGreenEeveelution
  ) {
    return 'Requires breeding for an Eevee egg postgame'
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
