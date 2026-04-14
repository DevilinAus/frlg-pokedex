import { useEffect, useId, useRef, useState } from 'react'

import {
  fossilOptions,
  hitmonOptions,
  starterOptions,
} from '../lib/pokedexOptions'

function InfoPopover({ label, children }) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)
  const buttonRef = useRef(null)
  const popoverRef = useRef(null)
  const popoverId = useId()

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      const clickedButton = buttonRef.current?.contains(event.target)
      const clickedPopover = popoverRef.current?.contains(event.target)

      if (!clickedButton && !clickedPopover) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <span
      ref={wrapperRef}
      className="choice-panel-info"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        ref={buttonRef}
        type="button"
        className="choice-panel-info-button"
        aria-label={label}
        aria-describedby={isOpen ? popoverId : undefined}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((currentState) => !currentState)}
        onFocus={() => setIsOpen(true)}
        onBlur={(event) => {
          if (!wrapperRef.current?.contains(event.relatedTarget)) {
            setIsOpen(false)
          }
        }}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <circle cx="10" cy="10" r="8.25" fill="none" />
          <path d="M10 8.2v4.4" />
          <circle cx="10" cy="5.8" r="0.7" fill="currentColor" stroke="none" />
        </svg>
      </button>

      {isOpen ? (
        <span
          ref={popoverRef}
          id={popoverId}
          role="tooltip"
          className="choice-panel-info-popover"
        >
          {children}
        </span>
      ) : null}
    </span>
  )
}

function ChoiceSelect({
  label,
  value,
  onChange,
  options,
  className,
  optionClassPrefix,
}) {
  return (
    <label className={className}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className={`${optionClassPrefix}${option.value}`}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function VersionChoiceCard({
  title,
  starter,
  setStarter,
  fossil,
  setFossil,
  hitmon,
  setHitmon,
}) {
  return (
    <section className="choice-card">
      <h2>{title}</h2>

      <ChoiceSelect
        label="Starter"
        value={starter}
        onChange={setStarter}
        options={starterOptions}
        className={`starter-select starter-select-${starter}`}
        optionClassPrefix="starter-option-"
      />

      <ChoiceSelect
        label="Fossil"
        value={fossil}
        onChange={setFossil}
        options={fossilOptions}
        className={`starter-select choice-select-${fossil}`}
        optionClassPrefix="choice-option-"
      />

      <ChoiceSelect
        label="Hitmon"
        value={hitmon}
        onChange={setHitmon}
        options={hitmonOptions}
        className={`starter-select choice-select-${hitmon}`}
        optionClassPrefix="choice-option-"
      />
    </section>
  )
}

function ChoicePanel(props) {
  const {
    ownedGames,
    trackerLayout,
    baseGameComplete,
    setBaseGameComplete,
    fireRedStarter,
    setFireRedStarter,
    fireRedFossil,
    setFireRedFossil,
    fireRedHitmon,
    setFireRedHitmon,
    leafGreenStarter,
    setLeafGreenStarter,
    leafGreenFossil,
    setLeafGreenFossil,
    leafGreenHitmon,
    setLeafGreenHitmon,
  } = props
  const isSingleVersionView = trackerLayout === 'single' && ownedGames !== 'both'

  return (
    <details className="choice-panel">
      <summary>
        <span className="choice-panel-heading">
          <span className="choice-panel-title">Pokedex Decisions</span>
        </span>
        <span className="choice-panel-arrow" aria-hidden="true">
          ▾
        </span>
      </summary>

      <div className="choice-panel-body">
        <p className="choice-panel-open-note">
          {isSingleVersionView
            ? 'One-off choices for your current version'
            : 'One-off choices for each version'}
        </p>

        <div
          className={`choice-panel-grid ${
            isSingleVersionView ? 'choice-panel-grid-single' : ''
          }`.trim()}
        >
          <section className="choice-card choice-card-shared">
            <div className="choice-panel-toggle-grid choice-panel-toggle-grid-single-card">
              <div className="choice-panel-toggle-card">
                <div className="choice-panel-toggle">
                  <div className="choice-panel-toggle-row">
                    <span className="choice-panel-toggle-heading">
                      <span className="choice-panel-toggle-title">Base game complete</span>
                      <InfoPopover label="About base game complete">
                        Shows the post-Elite Four National Dex Pokemon that unlock
                        through the Sevii Islands postgame, breeding, roaming
                        legendaries, and event tickets.
                      </InfoPopover>
                    </span>
                    <label className="choice-panel-toggle-input" htmlFor="base-game-complete">
                      <input
                        id="base-game-complete"
                        type="checkbox"
                        checked={baseGameComplete}
                        onChange={(event) => setBaseGameComplete(event.target.checked)}
                      />
                    </label>
                  </div>
                  <span className="choice-panel-toggle-text">
                    Tick this once you want to track the postgame roster too.
                  </span>
                </div>
              </div>
            </div>
          </section>

          {!isSingleVersionView || ownedGames === 'fire-red' ? (
            <VersionChoiceCard
              title="Fire Red"
              starter={fireRedStarter}
              setStarter={setFireRedStarter}
              fossil={fireRedFossil}
              setFossil={setFireRedFossil}
              hitmon={fireRedHitmon}
              setHitmon={setFireRedHitmon}
            />
          ) : null}

          {!isSingleVersionView || ownedGames === 'leaf-green' ? (
            <VersionChoiceCard
              title="Leaf Green"
              starter={leafGreenStarter}
              setStarter={setLeafGreenStarter}
              fossil={leafGreenFossil}
              setFossil={setLeafGreenFossil}
              hitmon={leafGreenHitmon}
              setHitmon={setLeafGreenHitmon}
            />
          ) : null}
        </div>
      </div>
    </details>
  )
}

export default ChoicePanel
