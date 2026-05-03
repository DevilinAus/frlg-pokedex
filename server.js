import 'dotenv/config'
import { Buffer } from 'node:buffer'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import bcrypt from 'bcryptjs'
import Database from 'better-sqlite3'
import SQLiteStoreFactory from 'better-sqlite3-session-store'
import express from 'express'
import session from 'express-session'
import { normalizeCheckboxState } from './src/lib/checkboxState.js'
import { sanitizeBreedingProgress } from './src/lib/breedingProgress.js'
import {
  normalizeOwnedHeldTradeItems,
  withLegacyOwnedHeldTradeItemsCompatibility,
} from './src/lib/heldTradeItems.js'

const app = express()
const port = Number(process.env.PORT || 3001)
const dataDir = path.join(process.cwd(), 'data')
const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'lgfr.sqlite')
const distDir = path.join(process.cwd(), 'dist')
const sessionSecret =
  process.env.SESSION_SECRET || 'dev-only-session-secret-change-me'

if (!process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET is not set. Using a development fallback secret.')
}

app.set('trust proxy', 1)

fs.mkdirSync(dataDir, { recursive: true })

const db = new Database(dbPath)
db.pragma('foreign_keys = ON')
db.pragma('journal_mode = WAL')

const defaultTrackerState = {
  ownedGames: 'both',
  trackerLayout: 'dual',
  onboardingComplete: false,
  tradeMode: false,
  showSecondaryProgress: false,
  unlockAll: false,
  primaryGame: '',
  switchEventUnlocks: false,
  fireRedBaseGameComplete: false,
  leafGreenBaseGameComplete: false,
  fireRedStarter: '',
  leafGreenStarter: '',
  fireRedFossil: '',
  leafGreenFossil: '',
  fireRedEeveelution: '',
  leafGreenEeveelution: '',
  fireRedHitmon: '',
  leafGreenHitmon: '',
  ownedHeldTradeItems: {},
  breedingProgress: {},
  checkboxState: {},
  celebrationState: {
    fireRedCompleteCelebrated: false,
    leafGreenCompleteCelebrated: false,
  },
}

const ownedGameValues = new Set(['fire-red', 'leaf-green', 'both'])
const primaryGameValues = new Set(['', 'fire-red', 'leaf-green'])
const trackerLayoutValues = new Set(['single', 'dual'])

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS saves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share_code_hash TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS save_memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'collaborator',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(save_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS save_states (
    save_id INTEGER PRIMARY KEY REFERENCES saves(id) ON DELETE CASCADE,
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_saves_owner_user_id
    ON saves(owner_user_id);

  CREATE INDEX IF NOT EXISTS idx_save_memberships_user_id
    ON save_memberships(user_id);

  CREATE INDEX IF NOT EXISTS idx_save_memberships_save_id
    ON save_memberships(save_id);

  CREATE INDEX IF NOT EXISTS idx_saves_share_code_hash
    ON saves(share_code_hash);
`)

const SQLiteStore = SQLiteStoreFactory(session)

app.use(express.json({ limit: '1mb' }))
app.use(
  session({
    secret: sessionSecret,
    proxy: true,
    store: new SQLiteStore({
      client: db,
    }),
    name: 'lgfr.sid',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' ? 'auto' : false,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    },
  }),
)

const createUser = db.prepare(`
  INSERT INTO users (username, password_hash)
  VALUES (@username, @passwordHash)
`)
const findUserByUsername = db.prepare(`
  SELECT id, username, password_hash
  FROM users
  WHERE username = ?
`)
const findUserById = db.prepare(`
  SELECT id, username
  FROM users
  WHERE id = ?
`)
const insertSave = db.prepare(`
  INSERT INTO saves (name, owner_user_id, share_code_hash, updated_at)
  VALUES (@name, @ownerUserId, NULL, CURRENT_TIMESTAMP)
`)
const insertSaveState = db.prepare(`
  INSERT INTO save_states (save_id, state_json, updated_by_user_id, updated_at)
  VALUES (@saveId, @stateJson, @updatedByUserId, CURRENT_TIMESTAMP)
`)
const updateSaveState = db.prepare(`
  INSERT INTO save_states (save_id, state_json, updated_by_user_id, updated_at)
  VALUES (@saveId, @stateJson, @updatedByUserId, CURRENT_TIMESTAMP)
  ON CONFLICT(save_id) DO UPDATE SET
    state_json = excluded.state_json,
    updated_by_user_id = excluded.updated_by_user_id,
    updated_at = excluded.updated_at
`)
const touchSave = db.prepare(`
  UPDATE saves
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`)
const listAccessibleSaves = db.prepare(`
  SELECT
    saves.id,
    saves.name,
    saves.owner_user_id AS ownerUserId,
    owners.username AS ownerUsername,
    saves.updated_at AS updatedAt,
    CASE
      WHEN saves.owner_user_id = @userId THEN 'owner'
      ELSE 'collaborator'
    END AS role
  FROM saves
  JOIN users AS owners ON owners.id = saves.owner_user_id
  WHERE saves.owner_user_id = @userId
     OR EXISTS (
       SELECT 1
       FROM save_memberships
       WHERE save_memberships.save_id = saves.id
         AND save_memberships.user_id = @userId
     )
  ORDER BY datetime(saves.updated_at) DESC, saves.id DESC
`)
const findSaveAccess = db.prepare(`
  SELECT
    saves.id,
    saves.name,
    saves.owner_user_id AS ownerUserId,
    owners.username AS ownerUsername,
    saves.updated_at AS updatedAt,
    saves.share_code_hash AS shareCodeHash,
    CASE
      WHEN saves.owner_user_id = @userId THEN 'owner'
      ELSE 'collaborator'
    END AS role
  FROM saves
  JOIN users AS owners ON owners.id = saves.owner_user_id
  WHERE saves.id = @saveId
    AND (
      saves.owner_user_id = @userId
      OR EXISTS (
        SELECT 1
        FROM save_memberships
        WHERE save_memberships.save_id = saves.id
          AND save_memberships.user_id = @userId
      )
    )
`)
const findOwnedSave = db.prepare(`
  SELECT id, owner_user_id AS ownerUserId
  FROM saves
  WHERE id = ?
`)
const findSaveState = db.prepare(`
  SELECT state_json AS stateJson
  FROM save_states
  WHERE save_id = ?
`)
const listSaveStates = db.prepare(`
  SELECT save_id AS saveId, state_json AS stateJson
  FROM save_states
`)
const overwriteSaveStateJson = db.prepare(`
  UPDATE save_states
  SET state_json = @stateJson,
      updated_at = CURRENT_TIMESTAMP
  WHERE save_id = @saveId
`)
const updateSaveShareCode = db.prepare(`
  UPDATE saves
  SET share_code_hash = @shareCodeHash,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = @saveId
`)
const findSaveByShareCodeHash = db.prepare(`
  SELECT id, owner_user_id AS ownerUserId
  FROM saves
  WHERE share_code_hash = ?
`)
const insertMembership = db.prepare(`
  INSERT OR IGNORE INTO save_memberships (save_id, user_id, role)
  VALUES (@saveId, @userId, 'collaborator')
`)
const listCollaborators = db.prepare(`
  SELECT users.id, users.username
  FROM save_memberships
  JOIN users ON users.id = save_memberships.user_id
  WHERE save_memberships.save_id = ?
  ORDER BY users.username ASC
`)
const deleteCollaborator = db.prepare(`
  DELETE FROM save_memberships
  WHERE save_id = @saveId
    AND user_id = @userId
`)

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function validateUsername(username) {
  return /^[a-z0-9_-]{3,24}$/.test(username)
}

function validatePassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    Buffer.byteLength(password, 'utf8') <= 72
  )
}

function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown'
}

function createRateLimiter({
  windowMs,
  maxRequests,
  message,
  keyBuilder = (req) => getClientIp(req),
}) {
  const attempts = new Map()

  return (req, res, next) => {
    const now = Date.now()
    const key = keyBuilder(req)
    const entry = attempts.get(key)

    if (!entry || entry.resetAt <= now) {
      attempts.set(key, {
        count: 1,
        resetAt: now + windowMs,
      })
      next()
      return
    }

    if (entry.count >= maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((entry.resetAt - now) / 1000),
      )
      res.set('Retry-After', String(retryAfterSeconds))
      res.status(429).json({ error: message })
      return
    }

    entry.count += 1
    next()
  }
}

const signUpRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many signup attempts. Please wait a bit and try again.',
})

const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many login attempts. Please wait a bit and try again.',
  keyBuilder: (req) => {
    const username = normalizeUsername(req.body?.username)
    return `${getClientIp(req)}:${username || 'anonymous'}`
  },
})

const joinSaveRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many share code attempts. Please wait a bit and try again.',
  keyBuilder: (req) => {
    const userId = req.session?.userId || 'guest'
    return `${getClientIp(req)}:${userId}`
  },
})

function sanitizeText(value, fallback) {
  if (typeof value !== 'string') {
    return fallback
  }

  return value
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
    state.ownedGames !== defaultTrackerState.ownedGames ||
    state.trackerLayout !== defaultTrackerState.trackerLayout ||
    state.tradeMode ||
    state.showSecondaryProgress !== defaultTrackerState.showSecondaryProgress ||
    state.unlockAll ||
    state.primaryGame !== defaultTrackerState.primaryGame ||
    state.switchEventUnlocks ||
    state.fireRedBaseGameComplete ||
    state.leafGreenBaseGameComplete ||
    state.fireRedStarter !== defaultTrackerState.fireRedStarter ||
    state.leafGreenStarter !== defaultTrackerState.leafGreenStarter ||
    state.fireRedFossil !== defaultTrackerState.fireRedFossil ||
    state.leafGreenFossil !== defaultTrackerState.leafGreenFossil ||
    state.fireRedEeveelution !== defaultTrackerState.fireRedEeveelution ||
    state.leafGreenEeveelution !== defaultTrackerState.leafGreenEeveelution ||
    state.fireRedHitmon !== defaultTrackerState.fireRedHitmon ||
    state.leafGreenHitmon !== defaultTrackerState.leafGreenHitmon ||
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

function sanitizeTrackerState(input) {
  const legacyBaseGameComplete = Boolean(input?.baseGameComplete)
  const ownedGames = sanitizeEnum(
    input?.ownedGames,
    ownedGameValues,
    defaultTrackerState.ownedGames,
  )
  const trackerLayout = sanitizeEnum(
    input?.trackerLayout,
    trackerLayoutValues,
    defaultTrackerState.trackerLayout,
  )
  const primaryGame = sanitizeEnum(
    input?.primaryGame,
    primaryGameValues,
    defaultTrackerState.primaryGame,
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
      defaultTrackerState.fireRedStarter,
    ),
    leafGreenStarter: sanitizeText(
      input?.leafGreenStarter,
      defaultTrackerState.leafGreenStarter,
    ),
    fireRedFossil: sanitizeText(
      input?.fireRedFossil,
      defaultTrackerState.fireRedFossil,
    ),
    leafGreenFossil: sanitizeText(
      input?.leafGreenFossil,
      defaultTrackerState.leafGreenFossil,
    ),
    fireRedEeveelution: sanitizeText(
      input?.fireRedEeveelution,
      defaultTrackerState.fireRedEeveelution,
    ),
    leafGreenEeveelution: sanitizeText(
      input?.leafGreenEeveelution,
      defaultTrackerState.leafGreenEeveelution,
    ),
    fireRedHitmon: sanitizeText(
      input?.fireRedHitmon,
      defaultTrackerState.fireRedHitmon,
    ),
    leafGreenHitmon: sanitizeText(
      input?.leafGreenHitmon,
      defaultTrackerState.leafGreenHitmon,
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
        : defaultTrackerState.celebrationState,
  }

  return {
    ...safeState,
    onboardingComplete:
      typeof input?.onboardingComplete === 'boolean'
        ? input.onboardingComplete
        : hasMeaningfulTrackerData(safeState),
  }
}

function parseStoredTrackerState(stateJson) {
  if (typeof stateJson !== 'string' || !stateJson) {
    return sanitizeTrackerState(defaultTrackerState)
  }

  try {
    return sanitizeTrackerState(JSON.parse(stateJson))
  } catch {
    return sanitizeTrackerState(defaultTrackerState)
  }
}

const backfillOwnedHeldTradeItemsInSaveStates = db.transaction(() => {
  let normalizedSaveCount = 0

  listSaveStates.all().forEach((row) => {
    let parsedState = null

    try {
      parsedState = JSON.parse(row.stateJson)
    } catch {
      return
    }

    const normalizedStateJson = JSON.stringify(sanitizeTrackerState(parsedState))

    if (normalizedStateJson === row.stateJson) {
      return
    }

    overwriteSaveStateJson.run({
      saveId: row.saveId,
      stateJson: normalizedStateJson,
    })
    normalizedSaveCount += 1
  })

  return normalizedSaveCount
})

function sanitizeTrackerPatch(
  input,
  currentOwnedGames = defaultTrackerState.ownedGames,
) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null
  }

  const patch = {}

  if (Object.hasOwn(input, 'ownedGames')) {
    patch.ownedGames = sanitizeEnum(
      input.ownedGames,
      ownedGameValues,
      defaultTrackerState.ownedGames,
    )
  }

  if (Object.hasOwn(input, 'trackerLayout')) {
    patch.trackerLayout = sanitizeEnum(
      input.trackerLayout,
      trackerLayoutValues,
      defaultTrackerState.trackerLayout,
    )
  }

  if (Object.hasOwn(input, 'onboardingComplete')) {
    patch.onboardingComplete = Boolean(input.onboardingComplete)
  }

  if (Object.hasOwn(input, 'tradeMode')) {
    patch.tradeMode = Boolean(input.tradeMode)
  }

  if (Object.hasOwn(input, 'showSecondaryProgress')) {
    patch.showSecondaryProgress = Boolean(input.showSecondaryProgress)
  }

  if (Object.hasOwn(input, 'unlockAll')) {
    patch.unlockAll = Boolean(input.unlockAll)
  }

  if (Object.hasOwn(input, 'primaryGame')) {
    patch.primaryGame = sanitizeEnum(
      input.primaryGame,
      primaryGameValues,
      defaultTrackerState.primaryGame,
    )
  }

  if (Object.hasOwn(input, 'switchEventUnlocks')) {
    patch.switchEventUnlocks = Boolean(input.switchEventUnlocks)
  }

  if (Object.hasOwn(input, 'fireRedBaseGameComplete')) {
    patch.fireRedBaseGameComplete = Boolean(input.fireRedBaseGameComplete)
  }

  if (Object.hasOwn(input, 'leafGreenBaseGameComplete')) {
    patch.leafGreenBaseGameComplete = Boolean(input.leafGreenBaseGameComplete)
  }

  if (Object.hasOwn(input, 'baseGameComplete')) {
    patch.fireRedBaseGameComplete = Boolean(input.baseGameComplete)
    patch.leafGreenBaseGameComplete = Boolean(input.baseGameComplete)
  }

  if (Object.hasOwn(input, 'fireRedStarter')) {
    patch.fireRedStarter = sanitizeText(
      input.fireRedStarter,
      defaultTrackerState.fireRedStarter,
    )
  }

  if (Object.hasOwn(input, 'leafGreenStarter')) {
    patch.leafGreenStarter = sanitizeText(
      input.leafGreenStarter,
      defaultTrackerState.leafGreenStarter,
    )
  }

  if (Object.hasOwn(input, 'fireRedFossil')) {
    patch.fireRedFossil = sanitizeText(
      input.fireRedFossil,
      defaultTrackerState.fireRedFossil,
    )
  }

  if (Object.hasOwn(input, 'leafGreenFossil')) {
    patch.leafGreenFossil = sanitizeText(
      input.leafGreenFossil,
      defaultTrackerState.leafGreenFossil,
    )
  }

  if (Object.hasOwn(input, 'fireRedEeveelution')) {
    patch.fireRedEeveelution = sanitizeText(
      input.fireRedEeveelution,
      defaultTrackerState.fireRedEeveelution,
    )
  }

  if (Object.hasOwn(input, 'leafGreenEeveelution')) {
    patch.leafGreenEeveelution = sanitizeText(
      input.leafGreenEeveelution,
      defaultTrackerState.leafGreenEeveelution,
    )
  }

  if (Object.hasOwn(input, 'fireRedHitmon')) {
    patch.fireRedHitmon = sanitizeText(
      input.fireRedHitmon,
      defaultTrackerState.fireRedHitmon,
    )
  }

  if (Object.hasOwn(input, 'leafGreenHitmon')) {
    patch.leafGreenHitmon = sanitizeText(
      input.leafGreenHitmon,
      defaultTrackerState.leafGreenHitmon,
    )
  }

  if (Object.hasOwn(input, 'ownedHeldTradeItems')) {
    patch.ownedHeldTradeItems = normalizeOwnedHeldTradeItems(
      sanitizeBooleanMap(input.ownedHeldTradeItems),
      input.ownedGames ?? currentOwnedGames,
    )
  }

  if (
    Object.hasOwn(input, 'breedingProgress') &&
    input.breedingProgress &&
    typeof input.breedingProgress === 'object' &&
    !Array.isArray(input.breedingProgress)
  ) {
    patch.breedingProgress = sanitizeBreedingProgress(input.breedingProgress)
  }

  if (
    Object.hasOwn(input, 'checkboxState') &&
    input.checkboxState &&
    typeof input.checkboxState === 'object' &&
    !Array.isArray(input.checkboxState)
  ) {
    patch.checkboxState = sanitizeBooleanMap(input.checkboxState)
  }

  if (
    Object.hasOwn(input, 'celebrationState') &&
    input.celebrationState &&
    typeof input.celebrationState === 'object' &&
    !Array.isArray(input.celebrationState)
  ) {
    patch.celebrationState = {}

    if (Object.hasOwn(input.celebrationState, 'fireRedCompleteCelebrated')) {
      patch.celebrationState.fireRedCompleteCelebrated = Boolean(
        input.celebrationState.fireRedCompleteCelebrated,
      )
    }

    if (Object.hasOwn(input.celebrationState, 'leafGreenCompleteCelebrated')) {
      patch.celebrationState.leafGreenCompleteCelebrated = Boolean(
        input.celebrationState.leafGreenCompleteCelebrated,
      )
    }
  }

  return patch
}

function mergeTrackerPatch(currentState, patch) {
  if (!patch) {
    return sanitizeTrackerState(currentState)
  }

  return sanitizeTrackerState({
    ...currentState,
    ...patch,
    ownedHeldTradeItems: patch.ownedHeldTradeItems
      ? {
          ...currentState.ownedHeldTradeItems,
          ...patch.ownedHeldTradeItems,
        }
      : currentState.ownedHeldTradeItems,
    breedingProgress: patch.breedingProgress
      ? {
          ...currentState.breedingProgress,
          ...patch.breedingProgress,
        }
      : currentState.breedingProgress,
    checkboxState: patch.checkboxState
      ? {
          ...currentState.checkboxState,
          ...patch.checkboxState,
        }
      : currentState.checkboxState,
    celebrationState: patch.celebrationState
      ? {
          ...currentState.celebrationState,
          ...patch.celebrationState,
        }
      : currentState.celebrationState,
  })
}

function hashShareCode(shareCode) {
  return crypto.createHash('sha256').update(shareCode).digest('hex')
}

function generateShareCode() {
  return crypto.randomBytes(18).toString('base64url')
}

function buildSaveSummary(save) {
  return {
    id: save.id,
    name: save.name,
    ownerUserId: save.ownerUserId,
    ownerUsername: save.ownerUsername,
    role: save.role,
    updatedAt: save.updatedAt,
  }
}

function serializeTrackerStateForClient(state) {
  const sanitizedState = sanitizeTrackerState(state)

  return {
    ...sanitizedState,
    ownedHeldTradeItems: withLegacyOwnedHeldTradeItemsCompatibility(
      sanitizedState.ownedHeldTradeItems,
      sanitizedState.ownedGames,
    ),
  }
}

function getSessionUser(req) {
  if (!req.session?.userId) {
    return null
  }

  return findUserById.get(req.session.userId) ?? null
}

function requireAuth(req, res, next) {
  const user = getSessionUser(req)

  if (!user) {
    res.status(401).json({ error: 'You need to log in first.' })
    return
  }

  req.currentUser = user
  next()
}

function getAccessibleSaveOrNull(userId, saveId) {
  return findSaveAccess.get({
    userId,
    saveId,
  })
}

function createSaveForUser(ownerUserId, name, initialState, updatedByUserId = ownerUserId) {
  const insertResult = insertSave.run({
    name,
    ownerUserId,
  })
  const saveId = Number(insertResult.lastInsertRowid)

  insertSaveState.run({
    saveId,
    stateJson: JSON.stringify(initialState),
    updatedByUserId,
  })

  return saveId
}

const normalizedSaveCount = backfillOwnedHeldTradeItemsInSaveStates()

if (normalizedSaveCount > 0) {
  console.info(`Normalized ${normalizedSaveCount} saved tracker state(s).`)
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

app.get('/api/auth/session', (req, res) => {
  const user = getSessionUser(req)

  if (!user) {
    res.json({
      authenticated: false,
      user: null,
      saves: [],
    })
    return
  }

  const saves = listAccessibleSaves
    .all({ userId: user.id })
    .map(buildSaveSummary)

  res.json({
    authenticated: true,
    user,
    saves,
  })
})

app.post('/api/auth/signup', signUpRateLimit, async (req, res) => {
  const username = normalizeUsername(req.body?.username)
  const password = req.body?.password

  if (!validateUsername(username)) {
    res.status(400).json({
      error: 'Choose a username with 3-24 letters, numbers, dashes, or underscores.',
    })
    return
  }

  if (!validatePassword(password)) {
    res.status(400).json({
      error: 'Choose a password with at least 8 characters and no more than 72 bytes.',
    })
    return
  }

  if (findUserByUsername.get(username)) {
    res.status(409).json({ error: 'That username is already taken.' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const insertResult = createUser.run({
    username,
    passwordHash,
  })

  await regenerateSession(req)
  req.session.userId = Number(insertResult.lastInsertRowid)

  res.status(201).json({
    ok: true,
    user: {
      id: Number(insertResult.lastInsertRowid),
      username,
    },
  })
})

app.post('/api/auth/login', loginRateLimit, async (req, res) => {
  const username = normalizeUsername(req.body?.username)
  const password = req.body?.password

  if (!username || typeof password !== 'string') {
    res.status(400).json({ error: 'Enter your username and password.' })
    return
  }

  const user = findUserByUsername.get(username)

  if (!user) {
    res.status(401).json({ error: 'Invalid username or password.' })
    return
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash)

  if (!passwordMatches) {
    res.status(401).json({ error: 'Invalid username or password.' })
    return
  }

  await regenerateSession(req)
  req.session.userId = user.id

  res.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
    },
  })
})

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('lgfr.sid')
    res.json({ ok: true })
  })
})

app.get('/api/saves', requireAuth, (req, res) => {
  const saves = listAccessibleSaves
    .all({ userId: req.currentUser.id })
    .map(buildSaveSummary)

  res.json({ saves })
})

app.post('/api/saves', requireAuth, (req, res) => {
  const name =
    typeof req.body?.name === 'string' && req.body.name.trim()
      ? req.body.name.trim().slice(0, 80)
      : 'My Kanto Tracker'
  const initialState = sanitizeTrackerState(req.body?.initialState ?? defaultTrackerState)
  const saveId = createSaveForUser(req.currentUser.id, name, initialState)
  const save = getAccessibleSaveOrNull(req.currentUser.id, saveId)

  res.status(201).json({
    ok: true,
    save: buildSaveSummary(save),
  })
})

app.post('/api/saves/migrate-local', requireAuth, (req, res) => {
  const existingSaves = listAccessibleSaves.all({ userId: req.currentUser.id })

  if (existingSaves.length > 0) {
    res.status(409).json({
      error: 'This account already has cloud saves, so local progress cannot be migrated automatically.',
    })
    return
  }

  const state = sanitizeTrackerState(req.body?.state)
  const saveId = createSaveForUser(req.currentUser.id, 'My Kanto Tracker', state)
  const save = getAccessibleSaveOrNull(req.currentUser.id, saveId)

  res.status(201).json({
    ok: true,
    save: buildSaveSummary(save),
  })
})

app.post('/api/saves/join', requireAuth, joinSaveRateLimit, (req, res) => {
  const shareCode = String(req.body?.shareCode || '').trim()

  if (!shareCode) {
    res.status(400).json({ error: 'Enter a share code.' })
    return
  }

  const save = findSaveByShareCodeHash.get(hashShareCode(shareCode))

  if (!save) {
    res.status(404).json({ error: 'That share code is invalid.' })
    return
  }

  if (save.ownerUserId === req.currentUser.id) {
    res.json({ ok: true, joined: false, saveId: save.id })
    return
  }

  insertMembership.run({
    saveId: save.id,
    userId: req.currentUser.id,
  })
  touchSave.run(save.id)

  res.json({ ok: true, joined: true, saveId: save.id })
})

app.get('/api/saves/:saveId', requireAuth, (req, res) => {
  const saveId = Number(req.params.saveId)
  const save = getAccessibleSaveOrNull(req.currentUser.id, saveId)

  if (!save) {
    res.status(404).json({ error: 'Save not found.' })
    return
  }

  const stateRow = findSaveState.get(saveId)
  const collaborators =
    save.role === 'owner'
      ? listCollaborators.all(saveId).map((user) => ({
          id: user.id,
          username: user.username,
        }))
      : []

  res.json({
    save: {
      ...buildSaveSummary(save),
      canManage: save.role === 'owner',
    },
    collaborators,
    state: serializeTrackerStateForClient(
      stateRow ? parseStoredTrackerState(stateRow.stateJson) : defaultTrackerState,
    ),
  })
})

app.get('/api/saves/:saveId/meta', requireAuth, (req, res) => {
  const saveId = Number(req.params.saveId)
  const save = getAccessibleSaveOrNull(req.currentUser.id, saveId)

  if (!save) {
    res.status(404).json({ error: 'Save not found.' })
    return
  }

  const collaborators =
    save.role === 'owner'
      ? listCollaborators.all(saveId).map((user) => ({
          id: user.id,
          username: user.username,
        }))
      : []

  res.json({
    save: {
      ...buildSaveSummary(save),
      canManage: save.role === 'owner',
    },
    collaborators,
  })
})

app.put('/api/saves/:saveId/state', requireAuth, (req, res) => {
  const saveId = Number(req.params.saveId)
  const save = getAccessibleSaveOrNull(req.currentUser.id, saveId)

  if (!save) {
    res.status(404).json({ error: 'Save not found.' })
    return
  }

  const state = sanitizeTrackerState(req.body?.state)

  updateSaveState.run({
    saveId,
    stateJson: JSON.stringify(state),
    updatedByUserId: req.currentUser.id,
  })
  touchSave.run(saveId)
  const refreshedSave = getAccessibleSaveOrNull(req.currentUser.id, saveId)

  res.json({
    ok: true,
    save: {
      ...buildSaveSummary(refreshedSave),
      canManage: refreshedSave.role === 'owner',
    },
    state: serializeTrackerStateForClient(state),
  })
})

app.patch('/api/saves/:saveId/state', requireAuth, (req, res) => {
  const saveId = Number(req.params.saveId)
  const save = getAccessibleSaveOrNull(req.currentUser.id, saveId)

  if (!save) {
    res.status(404).json({ error: 'Save not found.' })
    return
  }

  const stateRow = findSaveState.get(saveId)
  const currentState = stateRow
    ? parseStoredTrackerState(stateRow.stateJson)
    : defaultTrackerState
  const patch = sanitizeTrackerPatch(req.body?.patch, currentState.ownedGames)
  const nextState = mergeTrackerPatch(currentState, patch)

  updateSaveState.run({
    saveId,
    stateJson: JSON.stringify(nextState),
    updatedByUserId: req.currentUser.id,
  })
  touchSave.run(saveId)
  const refreshedSave = getAccessibleSaveOrNull(req.currentUser.id, saveId)

  res.json({
    ok: true,
    save: {
      ...buildSaveSummary(refreshedSave),
      canManage: refreshedSave.role === 'owner',
    },
    state: serializeTrackerStateForClient(nextState),
  })
})

app.post('/api/saves/:saveId/share-code', requireAuth, (req, res) => {
  const saveId = Number(req.params.saveId)
  const ownedSave = findOwnedSave.get(saveId)

  if (!ownedSave || ownedSave.ownerUserId !== req.currentUser.id) {
    res.status(404).json({ error: 'Save not found.' })
    return
  }

  const shareCode = generateShareCode()

  updateSaveShareCode.run({
    saveId,
    shareCodeHash: hashShareCode(shareCode),
  })

  res.json({
    ok: true,
    shareCode,
  })
})

app.delete('/api/saves/:saveId/collaborators/:userId', requireAuth, (req, res) => {
  const saveId = Number(req.params.saveId)
  const collaboratorUserId = Number(req.params.userId)
  const ownedSave = findOwnedSave.get(saveId)

  if (!ownedSave || ownedSave.ownerUserId !== req.currentUser.id) {
    res.status(404).json({ error: 'Save not found.' })
    return
  }

  if (collaboratorUserId === req.currentUser.id) {
    res.status(400).json({ error: 'The owner cannot remove themselves.' })
    return
  }

  deleteCollaborator.run({
    saveId,
    userId: collaboratorUserId,
  })
  updateSaveShareCode.run({
    saveId,
    shareCodeHash: null,
  })

  res.json({ ok: true })
})

if (fs.existsSync(distDir)) {
  app.use(
    '/assets',
    express.static(path.join(distDir, 'assets'), {
      immutable: true,
      maxAge: '1y',
    }),
  )

  app.use(
    express.static(distDir, {
      index: false,
      maxAge: 0,
    }),
  )

  app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'), {
      cacheControl: false,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  })
}

app.listen(port, () => {
  console.log(`SQLite API listening on http://localhost:${port}`)
})
