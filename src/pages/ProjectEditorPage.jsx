import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProjectById } from '../services/projectService'
import useEditorPersistence from '../hooks/useEditorPersistence'
import { createTechnicalItem } from '../lib/technicalSpecs'
import { createInitialBidSecurityState } from '../lib/bidSecurity'
import { createInitialOmnibusState } from '../lib/omnibus'
import { createDocumentSetup, setupProject, alignScheduleItems, sharedScheduleItems } from '../lib/documentSetup'
import { projectDocuments } from '../lib/projectDocuments'
import { pdfTemplates } from '../lib/pdfTemplates'
import ProjectSidebar from '../components/ProjectSidebar'
import DocumentSetup from '../components/DocumentSetup'
import PdfPreview from '../components/PdfPreview'
import TechnicalSpecsEditor from '../editors/TechnicalSpecsEditor'
import ScheduleEditor from '../editors/ScheduleEditor'
import BidSecurityEditor from '../editors/BidSecurityEditor'
import OmnibusEditor from '../editors/OmnibusEditor'

export default function ProjectEditorPage() {
  const { id } = useParams()
  return <ProjectEditorContent key={id} id={id} />
}

function ProjectEditorContent({ id }) {
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [error, setError] = useState('')
  const [activeDocument, setActiveDocument] = useState(null)
  const [technical, setTechnical] = useState(() => [createTechnicalItem(1)])
  const [schedule, setSchedule] = useState([])
  const [bidSecurity, setBidSecurity] = useState(null)
  const [omnibus, setOmnibus] = useState(null)
  const [documentSetup, setDocumentSetup] = useState(null)
  const persistence = useEditorPersistence(id, (saved) => {
    const items = saved?.technical_specs ?? [createTechnicalItem(1)]
    setTechnical(items)
    setSchedule(alignScheduleItems(items, saved?.schedule_requirements ?? []))
    setBidSecurity(saved?.bid_security ?? null)
    setOmnibus(saved?.omnibus ?? null)
    setDocumentSetup(saved?.bid_security?.documentSetup ?? null)
  })
  useEffect(() => {
    let cancelled = false
    getProjectById(id).then(({ data, error }) => {
      if (error) throw error
      if (!cancelled) setProject(data)
    }).catch((err) => { if (!cancelled) setError(err.message || 'Unable to load project.') })
    return () => { cancelled = true }
  }, [id])

  if (error || persistence.loadError) return <div className="message" role="alert"><p>{error || persistence.loadError}</p><button onClick={() => navigate('/')}>Back</button><button onClick={() => window.location.reload()}>Retry Load</button></div>
  if (!project || !persistence.ready) return <div className="message" role="status">Loading document setup...</div>

  const setup = documentSetup ?? createDocumentSetup(project, bidSecurity ?? {}, omnibus ?? {})
  const sharedProject = setupProject(setup)
  const common = { projectTitle: setup.projectTitle, referenceNumber: setup.referenceNumber, procuringEntity: setup.procuringEntity, municipality: setup.municipality, province: setup.province, date: setup.date, bidderName: setup.bidderName, companyAddress: setup.businessAddress, authorizedRepresentative: setup.submittedBy }
  const bidValue = { ...(bidSecurity ?? createInitialBidSecurityState(sharedProject)), ...common, representativeDesignation: setup.designation }
  const omnibusValue = { ...(omnibus ?? createInitialOmnibusState(sharedProject)), ...common, designation: setup.designation }
  const scheduleItems = sharedScheduleItems(technical, schedule)
  const selected = projectDocuments.find((item) => item.id === activeDocument)
  const preview = activeDocument === 'bidSecurity' ? (bidValue.templateVariant === 'initao_lgu' ? pdfTemplates.initao : pdfTemplates.bidSecurity)
    : activeDocument === 'omnibus' ? (omnibusValue.templateVariant === 'initao_lgu' ? pdfTemplates.initao : pdfTemplates.omnibus)
      : selected?.template ? '/pdf/templates/' + selected.template : null
  function changeSetup(value) {
    setDocumentSetup(value)
    const next = { ...bidValue, documentSetup: value }
    setBidSecurity(next)
    persistence.change('bid_security', next)
  }
  function changeTechnical(value) { setTechnical(value); persistence.change('technical_specs', value) }
  function schedulePayload(value) {
    // Retain previously saved delivery values for removed master IDs; never
    // reassign them to another item when the master list is renumbered.
    return [...value, ...schedule.filter((item) => !value.some((row) => row.id === item.id))]
  }
  function changeSchedule(value) { const next = schedulePayload(value); setSchedule(next); persistence.change('schedule_requirements', next) }
  function changeBid(value) { const next = { ...value, documentSetup: setup }; setBidSecurity(next); persistence.change('bid_security', next) }
  function changeOmnibus(value) { setOmnibus(value); persistence.change('omnibus', value) }
  function renderEditor(document) {
    if (document.id === 'technical') return <TechnicalSpecsEditor compact project={sharedProject} value={technical} onChange={changeTechnical} onSave={(value) => persistence.save('technical_specs', value)} />
    if (document.id === 'schedule') return <ScheduleEditor project={sharedProject} value={scheduleItems} onChange={changeSchedule} onSave={(value) => persistence.save('schedule_requirements', schedulePayload(value))} />
    if (document.id === 'bidSecurity') return <BidSecurityEditor compact project={sharedProject} value={bidValue} onChange={changeBid} onSave={(value) => persistence.save('bid_security', { ...value, documentSetup: setup })} saveStatus={persistence.sectionStatuses.bid_security} />
    if (document.id === 'omnibus') return <OmnibusEditor compact project={sharedProject} value={omnibusValue} onChange={changeOmnibus} onSave={(value) => persistence.save('omnibus', value)} saveStatus={persistence.sectionStatuses.omnibus} />
    return <div className="pending-component"><p>Editor pending. {document.template ? 'The template is available in the preview.' : 'No template is available yet.'}</p>{['priceSchedule', 'summary'].includes(document.id) && <><p>Shared items from Technical Specifications:</p>{technical.map((item) => <p key={item.id}>Item {item.itemNo}: {item.qty} {item.unit} ? {item.specificationLines.map((line) => line.text).join('; ')}</p>)}</>}</div>
  }
  return <div className="pdf-editor-shell">
    <header className="pdf-editor-topbar"><button className="button-secondary" onClick={async () => { try { await persistence.retry(); navigate('/') } catch { /* Keep draft available. */ } }}>Back</button><h1>Bid Docs PDF Editor</h1><span className={'save-status save-' + persistence.status.split(' ')[0].replace('...', '').toLowerCase()} role="status">{persistence.status}</span>{persistence.status === 'Error saving' && <button className="button-secondary" onClick={() => persistence.retry().catch(() => {})}>Retry Save</button>}{persistence.saveError && <span role="alert" className="save-error-detail">{persistence.saveError}</span>}</header>
    <div className="pdf-editor-body"><ProjectSidebar activeDocument={activeDocument} onSelectDocument={setActiveDocument} sectionStatuses={persistence.sectionStatuses} renderEditor={renderEditor}><DocumentSetup value={setup} onChange={changeSetup} /></ProjectSidebar>
      <main className="pdf-preview-workspace">{!selected ? <p className="neutral-preview">Select a document component to preview.</p> : <><header className="preview-heading"><h2>{selected.title}</h2><p>{setup.projectTitle}</p><p>Reference No. {setup.referenceNumber}</p></header>{preview ? <><p className="pdf-preview-notice">Static template preview. Editing fields does not modify this PDF yet.</p><PdfPreview src={preview} title={selected.title} /></> : <p className="neutral-preview">A template for {selected.title} is not available yet.</p>}</>}</main>
    </div>
  </div>
}
