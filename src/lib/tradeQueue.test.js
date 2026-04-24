import assert from 'node:assert/strict'
import test from 'node:test'

import { getTrackablePokemon, pokemon } from '../data/pokemon.js'
import { getComment } from './pokedexHelpers.js'
import { buildTradeQueue } from './tradeQueue.js'

const pokemonList = getTrackablePokemon({ baseGameComplete: true })

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

function getLeafGreenFamilyTokens(checkboxState = {}) {
  const tradeQueue = buildTradeQueue(
    pokemonList,
    checkboxState,
    createTrackerState(checkboxState),
  )

  return tradeQueue.readyByVersion['leaf-green'].filter(
    (token) => token.name === 'Magmar' || token.name === 'Magby',
  )
}

function getPokemonByName(name) {
  return pokemon.find((entry) => entry.name === name)
}

function getRowComment(name, checkboxState = {}) {
  return getComment(
    getPokemonByName(name),
    false,
    '',
    '',
    '',
    '',
    '',
    '',
    checkboxState,
  )
}

test('queues only the default Magmar seed trade when both family extras are prepared', () => {
  const tokens = getLeafGreenFamilyTokens({
    'leaf-green-extra-126': true,
    'leaf-green-extra-240': true,
  })

  assert.deepEqual(tokens.map((token) => token.name), ['Magmar'])
  assert.match(tokens[0].queueNote, /breed Magby/)
})

test('lets Magby seed the family when it is the only prepared extra', () => {
  const tokens = getLeafGreenFamilyTokens({
    'leaf-green-extra-240': true,
  })

  assert.deepEqual(tokens.map((token) => token.name), ['Magby'])
  assert.match(tokens[0].queueNote, /skip trading Magmar/)
})

test('keeps only the missing family member as an optional shortcut once Fire Red has one', () => {
  const tokens = getLeafGreenFamilyTokens({
    'fire-red-126': true,
    'leaf-green-extra-126': true,
    'leaf-green-extra-240': true,
  })

  assert.deepEqual(tokens.map((token) => token.name), ['Magby'])
  assert.match(tokens[0].queueNote, /Optional shortcut/)
  assert.match(tokens[0].queueNote, /saves breeding/)
})

test('cleans up the special family queue rule once Fire Red has both members', () => {
  const tokens = getLeafGreenFamilyTokens({
    'fire-red-126': true,
    'fire-red-240': true,
    'leaf-green-extra-126': true,
    'leaf-green-extra-240': true,
  })

  assert.deepEqual(tokens.map((token) => token.name), ['Magmar', 'Magby'])
  assert.ok(tokens.every((token) => !token.queueNote))
})

test('adds the family note to Magby without losing the breeding guidance', () => {
  const comment = getRowComment('Magby')

  assert.match(comment, /Requires breeding Magmar/)
  assert.match(comment, /only needs one Magmar\/Magby handoff/)
})

test('drops the family note once Fire Red already has both Magmar and Magby', () => {
  const comment = getRowComment('Magby', {
    'fire-red-126': true,
    'fire-red-240': true,
  })

  assert.match(comment, /Requires breeding Magmar/)
  assert.doesNotMatch(comment, /only needs one Magmar\/Magby handoff/)
})
