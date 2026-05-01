import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getHeldTradeItemOwnershipKey,
  getOwnedHeldTradeItem,
  normalizeOwnedHeldTradeItems,
} from './heldTradeItems.js'

test('migrates legacy held items to both versions', () => {
  const normalizedItems = normalizeOwnedHeldTradeItems({
    'Dragon Scale': true,
  })

  assert.deepEqual(normalizedItems, {
    [getHeldTradeItemOwnershipKey('fire-red', 'Dragon Scale')]: true,
    [getHeldTradeItemOwnershipKey('leaf-green', 'Dragon Scale')]: true,
  })
})

test('prefers version-specific held item ownership over legacy values', () => {
  const ownedHeldTradeItems = {
    "King's Rock": true,
    [getHeldTradeItemOwnershipKey('leaf-green', "King's Rock")]: false,
  }

  assert.equal(getOwnedHeldTradeItem(ownedHeldTradeItems, 'leaf-green', "King's Rock"), false)
  assert.equal(getOwnedHeldTradeItem(ownedHeldTradeItems, 'fire-red', "King's Rock"), true)
})
