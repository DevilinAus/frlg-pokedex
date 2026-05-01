import assert from 'node:assert/strict'
import test from 'node:test'

import { getTrackablePokemon } from '../data/pokemon.js'
import { buildTradeQueue } from './tradeQueue.js'
import {
  buildGoalsByVersion,
  getVersionGoals,
  XP_SHARE_POKEDEX_REQUIREMENT,
} from './goals.js'

const pokemonList = getTrackablePokemon({ baseGameComplete: true })

function getCaughtKey(versionKey, pokemonId) {
  return `${versionKey}-${String(pokemonId).padStart(3, '0')}`
}

function createTrackerState(checkboxState = {}, ownedHeldTradeItems = {}) {
  return {
    tradeMode: false,
    switchEventUnlocks: false,
    fireRedStarter: '',
    leafGreenStarter: '',
    fireRedFossil: '',
    leafGreenFossil: '',
    fireRedHitmon: '',
    leafGreenHitmon: '',
    ownedHeldTradeItems,
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
  assert.equal(goals.partyGoal.badgeLabel, '')
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

test('falls back to the next owned trade-unlock line once an earlier one is complete', () => {
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

  assert.equal(goals.partyGoal.sourceEntry.name, 'Geodude')
  assert.equal(goals.partyGoal.targetEntry.name, 'Graveler')
  assert.equal(goals.partyGoal.tradeFollowUp?.name, 'Golem')
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
  assert.equal(goals.partyGoal.badgeLabel, '')
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
