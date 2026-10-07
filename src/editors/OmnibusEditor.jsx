export default function OmnibusEditor({
  value = {},
  onChange,
  onSave,
  saveStatus,
}) {
  const templateVariant =
    value?.templateVariant === 'initao_lgu'
      ? 'initao_lgu'
      : 'old_default'

  function handleTemplateChange(event) {
    const next = {
      ...value,
      templateVariant: event.target.value,
    }

    onChange?.(next)
  }

  function handleSave() {
    onSave?.({
      ...value,
      templateVariant,
    })
  }

  return (
    <div className="omnibus-editor">
      <div className="editor-section">
        <label>
          <strong>Template Variant</strong>

          <select
            value={templateVariant}
            onChange={handleTemplateChange}
          >
            <option value="old_default">
              OLD / Default
            </option>

            <option value="initao_lgu">
              INITAO LGU
            </option>
          </select>
        </label>
      </div>

      <div className="editor-save-row">
        <button
          type="button"
          onClick={handleSave}
        >
          Save
        </button>

        <span>
          {saveStatus === 'Saving...'
            ? 'Saving...'
            : saveStatus === 'Error saving'
            ? 'Error saving'
            : 'Saved automatically'}
        </span>
      </div>
    </div>
  )
}