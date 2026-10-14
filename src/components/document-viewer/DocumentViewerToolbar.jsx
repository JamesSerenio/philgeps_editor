import { useState } from 'react'

export default function DocumentViewerToolbar({
  pagination,
  zoomControls,
  fullscreen,
  onFullscreen,
  onDownload,
  downloadDisabled,
}) {
  const [draft, setDraft] = useState(null)
  const commit = () => {
    if (draft !== null && draft !== '') pagination.jump(draft)
    setDraft(null)
  }
  return (
    <div
      className="document-viewer-toolbar"
      aria-label="Document viewer controls"
    >
      {pagination && (
        <div className="document-viewer-group">
          <span>Pages</span>
          <button
            aria-label="Previous page"
            disabled={pagination.page <= 1 || !pagination.total}
            onClick={() => pagination.jump(pagination.page - 1)}
          >
            Prev
          </button>
          <label className="document-viewer-page">
            <input
              aria-label="Current page"
              type="number"
              min="1"
              max={pagination.total || 1}
              disabled={!pagination.total}
              value={draft ?? pagination.page}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commit()
                  e.currentTarget.blur()
                }
              }}
            />
            <span>/ {pagination.total}</span>
          </label>
          <button
            aria-label="Next page"
            disabled={pagination.page >= pagination.total || !pagination.total}
            onClick={() => pagination.jump(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
      {zoomControls && (
        <div className="document-viewer-group">
          <button
            aria-label="Zoom out Word preview"
            disabled={zoomControls.zoom <= 0.5}
            onClick={() => zoomControls.applyZoom(zoomControls.zoom - 0.1)}
          >
            -
          </button>
          <span className="document-viewer-percentage">
            {Math.round(zoomControls.zoom * 100)}%
          </span>
          <button
            aria-label="Zoom in Word preview"
            disabled={zoomControls.zoom >= 2}
            onClick={() => zoomControls.applyZoom(zoomControls.zoom + 0.1)}
          >
            +
          </button>
          <button onClick={zoomControls.fit}>Fit Width</button>
          <button onClick={() => zoomControls.applyZoom(1)}>Reset Zoom</button>
        </div>
      )}
      <div className="document-viewer-group document-viewer-end">
        <button
          onClick={onFullscreen}
          aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d={
                fullscreen
                  ? 'M9 3v6H3m12-6v6h6M9 21v-6H3m12 6v-6h6'
                  : 'M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6'
              }
            />
          </svg>
          {fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
        <button disabled={downloadDisabled} onClick={onDownload}>
          Download
        </button>
      </div>
    </div>
  )
}
