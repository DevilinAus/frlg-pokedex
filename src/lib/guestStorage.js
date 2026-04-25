import { defaultAppState } from './pokedexOptions'

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

function hasMeaningfulTrackerData(state) {
  return (
    state.ownedGames !== defaultAppState.ownedGames ||
    state.trackerLayout !== defaultAppState.trackerLayout ||
    state.tradeMode ||
    state.unlockAll ||
    state.primaryGame !== defaultAppState.primaryGame ||
    state.switchEventUnlocks ||
    state.baseGameComplete ||
    state.fireRedStarter !== defaultAppState.fireRedStarter ||
    state.leafGreenStarter !== defaultAppState.leafGreenStarter ||
    state.fireRedFossil !== defaultAppState.fireRedFossil ||
    state.leafGreenFossil !== defaultAppState.leafGreenFossil ||
    state.fireRedEeveelution !== defaultAppState.fireRedEeveelution ||
    state.leafGreenEeveelution !== defaultAppState.leafGreenEeveelution ||
    state.fireRedHitmon !== defaultAppState.fireRedHitmon ||
    state.leafGreenHitmon !== defaultAppState.leafGreenHitmon ||
    Object.values(state.checkboxState).some(Boolean)
  )
}

export function sanitizeTrackerState(input) {
  const safeState = {
    ownedGames: sanitizeEnum(
      input?.ownedGames,
      ownedGameValues,
      defaultAppState.ownedGames,
    ),
    trackerLayout: sanitizeEnum(
      input?.trackerLayout,
      trackerLayoutValues,
      defaultAppState.trackerLayout,
    ),
    tradeMode: Boolean(input?.tradeMode),
    unlockAll: Boolean(input?.unlockAll),
    primaryGame: sanitizeEnum(
      input?.primaryGame,
      primaryGameValues,
      defaultAppState.primaryGame,
    ),
    switchEventUnlocks: Boolean(input?.switchEventUnlocks),
    baseGameComplete: Boolean(input?.baseGameComplete),
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
    checkboxState:
      input?.checkboxState &&
      typeof input.checkboxState === 'object' &&
      !Array.isArray(input.checkboxState)
        ? Object.fromEntries(
            Object.entries(input.checkboxState)
              .filter(([key]) => typeof key === 'string')
              .map(([key, value]) => [key, Boolean(value)]),
          )
        : {},
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
