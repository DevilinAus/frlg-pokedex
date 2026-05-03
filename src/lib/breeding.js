export const directBreedGoalRules = [
  {
    targetName: 'Pichu',
    breederNames: ['Pikachu', 'Raichu'],
    breederLabel: 'Pikachu / Raichu',
  },
  {
    targetName: 'Cleffa',
    breederNames: ['Clefairy', 'Clefable'],
    breederLabel: 'Clefairy / Clefable',
  },
  {
    targetName: 'Igglybuff',
    breederNames: ['Jigglypuff', 'Wigglytuff'],
    breederLabel: 'Jigglypuff / Wigglytuff',
  },
  {
    targetName: 'Tyrogue',
    breederNames: ['Hitmonlee', 'Hitmonchan', 'Hitmontop'],
    breederLabel: 'Any Hitmon',
  },
  {
    targetName: 'Smoochum',
    breederNames: ['Jynx'],
  },
  {
    targetName: 'Elekid',
    breederNames: ['Electabuzz'],
  },
  {
    targetName: 'Magby',
    breederNames: ['Magmar'],
  },
  {
    targetName: 'Azurill',
    breederNames: ['Marill', 'Azumarill'],
    breederLabel: 'Marill / Azumarill',
    breedingItemName: 'Sea Incense',
  },
  {
    targetName: 'Wynaut',
    breederNames: ['Wobbuffet'],
    breedingItemName: 'Lax Incense',
  },
]

export const crossVersionBreedGoalRules = [
  {
    targetName: 'Bulbasaur',
    breederNames: ['Bulbasaur', 'Ivysaur', 'Venusaur'],
    breederLabel: 'Bulbasaur line',
  },
  {
    targetName: 'Charmander',
    breederNames: ['Charmander', 'Charmeleon', 'Charizard'],
    breederLabel: 'Charmander line',
  },
  {
    targetName: 'Squirtle',
    breederNames: ['Squirtle', 'Wartortle', 'Blastoise'],
    breederLabel: 'Squirtle line',
  },
  {
    targetName: 'Omanyte',
    breederNames: ['Omanyte', 'Omastar'],
    breederLabel: 'Omanyte / Omastar',
  },
  {
    targetName: 'Kabuto',
    breederNames: ['Kabuto', 'Kabutops'],
    breederLabel: 'Kabuto / Kabutops',
  },
  {
    targetName: 'Hitmonlee',
    breederNames: ['Hitmonlee', 'Hitmonchan', 'Hitmontop'],
    breederLabel: 'Any Hitmon',
    followUpHint: 'Raise Attack higher than Defense by Lv. 20.',
  },
  {
    targetName: 'Hitmonchan',
    breederNames: ['Hitmonlee', 'Hitmonchan', 'Hitmontop'],
    breederLabel: 'Any Hitmon',
    followUpHint: 'Raise Defense higher than Attack by Lv. 20.',
  },
]

export const branchBreedGoalRules = [
  {
    familyKey: 'eevee',
    eggName: 'Eevee',
    breederNames: ['Eevee', 'Vaporeon', 'Jolteon', 'Flareon'],
    ownedMemberNames: ['Eevee', 'Vaporeon', 'Jolteon', 'Flareon'],
    breederLabel: 'Eevee / Any Eeveelution',
    targetNames: ['Vaporeon', 'Jolteon', 'Flareon'],
    requiredCount: 3,
    followUpHints: {
      Vaporeon: 'Use a Water Stone on the hatched Eevee.',
      Jolteon: 'Use a Thunder Stone on the hatched Eevee.',
      Flareon: 'Use a Fire Stone on the hatched Eevee.',
    },
  },
  {
    familyKey: 'hitmon',
    eggName: 'Tyrogue',
    breederNames: ['Hitmonlee', 'Hitmonchan', 'Hitmontop'],
    ownedMemberNames: ['Tyrogue', 'Hitmonlee', 'Hitmonchan', 'Hitmontop'],
    progressCountNames: ['Hitmonlee', 'Hitmonchan', 'Hitmontop'],
    availableCaughtStockNames: ['Tyrogue'],
    availableCaughtStockBaselineCount: 1,
    breederLabel: 'Any Hitmon',
    targetNames: ['Hitmonlee', 'Hitmonchan', 'Hitmontop'],
    requiredCount: 3,
    breedGoalSkipsAvailableStock: true,
    hatchSequenceMode: 'target-progress',
    hatchSequenceBaselineCount: 1,
    followUpHints: {
      Hitmonlee: 'Raise Attack higher than Defense by Lv. 20.',
      Hitmonchan: 'Raise Defense higher than Attack by Lv. 20.',
      Hitmontop: 'Keep Attack and Defense equal by Lv. 20.',
    },
  },
]
