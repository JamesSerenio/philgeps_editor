
export default function BidSecurityEditor({
  value = {},
  onChange,
  onSave,
  saveStatus,
}) {
  const templateVariant =
    value?.templateVariant === 'with_table'
      ? 'with_table'
      : 'without_table'

  function handleTemplateChange(event) {
    onChange?.({
      ...value,
      templateVariant: event.target.value,
    })
  }

  function handleSave() {
    onSave?.({
      ...value,
      templateVariant,
    })
  }

  const statusText =
    saveStatus === 'Saved' || saveStatus === 'saved'
      ? 'Saved automatically'
      : saveStatus === 'Saving...' || saveStatus === 'saving'
        ? 'Saving...'
        : saveStatus === 'Error saving' || saveStatus === 'error'
          ? 'Error saving'
          : 'Changes save automatically'

  return (
    <div className="bid-security-editor">
      <section className="editor-section">
        <label>
          <strong>Template Variant</strong>

          <select
            aria-label="Bid Security Template"
            value={templateVariant}
            onChange={handleTemplateChange}
          >
            <option value="with_table">
              With Table
            </option>

            <option value="without_table">
              Without Table
            </option>
          </select>
        </label>
      </section>

      <div className="editor-save-row">
        <button type="button" onClick={handleSave}>
          Save
        </button>

        <span
          className={
            saveStatus === 'Error saving' ||
            saveStatus === 'error'
              ? 'save-error'
              : ''
          }
          role="status"
        >
          {statusText}
        </span>
      </div>
    </div>
  )
}
