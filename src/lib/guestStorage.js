import { defaultAppState } from './pokedexOptions'
import { sanitizeBreedingProgress } from './breedingProgress'
import { normalizeCheckboxState } from './checkboxState'
import { normalizeOwnedHeldTradeItems } from './heldTradeItems'

export const guestStateStorageKey = 'lgfr-guest-state'

const ownedGameValues = new Set(['fire-red', 'leaf-green', 'both'])
const primaryGameValues = new Set(['', 'fire-red', 'leaf-green'])
const trackerLayoutValues = new Set(['single', 'dual'])

function sanitizeText(value, fallback) {
  return typeof value === 'string' ? value : fallback
}

function sanitizeEnum(value, allowedValues, fallback) {
  return allowedValues.has(value) ? value : fallback
}

function sanitizeBooleanMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => typeof key === 'string')
      .map(([key, mapValue]) => [key, Boolean(mapValue)]),
  )
}

function hasMeaningfulTrackerData(state) {
  return (
    state.ownedGames !== defaultAppState.ownedGames ||
    state.trackerLayout !== defaultAppState.trackerLayout ||
    state.tradeMode ||
    state.showSecondaryProgress !== defaultAppState.showSecondaryProgress ||
    state.unlockAll ||
    state.primaryGame !== defaultAppState.primaryGame ||
    state.switchEventUnlocks ||
    state.fireRedBaseGameComplete ||
    state.leafGreenBaseGameComplete ||
    state.fireRedStarter !== defaultAppState.fireRedStarter ||
    state.leafGreenStarter !== defaultAppState.leafGreenStarter ||
    state.fireRedFossil !== defaultAppState.fireRedFossil ||
    state.leafGreenFossil !== defaultAppState.leafGreenFossil ||
    state.fireRedEeveelution !== defaultAppState.fireRedEeveelution ||
    state.leafGreenEeveelution !== defaultAppState.leafGreenEeveelution ||
    state.fireRedHitmon !== defaultAppState.fireRedHitmon ||
    state.leafGreenHitmon !== defaultAppState.leafGreenHitmon ||
    Object.values(state.ownedHeldTradeItems).some(Boolean) ||
    Object.values(state.breedingProgress).some((value) => value > 0) ||
    Object.values(state.checkboxState).some(Boolean)
  )
}

function inferShowSecondaryProgress(input, ownedGames, trackerLayout, primaryGame) {
  if (typeof input?.showSecondaryProgress === 'boolean') {
    return input.showSecondaryProgress
  }

  if (ownedGames === 'both') {
    if (primaryGame) {
      return Boolean(input?.tradeMode)
    }

    return true
  }

  return trackerLayout === 'dual'
}

export function sanitizeTrackerState(input) {
  const legacyBaseGameComplete = Boolean(input?.baseGameComplete)
  const ownedGames = sanitizeEnum(
    input?.ownedGames,
    ownedGameValues,
    defaultAppState.ownedGames,
  )
  const trackerLayout = sanitizeEnum(
    input?.trackerLayout,
    trackerLayoutValues,
    defaultAppState.trackerLayout,
  )
  const primaryGame = sanitizeEnum(
    input?.primaryGame,
    primaryGameValues,
    defaultAppState.primaryGame,
  )
  const showSecondaryProgress = inferShowSecondaryProgress(
    input,
    ownedGames,
    trackerLayout,
    primaryGame,
  )
  const tradeMode = ownedGames === 'both' && Boolean(primaryGame)
  const checkboxState = normalizeCheckboxState(sanitizeBooleanMap(input?.checkboxState))
  const safeState = {
    ownedGames,
    trackerLayout,
    tradeMode,
    showSecondaryProgress,
    unlockAll: Boolean(input?.unlockAll),
    primaryGame,
    switchEventUnlocks: Boolean(input?.switchEventUnlocks),
    fireRedBaseGameComplete:
      typeof input?.fireRedBaseGameComplete === 'boolean'
        ? input.fireRedBaseGameComplete
        : legacyBaseGameComplete,
    leafGreenBaseGameComplete:
      typeof input?.leafGreenBaseGameComplete === 'boolean'
        ? input.leafGreenBaseGameComplete
        : legacyBaseGameComplete,
    fireRedStarter: sanitizeText(
      input?.fireRedStarter,
      defaultAppState.fireRedStarter,
    ),
    leafGreenStarter: sanitizeText(
      input?.leafGreenStarter,
      defaultAppState.leafGreenStarter,
    ),
    fireRedFossil: sanitizeText(
      input?.fireRedFossil,
      defaultAppState.fireRedFossil,
    ),
    leafGreenFossil: sanitizeText(
      input?.leafGreenFossil,
      defaultAppState.leafGreenFossil,
    ),
    fireRedEeveelution: sanitizeText(
      input?.fireRedEeveelution,
      defaultAppState.fireRedEeveelution,
    ),
    leafGreenEeveelution: sanitizeText(
      input?.leafGreenEeveelution,
      defaultAppState.leafGreenEeveelution,
    ),
    fireRedHitmon: sanitizeText(
      input?.fireRedHitmon,
      defaultAppState.fireRedHitmon,
    ),
    leafGreenHitmon: sanitizeText(
      input?.leafGreenHitmon,
      defaultAppState.leafGreenHitmon,
    ),
    ownedHeldTradeItems: normalizeOwnedHeldTradeItems(
      sanitizeBooleanMap(input?.ownedHeldTradeItems),
      ownedGames,
    ),
    breedingProgress: sanitizeBreedingProgress(input?.breedingProgress),
    checkboxState,
    celebrationState:
      input?.celebrationState &&
      typeof input.celebrationState === 'object' &&
      !Array.isArray(input.celebrationState)
        ? {
            fireRedCompleteCelebrated: Boolean(
              input.celebrationState.fireRedCompleteCelebrated,
            ),
            leafGreenCompleteCelebrated: Boolean(
              input.celebrationState.leafGreenCompleteCelebrated,
            ),
          }
        : defaultAppState.celebrationState,
  }

  return {
    ...safeState,
    onboardingComplete:
      typeof input?.onboardingComplete === 'boolean'
        ? input.onboardingComplete
        : hasMeaningfulTrackerData(safeState),
  }
}

export function loadGuestTrackerState() {
  try {
    const stored = window.localStorage.getItem(guestStateStorageKey)

    if (!stored) {
      return sanitizeTrackerState(defaultAppState)
    }

    return sanitizeTrackerState(JSON.parse(stored))
  } catch {
    return sanitizeTrackerState(defaultAppState)
  }
}

export function saveGuestTrackerState(state) {
  window.localStorage.setItem(
    guestStateStorageKey,
    JSON.stringify(sanitizeTrackerState(state)),
  )
}

export function clearGuestTrackerState() {
  window.localStorage.removeItem(guestStateStorageKey)
}

export function hasMeaningfulTrackerState(state) {
  return hasMeaningfulTrackerData(sanitizeTrackerState(state))
}

export function getActiveSaveStorageKey(userId) {
  return `lgfr-active-save-${userId}`
}
