import assert from 'node:assert/strict'
import test from 'node:test'

import { getTrackablePokemon } from '../data/pokemon.js'
import { buildTradeQueue } from './tradeQueue.js'
import { getBreedingProgressStateKey } from './breedingProgress.js'
import {
  buildGoalsByVersion,
  getVersionGoals,
  XP_SHARE_POKEDEX_REQUIREMENT,
} from './goals.js'

const pokemonList = getTrackablePokemon({ baseGameComplete: true })

function getCaughtKey(versionKey, pokemonId) {
  return `${versionKey}-${String(pokemonId).padStart(3, '0')}`
}

function createTrackerState(
  checkboxState = {},
  ownedHeldTradeItems = {},
  breedingProgress = {},
) {
  return {
    tradeMode: false,
    switchEventUnlocks: false,
    fireRedBaseGameComplete: true,
    leafGreenBaseGameComplete: true,
    fireRedStarter: '',
    leafGreenStarter: '',
    fireRedFossil: '',
    leafGreenFossil: '',
    fireRedEeveelution: '',
    leafGreenEeveelution: '',
    fireRedHitmon: '',
    leafGreenHitmon: '',
    ownedHeldTradeItems,
    breedingProgress,
    checkboxState,
  }
}

function createCaughtState(versionKey, pokemonIds) {
  return Object.fromEntries(
    pokemonIds.map((pokemonId) => [getCaughtKey(versionKey, pokemonId), true]),
  )
}

test('prefers an owned trade-unlock leveling line for the party goal', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState(
      createCaughtState('fire-red', [
        ...Array.from({ length: XP_SHARE_POKEDEX_REQUIREMENT - 1 }, (_, index) => index + 1),
        63,
      ]),
    ),
  )

  assert.equal(goals.partyGoal.sourceEntry.name, 'Abra')
  assert.equal(goals.partyGoal.targetEntry.name, 'Kadabra')
  assert.equal(goals.partyGoal.tradeFollowUp?.name, 'Alakazam')
})

test('waits to show the XP Share target until 50 Pokemon are registered', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState(
      createCaughtState('fire-red', [
        ...Array.from({ length: XP_SHARE_POKEDEX_REQUIREMENT - 2 }, (_, index) => index + 1),
        63,
      ]),
    ),
  )

  assert.equal(goals.caughtCount, XP_SHARE_POKEDEX_REQUIREMENT - 1)
  assert.equal(goals.xpShareUnlocked, false)
  assert.equal(goals.xpShareRemaining, 1)
  assert.equal(goals.partyGoal, null)
})

test('shows the XP Share target once 50 Pokemon are registered', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState(
      createCaughtState('fire-red', [
        ...Array.from({ length: XP_SHARE_POKEDEX_REQUIREMENT - 1 }, (_, index) => index + 1),
        63,
      ]),
    ),
  )

  assert.equal(goals.caughtCount, XP_SHARE_POKEDEX_REQUIREMENT)
  assert.equal(goals.xpShareUnlocked, true)
  assert.equal(goals.xpShareRemaining, 0)
  assert.equal(goals.partyGoal?.sourceEntry.name, 'Abra')
})

test('prefers the quickest nearly-finished family once an earlier XP Share line is complete', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState(
      createCaughtState('fire-red', [
        ...Array.from({ length: XP_SHARE_POKEDEX_REQUIREMENT - 4 }, (_, index) => index + 1),
        63,
        64,
        65,
        74,
      ]),
    ),
  )

  assert.equal(goals.partyGoal.sourceEntry.name, 'Paras')
  assert.equal(goals.partyGoal.targetEntry.name, 'Parasect')
  assert.equal(goals.partyGoal.tradeFollowUp, null)
})

test('keeps the XP Share target on the same family after an evolution is marked complete', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState(
      createCaughtState('fire-red', [
        ...Array.from({ length: 49 }, (_, index) => index + 1).filter((id) => id !== 6),
        74,
        75,
        147,
      ]),
    ),
  )

  assert.equal(goals.partyGoal.sourceEntry.name, 'Charmeleon')
  assert.equal(goals.partyGoal.targetEntry.name, 'Charizard')
})

test('deprioritizes long leveling lines like Dratini when a shorter family is at the same progress point', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState(
      createCaughtState('fire-red', [
        ...Array.from({ length: 49 }, (_, index) => index + 1).filter(
          (id) => id !== 5 && id !== 6,
        ),
        74,
        75,
        147,
      ]),
    ),
  )

  assert.equal(goals.partyGoal.sourceEntry.name, 'Charmander')
  assert.equal(goals.partyGoal.targetEntry.name, 'Charmeleon')
})

test('prefers a non-Game Corner hunt target before prize Pokemon', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState(),
  )

  assert.equal(goals.huntGoal.sourceEntry.name, 'Machop')
  assert.equal(goals.huntGoal.targetEntry.name, 'Machoke')
  assert.equal(goals.huntGoal.tradeFollowUp?.name, 'Machamp')
})

test('deprioritizes Leaf Green Game Corner Pokemon as hunt targets', () => {
  const goals = getVersionGoals(
    pokemonList,
    'leaf-green',
    createTrackerState(),
  )

  assert.equal(goals.huntGoal.sourceEntry.name, 'Machop')
  assert.equal(goals.huntGoal.targetEntry.name, 'Machoke')
  assert.equal(goals.huntGoal.tradeFollowUp?.name, 'Machamp')
})

test('still returns a Game Corner hunt target when it is the only hunt option left', () => {
  const gameCornerOnlyPokemon = pokemonList.filter((entry) =>
    ['Abra', 'Kadabra', 'Alakazam'].includes(entry.name),
  )
  const goals = getVersionGoals(
    gameCornerOnlyPokemon,
    'leaf-green',
    createTrackerState(),
  )

  assert.equal(goals.huntGoal.sourceEntry.name, 'Abra')
  assert.equal(goals.huntGoal.targetEntry.name, 'Kadabra')
  assert.equal(goals.huntGoal.tradeFollowUp?.name, 'Alakazam')
  assert.equal(goals.huntGoal.isGameCornerPrize, true)
})

test('considers direct native catches as hunt targets when no leveling line starter is available', () => {
  const directCatchOnlyPokemon = pokemonList.filter((entry) =>
    ['Exeggcute', 'Chansey', 'Kangaskhan', 'Tauros'].includes(entry.name),
  )
  const goals = getVersionGoals(
    directCatchOnlyPokemon,
    'leaf-green',
    createTrackerState(),
  )

  assert.equal(goals.huntGoal.sourceEntry.name, 'Exeggcute')
  assert.equal(goals.huntGoal.targetEntry.name, 'Exeggcute')
})

test('prefers a direct native catch before a Game Corner hunt line', () => {
  const safariBeforeGameCornerPokemon = pokemonList.filter((entry) =>
    ['Exeggcute', 'Dratini', 'Dragonair', 'Dragonite'].includes(entry.name),
  )
  const goals = getVersionGoals(
    safariBeforeGameCornerPokemon,
    'leaf-green',
    createTrackerState(),
  )

  assert.equal(goals.huntGoal.sourceEntry.name, 'Exeggcute')
  assert.equal(goals.huntGoal.targetEntry.name, 'Exeggcute')
})

test('starts an unowned Game Corner family from its earliest stage instead of skipping ahead', () => {
  const dratiniFamily = pokemonList.filter((entry) =>
    ['Dratini', 'Dragonair', 'Dragonite'].includes(entry.name),
  )
  const goals = getVersionGoals(
    dratiniFamily,
    'fire-red',
    createTrackerState(),
  )

  assert.equal(goals.huntGoal.sourceEntry.name, 'Dratini')
  assert.equal(goals.huntGoal.targetEntry.name, 'Dragonair')
})

test('uses the same leveling logic for Leaf Green goals', () => {
  const goals = getVersionGoals(
    pokemonList,
    'leaf-green',
    createTrackerState(
      createCaughtState('leaf-green', [
        ...Array.from({ length: XP_SHARE_POKEDEX_REQUIREMENT - 1 }, (_, index) => index + 1),
        116,
      ]),
    ),
  )

  assert.equal(goals.partyGoal.sourceEntry.name, 'Horsea')
  assert.equal(goals.partyGoal.targetEntry.name, 'Seadra')
  assert.equal(goals.partyGoal.tradeFollowUp?.name, 'Kingdra')
})

test('omits the chain-evo badge and extra follow-up copy for plain level chains', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState(
      createCaughtState('fire-red', [
        ...Array.from({ length: XP_SHARE_POKEDEX_REQUIREMENT - 1 }, (_, index) => index + 1),
        187,
      ]),
    ),
  )

  assert.equal(goals.partyGoal.sourceEntry.name, 'Hoppip')
  assert.equal(goals.partyGoal.targetEntry.name, 'Skiploom')
  assert.equal(goals.partyGoal.tradeFollowUpCopy, '')
})

test('returns a hunt goal when the line is available but not yet owned', () => {
  const goals = getVersionGoals(
    pokemonList,
    'leaf-green',
    createTrackerState({
      [getCaughtKey('leaf-green', 63)]: true,
      [getCaughtKey('leaf-green', 64)]: true,
      [getCaughtKey('leaf-green', 65)]: true,
    }),
  )

  assert.equal(goals.huntGoal.sourceEntry.name, 'Machop')
  assert.equal(goals.huntGoal.targetEntry.name, 'Machoke')
  assert.equal(goals.huntGoal.tradeFollowUp?.name, 'Machamp')
})

test('shows a stone goal when the immediate source is already owned', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState({
      [getCaughtKey('fire-red', 120)]: true,
    }),
  )

  assert.equal(goals.stoneGoal?.sourceEntry.name, 'Staryu')
  assert.equal(goals.stoneGoal?.targetEntry.name, 'Starmie')
  assert.equal(goals.stoneGoal?.stoneItemName, 'Water Stone')
  assert.equal(goals.stoneGoal?.stoneToneKey, 'water')
})

test('clears the stone goal once the evolved form is already registered', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState({
      [getCaughtKey('fire-red', 120)]: true,
      [getCaughtKey('fire-red', 121)]: true,
    }),
  )

  assert.equal(goals.stoneGoal, null)
})

test('does not recommend a later-stage evolution as a hunt target when it is only unlocked by an owned pre-evolution', () => {
  const charmanderLine = pokemonList.filter((entry) =>
    ['Charmander', 'Charmeleon', 'Charizard'].includes(entry.name),
  )
  const goals = getVersionGoals(
    charmanderLine,
    'fire-red',
    createTrackerState({
      [getCaughtKey('fire-red', 4)]: true,
    }),
  )

  assert.equal(goals.huntGoal, null)
})

test('shows a same-version baby breeding goal once the parent is caught', () => {
  const goals = getVersionGoals(
    pokemonList,
    'leaf-green',
    createTrackerState({
      [getCaughtKey('leaf-green', 126)]: true,
    }),
  )

  assert.equal(goals.breedGoal?.targetEntry.name, 'Magby')
  assert.equal(goals.breedGoal?.sourceEntry.name, 'Magmar')
  assert.equal(goals.breedGoal?.pairingLabel, 'Magmar + Ditto')
  assert.equal(goals.breedGoal?.instructionCopy, '')
})

test('uses breeding to cover a fossil the other version cannot catch', () => {
  const goalsByVersion = buildGoalsByVersion(
    pokemonList,
    {
      ...createTrackerState({
        [getCaughtKey('leaf-green', 140)]: true,
      }),
      fireRedFossil: 'omanyte',
      leafGreenFossil: 'kabuto',
    },
    ['fire-red', 'leaf-green'],
  )

  assert.equal(goalsByVersion['leaf-green'].breedGoal?.targetEntry.name, 'Kabuto')
  assert.equal(goalsByVersion['leaf-green'].breedGoal?.sourceEntry.name, 'Kabuto')
  assert.equal(goalsByVersion['leaf-green'].breedGoal?.destinationVersionKey, 'fire-red')
  assert.equal(goalsByVersion['leaf-green'].breedGoal?.breederLabel, 'Kabuto / Kabutops')
  assert.match(goalsByVersion['leaf-green'].breedGoal?.instructionCopy ?? '', /Trade it to Fire Red/)
})

test('can keep an Eeveelution plan alive from any owned Eeveelution', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState({
      [getCaughtKey('fire-red', 134)]: true,
    }),
  )

  assert.equal(goals.breedGoal?.targetEntry.name, 'Jolteon')
  assert.equal(goals.breedGoal?.sourceEntry.name, 'Vaporeon')
  assert.equal(goals.breedGoal?.breederLabel, 'Eevee / Any Eeveelution')
  assert.equal(goals.breedGoal?.pairingLabel, 'Eevee / Any Eeveelution + Ditto')
  assert.equal(goals.breedGoal?.progressCurrentCount, 1)
  assert.equal(goals.breedGoal?.progressTargetCount, 3)
  assert.match(goals.breedGoal?.instructionCopy ?? '', /Use a Thunder Stone on the hatched Eevee/)
  assert.doesNotMatch(goals.breedGoal?.instructionCopy ?? '', /Flareon/)
})

test('keeps Eevee breeding active until three total family members or eggs are ready', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState(
      {
        [getCaughtKey('fire-red', 133)]: true,
      },
      {},
      {
        [getBreedingProgressStateKey('fire-red', 'eevee')]: 2,
      },
    ),
  )

  assert.equal(goals.breedGoal?.targetEntry.name, 'Vaporeon')
  assert.equal(goals.breedGoal?.progressCurrentCount, 2)
  assert.equal(goals.breedGoal?.progressTargetCount, 3)
})

test('does not double count caught Eeveelutions and reserved breeding stock', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState(
      {
        [getCaughtKey('fire-red', 134)]: true,
      },
      {},
      {
        [getBreedingProgressStateKey('fire-red', 'eevee')]: 2,
      },
    ),
  )

  assert.equal(goals.breedGoal?.targetEntry.name, 'Jolteon')
  assert.equal(goals.breedGoal?.progressCurrentCount, 2)
  assert.equal(goals.breedGoal?.progressTargetCount, 3)
})

test('hides Eevee breeding once three total family members or eggs are ready', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState(
      {
        [getCaughtKey('fire-red', 133)]: true,
      },
      {},
      {
        [getBreedingProgressStateKey('fire-red', 'eevee')]: 3,
      },
    ),
  )

  assert.notEqual(goals.breedGoal?.progressKey, 'eevee')
})

test('uses Tyrogue breeding for missing Hitmon evolutions after Tyrogue is registered', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState({
      [getCaughtKey('fire-red', 106)]: true,
      [getCaughtKey('fire-red', 236)]: true,
    }),
  )

  assert.equal(goals.breedGoal?.targetEntry.name, 'Hitmontop')
  assert.equal(goals.breedGoal?.sourceEntry.name, 'Hitmonlee')
  assert.equal(goals.breedGoal?.breederLabel, 'Any Hitmon')
  assert.equal(goals.hatchGoal?.targetEntry.name, 'Hitmonchan')
  assert.equal(goals.hatchGoal?.sourceLabel, 'Tyrogue')
  assert.match(goals.hatchGoal?.instructionCopy ?? '', /Defense higher than Attack/)
  assert.match(goals.breedGoal?.instructionCopy ?? '', /Keep Attack and Defense equal/)
})

test('hides a one-off breeding goal once an egg has been marked obtained', () => {
  const goals = getVersionGoals(
    pokemonList,
    'leaf-green',
    createTrackerState(
      {
        [getCaughtKey('leaf-green', 126)]: true,
      },
      {},
      {
        [getBreedingProgressStateKey('leaf-green', 'magby')]: 1,
      },
    ),
  )

  assert.notEqual(goals.breedGoal?.targetEntry.name, 'Magby')
})

test('shows a hatch goal once a same-version egg is owned', () => {
  const goals = getVersionGoals(
    pokemonList,
    'leaf-green',
    createTrackerState(
      {
        [getCaughtKey('leaf-green', 126)]: true,
      },
      {},
      {
        [getBreedingProgressStateKey('leaf-green', 'magby')]: 1,
      },
    ),
  )

  assert.equal(goals.hatchGoal?.sourceEntry.name, 'Magby')
  assert.equal(goals.hatchGoal?.targetEntry.name, 'Magby')
})

test('numbers the first repeated Eevee hatch so multiple eggs do not look duplicated', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState(
      {
        [getCaughtKey('fire-red', 133)]: true,
      },
      {},
      {
        [getBreedingProgressStateKey('fire-red', 'eevee')]: 3,
      },
    ),
  )

  assert.equal(goals.hatchGoal?.sourceLabel, 'Eevee (2)')
})

test('clears a hatch goal once the baby is ticked in the planner', () => {
  const goals = getVersionGoals(
    pokemonList,
    'leaf-green',
    createTrackerState(
      {
        [getCaughtKey('leaf-green', 126)]: true,
        [getCaughtKey('leaf-green', 240)]: true,
      },
      {},
      {
        [getBreedingProgressStateKey('leaf-green', 'magby')]: 1,
      },
    ),
  )

  assert.equal(goals.hatchGoal, null)
})

test('does not retarget a consumed baby egg to the other version in shared goals', () => {
  const goalsByVersion = buildGoalsByVersion(
    pokemonList,
    createTrackerState(
      {
        [getCaughtKey('leaf-green', 126)]: true,
        [getCaughtKey('leaf-green', 240)]: true,
      },
      {},
      {
        [getBreedingProgressStateKey('leaf-green', 'magby')]: 1,
      },
    ),
    ['fire-red', 'leaf-green'],
  )

  assert.equal(goalsByVersion['leaf-green'].hatchGoal, null)
})

test('shows an Eevee hatch goal for reserved eggs and advances after a planner tick', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState(
      {
        [getCaughtKey('fire-red', 133)]: true,
        [getCaughtKey('fire-red', 134)]: true,
      },
      {},
      {
        [getBreedingProgressStateKey('fire-red', 'eevee')]: 3,
      },
    ),
  )

  assert.equal(goals.hatchGoal?.sourceEntry.name, 'Eevee')
  assert.equal(goals.hatchGoal?.sourceLabel, 'Eevee (3)')
  assert.equal(goals.hatchGoal?.targetEntry.name, 'Jolteon')
  assert.equal(goals.hatchGoal?.instructionCopy ?? '', '')
})

test('shows a Tyrogue hatch goal until enough branch eggs have been consumed', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState(
      {
        [getCaughtKey('fire-red', 236)]: true,
        [getCaughtKey('fire-red', 106)]: true,
      },
      {},
      {
        [getBreedingProgressStateKey('fire-red', 'hitmon')]: 3,
      },
    ),
  )

  assert.equal(goals.hatchGoal?.sourceEntry.name, 'Tyrogue')
  assert.equal(goals.hatchGoal?.sourceLabel, 'Tyrogue')
  assert.equal(goals.hatchGoal?.targetEntry.name, 'Hitmonchan')
  assert.match(goals.hatchGoal?.instructionCopy ?? '', /Defense higher than Attack/)
})

test('shows the second Tyrogue hatch after one missing Hitmon is already filled', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState(
      {
        [getCaughtKey('fire-red', 106)]: true,
        [getCaughtKey('fire-red', 107)]: true,
        [getCaughtKey('fire-red', 236)]: true,
      },
      {},
      {
        [getBreedingProgressStateKey('fire-red', 'hitmon')]: 3,
      },
    ),
  )

  assert.equal(goals.hatchGoal?.sourceLabel, 'Tyrogue (2)')
  assert.equal(goals.hatchGoal?.targetEntry.name, 'Hitmontop')
})

test('can breed a missing Hitmon choice for the other version', () => {
  const goalsByVersion = buildGoalsByVersion(
    pokemonList,
    {
      ...createTrackerState({
        [getCaughtKey('fire-red', 236)]: true,
        [getCaughtKey('leaf-green', 106)]: true,
        [getCaughtKey('leaf-green', 107)]: true,
        [getCaughtKey('leaf-green', 236)]: true,
        [getCaughtKey('leaf-green', 237)]: true,
      }),
      fireRedHitmon: 'hitmonlee',
      leafGreenHitmon: 'hitmonlee',
    },
    ['fire-red', 'leaf-green'],
  )

  assert.equal(goalsByVersion['leaf-green'].breedGoal?.targetEntry.name, 'Hitmonchan')
  assert.equal(goalsByVersion['leaf-green'].breedGoal?.sourceEntry.name, 'Hitmonlee')
  assert.equal(goalsByVersion['leaf-green'].breedGoal?.destinationVersionKey, 'fire-red')
  assert.equal(goalsByVersion['leaf-green'].breedGoal?.pairingLabel, 'Any Hitmon + Ditto')
  assert.match(
    goalsByVersion['leaf-green'].breedGoal?.instructionCopy ?? '',
    /Defense higher than Attack/,
  )
})

test('hides the breeding goal until that save is marked base game complete', () => {
  const goalsByVersion = buildGoalsByVersion(
    pokemonList,
    {
      ...createTrackerState({
        [getCaughtKey('leaf-green', 126)]: true,
      }),
      leafGreenBaseGameComplete: false,
    },
    ['leaf-green'],
  )

  assert.equal(goalsByVersion['leaf-green'].baseGameComplete, false)
  assert.equal(goalsByVersion['leaf-green'].breedGoal, null)
})

test('does not offer a breeding goal for legendary-only lists', () => {
  const legendaryPokemon = pokemonList.filter((entry) =>
    ['Raikou', 'Entei', 'Suicune'].includes(entry.name),
  )
  const goals = getVersionGoals(
    legendaryPokemon,
    'fire-red',
    createTrackerState({
      [getCaughtKey('fire-red', 244)]: true,
    }),
  )

  assert.equal(goals.breedGoal, null)
})

test('adds an item goal when a blocked held-item trade exists', () => {
  const checkboxState = {
    [getCaughtKey('fire-red', 117)]: true,
  }
  const trackerState = createTrackerState(checkboxState)
  const tradeQueue = buildTradeQueue(pokemonList, checkboxState, trackerState)
  const goalsByVersion = buildGoalsByVersion(
    pokemonList,
    trackerState,
    ['fire-red'],
    tradeQueue.blockedByVersion,
  )

  assert.equal(goalsByVersion['fire-red'].itemGoal?.heldItemName, 'Dragon Scale')
  assert.equal(goalsByVersion['fire-red'].itemGoal?.sourceEntry.name, 'Seadra')
  assert.equal(goalsByVersion['fire-red'].itemGoal?.targetEntry.name, 'Kingdra')
})

test('skips the item goal once the held trade item is already owned', () => {
  const checkboxState = {
    [getCaughtKey('fire-red', 117)]: true,
  }
  const trackerState = createTrackerState(checkboxState, {
    'Dragon Scale': true,
  })
  const tradeQueue = buildTradeQueue(pokemonList, checkboxState, trackerState)
  const goalsByVersion = buildGoalsByVersion(
    pokemonList,
    trackerState,
    ['fire-red'],
    tradeQueue.blockedByVersion,
  )

  assert.equal(goalsByVersion['fire-red'].itemGoal, null)
})
