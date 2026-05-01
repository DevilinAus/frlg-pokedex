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

export function normalizeOwnedHeldTradeItems(ownedHeldTradeItems) {
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
    if (!value) {
      return
    }

    heldTradeItemVersionKeys.forEach((versionKey) => {
      const ownershipKey = getHeldTradeItemOwnershipKey(versionKey, itemName)

      if (!Object.hasOwn(normalizedItems, ownershipKey)) {
        normalizedItems[ownershipKey] = true
      }
    })
  })

  return normalizedItems
}
