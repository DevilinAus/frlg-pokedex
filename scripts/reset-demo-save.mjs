import path from 'node:path'

import Database from 'better-sqlite3'

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'lgfr.sqlite')
const db = new Database(dbPath)

const getUserByUsername = db.prepare(`
  SELECT id, username
  FROM users
  WHERE username = ?
`)
const getDemoSave = db.prepare(`
  SELECT id
  FROM saves
  WHERE owner_user_id = ?
    AND name = 'Local Demo Linked Run'
`)
const insertSave = db.prepare(`
  INSERT INTO saves (name, owner_user_id, share_code_hash, updated_at)
  VALUES ('Local Demo Linked Run', ?, NULL, CURRENT_TIMESTAMP)
`)
const upsertSaveState = db.prepare(`
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
const clearCollaborators = db.prepare(`
  DELETE FROM save_memberships
  WHERE save_id = ?
`)
const ensureCollaborator = db.prepare(`
  INSERT OR IGNORE INTO save_memberships (save_id, user_id, role)
  VALUES (?, ?, 'collaborator')
`)

const demoState = {
  ownedGames: 'leaf-green',
  trackerLayout: 'dual',
  onboardingComplete: true,
  tradeMode: false,
  showSecondaryProgress: true,
  unlockAll: false,
  primaryGame: '',
  switchEventUnlocks: false,
  fireRedBaseGameComplete: false,
  leafGreenBaseGameComplete: false,
  fireRedStarter: 'charmander',
  leafGreenStarter: 'bulbasaur',
  fireRedFossil: '',
  leafGreenFossil: '',
  fireRedEeveelution: '',
  leafGreenEeveelution: '',
  fireRedHitmon: '',
  leafGreenHitmon: '',
  ownedHeldTradeItems: {},
  checkboxState: {
    'fire-red-004': true,
    'fire-red-125': true,
    'leaf-green-001': true,
    'leaf-green-126': true,
  },
  celebrationState: {
    fireRedCompleteCelebrated: false,
    leafGreenCompleteCelebrated: false,
  },
}

const leafDemoUser = getUserByUsername.get('leaf_demo')
const fireDemoUser = getUserByUsername.get('fire_demo')

if (!leafDemoUser || !fireDemoUser) {
  throw new Error('Expected demo users leaf_demo and fire_demo to exist before resetting the demo save.')
}

const result = db.transaction(() => {
  let demoSave = getDemoSave.get(leafDemoUser.id)

  if (!demoSave) {
    const insertResult = insertSave.run(leafDemoUser.id)
    demoSave = { id: Number(insertResult.lastInsertRowid) }
  }

  upsertSaveState.run({
    saveId: demoSave.id,
    stateJson: JSON.stringify(demoState),
    updatedByUserId: leafDemoUser.id,
  })
  clearCollaborators.run(demoSave.id)
  ensureCollaborator.run(demoSave.id, fireDemoUser.id)
  touchSave.run(demoSave.id)

  return demoSave.id
})()

console.log(`Reset Local Demo Linked Run in ${dbPath} (save ${result}).`)
