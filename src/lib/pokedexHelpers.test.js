import assert from 'node:assert/strict'
import test from 'node:test'

import { getTrackablePokemon } from '../data/pokemon.js'
import { getVersionTrackerState, isVisibleInSingleVersion } from './pokedexHelpers.js'

const pokemonList = getTrackablePokemon({ baseGameComplete: false })

function createTrackerState(overrides = {}) {
  return {
    tradeMode: false,
    unlockAll: false,
    switchEventUnlocks: false,
    fireRedStarter: '',
    leafGreenStarter: '',
    fireRedFossil: '',
    leafGreenFossil: '',
    fireRedHitmon: '',
    leafGreenHitmon: '',
    checkboxState: {},
    ...overrides,
  }
}

function getPokemonByName(name) {
  return pokemonList.find((entry) => entry.name === name)
}

function getCaughtKey(versionKey, pokemonId) {
  return `${versionKey}-${String(pokemonId).padStart(3, '0')}`
}

test('unlock all removes the disabled state from trade-only rows', () => {
  const magmar = getPokemonByName('Magmar')

  const lockedState = getVersionTrackerState(magmar, 'fire-red', createTrackerState())
  const unlockedState = getVersionTrackerState(
    magmar,
    'fire-red',
    createTrackerState({
      unlockAll: true,
    }),
  )

  assert.equal(lockedState.locked, true)
  assert.equal(unlockedState.locked, false)
})

test('unlock all preserves native extra-copy prompts', () => {
  const magmar = getPokemonByName('Magmar')

  const state = getVersionTrackerState(
    magmar,
    'leaf-green',
    createTrackerState({
      unlockAll: true,
    }),
  )

  assert.equal(state.locked, false)
  assert.equal(state.showExtraCopy, true)
})

test('unlock all makes single-version rows visible again', () => {
  const magmar = getPokemonByName('Magmar')

  assert.equal(isVisibleInSingleVersion(magmar, 'fire-red', createTrackerState()), false)
  assert.equal(
    isVisibleInSingleVersion(
      magmar,
      'fire-red',
      createTrackerState({
        unlockAll: true,
      }),
    ),
    true,
  )
})

test('caught trade evolutions are not shown as locked', () => {
  const alakazam = getPokemonByName('Alakazam')

  const state = getVersionTrackerState(
    alakazam,
    'fire-red',
    createTrackerState({
      checkboxState: {
        [getCaughtKey('fire-red', alakazam.id)]: true,
      },
    }),
  )

  assert.equal(state.locked, false)
})

test('caught trade evolutions stay visible in single-version view', () => {
  const alakazam = getPokemonByName('Alakazam')

  assert.equal(
    isVisibleInSingleVersion(
      alakazam,
      'fire-red',
      createTrackerState({
        checkboxState: {
          [getCaughtKey('fire-red', alakazam.id)]: true,
        },
      }),
    ),
    true,
  )
})
