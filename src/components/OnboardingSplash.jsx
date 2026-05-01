import { useEffect, useRef, useState } from 'react'

const versionLabels = {
  'fire-red': 'Fire Red',
  'leaf-green': 'Leaf Green',
}

const ownedGameChoices = [
  {
    value: 'fire-red',
    title: 'Fire Red',
    tone: 'red',
  },
  {
    value: 'leaf-green',
    title: 'Leaf Green',
    tone: 'green',
  },
  {
    value: 'both',
    title: 'Both Versions',
    tone: 'neutral',
  },
]

const starterChoices = [
  {
    value: 'bulbasaur',
    title: 'Bulbasaur',
    tone: 'green',
  },
  {
    value: 'charmander',
    title: 'Charmander',
    tone: 'red',
  },
  {
    value: 'squirtle',
    title: 'Squirtle',
    tone: 'blue',
  },
]

const switchReleaseChoices = [
  {
    value: false,
    title: 'Game Boy Advance',
    tone: 'plain',
  },
  {
    value: true,
    title: 'Switch',
    tone: 'switch',
  },
]

const primaryGameChoices = [
  {
    value: 'fire-red',
    title: 'Fire Red',
    tone: 'red',
  },
  {
    value: 'leaf-green',
    title: 'Leaf Green',
    tone: 'green',
  },
]

function getJourneyChoices(ownedGames) {
  if (ownedGames === 'both') {
    return [
      {
        value: 'one-dex',
        title: 'One Pokedex',
        tone: 'red',
      },
      {
        value: 'two-dexes',
        title: 'Both Pokedexes',
        tone: 'green',
      },
    ]
  }

  const versionTone = ownedGames === 'leaf-green' ? 'green' : 'red'

  return [
    {
      value: 'single-save',
      title: 'Solo Run',
      tone: versionTone,
    },
    {
      value: 'duo',
      title: 'With a Friend',
      tone: 'neutral',
    },
  ]
}

function needsPrimaryGameStep(draft) {
  return draft.ownedGames === 'both' && draft.journey === 'one-dex'
}

function needsFriendCodeStep(draft) {
  return draft.journey === 'duo'
}

function needsDualStarterSelection(draft) {
  return draft.ownedGames === 'both' && draft.journey === 'two-dexes'
}

function getStarterTargets(draft) {
  if (needsDualStarterSelection(draft)) {
    return ['fire-red', 'leaf-green']
  }

  if (draft.ownedGames === 'both') {
    return draft.primaryGame ? [draft.primaryGame] : []
  }

  return draft.ownedGames ? [draft.ownedGames] : []
}

function getStarterStepCopy(draft) {
  if (needsDualStarterSelection(draft)) {
    return {
      title: 'Choose your starters',
      body: 'Pick one for each version. We’ll mark them as caught and use them for starter-based Pokedex decisions.',
    }
  }

  return {
    title: 'Choose your starter',
    body: 'We’ll mark it as caught and use it for starter-based Pokedex decisions.',
  }
}

function validateAuthCredentials(username, password) {
  const trimmedUsername = username.trim().toLowerCase()
  const passwordBytes = new TextEncoder().encode(password).length

  if (!/^[a-z0-9_-]{3,24}$/.test(trimmedUsername)) {
    return 'Use 3-24 lowercase letters, numbers, dashes, or underscores for your username.'
  }

  if (password.length < 8) {
    return 'Use a password with at least 8 characters.'
  }

  if (passwordBytes > 72) {
    return 'Use a password that is no more than 72 bytes.'
  }

  return ''
}

function mapDraftToSetup(draft) {
  const starterSetup = {
    fireRedStarter: draft.fireRedStarter ?? '',
    leafGreenStarter: draft.leafGreenStarter ?? '',
  }

  if (draft.ownedGames === 'both') {
    return {
      ownedGames: draft.ownedGames,
      trackerLayout: 'dual',
      tradeMode: draft.journey === 'one-dex',
      showSecondaryProgress: true,
      primaryGame: draft.journey === 'one-dex' ? draft.primaryGame : '',
      switchEventUnlocks: draft.switchEventUnlocks,
      ...starterSetup,
    }
  }

  return {
    ownedGames: draft.ownedGames,
    trackerLayout: draft.journey === 'duo' ? 'dual' : 'single',
    tradeMode: false,
    showSecondaryProgress: draft.journey === 'duo',
    primaryGame: '',
    switchEventUnlocks: draft.switchEventUnlocks,
    ...starterSetup,
  }
}

function ChoiceCard({ option, isSelected, onSelect }) {
  return (
    <button
      type="button"
      className={`onboarding-choice onboarding-choice-tone-${option.tone ?? 'neutral'} ${
        option.description ? 'onboarding-choice-detailed' : ''
      } ${isSelected ? 'onboarding-choice-selected' : ''}`.trim()}
      onClick={() => onSelect(option.value)}
    >
      <span className="onboarding-choice-title">{option.title}</span>
      {option.description ? (
        <span className="onboarding-choice-description">{option.description}</span>
      ) : null}
    </button>
  )
}

function OnboardingSplash({
  authError = '',
  authNotice = '',
  canClose = false,
  currentUser = null,
  joinSharedSave,
  logIn,
  mode = 'guest',
  onClose,
  onComplete,
  signUp,
}) {
  const stepAdvanceTimeout = useRef(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [authMode, setAuthMode] = useState('login')
  const [authPassword, setAuthPassword] = useState('')
  const [authUsername, setAuthUsername] = useState('')
  const [friendCodeNeedsAuth, setFriendCodeNeedsAuth] = useState(false)
  const [friendCodeInput, setFriendCodeInput] = useState('')
  const [friendCodeError, setFriendCodeError] = useState('')
  const [friendCodeSuccess, setFriendCodeSuccess] = useState('')
  const [localAuthError, setLocalAuthError] = useState('')
  const [isJoiningFriendSave, setIsJoiningFriendSave] = useState(false)
  const [pendingJoinAfterAuth, setPendingJoinAfterAuth] = useState(false)
  const [joinedSharedSave, setJoinedSharedSave] = useState(false)
  const [draft, setDraft] = useState(() => ({
    ownedGames: null,
    journey: null,
    primaryGame: null,
    switchEventUnlocks: null,
    fireRedStarter: null,
    leafGreenStarter: null,
  }))
  const canJoinSharedSave = mode === 'cloud' && Boolean(currentUser)

  useEffect(
    () => () => {
      window.clearTimeout(stepAdvanceTimeout.current)
    },
    [],
  )

  const journeyChoices = getJourneyChoices(draft.ownedGames)
  const shouldOfferFriendCodeStep = needsFriendCodeStep(draft)
  const starterStepCopy = getStarterStepCopy(draft)
  const starterTargets = getStarterTargets(draft)
  const singleStarterTarget = starterTargets[0] ?? 'fire-red'
  function advanceAfterFriendCodeJoin(nextMessage) {
    window.clearTimeout(stepAdvanceTimeout.current)
    setFriendCodeSuccess(nextMessage)
    setJoinedSharedSave(true)
    stepAdvanceTimeout.current = window.setTimeout(() => {
      setFriendCodeSuccess('')
      setFriendCodeError('')
      setFriendCodeNeedsAuth(false)
      setPendingJoinAfterAuth(false)
      setStepIndex((currentStepValue) => currentStepValue + 1)
    }, 900)
  }

  const steps = [
    {
      id: 'game',
      title: 'Which game are you playing?',
      body: 'Pick a game to get started. You can change this anytime.',
    },
    {
      id: 'journey',
      title:
        draft.ownedGames === 'both'
          ? 'How should this tracker treat both versions?'
          : 'How are you playing?',
      body:
        draft.ownedGames === 'both'
          ? 'Choose whether you are racing toward one combined dex or completing both save files properly.'
          : 'Solo, or with a friend you can trade with in person?',
    },
    ...(shouldOfferFriendCodeStep
      ? [
          {
            id: 'friend-code',
            title: 'Have a friend link code?',
            body: 'Join their shared save now, or continue setup and connect later.',
          },
        ]
      : []),
    ...(needsPrimaryGameStep(draft)
      ? [
          {
            id: 'primary-game',
            title: 'Which game is your main save?',
            body:
              'We’ll use this later to keep trade suggestions focused on the file you are actually trying to 100%.',
          },
        ]
      : []),
    ...(joinedSharedSave
      ? []
      : [
          {
            id: 'switch-release',
            title: 'Which release are you playing?',
            body: 'This affects if certain Pokemon are unlocked during your run.',
          },
        ]),
    {
      id: 'starter',
      title: starterStepCopy.title,
      body: starterStepCopy.body,
    },
  ]

  const currentStep = steps[stepIndex]

  function handleOwnedGamesSelect(nextValue) {
    window.clearTimeout(stepAdvanceTimeout.current)
    setFriendCodeNeedsAuth(false)
    setFriendCodeInput('')
    setFriendCodeError('')
    setFriendCodeSuccess('')
    setLocalAuthError('')
    setPendingJoinAfterAuth(false)
    setJoinedSharedSave(false)
    setDraft(() => ({
      ownedGames: nextValue,
      journey: null,
      primaryGame: null,
      switchEventUnlocks: null,
      fireRedStarter: null,
      leafGreenStarter: null,
    }))
    stepAdvanceTimeout.current = window.setTimeout(() => {
      setStepIndex(1)
    }, 120)
  }

  function handleJourneySelect(nextValue) {
    window.clearTimeout(stepAdvanceTimeout.current)
    setFriendCodeNeedsAuth(false)
    setFriendCodeInput('')
    setFriendCodeError('')
    setFriendCodeSuccess('')
    setLocalAuthError('')
    setPendingJoinAfterAuth(false)
    setJoinedSharedSave(false)
    setDraft((currentDraft) => ({
      ...currentDraft,
      journey: nextValue,
      primaryGame: null,
      switchEventUnlocks: null,
      fireRedStarter: null,
      leafGreenStarter: null,
    }))
    stepAdvanceTimeout.current = window.setTimeout(() => {
      setStepIndex(2)
    }, 120)
  }

  function handlePrimaryGameSelect(nextValue) {
    window.clearTimeout(stepAdvanceTimeout.current)
    setDraft((currentDraft) => ({
      ...currentDraft,
      primaryGame: nextValue,
      fireRedStarter: null,
      leafGreenStarter: null,
    }))
    stepAdvanceTimeout.current = window.setTimeout(() => {
      setStepIndex(3)
    }, 120)
  }

  function handleSwitchReleaseSelect(nextValue) {
    window.clearTimeout(stepAdvanceTimeout.current)
    setDraft((currentDraft) => ({
      ...currentDraft,
      switchEventUnlocks: nextValue,
    }))
    stepAdvanceTimeout.current = window.setTimeout(() => {
      setStepIndex((currentStepValue) => currentStepValue + 1)
    }, 120)
  }

  function handleStarterSelect(versionKey, nextValue) {
    window.clearTimeout(stepAdvanceTimeout.current)

    const starterKey = versionKey === 'leaf-green' ? 'leafGreenStarter' : 'fireRedStarter'
    const nextDraft = {
      ...draft,
      [starterKey]: nextValue,
    }

    setDraft(nextDraft)

    const starterTargets = getStarterTargets(nextDraft)
    const allTargetsSelected = starterTargets.every((targetVersionKey) =>
      Boolean(
        nextDraft[
          targetVersionKey === 'leaf-green' ? 'leafGreenStarter' : 'fireRedStarter'
        ],
      ),
    )

    if (allTargetsSelected) {
      onComplete(mapDraftToSetup(nextDraft))
    }
  }

  async function handleFriendCodeSubmit(event) {
    event.preventDefault()

    const shareCode = friendCodeInput.trim()

    if (!shareCode) {
      setFriendCodeError('Enter a friend code, or skip this step for now.')
      return
    }

    if (!joinSharedSave) {
      setFriendCodeError('Friend linking is not available right now.')
      return
    }

    setIsJoiningFriendSave(true)
    setFriendCodeError('')

    if (!canJoinSharedSave) {
      setIsJoiningFriendSave(false)
      setFriendCodeNeedsAuth(true)
      return
    }

    setFriendCodeNeedsAuth(false)
    setPendingJoinAfterAuth(false)

    const result = await joinSharedSave(shareCode)

    setIsJoiningFriendSave(false)

    if (!result?.ok) {
      setFriendCodeError(result?.error || 'Could not join that save.')
      return
    }

    setFriendCodeError('')
    setFriendCodeNeedsAuth(false)
    setPendingJoinAfterAuth(false)
    advanceAfterFriendCodeJoin('Joined successfully. Continue setup.')
  }

  function handleFriendCodeSkip() {
    setFriendCodeError('')
    setFriendCodeSuccess('')
    setLocalAuthError('')
    setFriendCodeNeedsAuth(false)
    setPendingJoinAfterAuth(false)
    setStepIndex((currentStepValue) => currentStepValue + 1)
  }

  async function handleFriendCodeAuthSubmit(nextAuthMode) {
    const validationError = validateAuthCredentials(authUsername, authPassword)

    if (validationError) {
      setLocalAuthError(validationError)
      return
    }

    setLocalAuthError('')
    setPendingJoinAfterAuth(true)
    setAuthMode(nextAuthMode)

    if (nextAuthMode === 'signup') {
      await signUp?.(authUsername, authPassword)
      return
    }

    await logIn?.(authUsername, authPassword)
  }

  useEffect(() => {
    const shareCode = friendCodeInput.trim()

    if (!pendingJoinAfterAuth || !shareCode || !canJoinSharedSave || isJoiningFriendSave) {
      return
    }

    void (async () => {
      setFriendCodeNeedsAuth(false)
      setFriendCodeError('')
      setIsJoiningFriendSave(true)
      const result = await joinSharedSave?.(shareCode)
      setIsJoiningFriendSave(false)
      setPendingJoinAfterAuth(false)

      if (!result?.ok) {
        setFriendCodeError(result?.error || 'Could not join that save.')
        return
      }

      setFriendCodeError('')
      setFriendCodeNeedsAuth(false)
      setPendingJoinAfterAuth(false)
      advanceAfterFriendCodeJoin('Joined successfully. Continue setup.')
    })()
  }, [
    canJoinSharedSave,
    currentUser,
    friendCodeInput,
    isJoiningFriendSave,
    joinSharedSave,
    pendingJoinAfterAuth,
  ])

  return (
    <div className="onboarding-shell" role="dialog" aria-modal="true" aria-labelledby="setup-title">
      <div className="onboarding-backdrop" aria-hidden="true" />

      <section className="onboarding-panel">
        <div className="onboarding-topbar">
          <p className="onboarding-step">
            Step {stepIndex + 1} of {steps.length}
          </p>

          {canClose ? (
            <button
              type="button"
              className="onboarding-close"
              aria-label="Close setup"
              onClick={onClose}
            >
              Close
            </button>
          ) : null}
        </div>

        <header className="onboarding-header">
          <h2 id="setup-title">{currentStep.title}</h2>
          <p className="onboarding-copy">{currentStep.body}</p>
        </header>

        <div key={currentStep.id} className="onboarding-stage">
          {currentStep.id === 'game' ? (
            <div className="onboarding-choice-grid">
              {ownedGameChoices.map((option) => (
                <ChoiceCard
                  key={option.value}
                  option={option}
                  isSelected={draft.ownedGames === option.value}
                  onSelect={handleOwnedGamesSelect}
                />
              ))}
            </div>
          ) : null}

          {currentStep.id === 'journey' ? (
            <div className="onboarding-choice-grid onboarding-choice-grid-compact">
              {journeyChoices.map((option) => (
                <ChoiceCard
                  key={option.value}
                  option={option}
                  isSelected={draft.journey === option.value}
                  onSelect={handleJourneySelect}
                />
              ))}
            </div>
          ) : null}

          {currentStep.id === 'switch-release' ? (
            <div className="onboarding-choice-grid onboarding-choice-grid-compact">
              {switchReleaseChoices.map((option) => (
                <ChoiceCard
                  key={String(option.value)}
                  option={option}
                  isSelected={draft.switchEventUnlocks === option.value}
                  onSelect={handleSwitchReleaseSelect}
                />
              ))}
            </div>
          ) : null}

          {currentStep.id === 'starter' ? (
            needsDualStarterSelection(draft) ? (
              <div className="onboarding-choice-groups">
                {starterTargets.map((versionKey) => {
                  const starterValue =
                    versionKey === 'leaf-green'
                      ? draft.leafGreenStarter
                      : draft.fireRedStarter

                  return (
                    <section key={versionKey} className="onboarding-choice-group">
                      <h3 className="onboarding-choice-group-title">
                        {versionLabels[versionKey]}
                      </h3>

                      <div className="onboarding-choice-grid">
                        {starterChoices.map((option) => (
                          <ChoiceCard
                            key={`${versionKey}-${option.value}`}
                            option={option}
                            isSelected={starterValue === option.value}
                            onSelect={(nextValue) => handleStarterSelect(versionKey, nextValue)}
                          />
                        ))}
                      </div>
                    </section>
                  )
                })}
              </div>
            ) : (
              <div className="onboarding-choice-grid">
                {starterChoices.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    option={option}
                    isSelected={
                      draft[singleStarterTarget === 'leaf-green' ? 'leafGreenStarter' : 'fireRedStarter'] ===
                      option.value
                    }
                    onSelect={(nextValue) => handleStarterSelect(singleStarterTarget, nextValue)}
                  />
                ))}
              </div>
            )
          ) : null}

          {currentStep.id === 'friend-code' ? (
            <div className="onboarding-link-panel">
              <form className="onboarding-link-form" onSubmit={handleFriendCodeSubmit}>
                <input
                  type="text"
                  className="onboarding-link-input"
                  value={friendCodeInput}
                  onChange={(event) => setFriendCodeInput(event.target.value)}
                  placeholder="Enter friend code"
                  autoComplete="off"
                  disabled={isJoiningFriendSave}
                />
                <button type="submit" disabled={isJoiningFriendSave}>
                  {isJoiningFriendSave ? 'Joining...' : 'Join save'}
                </button>
              </form>

              <div className="onboarding-link-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleFriendCodeSkip}
                  disabled={isJoiningFriendSave}
                >
                  Skip for now
                </button>
              </div>

              <p className="onboarding-link-note">
                Use this if your friend has already shared their tracker with you.
              </p>

              {friendCodeError ? <p className="account-error">{friendCodeError}</p> : null}
              {friendCodeSuccess ? <p className="account-success">{friendCodeSuccess}</p> : null}

              {friendCodeNeedsAuth ? (
                <div className="onboarding-auth-panel">
                  <p className="onboarding-link-note">
                    You need an account to join a shared save. Log in, sign up, or do this later.
                  </p>

                  <form
                    className="account-form onboarding-auth-form"
                    onSubmit={(event) => event.preventDefault()}
                  >
                    <input
                      type="text"
                      value={authUsername}
                      onChange={(event) => setAuthUsername(event.target.value)}
                      placeholder="username"
                      autoComplete="username"
                      disabled={isJoiningFriendSave}
                    />
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(event) => setAuthPassword(event.target.value)}
                      placeholder="password"
                      autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                      disabled={isJoiningFriendSave}
                    />
                    <div className="account-form-actions">
                      <button
                        type="button"
                        onClick={() => handleFriendCodeAuthSubmit('login')}
                        disabled={isJoiningFriendSave}
                      >
                        Log In
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleFriendCodeAuthSubmit('signup')}
                        disabled={isJoiningFriendSave}
                      >
                        Sign Up
                      </button>
                    </div>
                    {authNotice ? <p className="account-success">{authNotice}</p> : null}
                    {localAuthError ? <p className="account-error">{localAuthError}</p> : null}
                    {authError ? <p className="account-error">{authError}</p> : null}
                  </form>
                </div>
              ) : null}
            </div>
          ) : null}

          {currentStep.id === 'primary-game' ? (
            <div className="onboarding-choice-grid onboarding-choice-grid-compact">
              {primaryGameChoices.map((option) => (
                <ChoiceCard
                  key={option.value}
                  option={option}
                  isSelected={draft.primaryGame === option.value}
                  onSelect={handlePrimaryGameSelect}
                />
              ))}
            </div>
          ) : null}
        </div>

        {stepIndex > 0 ? (
          <footer className="onboarding-footer">
            <div className="onboarding-actions">
              <button
                type="button"
                className="secondary-button onboarding-back"
                onClick={() => setStepIndex((currentStepValue) => currentStepValue - 1)}
              >
                Back
              </button>
            </div>
          </footer>
        ) : null}
      </section>
    </div>
  )
}

export default OnboardingSplash
