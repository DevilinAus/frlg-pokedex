export const starterOptions = [
  { value: 'bulbasaur', label: 'Bulbasaur' },
  { value: 'charmander', label: 'Charmander' },
  { value: 'squirtle', label: 'Squirtle' },
]

export const fossilOptions = [
  { value: 'omanyte', label: 'Helix Fossil' },
  { value: 'kabuto', label: 'Dome Fossil' },
]

export const eeveelutionOptions = [
  { value: 'vaporeon', label: 'Vaporeon' },
  { value: 'jolteon', label: 'Jolteon' },
  { value: 'flareon', label: 'Flareon' },
]

export const hitmonOptions = [
  { value: 'hitmonlee', label: 'Hitmonlee' },
  { value: 'hitmonchan', label: 'Hitmonchan' },
]

export const starterLabels = Object.fromEntries(
  starterOptions.map((option) => [option.value, option.label]),
)

export const defaultCelebrationState = {
  fireRedCompleteCelebrated: false,
  leafGreenCompleteCelebrated: false,
}

export const defaultAppState = {
  tradeMode: false,
  fireRedStarter: 'charmander',
  leafGreenStarter: 'bulbasaur',
  fireRedFossil: 'omanyte',
  leafGreenFossil: 'kabuto',
  fireRedEeveelution: 'vaporeon',
  leafGreenEeveelution: 'jolteon',
  fireRedHitmon: 'hitmonlee',
  leafGreenHitmon: 'hitmonchan',
  checkboxState: {},
  celebrationState: defaultCelebrationState,
}
