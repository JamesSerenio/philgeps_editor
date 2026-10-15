import { useCallback, useEffect, useRef, useState } from 'react'
import DashboardIcon from './DashboardIcon'
import DocumentPreview from './DocumentPreview'
import '../styles/generate-documents.css'

export default function GenerateDocumentsModal({
  busy = false,
  progress = {},
  error = '',
  results = {},
  contentKey,
  onGenerate,
  onClose,
}) {
  const dialogRef = useRef(null)
  const [format, setFormat] = useState('pdf')
  const [downloadedUrl, setDownloadedUrl] = useState(null)
  const [attemptedFormat, setAttemptedFormat] = useState(null)
  const [previewStatuses, setPreviewStatuses] = useState({})
  const onPreviewStatus = useCallback(
    (url, status) =>
      setPreviewStatuses((previous) => ({ ...previous, [url]: status })),
    [],
  )
  useEffect(() => {
    const dialog = dialogRef.current,
      previous = document.activeElement
    if (!dialog.open) dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
      if (previous?.isConnected) previous.focus?.({ preventScroll: true })
    }
  }, [])
  const file = results[format]
  const ready = !!(file?.url && file?.filename && file.format === format)
  const rendered = ready && previewStatuses[file.url] === 'ready'
  const failed = ready && previewStatuses[file.url] === 'error'
  const canDownload = ready && (rendered || failed)
  const rendering = ready && !rendered && !failed
  const outdated = ready && file.contentKey !== contentKey
  const completed = Math.max(
    0,
    Math.min(Number(progress.completed) || 0, Number(progress.total) || 22),
  )
  function download() {
    if (!canDownload || busy || outdated) return
    const link = document.createElement('a')
    link.href = file.url
    link.download = file.filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    setDownloadedUrl(file.url)
  }
  return (
    <dialog
      ref={dialogRef}
      className="bid-export-dialog"
      aria-labelledby="bid-export-title"
      aria-describedby="bid-export-description"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose?.()
      }}
    >
      <div className="bid-export-shell">
        <header className="bid-export-header">
          <span className="bid-export-brand">
            <DashboardIcon name="document" />
          </span>
          <div className="bid-export-heading">
            <h2 id="bid-export-title">Generate Bid Documents</h2>
            <p id="bid-export-description">
              Preview your complete bid package before downloading.
            </p>
          </div>
          <span className="bid-export-count">22 Documents</span>
          <button
            type="button"
            className="bid-export-close-icon"
            aria-label="Close preview"
            disabled={busy}
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M6 18 18 6" />
            </svg>
          </button>
        </header>
        <div className="bid-export-controls">
          <fieldset className="bid-export-formats" disabled={busy}>
            <legend className="sr-only">Document format</legend>
            {[
              [
                'pdf',
                'PDF Document',
                'Print-ready with original document formatting.',
              ],
              [
                'docx',
                'Microsoft Word',
                'Editable document with formatted text and tables.',
              ],
            ].map(([value, title, description]) => (
              <label
                key={value}
                className={
                  'bid-export-format' + (format === value ? ' is-selected' : '')
                }
              >
                <span
                  className={'bid-export-format-icon is-' + value}
                  aria-hidden="true"
                >
                  {value === 'pdf' ? 'PDF' : 'W'}
                </span>
                <span className="bid-export-format-copy">
                  <strong>
                    {title}
                    <small>.{value}</small>
                  </strong>
                  <span>{description}</span>
                </span>
                <input
                  type="radio"
                  name="bid-export-format"
                  value={value}
                  checked={format === value}
                  onChange={() => setFormat(value)}
                />
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            className="bid-export-primary bid-export-generate"
            disabled={busy || rendering}
            aria-busy={busy || rendering}
            onClick={() => {
              setAttemptedFormat(format)
              onGenerate(format)
            }}
          >
            {busy ? (
              <span className="bid-export-spinner" />
            ) : (
              <DashboardIcon name="document" />
            )}
            {busy
              ? 'Generating preview...'
              : rendering
                ? 'Rendering preview...'
                : ready
                  ? 'Regenerate Preview'
                  : 'Generate Preview'}
          </button>
        </div>
        {busy && (
          <div className="bid-export-progress" role="status" aria-live="polite">
            <div>
              <span>{progress.message || 'Saving pending changes...'}</span>
              {progress.total > 0 && (
                <strong>
                  {completed} / {progress.total} sections
                </strong>
              )}
            </div>
            <progress
              aria-label="Document preparation"
              value={progress.total ? completed : undefined}
              max={progress.total || 22}
            />
          </div>
        )}
        {error && (!attemptedFormat || attemptedFormat === format) && (
          <p className="bid-export-error" role="alert">
            {error}
          </p>
        )}
        <div className="bid-export-preview-deck">
          {['pdf', 'docx'].map((value) => (
            <div
              key={value}
              className="bid-export-preview-panel"
              hidden={format !== value}
              inert={format !== value}
            >
              <DocumentPreview
                key={results[value]?.url || 'empty'}
                file={results[value] || null}
                format={value}
                busy={busy && format === value}
                outdated={
                  !!results[value] && results[value].contentKey !== contentKey
                }
                onStatus={onPreviewStatus}
                onDownload={download}
                downloadDisabled={
                  busy ||
                  !results[value] ||
                  results[value].contentKey !== contentKey ||
                  !['ready', 'error'].includes(
                    previewStatuses[results[value]?.url],
                  )
                }
              />
            </div>
          ))}
        </div>
        <footer className="bid-export-footer">
          <p role="status">
            <span
              className={'bid-export-status-dot' + (ready ? ' is-ready' : '')}
            />
            {busy
              ? 'Preparing your preview...'
              : outdated
                ? 'Preview may be outdated'
                : downloadedUrl === file?.url && ready
                  ? 'Download started'
                  : rendered
                    ? 'Ready to download'
                    : failed
                      ? 'Preview unavailable; file ready'
                      : ready
                        ? 'Rendering preview...'
                        : 'Generate a preview to continue.'}
          </p>
          <div>
            <button
              type="button"
              className="bid-export-secondary"
              disabled={busy}
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="bid-export-primary"
              disabled={!canDownload || busy || outdated}
              onClick={download}
            >
              <DashboardIcon name="download" />
              Download {format === 'pdf' ? 'PDF' : 'Word'}
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  )
}
