import assert from 'node:assert/strict'
import test from 'node:test'

import { getTrackablePokemon, pokemon } from '../data/pokemon.js'
import { getHeldTradeItemOwnershipKey } from './heldTradeItems.js'
import { getComment } from './pokedexHelpers.js'
import { buildTradeQueue } from './tradeQueue.js'

const pokemonList = getTrackablePokemon({ baseGameComplete: true })
const pokemonIdByName = new Map(
  pokemon.map((entry) => [entry.name, String(entry.id).padStart(3, '0')]),
)

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
    [getOwnedKey('leaf-green', 'Magmar')]: true,
    [getOwnedKey('leaf-green', 'Magby')]: true,
    [getExtraKey('leaf-green', 'Magmar')]: true,
    [getExtraKey('leaf-green', 'Magby')]: true,
  })

  assert.deepEqual(tokens.map((token) => token.name), ['Magmar'])
  assert.equal(tokens[0].queueNote, 'Magmar or Magby')
})

test('lets Magby seed the family when it is the only prepared extra', () => {
  const tokens = getVersionFamilyTokens('leaf-green', ['Magmar', 'Magby'], {
    [getOwnedKey('leaf-green', 'Magby')]: true,
    [getExtraKey('leaf-green', 'Magby')]: true,
  })

  assert.deepEqual(tokens.map((token) => token.name), ['Magby'])
  assert.equal(tokens[0].queueNote, 'Magmar or Magby')
})

test('keeps only the missing family member as an optional shortcut once Fire Red has one', () => {
  const tokens = getVersionFamilyTokens('leaf-green', ['Magmar', 'Magby'], {
    [getOwnedKey('fire-red', 'Magmar')]: true,
    [getOwnedKey('leaf-green', 'Magmar')]: true,
    [getOwnedKey('leaf-green', 'Magby')]: true,
    [getExtraKey('leaf-green', 'Magmar')]: true,
    [getExtraKey('leaf-green', 'Magby')]: true,
  })

  assert.deepEqual(tokens.map((token) => token.name), ['Magby'])
  assert.equal(tokens[0].queueNote, 'Magmar or Magby')
})

test('drops extra-copy family tokens once Fire Red already has both members', () => {
  const tokens = getVersionFamilyTokens('leaf-green', ['Magmar', 'Magby'], {
    [getOwnedKey('fire-red', 'Magmar')]: true,
    [getOwnedKey('fire-red', 'Magby')]: true,
    [getOwnedKey('leaf-green', 'Magmar')]: true,
    [getOwnedKey('leaf-green', 'Magby')]: true,
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
    [getOwnedKey('fire-red', 'Electabuzz')]: true,
    [getOwnedKey('fire-red', 'Elekid')]: true,
    [getExtraKey('fire-red', 'Electabuzz')]: true,
    [getExtraKey('fire-red', 'Elekid')]: true,
  })

  assert.deepEqual(tokens.map((token) => token.name), ['Electabuzz'])
  assert.equal(tokens[0].queueNote, 'Electabuzz or Elekid')
})

test('treats Azumarill as a seeded adult for the Azurill family', () => {
  const tokens = getVersionFamilyTokens('leaf-green', ['Marill', 'Azurill'], {
    [getOwnedKey('fire-red', 'Azumarill')]: true,
    [getOwnedKey('leaf-green', 'Marill')]: true,
    [getOwnedKey('leaf-green', 'Azurill')]: true,
    [getExtraKey('leaf-green', 'Marill')]: true,
    [getExtraKey('leaf-green', 'Azurill')]: true,
  })

  assert.deepEqual(tokens.map((token) => token.name), ['Azurill'])
  assert.equal(tokens[0].queueNote, 'Marill or Azurill')
})

test('adds the Sea Incense family note to Azurill without losing the breeding guidance', () => {
  const comment = getRowComment('Azurill')

  assert.match(comment, /Requires breeding Marill or Azumarill holding Sea Incense/)
  assert.match(comment, /only needs one Marill\/Azurill handoff/)
  assert.match(comment, /bred one with Sea Incense/)
})

test('explains the Hitmon breeding workaround instead of asking for a fresh save', () => {
  const comment = getComment(
    getPokemonByName('Hitmonchan'),
    false,
    '',
    '',
    '',
    '',
    'hitmonlee',
    'hitmonlee',
    {},
  )

  assert.match(comment, /breeding Tyrogue/)
  assert.doesNotMatch(comment, /fresh game/)
})

test('ignores extra-copy trades when the base catch is unchecked', () => {
  const tokens = getVersionFamilyTokens('leaf-green', ['Magmar', 'Magby'], {
    [getExtraKey('leaf-green', 'Magmar')]: true,
    [getExtraKey('leaf-green', 'Magby')]: true,
  })

  assert.deepEqual(tokens.map((token) => token.name), [])
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
  assert.equal(token?.heldItemOwned, false)
  assert.equal(token?.tagLabel, 'Trade item')
})

test('blocks held-item trades until the item is owned', () => {
  const checkboxState = {
    [getOwnedKey('leaf-green', 'Slowpoke')]: true,
    [getOwnedKey('fire-red', 'Scyther')]: true,
  }
  const tradeQueue = buildTradeQueue(
    pokemonList,
    checkboxState,
    createTrackerState(checkboxState),
  )

  assert.equal(tradeQueue.pairableCount, 1)
  assert.equal(tradeQueue.readyCount, 0)
  assert.equal(tradeQueue.blockedByHeldItemCount, 1)
  assert.equal(tradeQueue.pairs[0].isReady, false)
  assert.deepEqual(tradeQueue.pairs[0].missingHeldItemNames, ["King's Rock", 'Metal Coat'])
})

test('marks held-item trades as ready once the item is owned', () => {
  const checkboxState = {
    [getOwnedKey('leaf-green', 'Seadra')]: true,
    [getOwnedKey('fire-red', 'Machoke')]: true,
  }
  const tradeQueue = buildTradeQueue(
    pokemonList,
    checkboxState,
    createTrackerState(checkboxState, {
      'Dragon Scale': true,
    }),
  )

  assert.equal(tradeQueue.pairableCount, 1)
  assert.equal(tradeQueue.readyCount, 1)
  assert.equal(tradeQueue.blockedByHeldItemCount, 0)
  assert.equal(tradeQueue.pairs[0].isReady, true)
  assert.equal(tradeQueue.pairs[0].left.heldItemOwned, true)
})

test('keeps held-item ownership separate for each version', () => {
  const checkboxState = {
    [getOwnedKey('leaf-green', 'Poliwhirl')]: true,
    [getOwnedKey('fire-red', 'Slowpoke')]: true,
  }
  const tradeQueue = buildTradeQueue(
    pokemonList,
    checkboxState,
    createTrackerState(checkboxState, {
      [getHeldTradeItemOwnershipKey('leaf-green', "King's Rock")]: true,
    }),
  )

  assert.equal(tradeQueue.pairableCount, 1)
  assert.equal(tradeQueue.readyCount, 0)
  assert.equal(tradeQueue.pairs[0].left.heldItemOwned, true)
  assert.equal(tradeQueue.pairs[0].right.heldItemOwned, false)
  assert.deepEqual(tradeQueue.pairs[0].missingHeldItemNames, ["King's Rock"])
})

test('drops the trade-for-base evolution text once Fire Red already owns Sandshrew', () => {
  const comment = getRowComment('Sandslash', {
    [getOwnedKey('fire-red', 'Sandshrew')]: true,
  })

  assert.doesNotMatch(comment, /Trade for Sandshrew and evolve it/)
  assert.match(comment, /Evolves at level 22/)
})

test('drops the trade-for-base evolution text once Leaf Green already owns Ekans', () => {
  const comment = getRowComment('Arbok', {
    [getOwnedKey('leaf-green', 'Ekans')]: true,
  })

  assert.doesNotMatch(comment, /Trade for Ekans and evolve it/)
  assert.match(comment, /Evolves at level 22/)
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

test('matches vanilla trades with each other before held-item trades', () => {
  const tradeQueue = buildTradeQueue(
    pokemonList,
    {
      [getOwnedKey('leaf-green', 'Graveler')]: true,
      [getOwnedKey('leaf-green', 'Slowpoke')]: true,
      [getOwnedKey('leaf-green', 'Staryu')]: true,
      [getExtraKey('leaf-green', 'Staryu')]: true,
      [getOwnedKey('fire-red', 'Machoke')]: true,
      [getOwnedKey('fire-red', 'Psyduck')]: true,
      [getOwnedKey('fire-red', 'Scyther')]: true,
      [getExtraKey('fire-red', 'Psyduck')]: true,
    },
    createTrackerState({
      [getOwnedKey('leaf-green', 'Graveler')]: true,
      [getOwnedKey('leaf-green', 'Slowpoke')]: true,
      [getOwnedKey('leaf-green', 'Staryu')]: true,
      [getExtraKey('leaf-green', 'Staryu')]: true,
      [getOwnedKey('fire-red', 'Machoke')]: true,
      [getOwnedKey('fire-red', 'Psyduck')]: true,
      [getOwnedKey('fire-red', 'Scyther')]: true,
      [getExtraKey('fire-red', 'Psyduck')]: true,
    }),
  )

  assert.deepEqual(
    tradeQueue.pairs.map((pair) => [pair.left.name, pair.right.name]),
    [
      ['Graveler', 'Machoke'],
      ['Staryu', 'Psyduck'],
      ['Slowpoke', 'Scyther'],
    ],
  )
  assert.equal(tradeQueue.pairs[0].requiresHeldItem, false)
  assert.equal(tradeQueue.pairs[1].requiresHeldItem, false)
  assert.equal(tradeQueue.pairs[2].requiresHeldItem, true)
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
