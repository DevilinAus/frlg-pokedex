import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildLegacyOwnedHeldTradeItems,
  getHeldTradeItemOwnershipKey,
  getOwnedHeldTradeItem,
  getOwnedHeldTradeItemForMode,
  normalizeOwnedHeldTradeItems,
  withLegacyOwnedHeldTradeItemsCompatibility,
} from './heldTradeItems.js'

test('migrates legacy held items to both versions', () => {
  const normalizedItems = normalizeOwnedHeldTradeItems({
    'Dragon Scale': true,
  }, 'both')

  assert.deepEqual(normalizedItems, {
    [getHeldTradeItemOwnershipKey('fire-red', 'Dragon Scale')]: true,
    [getHeldTradeItemOwnershipKey('leaf-green', 'Dragon Scale')]: true,
  })
})

test('migrates legacy false values to both versions', () => {
  const normalizedItems = normalizeOwnedHeldTradeItems({
    'Dragon Scale': false,
  }, 'both')

  assert.deepEqual(normalizedItems, {
    [getHeldTradeItemOwnershipKey('fire-red', 'Dragon Scale')]: false,
    [getHeldTradeItemOwnershipKey('leaf-green', 'Dragon Scale')]: false,
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

test('treats either version as enough when one player owns both games', () => {
  const ownedHeldTradeItems = {
    [getHeldTradeItemOwnershipKey('fire-red', "King's Rock")]: true,
    [getHeldTradeItemOwnershipKey('leaf-green', "King's Rock")]: false,
  }

  assert.equal(
    getOwnedHeldTradeItemForMode(
      ownedHeldTradeItems,
      'leaf-green',
      "King's Rock",
      'both',
    ),
    true,
  )
})

test('keeps explicit version ownership when legacy values disagree', () => {
  const normalizedItems = normalizeOwnedHeldTradeItems({
    "King's Rock": false,
    [getHeldTradeItemOwnershipKey('fire-red', "King's Rock")]: true,
  }, 'both')

  assert.deepEqual(normalizedItems, {
    [getHeldTradeItemOwnershipKey('fire-red', "King's Rock")]: true,
    [getHeldTradeItemOwnershipKey('leaf-green', "King's Rock")]: false,
  })
})

test('maps legacy item ownership to the local game in duo mode', () => {
  const normalizedItems = normalizeOwnedHeldTradeItems({
    "King's Rock": true,
  }, 'leaf-green')

  assert.deepEqual(normalizedItems, {
    [getHeldTradeItemOwnershipKey('leaf-green', "King's Rock")]: true,
  })
})

test('builds shared legacy compatibility values from split ownership', () => {
  const legacyItems = buildLegacyOwnedHeldTradeItems({
    [getHeldTradeItemOwnershipKey('fire-red', "King's Rock")]: true,
    [getHeldTradeItemOwnershipKey('leaf-green', "King's Rock")]: false,
    [getHeldTradeItemOwnershipKey('fire-red', 'Metal Coat')]: true,
    [getHeldTradeItemOwnershipKey('leaf-green', 'Metal Coat')]: true,
  }, 'both')

  assert.deepEqual(legacyItems, {
    "King's Rock": true,
    'Metal Coat': true,
  })
})

test('keeps compatibility keys alongside version-specific ownership', () => {
  const compatibleItems = withLegacyOwnedHeldTradeItemsCompatibility({
    [getHeldTradeItemOwnershipKey('fire-red', "King's Rock")]: true,
    [getHeldTradeItemOwnershipKey('leaf-green', "King's Rock")]: false,
  }, 'both')

  assert.deepEqual(compatibleItems, {
    "King's Rock": true,
    [getHeldTradeItemOwnershipKey('fire-red', "King's Rock")]: true,
    [getHeldTradeItemOwnershipKey('leaf-green', "King's Rock")]: false,
  })
})
