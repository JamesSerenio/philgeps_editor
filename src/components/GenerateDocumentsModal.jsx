
import { useEffect, useRef, useState } from 'react'
import '../styles/generate-documents.css'

const ui = {
  dialog: {
    width: 'min(1120px, 96vw)',
    height: 'min(94vh, 920px)',
    maxWidth: 'none',
    maxHeight: 'none',
    padding: 0,
    border: '1px solid #cbd5e1',
    borderRadius: 16,
    overflow: 'hidden',
    color: '#172033',
    background: '#fff',
    boxShadow: '0 22px 70px #0005'
  },
  shell: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    fontFamily: 'inherit'
  },
  header: {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    borderBottom: '1px solid #e2e8f0'
  },
  title: {
    margin: 0,
    fontSize: 21,
    color: '#0f172a'
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 12,
    color: '#64748b'
  },
  toolbar: {
    padding: '12px 20px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    borderBottom: '1px solid #e2e8f0'
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 9,
    background: '#fff',
    color: '#0f172a',
    fontSize: 13
  },
  button: {
    padding: '10px 16px',
    border: '1px solid #cbd5e1',
    borderRadius: 9,
    cursor: 'pointer',
    fontWeight: 700,
    background: '#fff',
    color: '#0f172a'
  },
  primary: {
    padding: '10px 16px',
    border: '1px solid #1d4ed8',
    borderRadius: 9,
    cursor: 'pointer',
    fontWeight: 700,
    background: '#1d4ed8',
    color: '#fff'
  },
  download: {
    padding: '10px 16px',
    border: '1px solid #047857',
    borderRadius: 9,
    cursor: 'pointer',
    fontWeight: 700,
    background: '#047857',
    color: '#fff'
  },
  preview: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    background: '#e2e8f0'
  },
  blank: {
    flex: 1,
    minHeight: 0,
    display: 'grid',
    placeContent: 'center',
    textAlign: 'center',
    padding: 24,
    color: '#475569'
  },
  documentHeader: {
    background: '#fff',
    borderBottom: '1px solid #cbd5e1',
    padding: '10px 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    fontSize: 12
  },
  progress: {
    padding: '8px 20px',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontSize: 12
  },
  error: {
    padding: '12px 20px',
    background: '#fef2f2',
    color: '#b91c1c',
    margin: 0,
    fontSize: 13
  },
  foot: {
    borderTop: '1px solid #e2e8f0',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
    fontSize: 12,
    background: '#fff',
    color: '#64748b'
  }
}

function WordPreview({ blob, url }) {
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const container = containerRef.current
    let cancelled = false

    if (!container) return undefined

    async function render() {
      setLoading(true)
      setError('')
      container.replaceChildren()

      try {
        const { renderAsync } = await import('docx-preview')

        const source = blob instanceof Blob
          ? blob
          : await fetch(url, {
              cache: 'no-store'
            }).then((response) => {
              if (!response.ok) {
                throw new Error(
                  'Unable to load DOCX file.'
                )
              }

              return response.blob()
            })

        if (cancelled) return

        await renderAsync(
          source,
          container,
          container,
          {
            inWrapper: true,
            breakPages: true,
            renderHeaders: true,
            renderFooters: true,
            renderFootnotes: true,
            renderEndnotes: true,
            ignoreWidth: false,
            ignoreHeight: false,
            useBase64URL: true
          }
        )
      } catch (e) {
        if (!cancelled) {
          setError(
            e?.message ||
            'Word preview failed.'
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void render()

    return () => {
      cancelled = true
      container.replaceChildren()
    }
  }, [blob, url])

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        minHeight: 0,
        padding: '16px 6px'
      }}
    >
      <p
        style={{
          margin: '0 0 12px',
          padding: '0 16px',
          fontSize: 12,
          color: '#475569'
        }}
      >
        Word preview is approximate.
        For the exact final formatting,
        open the downloaded DOCX in Microsoft Word.
      </p>

      {loading && (
        <p
          role="status"
          style={{ textAlign: 'center' }}
        >
          Rendering Word pages...
        </p>
      )}

      {error && (
        <p
          role="alert"
          style={{
            color: '#b91c1c',
            padding: 16
          }}
        >
          {error}
          {' '}
          You can still download the DOCX.
        </p>
      )}

      <div
        ref={containerRef}
        className="bid-word-preview"
      />
    </div>
  )
}

export default function GenerateDocumentsModal({
  busy = false,
  progress = {},
  error = '',
  result = null,
  onGenerate,
  onClose
}) {
  const dialogRef = useRef(null)
  const [format, setFormat] = useState('pdf')

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement

    if (dialog && !dialog.open) {
      dialog.showModal()
    }

    return () => {
      if (dialog?.open) {
        dialog.close()
      }

      if (previousFocus?.isConnected) {
        previousFocus.focus?.({
          preventScroll: true
        })
      }
    }
  }, [])

  const ready = Boolean(
    result?.url &&
    result?.filename &&
    result?.format === format
  )

  const count = Number(
    progress?.completed
  ) || 0

  const total = Number(
    progress?.total
  ) || 0

  function download() {
    if (!ready || busy) return

    const link = document.createElement('a')

    // Same generated file as preview.
    link.href = result.url
    link.download = result.filename

    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <dialog
      ref={dialogRef}
      style={ui.dialog}
      aria-labelledby="bid-export-title"
      onCancel={(event) => {
        event.preventDefault()

        if (!busy) {
          onClose?.()
        }
      }}
    >
      <div style={ui.shell}>
        <header style={ui.header}>
          <div>
            <h2
              id="bid-export-title"
              style={ui.title}
            >
              Preview &amp; Download Bid Documents
            </h2>

            <p style={ui.subtitle}>
              Generate first, review the latest
              PDF or Word file, then download.
            </p>
          </div>

          <button
            type="button"
            style={ui.button}
            disabled={busy}
            onClick={onClose}
            aria-label="Close preview"
          >
            Close
          </button>
        </header>

        <div style={ui.toolbar}>
          <label
            htmlFor="bid-export-format"
            style={{
              fontSize: 13,
              fontWeight: 700
            }}
          >
            Format:
          </label>

          <select
            id="bid-export-format"
            value={format}
            onChange={(event) => {
              setFormat(event.target.value)
            }}
            disabled={busy}
            style={ui.select}
          >
            <option value="pdf">
              PDF (fixed layout)
            </option>

            <option value="docx">
              Word / DOCX (editable)
            </option>
          </select>

          <button
            type="button"
            style={ui.primary}
            disabled={busy}
            onClick={() => onGenerate(format)}
          >
            {busy
              ? 'Generating...'
              : ready
                ? 'Regenerate Preview'
                : 'Generate Preview'}
          </button>

          <button
            type="button"
            style={{
              ...ui.download,
              opacity: ready && !busy ? 1 : 0.5
            }}
            disabled={!ready || busy}
            onClick={download}
          >
            Download {format === 'pdf' ? 'PDF' : 'Word'}
          </button>
        </div>

        {busy && (
          <div
            role="status"
            style={ui.progress}
          >
            <div>
              {progress?.message ||
                'Preparing document...'}
            </div>

            {total > 0 && (
              <progress
                style={{ width: '100%' }}
                value={count}
                max={total}
              />
            )}
          </div>
        )}

        {error && (
          <p role="alert" style={ui.error}>
            {error}
          </p>
        )}

        <section
          style={ui.preview}
          aria-label="Generated file preview"
        >
          {ready && !busy ? (
            <>
              <div style={ui.documentHeader}>
                <span
                  style={{
                    fontWeight: 700,
                    overflowWrap: 'anywhere'
                  }}
                >
                  {result.filename}
                </span>

                {format === 'pdf' && (
                  <button
                    type="button"
                    style={ui.button}
                    onClick={() => {
                      window.open(
                        result.url,
                        '_blank',
                        'noopener,noreferrer'
                      )
                    }}
                  >
                    Open PDF in new tab
                  </button>
                )}
              </div>

              {format === 'pdf' ? (
                <iframe
                  title="Actual generated PDF preview"
                  src={result.url}
                  style={{
                    width: '100%',
                    height: '100%',
                    flex: 1,
                    border: 0,
                    background: '#fff',
                    minHeight: 0
                  }}
                />
              ) : (
                <WordPreview
                  key={result.url}
                  blob={result.blob}
                  url={result.url}
                />
              )}
            </>
          ) : (
            <div style={ui.blank}>
              <strong
                style={{
                  fontSize: 18,
                  marginBottom: 7
                }}
              >
                {busy
                  ? 'Generating your documents...'
                  : 'No document preview yet'}
              </strong>

              <span>
                {busy
                  ? 'Please wait for the package to finish.'
                  : 'Select PDF or Word and click Generate Preview.'}
              </span>
            </div>
          )}
        </section>

        <footer style={ui.foot}>
          <span>
            Preview first • Download the same generated file
          </span>

          <button
            type="button"
            style={{
              ...ui.download,
              opacity: ready && !busy ? 1 : 0.5
            }}
            disabled={!ready || busy}
            onClick={download}
          >
            Download {format === 'pdf' ? 'PDF' : 'Word'}
          </button>
        </footer>
      </div>
    </dialog>
  )
}
