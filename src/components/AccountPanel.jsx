import { useState } from 'react'

function GuestAuthForm({ authError, authNotice, logIn, signUp }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')

  function validate() {
    const trimmedUsername = username.trim().toLowerCase()

    if (!/^[a-z0-9_-]{3,24}$/.test(trimmedUsername)) {
      setLocalError(
        'Use 3-24 lowercase letters, numbers, dashes, or underscores for your username.',
      )
      return false
    }

    if (password.length < 8) {
      setLocalError('Use a password with at least 8 characters.')
      return false
    }

    setLocalError('')
    return true
  }

  return (
    <form className="account-form" onSubmit={(event) => event.preventDefault()}>
      <input
        type="text"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        placeholder="username"
        autoComplete="username"
      />
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="password"
        autoComplete="current-password"
      />
      <div className="account-form-actions">
        <button
          type="button"
          onClick={() => {
            if (validate()) {
              logIn(username, password)
            }
          }}
        >
          Log In
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            if (validate()) {
              signUp(username, password)
            }
          }}
        >
          Sign Up
        </button>
      </div>
      {authNotice ? <p className="account-success">{authNotice}</p> : null}
      {localError ? <p className="account-error">{localError}</p> : null}
      {authError ? <p className="account-error">{authError}</p> : null}
    </form>
  )
}

function CloudSaveTools({
  accessibleSaves,
  activeSaveId,
  switchActiveSave,
  logOut,
  joinSharedSave,
  shareError,
  generatedShareCode,
  generateShareCodeForActiveSave,
  activeSave,
  collaborators,
  removeCollaboratorFromActiveSave,
}) {
  const [shareCodeInput, setShareCodeInput] = useState('')

  async function handleJoin(event) {
    event.preventDefault()
    await joinSharedSave(shareCodeInput)
    setShareCodeInput('')
  }

  return (
    <div className="cloud-tools">
      <div className="cloud-toolbar">
        <label className="cloud-select">
          <span>Cloud save</span>
          <select
            value={activeSaveId ?? ''}
            onChange={(event) => switchActiveSave(Number(event.target.value))}
          >
            {accessibleSaves.map((save) => (
              <option key={save.id} value={save.id}>
                {save.name} {save.role === 'owner' ? '(Owner)' : '(Shared)'}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="secondary-button" onClick={logOut}>
          Log Out
        </button>
      </div>

      <form className="join-save-form" onSubmit={handleJoin}>
        <input
          type="text"
          value={shareCodeInput}
          onChange={(event) => setShareCodeInput(event.target.value)}
          placeholder="Enter share code"
        />
        <button type="submit" className="secondary-button">
          Join Save
        </button>
      </form>

      {activeSave?.canManage ? (
        <div className="share-panel">
          <div className="share-panel-header">
            <div>
              <h3>Share This Save</h3>
              <p>
                Generate a code, then have another logged-in user join it. Making
                a new code replaces the previous one, and removing a collaborator
                invalidates the current code.
              </p>
            </div>
            <button type="button" onClick={generateShareCodeForActiveSave}>
              Generate Code
            </button>
          </div>

          {generatedShareCode ? (
            <p className="share-code">Share code: {generatedShareCode}</p>
          ) : null}

          {collaborators.length > 0 ? (
            <ul className="collaborator-list">
              {collaborators.map((collaborator) => (
                <li key={collaborator.id}>
                  <span>{collaborator.username}</span>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => removeCollaboratorFromActiveSave(collaborator.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="share-empty">No collaborators yet.</p>
          )}
        </div>
      ) : activeSave ? (
        <p className="share-empty">
          Shared by {activeSave.ownerUsername}. Only the owner can manage collaborators.
        </p>
      ) : null}

      {shareError ? <p className="account-error">{shareError}</p> : null}
    </div>
  )
}

function AccountPanel(props) {
  const {
    className = '',
    mode,
    currentUser,
    activeSave,
    accessibleSaves,
    activeSaveId,
    authError,
    authNotice,
    shareError,
    collaborators,
    generatedShareCode,
    logIn,
    signUp,
    logOut,
    switchActiveSave,
    joinSharedSave,
    generateShareCodeForActiveSave,
    removeCollaboratorFromActiveSave,
  } = props

  return (
    <section className={`account-panel ${className}`.trim()}>
      <div className="account-panel-header">
        <div>
          <h2>
            {mode === 'loading'
              ? 'Checking your session'
              : mode === 'guest'
                ? 'Use it now, sign in later'
                : currentUser?.username}
          </h2>
        </div>

        <p className="account-panel-copy">
          {mode === 'loading'
            ? 'Loading your current account and save state.'
            : mode === 'guest'
            ? 'Guest progress stays on this browser only until you log in.'
            : `Editing ${activeSave?.name ?? 'your tracker'} with cloud saves and collaboration.`}
        </p>
      </div>

      {mode === 'loading' ? null : mode === 'guest' ? (
        <GuestAuthForm
          authError={authError}
          authNotice={authNotice}
          logIn={logIn}
          signUp={signUp}
        />
      ) : (
        <>
          {authNotice ? <p className="account-success">{authNotice}</p> : null}
          <CloudSaveTools
            accessibleSaves={accessibleSaves}
            activeSaveId={activeSaveId}
            switchActiveSave={switchActiveSave}
            logOut={logOut}
            joinSharedSave={joinSharedSave}
            shareError={shareError}
            generatedShareCode={generatedShareCode}
            generateShareCodeForActiveSave={generateShareCodeForActiveSave}
            activeSave={activeSave}
            collaborators={collaborators}
            removeCollaboratorFromActiveSave={removeCollaboratorFromActiveSave}
          />
        </>
      )}
    </section>
  )
}

export default AccountPanel
