import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProjectById } from '../services/projectService'
import { getDocumentPreview } from '../services/pdfService'
import { projectDocuments } from '../lib/projectDocuments'
import { getDeadline, formatDateTime } from '../lib/projectFormatters'
import ProjectSidebar from '../components/ProjectSidebar'
import PdfPreview from '../components/PdfPreview'

export default function ProjectEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [activeDocument, setActiveDocument] = useState('bidSecurity')
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadProject() {
      setLoading(true)
      setError('')

      try {
        const { data, error } = await getProjectById(id)

        if (error) throw error

        if (!cancelled) {
          setProject(data)
        }
      } catch (err) {
        console.error(err)

        if (!cancelled) {
          setError(
            err.message || 'Failed to load project'
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProject()

    return () => {
      cancelled = true
    }
  }, [id])

  const document = projectDocuments.find((item) => item.id === activeDocument)
  const { src, isReference } = getDocumentPreview(activeDocument)

  if (loading) {
    return (
      <div className="editor-page">
        Loading project...
      </div>
    )
  }

  if (error) {
    return (
      <div className="editor-page">
        <button onClick={() => navigate('/')}>
          ← Back
        </button>

        <p className="error" role="alert">
          {error}
        </p>
      </div>
    )
  }

  const projectTitle =
    project?.title ||
    project?.project_title ||
    project?.projectTitle ||
    'Untitled Project'

  const referenceNumber =
    project?.reference_number ||
    project?.reference_no ||
    project?.referenceNumber ||
    '—'

  const procuringEntity =
    project?.procuring_entity ||
    project?.entity ||
    '—'

  return (
    <div className="editor-page">
      <header className="editor-topbar">
        <button className="button-secondary back-button" onClick={() => navigate('/')}>← Back</button>
        <div className="editor-heading"><span className="eyebrow">Bid document editor</span><h1>{projectTitle}</h1><p>Reference No. {referenceNumber}</p></div>
        <span className="badge">Bidding Doc</span>
      </header>
      <div className="editor-layout">
        <ProjectSidebar activeDocument={activeDocument} onSelectDocument={setActiveDocument}>
          <section className="project-summary">
            <h2 className="eyebrow">Project information</h2>
            <label htmlFor="project-title">Project Title</label><textarea id="project-title" value={projectTitle} readOnly rows={3} />
            <label htmlFor="project-reference">Reference Number</label><input id="project-reference" value={referenceNumber} readOnly />
            <label htmlFor="project-entity">Procuring Entity</label><textarea id="project-entity" value={procuringEntity} readOnly rows={2} />
            <label htmlFor="project-abc">ABC</label><input id="project-abc" value={project?.abc || project?.ebc || ''} readOnly />
            <label htmlFor="project-deadline">Deadline</label><input id="project-deadline" value={formatDateTime(getDeadline(project), 'No deadline')} readOnly />
          </section>
        </ProjectSidebar>
        <main className="editor-workspace preview-workspace">
          <div className="workspace-heading"><span>Project documents <span aria-hidden="true">/</span> <strong>{document.title}</strong></span><span className="draft-label">Preview only</span></div>
          <section className="document-card preview-document-card" aria-labelledby="document-title">
            <header className="document-header">
              <div><span className="eyebrow">Bidding documents</span><h2 id="document-title">{document.title}</h2><p>{projectTitle}</p><p className="reference">Reference No. {referenceNumber}</p></div>
            </header>
            {src && <p className="pdf-preview-notice">{isReference ? 'Visual reference only. This PDF is not a final document or a generation template.' : 'Template preview only. Project information has not been applied to this PDF.'}</p>}
            <PdfPreview src={src} title={document.title} />
          </section>
        </main>
      </div>
    </div>
  )
}

