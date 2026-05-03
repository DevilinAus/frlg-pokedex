const extraCopyKeyPattern = /^(fire-red|leaf-green)-extra-(\d{3})$/
const baseCatchKeyPattern = /^(fire-red|leaf-green)-(\d{3})$/

export function getBaseCatchKeyForExtraCopyKey(key) {
  const match = extraCopyKeyPattern.exec(key)

  if (!match) {
    return ''
  }

  return `${match[1]}-${match[2]}`
}

export function getExtraCopyKeyForBaseCatchKey(key) {
  const match = baseCatchKeyPattern.exec(key)

  if (!match) {
    return ''
  }

  return `${match[1]}-extra-${match[2]}`
}

export function normalizeCheckboxState(checkboxState) {
  const nextState = { ...checkboxState }

  Object.entries(checkboxState).forEach(([key, checked]) => {
    const baseCatchKey = getBaseCatchKeyForExtraCopyKey(key)

    if (!baseCatchKey || !checked) {
      return
    }

    if (!checkboxState[baseCatchKey]) {
      nextState[key] = false
    }
  })

  return nextState
}

export function applyCheckboxStateUpdate(currentState, key, checked) {
  if (typeof key !== 'string') {
    return currentState
  }

  const nextState = {
    ...currentState,
    [key]: Boolean(checked),
  }
  const baseCatchKey = getBaseCatchKeyForExtraCopyKey(key)

  if (baseCatchKey) {
    if (checked) {
      nextState[baseCatchKey] = true
    }

    return normalizeCheckboxState(nextState)
  }

  if (!checked) {
    const extraCopyKey = getExtraCopyKeyForBaseCatchKey(key)

    if (extraCopyKey) {
      nextState[extraCopyKey] = false
    }
  }

  return normalizeCheckboxState(nextState)
}

export function applyCheckboxStateUpdates(currentState, updates) {
  if (!Array.isArray(updates) || updates.length === 0) {
    return currentState
  }

  return updates.reduce(
    (nextState, { key, checked }) => applyCheckboxStateUpdate(nextState, key, checked),
    currentState,
  )
}
