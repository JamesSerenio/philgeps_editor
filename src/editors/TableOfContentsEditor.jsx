export default function TableOfContentsEditor({
  value,
  onChange,
  onSave,
  saveStatus,
  project,
}) {
  const rows = value?.rows ?? []

  function updateRow(id, included) {
    const next = {
      ...value,
      rows: rows.map((row) =>
        row.id === id
          ? {
              ...row,
              included,
            }
          : row,
      ),
    }

    onChange?.(next)
  }

  return (
    <div className="toc-editor">
      <div className="editor-section-heading">
        <div>
          <h3>Table of Contents</h3>
          <p>
            Select the documents to include.
            Project information is filled automatically.
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

      <div
        style={{
          marginBottom: 16,
          padding: 12,
          border: '1px solid #d7e4dc',
          borderRadius: 8,
          background: '#f7fbf8',
        }}
      >
        <strong>Automatic Header</strong>

        <div style={{ marginTop: 8 }}>
          Republic of the Philippines
        </div>

        <div>
          PROVINCE OF{' '}
          {(project?.province || '').toUpperCase()}
        </div>

        <div>
          Municipality of{' '}
          {project?.municipality || ''}
        </div>

        <div style={{ marginTop: 10 }}>
          <strong>Project:</strong>{' '}
          {project?.projectTitle || ''}
        </div>

        <div>
          <strong>Date:</strong>{' '}
          {project?.date || ''}
        </div>

        <div>
          <strong>Name of Bidder:</strong>{' '}
          {project?.bidderName || ''}
        </div>
      </div>

      <div className="toc-table">
        <div
          className="toc-table-header"
          style={{
            gridTemplateColumns: '70px 1fr',
          }}
        >
          <span>Include</span>
          <span>Document</span>
        </div>

        {rows.map((row) => (
          <div
            className="toc-table-row"
            key={row.id}
            style={{
              gridTemplateColumns: '70px 1fr',
            }}
          >
            <label className="toc-checkbox">
              <input
                type="checkbox"
                checked={row.included}
                onChange={(event) =>
                  updateRow(
                    row.id,
                    event.target.checked,
                  )
                }
              />
            </label>

            <div className="toc-document-name">
              {row.title}
            </div>
          </div>
        ))}
      </div>

      <div className="editor-actions">
        <button
          type="button"
          onClick={() => onSave?.(value)}
        >
          Save Table of Contents
        </button>
      </div>
    </div>
  )
}