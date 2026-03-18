# Kanto Pokedex

A shared FireRed and LeafGreen Pokedex tracker built with React, Vite, Express, and SQLite.

This project is designed for:
- one person tracking both versions
- two people collaborating on the same save
- quick guest usage with no login required

## What It Does

- Tracks all 151 Kanto Pokemon
- Supports separate FireRed and LeafGreen progress
- Stores guest progress locally in the browser
- Supports accounts, cloud saves, and shared collaboration
- Lets one user invite another user onto the same tracker
- Includes sprites, comments, and game-specific decision logic

## Tech Stack

- React
- Vite
- Express
- SQLite
- `better-sqlite3`
- `express-session`

## Project Structure

Key folders and files:

- [src/App.jsx](/Users/andrew/Documents/projects/lgfr/src/App.jsx): main page layout
- [src/App.css](/Users/andrew/Documents/projects/lgfr/src/App.css): app styling
- [src/components](/Users/andrew/Documents/projects/lgfr/src/components): UI pieces like rows, panels, and overlays
- [src/hooks/usePokedexState.js](/Users/andrew/Documents/projects/lgfr/src/hooks/usePokedexState.js): main app state, cloud save logic, auth state, and sync behavior
- [src/lib](/Users/andrew/Documents/projects/lgfr/src/lib): helper logic and shared data utilities
- [public/pokemon-sprites](/Users/andrew/Documents/projects/lgfr/public/pokemon-sprites): Pokemon sprite images
- [server.js](/Users/andrew/Documents/projects/lgfr/server.js): Express API, auth, sessions, SQLite, and collaboration routes
- [data](/Users/andrew/Documents/projects/lgfr/data): local SQLite database files

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy the example env file:

```bash
cp .env.example .env
```

Then edit `.env` and set a real session secret:

```env
PORT=3001
SESSION_SECRET=replace-with-a-long-random-secret
DATABASE_PATH=data/lgfr.sqlite
```

### 3. Start the app in development

```bash
npm run dev
```

Open:

```bash
http://127.0.0.1:5173
```

In development:
- frontend runs on `5173`
- backend API runs on `3001`

### 4. Build for production

```bash
npm run build
```

### 5. Run the production server

```bash
npm start
```

## Authentication And Saves

The app supports both guest mode and cloud mode.

### Guest mode

- Works immediately with no account
- Saves progress to browser localStorage

### Cloud mode

- Requires signup or login
- Uses SQLite on the server
- Supports shared saves and collaborators

### Save model

Important concept:

- a user account is not the same thing as a save
- saves belong to a project/tracker
- users can own a save or collaborate on one

That means:
- one user can own a tracker
- another user can join that same tracker
- both can work on the same saved progress

## Collaboration

Current collaboration flow:

1. User A signs up or logs in
2. User A creates or opens a cloud save
3. User A generates a share code
4. User B signs up or logs in
5. User B joins using the share code
6. Both users can edit the same tracker

The app currently uses a polling-based sync model for shared updates rather than full realtime sockets.

## Scripts

- `npm run dev`: start frontend and backend in development
- `npm run dev:client`: start the Vite frontend only
- `npm run dev:server`: start the Express backend only
- `npm run build`: create a production frontend build
- `npm start`: run the backend and serve the built frontend
- `npm run lint`: run ESLint

## GitHub And Local Files

The following are intentionally ignored and should not be committed:

- `node_modules`
- `dist`
- `.env`
- SQLite database files in `data/`

The repo includes [`.env.example`](/Users/andrew/Documents/projects/lgfr/.env.example) as the safe template for local setup.

## Notes

- SQLite is fine for this hobby project and small shared usage
- session cookies are server-side and do not use localStorage auth tokens
- the database file is local by default unless you point `DATABASE_PATH` somewhere else

## Future Improvements

Good next improvements for the project:

- stronger conflict handling for simultaneous edits
- more reliable cloud save flush on page refresh/navigation
- better collaborator management UI
- further polish for mobile and tablet layouts
