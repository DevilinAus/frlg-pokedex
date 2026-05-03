import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyCheckboxStateUpdate,
  applyCheckboxStateUpdates,
  normalizeCheckboxState,
} from './checkboxState.js'

test('normalizeCheckboxState clears extra copies when the base catch is missing', () => {
  const nextState = normalizeCheckboxState({
    'leaf-green-126': false,
    'leaf-green-extra-126': true,
    'fire-red-125': true,
    'fire-red-extra-125': true,
  })

  assert.equal(nextState['leaf-green-extra-126'], false)
  assert.equal(nextState['fire-red-extra-125'], true)
})

test('checking an extra copy also checks the base catch', () => {
  const nextState = applyCheckboxStateUpdate({}, 'leaf-green-extra-126', true)

  assert.equal(nextState['leaf-green-126'], true)
  assert.equal(nextState['leaf-green-extra-126'], true)
})

test('clearing a base catch also clears its extra copy', () => {
  const nextState = applyCheckboxStateUpdate(
    {
      'leaf-green-126': true,
      'leaf-green-extra-126': true,
    },
    'leaf-green-126',
    false,
  )

  assert.equal(nextState['leaf-green-126'], false)
  assert.equal(nextState['leaf-green-extra-126'], false)
})

test('batched checkbox updates keep base and extra copies in sync', () => {
  const nextState = applyCheckboxStateUpdates(
    {
      'leaf-green-126': true,
      'leaf-green-extra-126': true,
    },
    [
      { key: 'leaf-green-126', checked: false },
      { key: 'fire-red-extra-125', checked: true },
    ],
  )

  assert.equal(nextState['leaf-green-extra-126'], false)
  assert.equal(nextState['fire-red-125'], true)
  assert.equal(nextState['fire-red-extra-125'], true)
})
