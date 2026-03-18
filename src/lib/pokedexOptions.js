export const starterOptions = [
  { value: '', label: 'Not chosen yet' },
  { value: 'bulbasaur', label: 'Bulbasaur' },
  { value: 'charmander', label: 'Charmander' },
  { value: 'squirtle', label: 'Squirtle' },
]

export const fossilOptions = [
  { value: '', label: 'Not chosen yet' },
  { value: 'omanyte', label: 'Helix Fossil' },
  { value: 'kabuto', label: 'Dome Fossil' },
]

export const eeveelutionOptions = [
  { value: '', label: 'Not chosen yet' },
  { value: 'vaporeon', label: 'Vaporeon' },
  { value: 'jolteon', label: 'Jolteon' },
  { value: 'flareon', label: 'Flareon' },
]

export const hitmonOptions = [
  { value: '', label: 'Not chosen yet' },
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
  fireRedStarter: '',
  leafGreenStarter: '',
  fireRedFossil: '',
  leafGreenFossil: '',
  fireRedEeveelution: '',
  leafGreenEeveelution: '',
  fireRedHitmon: '',
  leafGreenHitmon: '',
  checkboxState: {},
  celebrationState: defaultCelebrationState,
}
