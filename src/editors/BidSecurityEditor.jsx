
export default function BidSecurityEditor({
  value = {},
  onChange,
  onSave,
  saveStatus,
}) {
  const templateVariant =
    value?.templateVariant === 'initao_lgu'
      ? 'initao_lgu'
      : 'old_default'

  // =============================================
  // TEMPLATE CHANGE
  // =============================================

  function handleTemplateChange(event) {
    const next = {
      ...value,
      templateVariant: event.target.value,
    }

    onChange?.(next)
  }

  // =============================================
  // SAVE
  // =============================================

  function handleSave() {
    onSave?.({
      ...value,
      templateVariant,
    })
  }

  // =============================================
  // SAVE STATUS
  // =============================================

  function getStatusText() {
    if (
      saveStatus === 'Saved' ||
      saveStatus === 'saved'
    ) {
      return 'Saved automatically'
    }

    if (
      saveStatus === 'Saving...' ||
      saveStatus === 'saving'
    ) {
      return 'Saving...'
    }

    if (
      saveStatus === 'Error saving' ||
      saveStatus === 'error'
    ) {
      return 'Error saving'
    }

    return 'Changes save automatically'
  }

  // =============================================
  // UI
  // =============================================

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
            <option value="old_default">
              OLD / Default
            </option>

            <option value="initao_lgu">
              INITAO LGU
            </option>
          </select>
        </label>
      </section>

      <div className="editor-save-row">
        <button
          type="button"
          onClick={handleSave}
        >
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
          {getStatusText()}
        </span>
      </div>
    </div>
  )
}
