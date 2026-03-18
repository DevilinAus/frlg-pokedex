import { defaultAppState } from './pokedexOptions'

export const guestStateStorageKey = 'lgfr-guest-state'

function sanitizeText(value, fallback) {
  return typeof value === 'string' ? value : fallback
}

export function sanitizeTrackerState(input) {
  return {
    tradeMode: Boolean(input?.tradeMode),
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
  const safeState = sanitizeTrackerState(state)

  return (
    safeState.tradeMode ||
    safeState.fireRedStarter !== defaultAppState.fireRedStarter ||
    safeState.leafGreenStarter !== defaultAppState.leafGreenStarter ||
    safeState.fireRedFossil !== defaultAppState.fireRedFossil ||
    safeState.leafGreenFossil !== defaultAppState.leafGreenFossil ||
    safeState.fireRedEeveelution !== defaultAppState.fireRedEeveelution ||
    safeState.leafGreenEeveelution !== defaultAppState.leafGreenEeveelution ||
    safeState.fireRedHitmon !== defaultAppState.fireRedHitmon ||
    safeState.leafGreenHitmon !== defaultAppState.leafGreenHitmon ||
    Object.values(safeState.checkboxState).some(Boolean)
  )
}

export function getActiveSaveStorageKey(userId) {
  return `lgfr-active-save-${userId}`
}
