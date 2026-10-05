export default function TableOfContentsEditor({
  project,
}) {
  return (
    <div className="toc-editor">
      <div className="editor-section-heading">
        <div>
          <h3>Table of Contents</h3>

          <p>
            Project information is filled automatically.
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: 12,
          border: '1px solid #d7e4dc',
          borderRadius: 8,
          background: '#f7fbf8',
          lineHeight: 1.6,
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
    </div>
  )
}