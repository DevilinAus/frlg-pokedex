import fs from 'node:fs'
import path from 'node:path'

import Database from 'better-sqlite3'
import express from 'express'

const app = express()
const port = 3001
const dataDir = path.join(process.cwd(), 'data')
const dbPath = path.join(dataDir, 'lgfr.sqlite')

fs.mkdirSync(dataDir, { recursive: true })

const db = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`)

const defaultState = {
  tradeMode: false,
  fireRedStarter: 'charmander',
  leafGreenStarter: 'bulbasaur',
  fireRedFossil: 'omanyte',
  leafGreenFossil: 'kabuto',
  fireRedEeveelution: 'vaporeon',
  leafGreenEeveelution: 'jolteon',
  fireRedHitmon: 'hitmonlee',
  leafGreenHitmon: 'hitmonchan',
  checkboxState: {},
  celebrationState: {
    fireRedCompleteCelebrated: false,
    leafGreenCompleteCelebrated: false,
  },
}

const getState = db.prepare('SELECT value FROM app_state WHERE key = ?')
const saveState = db.prepare(`
  INSERT INTO app_state (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`)

if (!getState.get('pokedex')) {
  saveState.run('pokedex', JSON.stringify(defaultState))
}

app.use(express.json())

app.get('/api/state', (_req, res) => {
  const row = getState.get('pokedex')
  res.json(row ? JSON.parse(row.value) : defaultState)
})

app.put('/api/state', (req, res) => {
  const nextState = {
    tradeMode: Boolean(req.body?.tradeMode),
    fireRedStarter:
      typeof req.body?.fireRedStarter === 'string'
        ? req.body.fireRedStarter
        : defaultState.fireRedStarter,
    leafGreenStarter:
      typeof req.body?.leafGreenStarter === 'string'
        ? req.body.leafGreenStarter
        : defaultState.leafGreenStarter,
    fireRedFossil:
      typeof req.body?.fireRedFossil === 'string'
        ? req.body.fireRedFossil
        : defaultState.fireRedFossil,
    leafGreenFossil:
      typeof req.body?.leafGreenFossil === 'string'
        ? req.body.leafGreenFossil
        : defaultState.leafGreenFossil,
    fireRedEeveelution:
      typeof req.body?.fireRedEeveelution === 'string'
        ? req.body.fireRedEeveelution
        : defaultState.fireRedEeveelution,
    leafGreenEeveelution:
      typeof req.body?.leafGreenEeveelution === 'string'
        ? req.body.leafGreenEeveelution
        : defaultState.leafGreenEeveelution,
    fireRedHitmon:
      typeof req.body?.fireRedHitmon === 'string'
        ? req.body.fireRedHitmon
        : defaultState.fireRedHitmon,
    leafGreenHitmon:
      typeof req.body?.leafGreenHitmon === 'string'
        ? req.body.leafGreenHitmon
        : defaultState.leafGreenHitmon,
    checkboxState:
      req.body?.checkboxState &&
      typeof req.body.checkboxState === 'object' &&
      !Array.isArray(req.body.checkboxState)
        ? req.body.checkboxState
        : {},
    celebrationState:
      req.body?.celebrationState &&
      typeof req.body.celebrationState === 'object' &&
      !Array.isArray(req.body.celebrationState)
        ? {
            fireRedCompleteCelebrated: Boolean(
              req.body.celebrationState.fireRedCompleteCelebrated,
            ),
            leafGreenCompleteCelebrated: Boolean(
              req.body.celebrationState.leafGreenCompleteCelebrated,
            ),
          }
        : defaultState.celebrationState,
  }

  saveState.run('pokedex', JSON.stringify(nextState))
  res.json({ ok: true })
})

app.listen(port, () => {
  console.log(`SQLite API listening on http://localhost:${port}`)
})
