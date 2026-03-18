import {
  eeveelutionOptions,
  fossilOptions,
  hitmonOptions,
  starterOptions,
} from '../lib/pokedexOptions'

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
  eeveelution,
  setEeveelution,
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
        label="Eeveelution"
        value={eeveelution}
        onChange={setEeveelution}
        options={eeveelutionOptions}
        className={`starter-select choice-select-${eeveelution}`}
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
    fireRedStarter,
    setFireRedStarter,
    fireRedFossil,
    setFireRedFossil,
    fireRedEeveelution,
    setFireRedEeveelution,
    fireRedHitmon,
    setFireRedHitmon,
    leafGreenStarter,
    setLeafGreenStarter,
    leafGreenFossil,
    setLeafGreenFossil,
    leafGreenEeveelution,
    setLeafGreenEeveelution,
    leafGreenHitmon,
    setLeafGreenHitmon,
  } = props

  return (
    <details className="choice-panel" open>
      <summary>
        <span className="choice-panel-heading">
          <span className="choice-panel-title">Pokedex Decisions</span>
        </span>
        <span className="choice-panel-arrow" aria-hidden="true">
          ▾
        </span>
      </summary>

      <div className="choice-panel-body">
        <p className="choice-panel-open-note">One-off choices for each version</p>

        <div className="choice-panel-grid">
          <VersionChoiceCard
            title="Fire Red"
            starter={fireRedStarter}
            setStarter={setFireRedStarter}
            fossil={fireRedFossil}
            setFossil={setFireRedFossil}
            eeveelution={fireRedEeveelution}
            setEeveelution={setFireRedEeveelution}
            hitmon={fireRedHitmon}
            setHitmon={setFireRedHitmon}
          />

          <VersionChoiceCard
            title="Leaf Green"
            starter={leafGreenStarter}
            setStarter={setLeafGreenStarter}
            fossil={leafGreenFossil}
            setFossil={setLeafGreenFossil}
            eeveelution={leafGreenEeveelution}
            setEeveelution={setLeafGreenEeveelution}
            hitmon={leafGreenHitmon}
            setHitmon={setLeafGreenHitmon}
          />
        </div>
      </div>
    </details>
  )
}

export default ChoicePanel
