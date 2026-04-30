import assert from 'node:assert/strict'
import test from 'node:test'

import { getTrackablePokemon, pokemon } from '../data/pokemon.js'
import {
  getVersionTrackerState,
  isBaseGameCompleteForVersion,
  isVisibleInSingleVersion,
} from './pokedexHelpers.js'

const pokemonList = getTrackablePokemon({ baseGameComplete: false })

function createTrackerState(overrides = {}) {
  return {
    tradeMode: false,
    unlockAll: false,
    switchEventUnlocks: false,
    fireRedBaseGameComplete: false,
    leafGreenBaseGameComplete: false,
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

test('level evolutions become unlocked when their pre-evolution is caught in that version', () => {
  const ekans = getPokemonByName('Ekans')
  const arbok = getPokemonByName('Arbok')

  const state = getVersionTrackerState(
    arbok,
    'leaf-green',
    createTrackerState({
      checkboxState: {
        [getCaughtKey('leaf-green', ekans.id)]: true,
      },
    }),
  )

  assert.equal(state.locked, false)
})

test('later stage evolutions become unlocked when the base form is caught in that version', () => {
  const bulbasaur = getPokemonByName('Bulbasaur')
  const venusaur = getPokemonByName('Venusaur')

  const state = getVersionTrackerState(
    venusaur,
    'leaf-green',
    createTrackerState({
      checkboxState: {
        [getCaughtKey('leaf-green', bulbasaur.id)]: true,
      },
    }),
  )

  assert.equal(state.locked, false)
})

test('level evolutions stay visible in single-version view when their pre-evolution is caught', () => {
  const ekans = getPokemonByName('Ekans')
  const arbok = getPokemonByName('Arbok')

  assert.equal(
    isVisibleInSingleVersion(
      arbok,
      'leaf-green',
      createTrackerState({
        checkboxState: {
          [getCaughtKey('leaf-green', ekans.id)]: true,
        },
      }),
    ),
    true,
  )
})

test('later stage evolutions stay visible in single-version view when the base form is caught', () => {
  const bulbasaur = getPokemonByName('Bulbasaur')
  const venusaur = getPokemonByName('Venusaur')

  assert.equal(
    isVisibleInSingleVersion(
      venusaur,
      'leaf-green',
      createTrackerState({
        checkboxState: {
          [getCaughtKey('leaf-green', bulbasaur.id)]: true,
        },
      }),
    ),
    true,
  )
})

test('hides the starter extra-copy prompt once both saves own that starter', () => {
  const charmander = getPokemonByName('Charmander')

  const state = getVersionTrackerState(
    charmander,
    'fire-red',
    createTrackerState({
      fireRedStarter: 'charmander',
      checkboxState: {
        [getCaughtKey('fire-red', charmander.id)]: true,
        [getCaughtKey('leaf-green', charmander.id)]: true,
      },
    }),
  )

  assert.equal(state.showExtraCopy, false)
})

test('hides version-exclusive extra-copy prompts once both saves own the species', () => {
  const magmar = getPokemonByName('Magmar')

  const state = getVersionTrackerState(
    magmar,
    'leaf-green',
    createTrackerState({
      checkboxState: {
        [getCaughtKey('leaf-green', magmar.id)]: true,
        [getCaughtKey('fire-red', magmar.id)]: true,
      },
    }),
  )

  assert.equal(state.showExtraCopy, false)
})

test('prefers the Fire Red-specific base game flag over the generic fallback', () => {
  const trackerState = createTrackerState({
    baseGameComplete: true,
    fireRedBaseGameComplete: false,
  })

  assert.equal(isBaseGameCompleteForVersion('fire-red', trackerState), false)
})

test('prefers the Leaf Green-specific base game flag over the generic fallback', () => {
  const trackerState = createTrackerState({
    baseGameComplete: true,
    leafGreenBaseGameComplete: false,
  })

  assert.equal(isBaseGameCompleteForVersion('leaf-green', trackerState), false)
})

test('keeps the other version locked when only one version has postgame unlocked', () => {
  const trackerState = createTrackerState({
    baseGameComplete: true,
    fireRedBaseGameComplete: true,
    leafGreenBaseGameComplete: false,
  })
  const sentret = pokemon.find((entry) => entry.name === 'Sentret')

  assert.ok(sentret?.baseGameCompleteRequired)
  assert.equal(
    getVersionTrackerState(sentret, 'fire-red', trackerState).locked,
    false,
  )
  assert.equal(
    getVersionTrackerState(sentret, 'leaf-green', trackerState).locked,
    true,
  )
})
