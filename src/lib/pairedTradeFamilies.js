import { pokemon } from '../data/pokemon.js'

const versionLabels = {
  'fire-red': 'Fire Red',
  'leaf-green': 'Leaf Green',
}

export const pairedTradeFamilies = [
  {
    key: 'electabuzz-elekid',
    adultName: 'Electabuzz',
    adultSeedNames: ['Electabuzz'],
    adultSeedLabel: 'Electabuzz',
    babyName: 'Elekid',
    familyTradeLabel: 'Electabuzz/Elekid',
    preferredTradeName: 'Electabuzz',
  },
  {
    key: 'magmar-magby',
    adultName: 'Magmar',
    adultSeedNames: ['Magmar'],
    adultSeedLabel: 'Magmar',
    babyName: 'Magby',
    familyTradeLabel: 'Magmar/Magby',
    preferredTradeName: 'Magmar',
  },
  {
    key: 'marill-azurill',
    adultName: 'Marill',
    adultSeedNames: ['Marill', 'Azumarill'],
    adultSeedLabel: 'Marill or Azumarill',
    babyName: 'Azurill',
    familyTradeLabel: 'Marill/Azurill',
    preferredTradeName: 'Marill',
    breedingRequirementLabel: ' with Sea Incense',
    memberNames: ['Marill', 'Azumarill', 'Azurill'],
  },
]

const pokemonIdByName = new Map(
  pokemon.map((entry) => [entry.name, String(entry.id).padStart(3, '0')]),
)

const familyByMemberName = new Map()

pairedTradeFamilies.forEach((family) => {
  const memberNames = family.memberNames ?? [family.adultName, family.babyName]

  memberNames.forEach((name) => {
    familyByMemberName.set(name, family)
  })
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

  const adultSeedNames = family.adultSeedNames ?? [family.adultName]
  const hasAdult = adultSeedNames.some((name) => hasPokemon(versionKey, name, checkboxState))
  const hasBaby = hasPokemon(versionKey, family.babyName, checkboxState)
  const hasAny = hasAdult || hasBaby
  const hasBoth = hasAdult && hasBaby
  const missingName =
    hasBoth || !hasAny ? null : hasAdult ? family.babyName : family.preferredTradeName

  return {
    ...family,
    adultSeedNames,
    adultSeedLabel: family.adultSeedLabel ?? family.adultName,
    familyTradeLabel: family.familyTradeLabel ?? `${family.preferredTradeName}/${family.babyName}`,
    breedingRequirementLabel: family.breedingRequirementLabel ?? '',
    hasAdult,
    hasBaby,
    hasAny,
    hasBoth,
    missingName,
  }
}
