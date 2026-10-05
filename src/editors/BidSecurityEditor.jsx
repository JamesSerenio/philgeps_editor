import { formatLongDate } from '../lib/documentSetup'

function clean(value) {
  return String(value ?? '').trim()
}

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

  const procuringEntity = clean(value?.procuringEntity)
  const projectTitle = clean(value?.projectTitle)
  const referenceNumber = clean(value?.referenceNumber)
  const bidderName = clean(value?.bidderName)

  const authorizedRepresentative = clean(
    value?.authorizedRepresentative,
  )

  const representativeDesignation = clean(
    value?.representativeDesignation,
  )

  const dateText = formatLongDate(value?.date)

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

  function getStatusText() {
    if (saveStatus === 'Saved') {
      return 'Saved automatically'
    }

    if (saveStatus === 'Saving...') {
      return 'Saving...'
    }

    if (saveStatus === 'Error saving') {
      return 'Error saving'
    }

    return 'Changes save automatically'
  }

  return (
    <div className="bid-security-editor">
      {/* ============================================= */}
      {/* TEMPLATE SELECTOR */}
      {/* ============================================= */}

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

      {/* ============================================= */}
      {/* AUTO-FILLED INFORMATION */}
      {/* No manual inputs here */}
      {/* ============================================= */}

      <section className="editor-section">
        <h3>
          Auto-filled from Document Setup
        </h3>

        <p>
          All Bid Sec information below is taken
          automatically from the Document Setup above.
        </p>

        <div className="auto-filled-summary">
          <p>
            <strong>
              Name of Procuring Entity:
            </strong>{' '}
            {procuringEntity || '—'}
          </p>

          <p>
            <strong>
              Project Title:
            </strong>{' '}
            {projectTitle || '—'}
          </p>

          <p>
            <strong>
              Project Identification No.:
            </strong>{' '}
            {referenceNumber || '—'}
          </p>

          <p>
            <strong>
              To:
            </strong>{' '}
            {procuringEntity || '—'}
          </p>

          <p>
            <strong>
              Duly authorized to sign the Bid for and
              behalf of:
            </strong>{' '}
            {bidderName || '—'}
          </p>

          <p>
            <strong>
              Authorized Representative:
            </strong>{' '}
            {authorizedRepresentative || '—'}
          </p>

          <p>
            <strong>
              Designation:
            </strong>{' '}
            {representativeDesignation || '—'}
          </p>

          <p>
            <strong>
              Date:
            </strong>{' '}
            {dateText || '—'}
          </p>
        </div>
      </section>

      {/* ============================================= */}
      {/* SAVE */}
      {/* ============================================= */}

      <div className="editor-save-row">
        <button
          type="button"
          onClick={handleSave}
        >
          Save
        </button>

        <span
          className={
            saveStatus === 'Error saving'
              ? 'save-error'
              : ''
          }
        >
          {getStatusText()}
        </span>
      </div>
    </div>
  )
}