import assert from 'node:assert/strict'
import test from 'node:test'

import { getTrackablePokemon } from '../data/pokemon.js'
import { getVersionGoals } from './goals.js'

const pokemonList = getTrackablePokemon({ baseGameComplete: true })

function getCaughtKey(versionKey, pokemonId) {
  return `${versionKey}-${String(pokemonId).padStart(3, '0')}`
}

function createTrackerState(checkboxState = {}) {
  return {
    tradeMode: false,
    switchEventUnlocks: false,
    fireRedStarter: '',
    leafGreenStarter: '',
    fireRedFossil: '',
    leafGreenFossil: '',
    fireRedHitmon: '',
    leafGreenHitmon: '',
    checkboxState,
  }
}

test('prefers an owned trade-unlock leveling line for the party goal', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState({
      [getCaughtKey('fire-red', 63)]: true,
    }),
  )

  assert.equal(goals.partyGoal.sourceEntry.name, 'Abra')
  assert.equal(goals.partyGoal.targetEntry.name, 'Kadabra')
  assert.equal(goals.partyGoal.tradeFollowUp?.name, 'Alakazam')
  assert.equal(goals.partyGoal.badgeLabel, 'Trade unlock')
})

test('falls back to the next owned trade-unlock line once an earlier one is complete', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
    createTrackerState({
      [getCaughtKey('fire-red', 63)]: true,
      [getCaughtKey('fire-red', 64)]: true,
      [getCaughtKey('fire-red', 65)]: true,
      [getCaughtKey('fire-red', 74)]: true,
    }),
  )

  assert.equal(goals.partyGoal.sourceEntry.name, 'Geodude')
  assert.equal(goals.partyGoal.targetEntry.name, 'Graveler')
  assert.equal(goals.partyGoal.tradeFollowUp?.name, 'Golem')
})

test('selects the lowest-dex hunt target that unlocks a trade after leveling', () => {
  const goals = getVersionGoals(
    pokemonList,
    'fire-red',
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
    createTrackerState({
      [getCaughtKey('leaf-green', 116)]: true,
    }),
  )

  assert.equal(goals.partyGoal.sourceEntry.name, 'Horsea')
  assert.equal(goals.partyGoal.targetEntry.name, 'Seadra')
  assert.equal(goals.partyGoal.tradeFollowUp?.name, 'Kingdra')
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
