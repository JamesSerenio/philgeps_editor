
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { getProjectById } from '../services/projectService'

import {
  generateNfccPreview,
  generateOngoingContractsPreview,
  generateTableOfContentsPreview,
  generateBidSecurityPreview,
  generateManpowerPreview,
  generateOmnibusPreview,
} from '../services/pdfService'

import useEditorPersistence from '../hooks/useEditorPersistence'

import { createTechnicalItem } from '../lib/technicalSpecs'
import { createInitialBidSecurityState } from '../lib/bidSecurity'
import { createInitialOmnibusState } from '../lib/omnibus'

import {
  createDocumentSetup,
  setupProject,
  alignScheduleItems,
  sharedScheduleItems,
} from '../lib/documentSetup'

import { projectDocuments } from '../lib/projectDocuments'
import { pdfTemplates } from '../lib/pdfTemplates'

import ProjectSidebar from '../components/ProjectSidebar'
import DocumentSetup from '../components/DocumentSetup'
import PdfPreview from '../components/PdfPreview'

import TechnicalSpecsEditor from '../editors/TechnicalSpecsEditor'
import ScheduleEditor from '../editors/ScheduleEditor'
import BidSecurityEditor from '../editors/BidSecurityEditor'
import OmnibusEditor from '../editors/OmnibusEditor'

// ============================================================
// CONFIGURATION
// ============================================================

const PREVIEW_ONLY = new Set([
  'contents',
  'ongoing',
  'slcc',
  'nfcc',
  'manpower',
])

const LIVE_PREVIEW = new Set([
  'contents',
  'ongoing',
  'nfcc',
  'bidSecurity',
  'manpower',
  'omnibus',
])

// ============================================================
// BID SECURITY TEMPLATE VARIANT
// ============================================================

function normalizeBidSecurityVariant(value) {
  if (value === 'with_table') {
    return 'with_table'
  }

  return 'without_table'
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function ProjectEditorPage() {
  const { id } = useParams()

  return <ProjectEditorContent key={id} id={id} />
}

function ProjectEditorContent({ id }) {
  const navigate = useNavigate()

  // ==========================================================
  // MAIN STATE
  // ==========================================================

  const [project, setProject] = useState(null)
  const [error, setError] = useState('')
  const [activeDocument, setActiveDocument] = useState(null)

  const [technical, setTechnical] = useState(() => [
    createTechnicalItem(1),
  ])

  const [schedule, setSchedule] = useState([])
  const [bidSecurity, setBidSecurity] = useState(null)
  const [omnibus, setOmnibus] = useState(null)
  const [documentSetup, setDocumentSetup] = useState(null)

  // ==========================================================
  // LIVE PDF PREVIEW
  // ==========================================================

  const [previews, setPreviews] = useState({})
  const [previewErrors, setPreviewErrors] = useState({})

  const previewUrlsRef = useRef({})

  // ==========================================================
  // PERSISTENCE
  // ==========================================================

  const persistence = useEditorPersistence(id, (saved) => {
    const items = saved?.technical_specs ?? [
      createTechnicalItem(1),
    ]

    setTechnical(items)

    setSchedule(
      alignScheduleItems(
        items,
        saved?.schedule_requirements ?? []
      )
    )

    setBidSecurity(saved?.bid_security ?? null)
    setOmnibus(saved?.omnibus ?? null)

    setDocumentSetup(
      saved?.bid_security?.documentSetup ?? null
    )
  })

  // ==========================================================
  // LOAD PROJECT
  // ==========================================================

  useEffect(() => {
    let cancelled = false

    getProjectById(id)
      .then(({ data, error: projectError }) => {
        if (projectError) {
          throw projectError
        }

        if (!cancelled) {
          setProject(data)
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError.message || 'Unable to load project.'
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [id])

  // ==========================================================
  // DOCUMENT SETUP
  // ==========================================================

  const setup = project
    ? documentSetup ??
      createDocumentSetup(
        project,
        bidSecurity ?? {},
        omnibus ?? {}
      )
    : null

  const sharedProject = setup
    ? setupProject(setup)
    : null

  const province = setup?.province ?? ''
  const municipality = setup?.municipality ?? ''
  const projectTitle = setup?.projectTitle ?? ''
  const referenceNumber = setup?.referenceNumber ?? ''
  const procuringEntity = setup?.procuringEntity ?? ''
  const date = setup?.date ?? ''
  const bidderName = setup?.bidderName ?? ''
  const businessAddress = setup?.businessAddress ?? ''
  const submittedBy = setup?.submittedBy ?? ''
  const designation = setup?.designation ?? ''

  // ==========================================================
  // BID SECURITY VARIANT
  // ==========================================================

  const templateVariant = normalizeBidSecurityVariant(
    bidSecurity?.templateVariant
  )

  // ==========================================================
  // GENERATE LIVE PDF PREVIEW
  // ==========================================================

  useEffect(() => {
    if (
      !setup ||
      !LIVE_PREVIEW.has(activeDocument)
    ) {
      return undefined
    }

    let cancelled = false

    const documentId = activeDocument

const omnibusTemplateVariant =
  omnibus?.templateVariant === 'initao_lgu'
    ? 'initao_lgu'
    : 'old_default'

const previewData = {
  province,
  municipality,
  projectTitle,
  referenceNumber,
  procuringEntity,
  date,
  bidderName,
  businessAddress,
  submittedBy,
  authorizedRepresentative: submittedBy,
  designation,
  representativeDesignation: designation,

  templateVariant:
    documentId === 'omnibus'
      ? omnibusTemplateVariant
      : templateVariant,
}

const generators = {
  contents: generateTableOfContentsPreview,
  ongoing: generateOngoingContractsPreview,
  nfcc: generateNfccPreview,
  bidSecurity: generateBidSecurityPreview,
  manpower: generateManpowerPreview,
  omnibus: generateOmnibusPreview,
}

    const generator = generators[documentId]

    if (!generator) {
      return undefined
    }


    Promise.resolve()
      .then(() => generator(previewData))
      .then((url) => {
        if (cancelled) {
          if (url?.startsWith('blob:')) {
            URL.revokeObjectURL(url)
          }
          return
        }

        setPreviewErrors((current) => ({
          ...current,
          [documentId]: '',
        }))

        const previousUrl =
          previewUrlsRef.current[documentId]

        previewUrlsRef.current[documentId] = url

        setPreviews((current) => ({
          ...current,
          [documentId]: url,
        }))

        if (
          previousUrl &&
          previousUrl !== url &&
          previousUrl.startsWith('blob:')
        ) {
          URL.revokeObjectURL(previousUrl)
        }
      })
      .catch((previewError) => {
        if (cancelled) {
          return
        }

        console.error(
          `${documentId} PDF preview failed:`,
          previewError
        )

        setPreviewErrors((current) => ({
          ...current,
          [documentId]:
            previewError.message ||
            'Unable to generate PDF preview.',
        }))
      })

    return () => {
      cancelled = true
    }
  }, [
    activeDocument,
    province,
    municipality,
    projectTitle,
    referenceNumber,
    procuringEntity,
    date,
    bidderName,
    businessAddress,
    submittedBy,
    designation,
    templateVariant,
    !!setup,
  ])

  // ==========================================================
  // CLEAN UP PDF URLS
  // ==========================================================

  useEffect(() => {
    return () => {
      Object.values(previewUrlsRef.current).forEach(
        (url) => {
          if (url?.startsWith('blob:')) {
            URL.revokeObjectURL(url)
          }
        }
      )

      previewUrlsRef.current = {}
    }
  }, [])

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error || persistence.loadError) {
    return (
      <div className="message" role="alert">
        <p>{error || persistence.loadError}</p>

        <button
          type="button"
          onClick={() => navigate('/')}
        >
          Back
        </button>

        <button
          type="button"
          onClick={() => window.location.reload()}
        >
          Retry Load
        </button>
      </div>
    )
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    !project ||
    !persistence.ready ||
    !setup ||
    !sharedProject
  ) {
    return (
      <div className="message" role="status">
        Loading document setup...
      </div>
    )
  }

  // ==========================================================
  // COMMON DOCUMENT SETUP VALUES
  // ==========================================================

  const common = {
    projectTitle: setup.projectTitle,
    referenceNumber: setup.referenceNumber,
    procuringEntity: setup.procuringEntity,
    municipality: setup.municipality,
    province: setup.province,
    date: setup.date,
    bidderName: setup.bidderName,
    companyAddress: setup.businessAddress,
    businessAddress: setup.businessAddress,
    authorizedRepresentative: setup.submittedBy,
    submittedBy: setup.submittedBy,
  }

  // ==========================================================
  // BID SECURITY VALUE
  // ==========================================================

  const bidValue = {
    ...createInitialBidSecurityState(sharedProject),
    ...bidSecurity,
    ...common,
    templateVariant,
    representativeDesignation: setup.designation,
    designation: setup.designation,
  }

  // ==========================================================
  // OMNIBUS VALUE
  // ==========================================================

  const omnibusValue = {
    ...(omnibus ??
      createInitialOmnibusState(sharedProject)),
    ...common,
    designation: setup.designation,
  }

  // ==========================================================
  // SHARED SCHEDULE
  // ==========================================================

  const scheduleItems = sharedScheduleItems(
    technical,
    schedule
  )

  // ==========================================================
  // SELECTED DOCUMENT
  // ==========================================================

  const selected = projectDocuments.find(
    (item) => item.id === activeDocument
  )

  // ==========================================================
  // PDF PREVIEW SOURCE
  // ==========================================================

  let preview = null

  if (LIVE_PREVIEW.has(activeDocument)) {
    preview = previews[activeDocument] ?? null
  } else if (activeDocument === 'omnibus') {
    preview =
      omnibusValue.templateVariant === 'initao_lgu'
        ? pdfTemplates.initao
        : pdfTemplates.omnibus
  } else if (selected?.template) {
    preview = `/pdf/templates/${selected.template}`
  }

  // ==========================================================
  // DOCUMENT SETUP CHANGE
  // ==========================================================

  function changeSetup(value) {
    setDocumentSetup(value)

    const nextBidSecurity = {
      ...bidSecurity,
      templateVariant,
      documentSetup: value,
    }

    setBidSecurity(nextBidSecurity)

    persistence.change(
      'bid_security',
      nextBidSecurity
    )
  }

  // ==========================================================
  // TECHNICAL SPECIFICATIONS
  // ==========================================================

  function changeTechnical(value) {
    setTechnical(value)

    persistence.change(
      'technical_specs',
      value
    )
  }

  // ==========================================================
  // SCHEDULE REQUIREMENTS
  // ==========================================================

  function schedulePayload(value) {
    return [
      ...value,
      ...schedule.filter(
        (item) =>
          !value.some(
            (row) => row.id === item.id
          )
      ),
    ]
  }

  function changeSchedule(value) {
    const next = schedulePayload(value)

    setSchedule(next)

    persistence.change(
      'schedule_requirements',
      next
    )
  }

  // ==========================================================
  // BID SECURITY TEMPLATE CHANGE
  // ==========================================================

  function changeBid(value) {
    const nextVariant = normalizeBidSecurityVariant(
      value?.templateVariant
    )

    const next = {
      ...bidSecurity,
      templateVariant: nextVariant,
      documentSetup: setup,
    }

    setBidSecurity(next)

    persistence.change(
      'bid_security',
      next
    )
  }

  // ==========================================================
  // SAVE BID SECURITY
  // ==========================================================

  function saveBid(value) {
    const nextVariant = normalizeBidSecurityVariant(
      value?.templateVariant
    )

    const next = {
      ...bidSecurity,
      templateVariant: nextVariant,
      documentSetup: setup,
    }

    setBidSecurity(next)

    return persistence.save(
      'bid_security',
      next
    )
  }

  // ==========================================================
  // OMNIBUS CHANGE
  // ==========================================================

  function changeOmnibus(value) {
    setOmnibus(value)

    persistence.change(
      'omnibus',
      value
    )
  }

  // ==========================================================
  // SIDEBAR EDITOR
  // ==========================================================

  function renderEditor(document) {
    // PREVIEW ONLY SECTIONS

    if (PREVIEW_ONLY.has(document.id)) {
      return null
    }

    // TECHNICAL SPECIFICATIONS

    if (document.id === 'technical') {
      return (
        <TechnicalSpecsEditor
          compact
          project={sharedProject}
          value={technical}
          onChange={changeTechnical}
          onSave={(value) =>
            persistence.save(
              'technical_specs',
              value
            )
          }
        />
      )
    }

    // SCHEDULE REQUIREMENTS

    if (document.id === 'schedule') {
      return (
        <ScheduleEditor
          project={sharedProject}
          value={scheduleItems}
          onChange={changeSchedule}
          onSave={(value) =>
            persistence.save(
              'schedule_requirements',
              schedulePayload(value)
            )
          }
        />
      )
    }

    // BID SECURITY

    if (document.id === 'bidSecurity') {
      return (
        <BidSecurityEditor
          value={bidValue}
          onChange={changeBid}
          onSave={saveBid}
          saveStatus={
            persistence.sectionStatuses.bid_security
          }
        />
      )
    }

    // OMNIBUS

    if (document.id === 'omnibus') {
      return (
        <OmnibusEditor
          compact
          project={sharedProject}
          value={omnibusValue}
          onChange={changeOmnibus}
          onSave={(value) =>
            persistence.save(
              'omnibus',
              value
            )
          }
          saveStatus={
            persistence.sectionStatuses.omnibus
          }
        />
      )
    }

    // OTHER SECTIONS

    return (
      <div className="pending-component">
        <p>
          {document.template}
        </p>

        {['priceSchedule', 'summary'].includes(
          document.id
        ) && (
          <>
            <p>
              Shared items from Technical Specifications:
            </p>

            {technical.map((item) => (
              <p key={item.id}>
                Item {item.itemNo}: {item.qty}{' '}
                {item.unit}
                {' — '}
                {(item.specificationLines ?? [])
                  .map((line) => line.text)
                  .join('; ')}
              </p>
            ))}
          </>
        )}
      </div>
    )
  }

  // ==========================================================
  // PAGE UI
  // ==========================================================

  return (
    <div className="pdf-editor-shell">
      <header className="pdf-editor-topbar">
        <button
          className="button-secondary"
          onClick={async () => {
            try {
              await persistence.retry()
              navigate('/')
            } catch {
              // Keep the unsaved draft available.
            }
          }}
        >
          Back
        </button>

        <h1>Bid Docs PDF Editor</h1>

        <span
          className={
            'save-status save-' +
            persistence.status
              .split(' ')[0]
              .replace('...', '')
              .toLowerCase()
          }
          role="status"
        >
          {persistence.status}
        </span>

        {persistence.status === 'Error saving' && (
          <button
            className="button-secondary"
            onClick={() =>
              persistence.retry().catch(() => {})
            }
          >
            Retry Save
          </button>
        )}

        {persistence.saveError && (
          <span
            role="alert"
            className="save-error-detail"
          >
            {persistence.saveError}
          </span>
        )}
      </header>

      <div className="pdf-editor-body">
        {/* SIDEBAR */}

        <ProjectSidebar
          activeDocument={activeDocument}
          onSelectDocument={setActiveDocument}
          sectionStatuses={
            persistence.sectionStatuses
          }
          renderEditor={renderEditor}
        >
          <DocumentSetup
            value={setup}
            onChange={changeSetup}
          />
        </ProjectSidebar>

        {/* PDF PREVIEW */}

        <main className="pdf-preview-workspace">
          {!selected ? (
            <p className="neutral-preview">
              Select a document component to preview.
            </p>
          ) : (
            <>
              <header className="preview-heading">
                <h2>{selected.title}</h2>

                <p>{setup.projectTitle}</p>

                <p>
                  Reference No. {setup.referenceNumber}
                </p>
              </header>

              {previewErrors[activeDocument] && (
                <p role="alert" className="message">
                  {previewErrors[activeDocument]}
                </p>
              )}

              {preview ? (
                <>
                  {!PREVIEW_ONLY.has(activeDocument) && (
                    <p className="pdf-preview-notice">
                      {LIVE_PREVIEW.has(activeDocument)
                        ? 'Live PDF preview'
                        : 'Static template preview. Editing fields does not modify this PDF yet.'}
                    </p>
                  )}

                  <PdfPreview
                    src={preview}
                    title={selected.title}
                  />
                </>
              ) : LIVE_PREVIEW.has(activeDocument) ? (
                <p className="neutral-preview">
                  Generating PDF preview...
                </p>
              ) : (
                <p className="neutral-preview">
                  A template for {selected.title} is
                  not available yet.
                </p>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
