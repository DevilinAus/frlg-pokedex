export function getBreedingProgressStateKey(versionKey, progressKey) {
  if (!versionKey || !progressKey) {
    return ''
  }

  return `${versionKey}-breed-${progressKey}`
}

export function sanitizeBreedingProgress(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(input)
      .filter(([key]) => typeof key === 'string')
      .map(([key, value]) => {
        const nextValue = Number.isFinite(Number(value))
          ? Math.max(0, Math.floor(Number(value)))
          : 0

        return [key, nextValue]
      }),
  )
}

export function getBreedingProgressCount(breedingProgress, versionKey, progressKey) {
  const stateKey = getBreedingProgressStateKey(versionKey, progressKey)

  if (!stateKey) {
    return 0
  }

  return Math.max(0, Math.floor(Number(breedingProgress?.[stateKey] ?? 0)))
}
