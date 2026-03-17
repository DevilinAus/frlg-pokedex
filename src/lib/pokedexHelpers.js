import { pokemon } from '../data/pokemon'
import { starterLabels } from './pokedexOptions'

export function isLockedByStarterChoice(entry, selectedStarter) {
  if (!entry.starterFamily || !selectedStarter) {
    return false
  }

  return entry.starterFamily !== selectedStarter
}

export function isLockedByChoice(entryValue, selectedValue) {
  if (!entryValue || !selectedValue) {
    return false
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
  fireRedStarter,
  leafGreenStarter,
  fireRedEeveelution,
  leafGreenEeveelution,
) {
  if (entry.specialComment) {
    return entry.specialComment
  }

  if (entry.inGameTrade) {
    return entry.inGameTrade
  }

  if (entry.tradeEvolution && entry.evolvesFrom) {
    return `Trade ${entry.evolvesFrom} to evolve it`
  }

  if (
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
    (entry.starterFamily === fireRedStarter ||
      entry.starterFamily === leafGreenStarter)
  ) {
    return `Requires breeding for a ${starterLabels[entry.starterFamily]} egg postgame`
  }

  if (
    entry.starterFamily &&
    entry.starterFamily !== fireRedStarter &&
    entry.starterFamily !== leafGreenStarter
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

export function hasCompletedDex(checkboxState, versionKey) {
  return pokemon.every((entry) =>
    Boolean(checkboxState[`${versionKey}-${String(entry.id).padStart(3, '0')}`]),
  )
}
