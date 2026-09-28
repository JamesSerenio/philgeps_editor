import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProjectById } from '../services/projectService'
import { getDocumentPreview } from '../services/pdfService'
import { projectDocuments } from '../lib/projectDocuments'
import { getDeadline, formatDateTime } from '../lib/projectFormatters'
import ProjectSidebar from '../components/ProjectSidebar'
import PdfPreview from '../components/PdfPreview'
import TechnicalSpecsEditor from '../editors/TechnicalSpecsEditor'
import ScheduleEditor from '../editors/ScheduleEditor'
import { createInitialScheduleItems } from '../lib/scheduleRequirements'
import { createTechnicalItem } from '../lib/technicalSpecs'
import useEditorPersistence from '../hooks/useEditorPersistence'
import { pdfTemplates } from '../lib/pdfTemplates'

export default function ProjectEditorPage() {
  const { id } = useParams()
  return <ProjectEditorContent key={id} />
}

function ProjectEditorContent() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [activeDocument, setActiveDocument] = useState('bidSecurity')
  const [scheduleRequirements, setScheduleRequirements] = useState(createInitialScheduleItems)
  const [technicalSpecs, setTechnicalSpecs] = useState(() => [createTechnicalItem(1)])
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const persistence = useEditorPersistence(id, (saved) => {
    if (saved?.technical_specs != null) setTechnicalSpecs(saved.technical_specs)
    if (saved?.schedule_requirements != null) setScheduleRequirements(saved.schedule_requirements)
  })
  function changeTechnical(value) {
    setTechnicalSpecs(value)
    persistence.change('technical_specs', value)
  }
  function changeSchedule(value) {
    setScheduleRequirements(value)
    persistence.change('schedule_requirements', value)
  }

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

  if (loading || (!persistence.ready && !persistence.loadError)) {
    return (
      <div className="editor-page">
        Loading project...
      </div>
    )
  }

  if (error || persistence.loadError) {
    return (
      <div className="editor-page">
        <button onClick={() => navigate('/')}>
          ← Back
        </button>

        <p className="error" role="alert">
          {error || persistence.loadError}
        </p>
        <button className="button-secondary" onClick={() => window.location.reload()}>Retry Load</button>
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
        <button className="button-secondary back-button" onClick={async () => { try { await persistence.retry(); navigate('/') } catch { /* Keep the local draft available for retry. */ } }}>← Back</button>
        <div className="editor-heading"><span className="eyebrow">Bid document editor</span><h1>{projectTitle}</h1><p>Reference No. {referenceNumber}</p></div>
        <span className="badge">Bidding Doc</span>
        <div className="editor-save-status">
          <span role="status" className={`save-status save-${persistence.status.split(' ')[0].replace('...', '').toLowerCase()}`}>{persistence.status}</span>
          {persistence.status === 'Error saving' && <button className="button-secondary" onClick={() => persistence.retry().catch(() => {})}>Retry Save</button>}
          {persistence.saveError && <span className="save-error-detail">{persistence.saveError}</span>}
        </div>
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
          <div className="workspace-heading"><span>Project documents <span aria-hidden="true">/</span> <strong>{document.title}</strong></span><span className="draft-label">{['technical', 'schedule'].includes(activeDocument) ? 'Autosave enabled' : 'Preview only'}</span></div>
          {activeDocument === 'technical' ? (
            <div className="technical-split">
              <TechnicalSpecsEditor project={project} value={technicalSpecs} onChange={changeTechnical} onSave={(value) => persistence.save('technical_specs', value)} />
              <section className="document-card technical-reference" aria-label="Technical specifications reference">
                <p className="pdf-preview-notice">Static visual reference only. Your draft does not change this PDF.</p>
                <PdfPreview src={pdfTemplates.reference} title="Technical Specifications reference" />
              </section>
            </div>
          ) : activeDocument === 'schedule' ? (
            <div className="technical-split">
              <ScheduleEditor project={project} value={scheduleRequirements} onChange={changeSchedule} onSave={(value) => persistence.save('schedule_requirements', value)} />
              <section className="document-card technical-reference" aria-label="Schedule of requirements reference">
                <p className="pdf-preview-notice">Static visual reference only. Your draft does not change this PDF.</p>
                <PdfPreview src={pdfTemplates.reference} title="Schedule of Requirements reference" />
              </section>
            </div>
          ) : (
          <section className="document-card preview-document-card" aria-labelledby="document-title">
            <header className="document-header">
              <div><span className="eyebrow">Bidding documents</span><h2 id="document-title">{document.title}</h2><p>{projectTitle}</p><p className="reference">Reference No. {referenceNumber}</p></div>
            </header>
            {src && <p className="pdf-preview-notice">{isReference ? 'Visual reference only. This PDF is not a final document or a generation template.' : 'Template preview only. Project information has not been applied to this PDF.'}</p>}
            <PdfPreview src={src} title={document.title} />
          </section>
          )}
        </main>
      </div>
    </div>
  )
}

