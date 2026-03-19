import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { hasCompletedDex } from '../lib/pokedexHelpers'
import { defaultAppState, defaultCelebrationState } from '../lib/pokedexOptions'
import {
  clearGuestTrackerState,
  getActiveSaveStorageKey,
  hasMeaningfulTrackerState,
  loadGuestTrackerState,
  sanitizeTrackerState,
  saveGuestTrackerState,
} from '../lib/guestStorage'
import { createFullDexCelebration } from '../lib/sprites'

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  let payload = null

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const error = new Error(payload?.error || 'Something went wrong.')
    error.status = response.status
    throw error
  }

  return payload
}

function usePokedexState() {
  const [mode, setMode] = useState('loading')
  const [currentUser, setCurrentUser] = useState(null)
  const [accessibleSaves, setAccessibleSaves] = useState([])
  const [activeSaveId, setActiveSaveId] = useState(null)
  const [activeSave, setActiveSave] = useState(null)
  const [collaborators, setCollaborators] = useState([])
  const [tradeMode, setTradeMode] = useState(defaultAppState.tradeMode)
  const [switchEventUnlocks, setSwitchEventUnlocks] = useState(
    defaultAppState.switchEventUnlocks,
  )
  const [baseGameComplete, setBaseGameComplete] = useState(
    defaultAppState.baseGameComplete,
  )
  const [fireRedStarter, setFireRedStarter] = useState(defaultAppState.fireRedStarter)
  const [leafGreenStarter, setLeafGreenStarter] = useState(defaultAppState.leafGreenStarter)
  const [fireRedFossil, setFireRedFossil] = useState(defaultAppState.fireRedFossil)
  const [leafGreenFossil, setLeafGreenFossil] = useState(defaultAppState.leafGreenFossil)
  const [fireRedEeveelution, setFireRedEeveelution] = useState(
    defaultAppState.fireRedEeveelution,
  )
  const [leafGreenEeveelution, setLeafGreenEeveelution] = useState(
    defaultAppState.leafGreenEeveelution,
  )
  const [fireRedHitmon, setFireRedHitmon] = useState(defaultAppState.fireRedHitmon)
  const [leafGreenHitmon, setLeafGreenHitmon] = useState(defaultAppState.leafGreenHitmon)
  const [checkboxState, setCheckboxState] = useState(defaultAppState.checkboxState)
  const [celebrationState, setCelebrationState] = useState(defaultCelebrationState)
  const [jumpingSprites, setJumpingSprites] = useState({})
  const [spriteFlood, setSpriteFlood] = useState([])
  const [saveError, setSaveError] = useState('')
  const [authError, setAuthError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [shareError, setShareError] = useState('')
  const [generatedShareCode, setGeneratedShareCode] = useState('')
  const [migrationConflict, setMigrationConflict] = useState(null)
  const hasLoadedState = useRef(false)
  const lastRemoteUpdatedAt = useRef('')
  const hasUnsavedCloudChanges = useRef(false)
  const isCloudSaving = useRef(false)
  const isApplyingRemoteState = useRef(false)
  const isRecoveringCloudAccess = useRef(false)
  const cloudBaselineState = useRef(sanitizeTrackerState(defaultAppState))
  const jumpTimeouts = useRef({})
  const floodTimeout = useRef(null)

  function markCloudStateDirty() {
    if (mode === 'cloud' && !isApplyingRemoteState.current) {
      hasUnsavedCloudChanges.current = true
    }
  }

  function updateAccessibleSaveSummary(nextSave) {
    setAccessibleSaves((currentSaves) =>
      currentSaves.map((save) =>
        save.id === nextSave.id ? { ...save, ...nextSave } : save,
      ),
    )
  }

  function applyRemoteSaveMeta(nextSave, nextCollaborators = null) {
    setActiveSave(nextSave)
    lastRemoteUpdatedAt.current = nextSave?.updatedAt ?? ''
    updateAccessibleSaveSummary(nextSave)

    if (nextCollaborators) {
      setCollaborators(nextCollaborators)
    }
  }

  const readTrackerState = useEffectEvent(() =>
    sanitizeTrackerState({
      tradeMode,
      switchEventUnlocks,
      baseGameComplete,
      fireRedStarter,
      leafGreenStarter,
      fireRedFossil,
      leafGreenFossil,
      fireRedEeveelution,
      leafGreenEeveelution,
      fireRedHitmon,
      leafGreenHitmon,
      checkboxState,
      celebrationState,
    }),
  )

  function buildTrackerPatch(nextState, baseState) {
    const patch = {}

    if (nextState.tradeMode !== baseState.tradeMode) {
      patch.tradeMode = nextState.tradeMode
    }

    if (nextState.switchEventUnlocks !== baseState.switchEventUnlocks) {
      patch.switchEventUnlocks = nextState.switchEventUnlocks
    }

    if (nextState.baseGameComplete !== baseState.baseGameComplete) {
      patch.baseGameComplete = nextState.baseGameComplete
    }

    if (nextState.fireRedStarter !== baseState.fireRedStarter) {
      patch.fireRedStarter = nextState.fireRedStarter
    }

    if (nextState.leafGreenStarter !== baseState.leafGreenStarter) {
      patch.leafGreenStarter = nextState.leafGreenStarter
    }

    if (nextState.fireRedFossil !== baseState.fireRedFossil) {
      patch.fireRedFossil = nextState.fireRedFossil
    }

    if (nextState.leafGreenFossil !== baseState.leafGreenFossil) {
      patch.leafGreenFossil = nextState.leafGreenFossil
    }

    if (nextState.fireRedEeveelution !== baseState.fireRedEeveelution) {
      patch.fireRedEeveelution = nextState.fireRedEeveelution
    }

    if (nextState.leafGreenEeveelution !== baseState.leafGreenEeveelution) {
      patch.leafGreenEeveelution = nextState.leafGreenEeveelution
    }

    if (nextState.fireRedHitmon !== baseState.fireRedHitmon) {
      patch.fireRedHitmon = nextState.fireRedHitmon
    }

    if (nextState.leafGreenHitmon !== baseState.leafGreenHitmon) {
      patch.leafGreenHitmon = nextState.leafGreenHitmon
    }

    const checkboxPatch = {}
    const checkboxKeys = new Set([
      ...Object.keys(baseState.checkboxState),
      ...Object.keys(nextState.checkboxState),
    ])

    checkboxKeys.forEach((key) => {
      const nextValue = Boolean(nextState.checkboxState[key])
      const baseValue = Boolean(baseState.checkboxState[key])

      if (nextValue !== baseValue) {
        checkboxPatch[key] = nextValue
      }
    })

    if (Object.keys(checkboxPatch).length > 0) {
      patch.checkboxState = checkboxPatch
    }

    const celebrationPatch = {}

    if (
      nextState.celebrationState.fireRedCompleteCelebrated !==
      baseState.celebrationState.fireRedCompleteCelebrated
    ) {
      celebrationPatch.fireRedCompleteCelebrated =
        nextState.celebrationState.fireRedCompleteCelebrated
    }

    if (
      nextState.celebrationState.leafGreenCompleteCelebrated !==
      baseState.celebrationState.leafGreenCompleteCelebrated
    ) {
      celebrationPatch.leafGreenCompleteCelebrated =
        nextState.celebrationState.leafGreenCompleteCelebrated
    }

    if (Object.keys(celebrationPatch).length > 0) {
      patch.celebrationState = celebrationPatch
    }

    return Object.keys(patch).length > 0 ? patch : null
  }

  function applyTrackerState(nextState, options = {}) {
    const state = sanitizeTrackerState(nextState)
    const { fromRemote = false } = options

    if (fromRemote) {
      isApplyingRemoteState.current = true
      cloudBaselineState.current = state
      hasUnsavedCloudChanges.current = false
    }

    setTradeMode(state.tradeMode)
    setSwitchEventUnlocks(state.switchEventUnlocks)
    setBaseGameComplete(state.baseGameComplete)
    setFireRedStarter(state.fireRedStarter)
    setLeafGreenStarter(state.leafGreenStarter)
    setFireRedFossil(state.fireRedFossil)
    setLeafGreenFossil(state.leafGreenFossil)
    setFireRedEeveelution(state.fireRedEeveelution)
    setLeafGreenEeveelution(state.leafGreenEeveelution)
    setFireRedHitmon(state.fireRedHitmon)
    setLeafGreenHitmon(state.leafGreenHitmon)
    setCheckboxState(state.checkboxState)
    setCelebrationState(state.celebrationState)

    if (fromRemote) {
      window.setTimeout(() => {
        isApplyingRemoteState.current = false
      }, 0)
    }
  }

  async function fetchSession() {
    return requestJson('/api/auth/session', {
      headers: {},
    })
  }

  async function loadCloudSave(saveId, saveList, userId) {
    const response = await requestJson(`/api/saves/${saveId}`)

    setActiveSaveId(saveId)
    applyRemoteSaveMeta(response.save, response.collaborators ?? [])
    applyTrackerState(response.state, { fromRemote: true })
    setGeneratedShareCode('')
    setShareError('')
    hasUnsavedCloudChanges.current = false
    isCloudSaving.current = false
    window.localStorage.setItem(getActiveSaveStorageKey(userId), String(saveId))

    if (saveList) {
      setAccessibleSaves(saveList)
    }

    hasLoadedState.current = true
    setSaveError('')
  }

  async function hydrateGuestMode() {
    hasLoadedState.current = false
    setMode('guest')
    setCurrentUser(null)
    setAccessibleSaves([])
    setActiveSaveId(null)
    setActiveSave(null)
    setCollaborators([])
    setMigrationConflict(null)
    setGeneratedShareCode('')
    setShareError('')
    applyTrackerState(loadGuestTrackerState())
    cloudBaselineState.current = sanitizeTrackerState(defaultAppState)
    hasUnsavedCloudChanges.current = false
    isCloudSaving.current = false
    hasLoadedState.current = true
    setSaveError('')
  }

  async function hydrateAuthenticatedMode({ suppressConflictPrompt = false } = {}) {
    hasLoadedState.current = false
    const session = await fetchSession()

    if (!session.authenticated || !session.user) {
      await hydrateGuestMode()
      return
    }

    const localGuestState = loadGuestTrackerState()
    const hasGuestState = hasMeaningfulTrackerState(localGuestState)
    const hadExistingSaves = session.saves.length > 0
    let saves = session.saves

    setMode('cloud')
    setCurrentUser(session.user)

    if (saves.length === 0) {
      if (hasGuestState) {
        await requestJson('/api/saves/migrate-local', {
          method: 'POST',
          body: JSON.stringify({
            state: localGuestState,
          }),
        })
        clearGuestTrackerState()
      } else {
        await requestJson('/api/saves', {
          method: 'POST',
          body: JSON.stringify({
            name: 'My Kanto Tracker',
            initialState: defaultAppState,
          }),
        })
      }

      const refreshedSession = await fetchSession()
      saves = refreshedSession.saves
      setCurrentUser(refreshedSession.user)
    }

    setAccessibleSaves(saves)

    const storedSaveId = Number(
      window.localStorage.getItem(getActiveSaveStorageKey(session.user.id)),
    )
    const nextActiveSave =
      saves.find((save) => save.id === storedSaveId) ?? saves[0] ?? null

    if (!nextActiveSave) {
      applyTrackerState(defaultAppState, { fromRemote: true })
      hasLoadedState.current = true
      return
    }

    await loadCloudSave(nextActiveSave.id, saves, session.user.id)

    if (!suppressConflictPrompt && hadExistingSaves && hasGuestState) {
      setMigrationConflict({
        localState: localGuestState,
      })
    } else {
      setMigrationConflict(null)
    }
  }

  const recoverFromLostCloudAccess = useEffectEvent(async () => {
    if (isRecoveringCloudAccess.current) {
      return
    }

    isRecoveringCloudAccess.current = true

    try {
      await hydrateAuthenticatedMode({
        suppressConflictPrompt: true,
      })
      setGeneratedShareCode('')
      setShareError('')
      setSaveError('')
      setAuthNotice(
        'Your access to that shared save was removed. We refreshed your available saves.',
      )
    } catch (error) {
      console.error(error)
      setSaveError('Your shared save access changed and the app could not refresh cleanly.')
    } finally {
      isRecoveringCloudAccess.current = false
    }
  })

  const hydrateInitialState = useEffectEvent(async () => {
    try {
      await hydrateAuthenticatedMode()
    } catch (error) {
      console.error(error)
      setSaveError('Could not load saved progress')
      await hydrateGuestMode()
    }
  })

  const persistTrackerState = useEffectEvent(async (state) => {
    try {
      if (mode === 'guest') {
        saveGuestTrackerState(state)
      } else if (mode === 'cloud' && activeSaveId) {
        const patch = buildTrackerPatch(state, cloudBaselineState.current)

        if (!patch) {
          hasUnsavedCloudChanges.current = false
          setSaveError('')
          return
        }

        isCloudSaving.current = true
        const response = await requestJson(`/api/saves/${activeSaveId}/state`, {
          method: 'PATCH',
          body: JSON.stringify({
            patch,
          }),
        })
        applyRemoteSaveMeta(response.save)
        applyTrackerState(response.state, { fromRemote: true })
        hasUnsavedCloudChanges.current = false
        isCloudSaving.current = false
      }

      setSaveError('')
    } catch (error) {
      isCloudSaving.current = false

      if (mode === 'cloud' && (error?.status === 401 || error?.status === 404)) {
        recoverFromLostCloudAccess().catch((recoveryError) => {
          console.error(recoveryError)
        })
        return
      }

      setSaveError(
        mode === 'guest'
          ? 'Could not save guest progress'
          : 'Could not save cloud progress',
      )
    }
  })

  const syncRemoteState = useEffectEvent(async () => {
    if (!activeSaveId) {
      return
    }

    const previousRemoteUpdatedAt = lastRemoteUpdatedAt.current
    const response = await requestJson(`/api/saves/${activeSaveId}/meta`)
    applyRemoteSaveMeta(response.save, response.collaborators ?? [])

    if (!response?.save?.updatedAt) {
      return
    }

    const remoteUpdatedAt = response.save.updatedAt

    if (hasUnsavedCloudChanges.current || isCloudSaving.current) {
      return
    }

    if (
      previousRemoteUpdatedAt &&
      remoteUpdatedAt <= previousRemoteUpdatedAt
    ) {
      return
    }

    const saveResponse = await requestJson(`/api/saves/${activeSaveId}`)
    applyRemoteSaveMeta(saveResponse.save, saveResponse.collaborators ?? [])
    applyTrackerState(saveResponse.state, { fromRemote: true })
    hasUnsavedCloudChanges.current = false
  })

  useEffect(() => {
    hydrateInitialState()
  }, [])

  useEffect(() => {
    const activeJumpTimeouts = jumpTimeouts.current

    return () => {
      Object.values(activeJumpTimeouts).forEach((timeoutId) => {
        window.clearTimeout(timeoutId)
      })
      window.clearTimeout(floodTimeout.current)
    }
  }, [])

  useEffect(() => {
    if (!hasLoadedState.current) {
      return
    }

    const state = readTrackerState()
    const timeoutId = window.setTimeout(() => {
      persistTrackerState(state).catch((error) => {
        console.error(error)
      })
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    activeSaveId,
    baseGameComplete,
    celebrationState,
    checkboxState,
    fireRedEeveelution,
    fireRedFossil,
    fireRedHitmon,
    fireRedStarter,
    leafGreenEeveelution,
    leafGreenFossil,
    leafGreenHitmon,
    leafGreenStarter,
    mode,
    switchEventUnlocks,
    tradeMode,
  ])

  useEffect(() => {
    if (!hasLoadedState.current) {
      return
    }

    const fireRedComplete = hasCompletedDex(checkboxState, 'fire-red', {
      baseGameComplete,
    })
    const leafGreenComplete = hasCompletedDex(checkboxState, 'leaf-green', {
      baseGameComplete,
    })

    if (fireRedComplete && !celebrationState.fireRedCompleteCelebrated) {
      setSpriteFlood(createFullDexCelebration({ baseGameComplete }))
      window.clearTimeout(floodTimeout.current)
      floodTimeout.current = window.setTimeout(() => {
        setSpriteFlood([])
      }, 19000)

      setCelebrationState((currentState) => ({
        ...currentState,
        fireRedCompleteCelebrated: true,
      }))
      return
    }

    if (leafGreenComplete && !celebrationState.leafGreenCompleteCelebrated) {
      setSpriteFlood(createFullDexCelebration({ baseGameComplete }))
      window.clearTimeout(floodTimeout.current)
      floodTimeout.current = window.setTimeout(() => {
        setSpriteFlood([])
      }, 19000)

      setCelebrationState((currentState) => ({
        ...currentState,
        leafGreenCompleteCelebrated: true,
      }))
    }
  }, [baseGameComplete, celebrationState, checkboxState])

  useEffect(() => {
    if (!hasLoadedState.current || mode !== 'cloud' || isApplyingRemoteState.current) {
      return
    }

    hasUnsavedCloudChanges.current = Boolean(
      buildTrackerPatch(readTrackerState(), cloudBaselineState.current),
    )
  }, [
    celebrationState,
    checkboxState,
    baseGameComplete,
    fireRedEeveelution,
    fireRedFossil,
    fireRedHitmon,
    fireRedStarter,
    leafGreenEeveelution,
    leafGreenFossil,
    leafGreenHitmon,
    leafGreenStarter,
    mode,
    switchEventUnlocks,
    tradeMode,
  ])

  useEffect(() => {
    if (mode !== 'cloud' || !activeSaveId) {
      return
    }

    syncRemoteState().catch((error) => {
      console.error(error)

      if (error?.status === 401 || error?.status === 404) {
        recoverFromLostCloudAccess().catch((recoveryError) => {
          console.error(recoveryError)
        })
      }
    })

    const intervalId = window.setInterval(() => {
      syncRemoteState().catch((error) => {
        console.error(error)

        if (error?.status === 401 || error?.status === 404) {
          recoverFromLostCloudAccess().catch((recoveryError) => {
            console.error(recoveryError)
          })
        }
      })
    }, 4000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activeSaveId, mode])

  function updateCheckboxState(key, checked) {
    markCloudStateDirty()

    setCheckboxState((currentState) => ({
      ...currentState,
      [key]: checked,
    }))

    if (!checked) {
      return
    }

    const pokemonId = key.split('-').at(-1)

    setJumpingSprites((currentState) => ({
      ...currentState,
      [pokemonId]: true,
    }))

    window.clearTimeout(jumpTimeouts.current[pokemonId])
    jumpTimeouts.current[pokemonId] = window.setTimeout(() => {
      setJumpingSprites((currentState) => ({
        ...currentState,
        [pokemonId]: false,
      }))
    }, 700)
  }

  function updateTradeMode(nextValue) {
    markCloudStateDirty()
    setTradeMode(nextValue)
  }

  function updateSwitchEventUnlocks(nextValue) {
    markCloudStateDirty()
    setSwitchEventUnlocks(nextValue)
  }

  function updateBaseGameComplete(nextValue) {
    markCloudStateDirty()
    setBaseGameComplete(nextValue)
  }

  function updateFireRedStarter(nextValue) {
    markCloudStateDirty()
    setFireRedStarter(nextValue)
  }

  function updateLeafGreenStarter(nextValue) {
    markCloudStateDirty()
    setLeafGreenStarter(nextValue)
  }

  function updateFireRedFossil(nextValue) {
    markCloudStateDirty()
    setFireRedFossil(nextValue)
  }

  function updateLeafGreenFossil(nextValue) {
    markCloudStateDirty()
    setLeafGreenFossil(nextValue)
  }

  function updateFireRedEeveelution(nextValue) {
    markCloudStateDirty()
    setFireRedEeveelution(nextValue)
  }

  function updateLeafGreenEeveelution(nextValue) {
    markCloudStateDirty()
    setLeafGreenEeveelution(nextValue)
  }

  function updateFireRedHitmon(nextValue) {
    markCloudStateDirty()
    setFireRedHitmon(nextValue)
  }

  function updateLeafGreenHitmon(nextValue) {
    markCloudStateDirty()
    setLeafGreenHitmon(nextValue)
  }

  async function signUp(username, password) {
    setAuthError('')
    setAuthNotice('')

    try {
      await requestJson('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      const session = await fetchSession()

      if (!session.authenticated || !session.user) {
        throw new Error(
          'Your account was created, but the login session was not saved. Check your production cookie and proxy setup.',
        )
      }

      await hydrateAuthenticatedMode()
      setAuthNotice(`Signed in as ${session.user.username}.`)
    } catch (error) {
      setAuthError(error.message)
    }
  }

  async function logIn(username, password) {
    setAuthError('')
    setAuthNotice('')

    try {
      await requestJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      const session = await fetchSession()

      if (!session.authenticated || !session.user) {
        throw new Error(
          'Your username and password were accepted, but the login session was not saved. Check your production cookie and proxy setup.',
        )
      }

      await hydrateAuthenticatedMode()
      setAuthNotice(`Signed in as ${session.user.username}.`)
    } catch (error) {
      setAuthError(error.message)
    }
  }

  async function logOut() {
    setAuthError('')
    setAuthNotice('')
    setShareError('')

    try {
      await requestJson('/api/auth/logout', {
        method: 'POST',
      })
    } catch {
      // Even if logout fails on the server, we still fall back to guest mode locally.
    }

    await hydrateGuestMode()
  }

  async function switchActiveSave(nextSaveId) {
    if (!currentUser || !nextSaveId || nextSaveId === activeSaveId) {
      return
    }

    try {
      hasLoadedState.current = false
      await loadCloudSave(nextSaveId, accessibleSaves, currentUser.id)
    } catch (error) {
      setSaveError(error.message || 'Could not switch saves')
    }
  }

  async function keepCloudVersion() {
    clearGuestTrackerState()
    setMigrationConflict(null)
  }

  async function replaceCloudWithLocalProgress() {
    if (!migrationConflict?.localState || !activeSaveId) {
      return
    }

    try {
      hasLoadedState.current = false
      await requestJson(`/api/saves/${activeSaveId}/state`, {
        method: 'PUT',
        body: JSON.stringify({
          state: migrationConflict.localState,
        }),
      })
      clearGuestTrackerState()
      setMigrationConflict(null)
      await loadCloudSave(activeSaveId, accessibleSaves, currentUser.id)
    } catch (error) {
      setSaveError(error.message || 'Could not replace the cloud save')
      hasLoadedState.current = true
    }
  }

  async function joinSharedSave(shareCode) {
    setShareError('')

    try {
      const response = await requestJson('/api/saves/join', {
        method: 'POST',
        body: JSON.stringify({ shareCode }),
      })
      await hydrateAuthenticatedMode({
        suppressConflictPrompt: Boolean(migrationConflict),
      })
      if (response.saveId) {
        await switchActiveSave(response.saveId)
      }
    } catch (error) {
      setShareError(error.message)
    }
  }

  async function generateShareCodeForActiveSave() {
    if (!activeSave?.canManage || !activeSaveId) {
      return
    }

    setShareError('')

    try {
      const response = await requestJson(`/api/saves/${activeSaveId}/share-code`, {
        method: 'POST',
      })
      setGeneratedShareCode(response.shareCode)
    } catch (error) {
      setShareError(error.message)
    }
  }

  async function removeCollaboratorFromActiveSave(userId) {
    if (!activeSave?.canManage || !activeSaveId) {
      return
    }

    setShareError('')

    try {
      await requestJson(`/api/saves/${activeSaveId}/collaborators/${userId}`, {
        method: 'DELETE',
      })
      await loadCloudSave(activeSaveId, accessibleSaves, currentUser.id)
    } catch (error) {
      setShareError(error.message)
    }
  }

  return {
    mode,
    currentUser,
    accessibleSaves,
    activeSaveId,
    activeSave,
    collaborators,
    tradeMode,
    setTradeMode: updateTradeMode,
    switchEventUnlocks,
    setSwitchEventUnlocks: updateSwitchEventUnlocks,
    baseGameComplete,
    setBaseGameComplete: updateBaseGameComplete,
    fireRedStarter,
    setFireRedStarter: updateFireRedStarter,
    leafGreenStarter,
    setLeafGreenStarter: updateLeafGreenStarter,
    fireRedFossil,
    setFireRedFossil: updateFireRedFossil,
    leafGreenFossil,
    setLeafGreenFossil: updateLeafGreenFossil,
    fireRedEeveelution,
    setFireRedEeveelution: updateFireRedEeveelution,
    leafGreenEeveelution,
    setLeafGreenEeveelution: updateLeafGreenEeveelution,
    fireRedHitmon,
    setFireRedHitmon: updateFireRedHitmon,
    leafGreenHitmon,
    setLeafGreenHitmon: updateLeafGreenHitmon,
    checkboxState,
    updateCheckboxState,
    jumpingSprites,
    spriteFlood,
    saveError,
    authError,
    authNotice,
    shareError,
    generatedShareCode,
    migrationConflict,
    signUp,
    logIn,
    logOut,
    switchActiveSave,
    keepCloudVersion,
    replaceCloudWithLocalProgress,
    joinSharedSave,
    generateShareCodeForActiveSave,
    removeCollaboratorFromActiveSave,
  }
}

export default usePokedexState
