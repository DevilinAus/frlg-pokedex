import { useEffect, useRef, useState } from 'react'
import { hasCompletedDex } from '../lib/pokedexHelpers'
import {
  defaultAppState,
  defaultCelebrationState,
} from '../lib/pokedexOptions'
import { createFullDexCelebration } from '../lib/sprites'

function usePokedexState() {
  const [tradeMode, setTradeMode] = useState(defaultAppState.tradeMode)
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
  const hasLoadedState = useRef(false)
  const jumpTimeouts = useRef({})
  const floodTimeout = useRef(null)

  useEffect(() => {
    return () => {
      Object.values(jumpTimeouts.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId)
      })
      window.clearTimeout(floodTimeout.current)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadState() {
      try {
        const response = await fetch('/api/state')
        const savedState = await response.json()

        if (cancelled) {
          return
        }

        setTradeMode(Boolean(savedState.tradeMode))
        setFireRedStarter(savedState.fireRedStarter ?? defaultAppState.fireRedStarter)
        setLeafGreenStarter(savedState.leafGreenStarter ?? defaultAppState.leafGreenStarter)
        setFireRedFossil(savedState.fireRedFossil ?? defaultAppState.fireRedFossil)
        setLeafGreenFossil(savedState.leafGreenFossil ?? defaultAppState.leafGreenFossil)
        setFireRedEeveelution(
          savedState.fireRedEeveelution ?? defaultAppState.fireRedEeveelution,
        )
        setLeafGreenEeveelution(
          savedState.leafGreenEeveelution ?? defaultAppState.leafGreenEeveelution,
        )
        setFireRedHitmon(savedState.fireRedHitmon ?? defaultAppState.fireRedHitmon)
        setLeafGreenHitmon(savedState.leafGreenHitmon ?? defaultAppState.leafGreenHitmon)
        setCheckboxState(savedState.checkboxState ?? defaultAppState.checkboxState)
        setCelebrationState(savedState.celebrationState ?? defaultCelebrationState)
        setSaveError('')
      } catch {
        if (!cancelled) {
          setSaveError('Could not load saved progress')
        }
      } finally {
        if (!cancelled) {
          hasLoadedState.current = true
        }
      }
    }

    loadState()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hasLoadedState.current) {
      return
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        await fetch('/api/state', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tradeMode,
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
        })

        setSaveError('')
      } catch {
        setSaveError('Could not save progress')
      }
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
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
    tradeMode,
  ])

  useEffect(() => {
    if (!hasLoadedState.current) {
      return
    }

    const fireRedComplete = hasCompletedDex(checkboxState, 'fire-red')
    const leafGreenComplete = hasCompletedDex(checkboxState, 'leaf-green')

    if (fireRedComplete && !celebrationState.fireRedCompleteCelebrated) {
      setSpriteFlood(createFullDexCelebration())
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
      setSpriteFlood(createFullDexCelebration())
      window.clearTimeout(floodTimeout.current)
      floodTimeout.current = window.setTimeout(() => {
        setSpriteFlood([])
      }, 19000)

      setCelebrationState((currentState) => ({
        ...currentState,
        leafGreenCompleteCelebrated: true,
      }))
    }
  }, [celebrationState, checkboxState])

  function updateCheckboxState(key, checked) {
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

  return {
    tradeMode,
    setTradeMode,
    fireRedStarter,
    setFireRedStarter,
    leafGreenStarter,
    setLeafGreenStarter,
    fireRedFossil,
    setFireRedFossil,
    leafGreenFossil,
    setLeafGreenFossil,
    fireRedEeveelution,
    setFireRedEeveelution,
    leafGreenEeveelution,
    setLeafGreenEeveelution,
    fireRedHitmon,
    setFireRedHitmon,
    leafGreenHitmon,
    setLeafGreenHitmon,
    checkboxState,
    updateCheckboxState,
    jumpingSprites,
    spriteFlood,
    saveError,
  }
}

export default usePokedexState
