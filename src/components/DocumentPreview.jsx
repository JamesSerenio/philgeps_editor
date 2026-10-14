
import { useEffect, useState } from 'react'

export default function DocumentPreview({
  onGenerate,
}) {
  const [format, setFormat] = useState('pdf')
  const [files, setFiles] = useState({
    pdf: null,
    docx: null,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    return () => {
      // URLs are cleaned up by their owning file
      // lifecycle when replaced or unmounted.
    }
  }, [])

  const current = files[format]

  async function generatePreview() {
    setLoading(true)
    setError('')

    try {
      // Generate ONLY selected format.
      const result = await onGenerate(format)

      let blob

      if (result instanceof Blob) {
        blob = result
      } else if (result?.blob instanceof Blob) {
        blob = result.blob
      } else if (typeof result === 'string') {
        const response = await fetch(result)
        if (!response.ok) {
          throw new Error('Cannot load generated file')
        }
        blob = await response.blob()
      } else {
        throw new Error('Invalid generated document')
      }

      const url = URL.createObjectURL(blob)

      setFiles(previous => {
        if (previous[format]?.url) {
          URL.revokeObjectURL(previous[format].url)
        }

        return {
          ...previous,
          [format]: { blob, url },
        }
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function downloadFile() {
    if (!current) return

    // Download EXACT SAME generated file.
    // Do not call onGenerate again.
    const link = document.createElement('a')
    link.href = current.url
    link.download =
      format === 'pdf'
        ? 'BID_DOCUMENTS.pdf'
        : 'BID_DOCUMENTS.docx'

    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div>
      <div>
        <button
          type="button"
          onClick={() => setFormat('pdf')}
        >
          PDF Preview
        </button>

        <button
          type="button"
          onClick={() => setFormat('docx')}
        >
          Word Preview
        </button>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={generatePreview}
      >
        {loading
          ? 'Generating...'
          : 'Generate Preview'}
      </button>

      {error && <p role="alert">{error}</p>}

      {current && format === 'pdf' && (
        <iframe
          title="PDF Preview"
          src={current.url}
          style={{
            width: '100%',
            height: '70vh',
            border: 0,
          }}
        />
      )}

      {current && format === 'docx' && (
        <WordPreview blob={current.blob} />
      )}

      <button
        type="button"
        disabled={!current || loading}
        onClick={downloadFile}
      >
        Download {format === 'pdf' ? 'PDF' : 'Word'}
      </button>
    </div>
  )
}

function WordPreview({ blob }) {
  const [message, setMessage] = useState(
    'Rendering Word preview...'
  )

  useEffect(() => {
    let cancelled = false
    const container = document.getElementById(
      'word-preview-container'
    )

    async function render() {
      try {
        const { renderAsync } =
          await import('docx-preview')

        if (cancelled || !container) return

        container.replaceChildren()

        await renderAsync(blob, container, container, {
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
        })

        if (!cancelled) setMessage('')
      } catch (error) {
        if (!cancelled) setMessage(error.message)
      }
    }

    render()

    return () => {
      cancelled = true
    }
  }, [blob])

  return (
    <div style={{
      height: '70vh',
      overflow: 'auto',
      background: '#e5e7eb',
    }}>
      {message && <p>{message}</p>}
      <div id="word-preview-container" />
    </div>
  )
}
