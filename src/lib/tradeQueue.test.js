import assert from 'node:assert/strict'
import test from 'node:test'

import { getTrackablePokemon, pokemon } from '../data/pokemon.js'
import { getComment } from './pokedexHelpers.js'
import { buildTradeQueue } from './tradeQueue.js'

const pokemonList = getTrackablePokemon({ baseGameComplete: true })
const pokemonIdByName = new Map(
  pokemon.map((entry) => [entry.name, String(entry.id).padStart(3, '0')]),
)

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

function getOwnedKey(versionKey, name) {
  return `${versionKey}-${pokemonIdByName.get(name)}`
}

function getExtraKey(versionKey, name) {
  return `${versionKey}-extra-${pokemonIdByName.get(name)}`
}

function getVersionFamilyTokens(versionKey, names, checkboxState = {}) {
  const tradeQueue = buildTradeQueue(
    pokemonList,
    checkboxState,
    createTrackerState(checkboxState),
  )

  return tradeQueue.readyByVersion[versionKey].filter((token) =>
    names.includes(token.name),
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
  const tokens = getVersionFamilyTokens('leaf-green', ['Magmar', 'Magby'], {
    [getExtraKey('leaf-green', 'Magmar')]: true,
    [getExtraKey('leaf-green', 'Magby')]: true,
  })

  assert.deepEqual(tokens.map((token) => token.name), ['Magmar'])
  assert.match(tokens[0].queueNote, /breed Magby/)
})

test('lets Magby seed the family when it is the only prepared extra', () => {
  const tokens = getVersionFamilyTokens('leaf-green', ['Magmar', 'Magby'], {
    [getExtraKey('leaf-green', 'Magby')]: true,
  })

  assert.deepEqual(tokens.map((token) => token.name), ['Magby'])
  assert.match(tokens[0].queueNote, /skip trading Magmar/)
})

test('keeps only the missing family member as an optional shortcut once Fire Red has one', () => {
  const tokens = getVersionFamilyTokens('leaf-green', ['Magmar', 'Magby'], {
    [getOwnedKey('fire-red', 'Magmar')]: true,
    [getExtraKey('leaf-green', 'Magmar')]: true,
    [getExtraKey('leaf-green', 'Magby')]: true,
  })

  assert.deepEqual(tokens.map((token) => token.name), ['Magby'])
  assert.match(tokens[0].queueNote, /Optional shortcut/)
  assert.match(tokens[0].queueNote, /saves breeding/)
})

test('drops extra-copy family tokens once Fire Red already has both members', () => {
  const tokens = getVersionFamilyTokens('leaf-green', ['Magmar', 'Magby'], {
    [getOwnedKey('fire-red', 'Magmar')]: true,
    [getOwnedKey('fire-red', 'Magby')]: true,
    [getExtraKey('leaf-green', 'Magmar')]: true,
    [getExtraKey('leaf-green', 'Magby')]: true,
  })

  assert.deepEqual(tokens.map((token) => token.name), [])
})

test('adds the family note to Magby without losing the breeding guidance', () => {
  const comment = getRowComment('Magby')

  assert.match(comment, /Requires breeding Magmar/)
  assert.match(comment, /only needs one Magmar\/Magby handoff/)
})

test('drops the family note once Fire Red already has both Magmar and Magby', () => {
  const comment = getRowComment('Magby', {
    [getOwnedKey('fire-red', 'Magmar')]: true,
    [getOwnedKey('fire-red', 'Magby')]: true,
  })

  assert.match(comment, /Requires breeding Magmar/)
  assert.doesNotMatch(comment, /only needs one Magmar\/Magby handoff/)
})

test('queues only the default Electabuzz seed trade when both Fire Red family extras are prepared', () => {
  const tokens = getVersionFamilyTokens('fire-red', ['Electabuzz', 'Elekid'], {
    [getExtraKey('fire-red', 'Electabuzz')]: true,
    [getExtraKey('fire-red', 'Elekid')]: true,
  })

  assert.deepEqual(tokens.map((token) => token.name), ['Electabuzz'])
  assert.match(tokens[0].queueNote, /breed Elekid/)
})

test('treats Azumarill as a seeded adult for the Azurill family', () => {
  const tokens = getVersionFamilyTokens('leaf-green', ['Marill', 'Azurill'], {
    [getOwnedKey('fire-red', 'Azumarill')]: true,
    [getExtraKey('leaf-green', 'Marill')]: true,
    [getExtraKey('leaf-green', 'Azurill')]: true,
  })

  assert.deepEqual(tokens.map((token) => token.name), ['Azurill'])
  assert.match(tokens[0].queueNote, /Marill or Azumarill/)
  assert.match(tokens[0].queueNote, /Sea Incense/)
})

test('adds the Sea Incense family note to Azurill without losing the breeding guidance', () => {
  const comment = getRowComment('Azurill')

  assert.match(comment, /Requires breeding Marill or Azumarill holding Sea Incense/)
  assert.match(comment, /only needs one Marill\/Azurill handoff/)
  assert.match(comment, /bred one with Sea Incense/)
})

test('adds held-item metadata for item-based trade evolutions', () => {
  const tradeQueue = buildTradeQueue(
    pokemonList,
    {
      [getOwnedKey('leaf-green', 'Seadra')]: true,
    },
    createTrackerState({
      [getOwnedKey('leaf-green', 'Seadra')]: true,
    }),
  )

  const token = tradeQueue.readyByVersion['leaf-green'].find(
    (readyToken) => readyToken.name === 'Seadra',
  )

  assert.equal(token?.heldItemName, 'Dragon Scale')
  assert.equal(token?.heldItemUrl, 'https://pokemondb.net/item/dragon-scale')
  assert.equal(token?.tagLabel, 'Trade item')
})

test('pushes held-item trade pairs to the bottom of the ready list', () => {
  const tradeQueue = buildTradeQueue(
    pokemonList,
    {
      [getOwnedKey('leaf-green', 'Graveler')]: true,
      [getOwnedKey('leaf-green', 'Poliwhirl')]: true,
      [getOwnedKey('fire-red', 'Kadabra')]: true,
      [getOwnedKey('fire-red', 'Machoke')]: true,
    },
    createTrackerState({
      [getOwnedKey('leaf-green', 'Graveler')]: true,
      [getOwnedKey('leaf-green', 'Poliwhirl')]: true,
      [getOwnedKey('fire-red', 'Kadabra')]: true,
      [getOwnedKey('fire-red', 'Machoke')]: true,
    }),
  )

  assert.equal(tradeQueue.pairs.length, 2)
  assert.equal(tradeQueue.pairs[0].requiresHeldItem, false)
  assert.equal(tradeQueue.pairs[1].requiresHeldItem, true)
  assert.equal(tradeQueue.pairs[1].left.heldItemName, "King's Rock")
  assert.deepEqual(
    tradeQueue.readyByVersion['leaf-green'].map((token) => token.name),
    ['Graveler', 'Poliwhirl'],
  )
})

test('ignores stale extra-copy checkmarks once the other save already owns that species', () => {
  const tradeQueue = buildTradeQueue(
    pokemonList,
    {
      [getOwnedKey('leaf-green', 'Magmar')]: true,
      [getOwnedKey('fire-red', 'Magmar')]: true,
      [getExtraKey('leaf-green', 'Magmar')]: true,
    },
    createTrackerState({
      [getOwnedKey('leaf-green', 'Magmar')]: true,
      [getOwnedKey('fire-red', 'Magmar')]: true,
      [getExtraKey('leaf-green', 'Magmar')]: true,
    }),
  )

  assert.deepEqual(
    tradeQueue.readyByVersion['leaf-green'].map((token) => token.name),
    [],
  )
})
