function MigrationPanel({ keepCloudVersion, replaceCloudWithLocalProgress }) {
  return (
    <section className="migration-panel">
      <div>
        <h2>Guest Progress Found On This Device</h2>
        <p>
          Your account already has cloud save data. Choose whether to keep the
          cloud save or replace the current cloud save with this device&apos;s guest
          progress.
        </p>
      </div>

      <div className="migration-actions">
        <button type="button" className="secondary-button" onClick={keepCloudVersion}>
          Continue With Cloud Data
        </button>
        <button type="button" onClick={replaceCloudWithLocalProgress}>
          Replace Cloud With This Device
        </button>
      </div>
    </section>
  )
}

export default MigrationPanel
