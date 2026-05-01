export const heldTradeItemVersionKeys = ['fire-red', 'leaf-green']

export function isHeldTradeItemVersionKey(versionKey) {
  return heldTradeItemVersionKeys.includes(versionKey)
}

export function getHeldTradeItemOwnershipKey(versionKey, itemName) {
  if (!isHeldTradeItemVersionKey(versionKey)) {
    return ''
  }

  if (typeof itemName !== 'string' || !itemName) {
    return ''
  }

  return `${versionKey}::${itemName}`
}

export function getOwnedHeldTradeItem(ownedHeldTradeItems, versionKey, itemName) {
  const ownershipKey = getHeldTradeItemOwnershipKey(versionKey, itemName)

  if (!ownershipKey) {
    return false
  }

  if (Object.hasOwn(ownedHeldTradeItems ?? {}, ownershipKey)) {
    return Boolean(ownedHeldTradeItems[ownershipKey])
  }

  return Boolean(ownedHeldTradeItems?.[itemName])
}

export function getOwnedHeldTradeItemForMode(
  ownedHeldTradeItems,
  versionKey,
  itemName,
  ownedGames,
) {
  if (ownedGames === 'both') {
    if (Object.hasOwn(ownedHeldTradeItems ?? {}, itemName)) {
      return Boolean(ownedHeldTradeItems[itemName])
    }

    return heldTradeItemVersionKeys.some((itemVersionKey) =>
      getOwnedHeldTradeItem(ownedHeldTradeItems, itemVersionKey, itemName),
    )
  }

  return getOwnedHeldTradeItem(ownedHeldTradeItems, versionKey, itemName)
}

export function buildLegacyOwnedHeldTradeItems(ownedHeldTradeItems, ownedGames = 'both') {
  const normalizedItems = normalizeOwnedHeldTradeItems(ownedHeldTradeItems, ownedGames)
  const itemNames = new Set()

  Object.keys(normalizedItems).forEach((key) => {
    const [versionKey, itemName] = key.split('::')

    if (itemName && isHeldTradeItemVersionKey(versionKey)) {
      itemNames.add(itemName)
    }
  })

  return Object.fromEntries(
    [...itemNames].sort().map((itemName) => [
      itemName,
      getOwnedHeldTradeItemForMode(normalizedItems, ownedGames, itemName, ownedGames),
    ]),
  )
}

export function withLegacyOwnedHeldTradeItemsCompatibility(
  ownedHeldTradeItems,
  ownedGames = 'both',
) {
  const normalizedItems = normalizeOwnedHeldTradeItems(ownedHeldTradeItems, ownedGames)

  return {
    ...buildLegacyOwnedHeldTradeItems(normalizedItems, ownedGames),
    ...normalizedItems,
  }
}

export function normalizeOwnedHeldTradeItems(ownedHeldTradeItems, ownedGames = 'both') {
  if (
    !ownedHeldTradeItems ||
    typeof ownedHeldTradeItems !== 'object' ||
    Array.isArray(ownedHeldTradeItems)
  ) {
    return {}
  }

  const normalizedItems = {}
  const legacyItems = []

  Object.entries(ownedHeldTradeItems).forEach(([key, value]) => {
    if (typeof key !== 'string') {
      return
    }

    const [versionKey, itemName] = key.split('::')

    if (itemName && isHeldTradeItemVersionKey(versionKey)) {
      normalizedItems[key] = Boolean(value)
      return
    }

    legacyItems.push([key, Boolean(value)])
  })

  legacyItems.forEach(([itemName, value]) => {
    if (ownedGames === 'both') {
      heldTradeItemVersionKeys.forEach((versionKey) => {
        const ownershipKey = getHeldTradeItemOwnershipKey(versionKey, itemName)

        if (!Object.hasOwn(normalizedItems, ownershipKey)) {
          normalizedItems[ownershipKey] = value
        }
      })

      return
    }

    if (isHeldTradeItemVersionKey(ownedGames)) {
      const ownershipKey = getHeldTradeItemOwnershipKey(ownedGames, itemName)

      if (!Object.hasOwn(normalizedItems, ownershipKey)) {
        normalizedItems[ownershipKey] = value
      }

      return
    }

    heldTradeItemVersionKeys.forEach((versionKey) => {
      const ownershipKey = getHeldTradeItemOwnershipKey(versionKey, itemName)

      if (!Object.hasOwn(normalizedItems, ownershipKey)) {
        normalizedItems[ownershipKey] = value
      }
    })
  })

  return normalizedItems
}
