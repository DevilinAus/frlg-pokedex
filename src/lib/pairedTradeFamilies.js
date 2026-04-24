import { pokemon } from '../data/pokemon.js'

const versionLabels = {
  'fire-red': 'Fire Red',
  'leaf-green': 'Leaf Green',
}

export const pairedTradeFamilies = [
  {
    key: 'magmar-magby',
    adultName: 'Magmar',
    babyName: 'Magby',
    preferredTradeName: 'Magmar',
  },
]

const pokemonIdByName = new Map(
  pokemon.map((entry) => [entry.name, String(entry.id).padStart(3, '0')]),
)

const familyByMemberName = new Map()

pairedTradeFamilies.forEach((family) => {
  familyByMemberName.set(family.adultName, family)
  familyByMemberName.set(family.babyName, family)
})

function hasPokemon(versionKey, name, checkboxState) {
  const pokemonId = pokemonIdByName.get(name)

  if (!pokemonId) {
    return false
  }

  return Boolean(checkboxState?.[`${versionKey}-${pokemonId}`])
}

export function getTradeVersionLabel(versionKey) {
  return versionLabels[versionKey] ?? versionKey
}

export function getPairedTradeFamily(name) {
  return familyByMemberName.get(name) ?? null
}

export function getPairedTradeFamilyState(familyOrName, versionKey, checkboxState) {
  const family =
    typeof familyOrName === 'string' ? getPairedTradeFamily(familyOrName) : familyOrName

  if (!family) {
    return null
  }

  const hasAdult = hasPokemon(versionKey, family.adultName, checkboxState)
  const hasBaby = hasPokemon(versionKey, family.babyName, checkboxState)
  const hasAny = hasAdult || hasBaby
  const hasBoth = hasAdult && hasBaby
  const missingName = hasBoth || !hasAny ? null : hasAdult ? family.babyName : family.adultName

  return {
    ...family,
    hasAdult,
    hasBaby,
    hasAny,
    hasBoth,
    missingName,
  }
}
