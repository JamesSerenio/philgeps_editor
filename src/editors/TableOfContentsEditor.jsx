import { createInitialContentsState } from '../lib/tableOfContents'

export default function TableOfContentsEditor({
  value,
  onChange,
  onSave,
  saveStatus,
}) {
  const currentValue = value ?? createInitialContentsState()

  function update(next) {
    onChange?.(next)
  }

  function updateRow(id, patch) {
    update({
      ...currentValue,
      rows: currentValue.rows.map((row) =>
        row.id === id
          ? {
              ...row,
              ...patch,
            }
          : row,
      ),
    })
  }

  function clearPageNumbers() {
    update({
      ...currentValue,
      rows: currentValue.rows.map((row) => ({
        ...row,
        page: '',
      })),
    })
  }

  return (
    <div className="toc-editor">
      <div className="editor-section-heading">
        <div>
          <h3>Table of Contents</h3>

          <p>
            Select which documents are included and enter their page
            numbers.
          </p>
        </div>

        {saveStatus && (
          <span className="editor-save-status">
            {saveStatus === 'Saved'
              ? 'Saved automatically'
              : saveStatus}
          </span>
        )}
      </div>

      <div className="toc-editor-actions">
        <button
          type="button"
          className="button-secondary"
          onClick={clearPageNumbers}
        >
          Clear Page Numbers
        </button>
      </div>

      <div className="toc-table">
        <div className="toc-table-header">
          <span>Include</span>
          <span>Document</span>
          <span>Page</span>
        </div>

        {currentValue.rows.map((row) => (
          <div
            className="toc-table-row"
            key={row.id}
          >
            <label className="toc-checkbox">
              <input
                type="checkbox"
                checked={row.included}
                onChange={(event) =>
                  updateRow(row.id, {
                    included: event.target.checked,
                  })
                }
              />
            </label>

            <div className="toc-document-name">
              {row.title}
            </div>

            <input
              type="text"
              inputMode="numeric"
              value={row.page}
              disabled={!row.included}
              placeholder="Page"
              onChange={(event) =>
                updateRow(row.id, {
                  page: event.target.value.replace(
                    /[^0-9-]/g,
                    '',
                  ),
                })
              }
            />
          </div>
        ))}
      </div>

      <div className="editor-actions">
        <button
          type="button"
          onClick={() => onSave?.(currentValue)}
        >
          Save Table of Contents
        </button>
      </div>
    </div>
  )
}