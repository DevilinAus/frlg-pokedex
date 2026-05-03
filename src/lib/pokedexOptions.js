export const starterOptions = [
  { value: '', label: 'Not chosen yet' },
  { value: 'bulbasaur', label: 'Bulbasaur' },
  { value: 'charmander', label: 'Charmander' },
  { value: 'squirtle', label: 'Squirtle' },
]

export const ownedGameOptions = [
  { value: 'fire-red', label: 'Fire Red' },
  { value: 'leaf-green', label: 'Leaf Green' },
  { value: 'both', label: 'Both versions' },
]

export const primaryGameOptions = [
  { value: '', label: 'Choose main game' },
  { value: 'fire-red', label: 'Fire Red' },
  { value: 'leaf-green', label: 'Leaf Green' },
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

export const ownedGameLabels = Object.fromEntries(
  ownedGameOptions.map((option) => [option.value, option.label]),
)

export const defaultCelebrationState = {
  fireRedCompleteCelebrated: false,
  leafGreenCompleteCelebrated: false,
}

export const defaultAppState = {
  ownedGames: 'both',
  trackerLayout: 'dual',
  onboardingComplete: false,
  tradeMode: false,
  showSecondaryProgress: false,
  unlockAll: false,
  primaryGame: '',
  switchEventUnlocks: false,
  fireRedBaseGameComplete: false,
  leafGreenBaseGameComplete: false,
  fireRedStarter: '',
  leafGreenStarter: '',
  fireRedFossil: '',
  leafGreenFossil: '',
  fireRedEeveelution: '',
  leafGreenEeveelution: '',
  fireRedHitmon: '',
  leafGreenHitmon: '',
  ownedHeldTradeItems: {},
  breedingProgress: {},
  checkboxState: {},
  celebrationState: defaultCelebrationState,
}
