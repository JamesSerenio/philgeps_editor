import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  useNavigate,
  useParams,
} from 'react-router-dom'

import {
  getProjectById,
} from '../services/projectService'

import {
  generateTableOfContentsPreview,
} from '../services/pdfService'

import useEditorPersistence from '../hooks/useEditorPersistence'

import {
  createTechnicalItem,
} from '../lib/technicalSpecs'

import {
  createInitialBidSecurityState,
} from '../lib/bidSecurity'

import {
  createInitialOmnibusState,
} from '../lib/omnibus'

import {
  createDocumentSetup,
  setupProject,
  alignScheduleItems,
  sharedScheduleItems,
} from '../lib/documentSetup'

import {
  projectDocuments,
} from '../lib/projectDocuments'

import {
  pdfTemplates,
} from '../lib/pdfTemplates'

import ProjectSidebar from '../components/ProjectSidebar'
import DocumentSetup from '../components/DocumentSetup'
import PdfPreview from '../components/PdfPreview'

import TableOfContentsEditor from '../editors/TableOfContentsEditor'
import TechnicalSpecsEditor from '../editors/TechnicalSpecsEditor'
import ScheduleEditor from '../editors/ScheduleEditor'
import BidSecurityEditor from '../editors/BidSecurityEditor'
import OmnibusEditor from '../editors/OmnibusEditor'

export default function ProjectEditorPage() {
  const { id } = useParams()

  return (
    <ProjectEditorContent
      key={id}
      id={id}
    />
  )
}

function ProjectEditorContent({ id }) {
  const navigate = useNavigate()

  const [project, setProject] =
    useState(null)

  const [error, setError] =
    useState('')

  const [
    activeDocument,
    setActiveDocument,
  ] = useState(null)

  const [
    contentsPreview,
    setContentsPreview,
  ] = useState(null)

  const contentsPreviewRef =
    useRef(null)

  const [
    technical,
    setTechnical,
  ] = useState(() => [
    createTechnicalItem(1),
  ])

  const [
    schedule,
    setSchedule,
  ] = useState([])

  const [
    bidSecurity,
    setBidSecurity,
  ] = useState(null)

  const [
    omnibus,
    setOmnibus,
  ] = useState(null)

  const [
    documentSetup,
    setDocumentSetup,
  ] = useState(null)

  // ============================================================
  // PERSISTENCE
  // ============================================================

  const persistence =
    useEditorPersistence(
      id,
      (saved) => {
        const items =
          saved?.technical_specs ??
          [createTechnicalItem(1)]

        setTechnical(items)

        setSchedule(
          alignScheduleItems(
            items,
            saved?.schedule_requirements ??
              [],
          ),
        )

        setBidSecurity(
          saved?.bid_security ??
            null,
        )

        setOmnibus(
          saved?.omnibus ??
            null,
        )

        setDocumentSetup(
          saved?.bid_security
            ?.documentSetup ??
            null,
        )
      },
    )

  // ============================================================
  // LOAD PROJECT
  // ============================================================

  useEffect(() => {
    let cancelled = false

    getProjectById(id)
      .then(({ data, error }) => {
        if (error) {
          throw error
        }

        if (!cancelled) {
          setProject(data)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.message ||
              'Unable to load project.',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [id])

  // ============================================================
  // SAFE SETUP FOR HOOKS
  // ============================================================
  //
  // Important:
  // These values are allowed to be null while project is loading.
  //
  // This lets all useEffect hooks remain ABOVE the conditional
  // return statements.
  // ============================================================

  const setup =
    project
      ? documentSetup ??
        createDocumentSetup(
          project,
          bidSecurity ?? {},
          omnibus ?? {},
        )
      : null

  const sharedProject =
    setup
      ? setupProject(setup)
      : null

  const previewProvince =
    sharedProject?.province ?? ''

  const previewMunicipality =
    sharedProject?.municipality ?? ''

  const previewProjectTitle =
    sharedProject?.projectTitle ?? ''

  const previewDate =
    sharedProject?.date ?? ''

  const previewBidderName =
    sharedProject?.bidderName ?? ''

  // ============================================================
  // LIVE TABLE OF CONTENTS PDF
  // ============================================================
  //
  // This hook is ALWAYS called.
  // It simply does nothing until:
  //
  // - project has loaded
  // - Table of Contents is selected
  // ============================================================

  useEffect(() => {
    if (
      activeDocument !== 'contents' ||
      !sharedProject
    ) {
      return undefined
    }

    let cancelled = false

    const previewProject = {
      province: previewProvince,
      municipality:
        previewMunicipality,
      projectTitle:
        previewProjectTitle,
      date: previewDate,
      bidderName:
        previewBidderName,
    }

    generateTableOfContentsPreview(
      previewProject,
    )
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }

        if (
          contentsPreviewRef.current &&
          contentsPreviewRef.current.startsWith(
            'blob:',
          )
        ) {
          URL.revokeObjectURL(
            contentsPreviewRef.current,
          )
        }

        contentsPreviewRef.current =
          url

        setContentsPreview(url)
      })
      .catch((previewError) => {
        if (cancelled) {
          return
        }

        console.error(
          'Table of Contents preview failed',
          previewError,
        )
      })

    return () => {
      cancelled = true
    }
  }, [
    activeDocument,
    previewProvince,
    previewMunicipality,
    previewProjectTitle,
    previewDate,
    previewBidderName,
  ])

  // ============================================================
  // CLEAN BLOB WHEN COMPONENT UNMOUNTS
  // ============================================================

  useEffect(() => {
    return () => {
      if (
        contentsPreviewRef.current &&
        contentsPreviewRef.current.startsWith(
          'blob:',
        )
      ) {
        URL.revokeObjectURL(
          contentsPreviewRef.current,
        )

        contentsPreviewRef.current =
          null
      }
    }
  }, [])

  // ============================================================
  // NOW CONDITIONAL RETURNS ARE SAFE
  // ============================================================
  //
  // All hooks have already been called above.
  // ============================================================

  if (
    error ||
    persistence.loadError
  ) {
    return (
      <div
        className="message"
        role="alert"
      >
        <p>
          {error ||
            persistence.loadError}
        </p>

        <button
          onClick={() =>
            navigate('/')
          }
        >
          Back
        </button>

        <button
          onClick={() =>
            window.location.reload()
          }
        >
          Retry Load
        </button>
      </div>
    )
  }

  if (
    !project ||
    !persistence.ready ||
    !setup ||
    !sharedProject
  ) {
    return (
      <div
        className="message"
        role="status"
      >
        Loading document setup...
      </div>
    )
  }

  // ============================================================
  // COMMON PROJECT FIELDS
  // ============================================================

  const common = {
    projectTitle:
      setup.projectTitle,

    referenceNumber:
      setup.referenceNumber,

    procuringEntity:
      setup.procuringEntity,

    municipality:
      setup.municipality,

    province:
      setup.province,

    date:
      setup.date,

    bidderName:
      setup.bidderName,

    companyAddress:
      setup.businessAddress,

    authorizedRepresentative:
      setup.submittedBy,
  }

  // ============================================================
  // BID SECURITY
  // ============================================================

  const bidValue = {
    ...(bidSecurity ??
      createInitialBidSecurityState(
        sharedProject,
      )),

    ...common,

    representativeDesignation:
      setup.designation,
  }

  // ============================================================
  // OMNIBUS
  // ============================================================

  const omnibusValue = {
    ...(omnibus ??
      createInitialOmnibusState(
        sharedProject,
      )),

    ...common,

    designation:
      setup.designation,
  }

  // ============================================================
  // SCHEDULE
  // ============================================================

  const scheduleItems =
    sharedScheduleItems(
      technical,
      schedule,
    )

  // ============================================================
  // SELECTED DOCUMENT
  // ============================================================

  const selected =
    projectDocuments.find(
      (item) =>
        item.id ===
        activeDocument,
    )

  // ============================================================
  // PREVIEW SOURCE
  // ============================================================

  const preview =
    activeDocument ===
    'contents'
      ? contentsPreview
      : activeDocument ===
          'bidSecurity'
        ? bidValue.templateVariant ===
          'initao_lgu'
          ? pdfTemplates.initao
          : pdfTemplates.bidSecurity
        : activeDocument ===
            'omnibus'
          ? omnibusValue.templateVariant ===
            'initao_lgu'
            ? pdfTemplates.initao
            : pdfTemplates.omnibus
          : selected?.template
            ? `/pdf/templates/${selected.template}`
            : null

  // ============================================================
  // DOCUMENT SETUP
  // ============================================================

  function changeSetup(value) {
    setDocumentSetup(value)

    const next = {
      ...bidValue,
      documentSetup: value,
    }

    setBidSecurity(next)

    persistence.change(
      'bid_security',
      next,
    )
  }

  // ============================================================
  // TECHNICAL SPECS
  // ============================================================

  function changeTechnical(value) {
    setTechnical(value)

    persistence.change(
      'technical_specs',
      value,
    )
  }

  // ============================================================
  // SCHEDULE
  // ============================================================

  function schedulePayload(value) {
    return [
      ...value,

      ...schedule.filter(
        (item) =>
          !value.some(
            (row) =>
              row.id ===
              item.id,
          ),
      ),
    ]
  }

  function changeSchedule(value) {
    const next =
      schedulePayload(value)

    setSchedule(next)

    persistence.change(
      'schedule_requirements',
      next,
    )
  }

  // ============================================================
  // BID SECURITY
  // ============================================================

  function changeBid(value) {
    const next = {
      ...value,
      documentSetup: setup,
    }

    setBidSecurity(next)

    persistence.change(
      'bid_security',
      next,
    )
  }

  // ============================================================
  // OMNIBUS
  // ============================================================

  function changeOmnibus(value) {
    setOmnibus(value)

    persistence.change(
      'omnibus',
      value,
    )
  }

  // ============================================================
  // RENDER EDITORS
  // ============================================================

  function renderEditor(document) {
    // ----------------------------------------------------------
    // TABLE OF CONTENTS
    // ----------------------------------------------------------

    if (
      document.id ===
      'contents'
    ) {
      return (
        <TableOfContentsEditor
          project={
            sharedProject
          }
        />
      )
    }

    // ----------------------------------------------------------
    // TECHNICAL SPECIFICATIONS
    // ----------------------------------------------------------

    if (
      document.id ===
      'technical'
    ) {
      return (
        <TechnicalSpecsEditor
          compact
          project={
            sharedProject
          }
          value={
            technical
          }
          onChange={
            changeTechnical
          }
          onSave={(value) =>
            persistence.save(
              'technical_specs',
              value,
            )
          }
        />
      )
    }

    // ----------------------------------------------------------
    // SCHEDULE REQUIREMENTS
    // ----------------------------------------------------------

    if (
      document.id ===
      'schedule'
    ) {
      return (
        <ScheduleEditor
          project={
            sharedProject
          }
          value={
            scheduleItems
          }
          onChange={
            changeSchedule
          }
          onSave={(value) =>
            persistence.save(
              'schedule_requirements',
              schedulePayload(
                value,
              ),
            )
          }
        />
      )
    }

    // ----------------------------------------------------------
    // BID SECURITY
    // ----------------------------------------------------------

    if (
      document.id ===
      'bidSecurity'
    ) {
      return (
        <BidSecurityEditor
          compact
          project={
            sharedProject
          }
          value={
            bidValue
          }
          onChange={
            changeBid
          }
          onSave={(value) =>
            persistence.save(
              'bid_security',
              {
                ...value,
                documentSetup:
                  setup,
              },
            )
          }
          saveStatus={
            persistence
              .sectionStatuses
              .bid_security
          }
        />
      )
    }

    // ----------------------------------------------------------
    // OMNIBUS
    // ----------------------------------------------------------

    if (
      document.id ===
      'omnibus'
    ) {
      return (
        <OmnibusEditor
          compact
          project={
            sharedProject
          }
          value={
            omnibusValue
          }
          onChange={
            changeOmnibus
          }
          onSave={(value) =>
            persistence.save(
              'omnibus',
              value,
            )
          }
          saveStatus={
            persistence
              .sectionStatuses
              .omnibus
          }
        />
      )
    }

    // ----------------------------------------------------------
    // PENDING COMPONENTS
    // ----------------------------------------------------------

    return (
      <div className="pending-component">
        <p>
          Editor pending.
          {' '}
          {document.template
            ? 'The template is available in the preview.'
            : 'No template is available yet.'}
        </p>

        {[
          'priceSchedule',
          'summary',
        ].includes(
          document.id,
        ) && (
          <>
            <p>
              Shared items from Technical Specifications:
            </p>

            {technical.map(
              (item) => (
                <p key={item.id}>
                  Item{' '}
                  {item.itemNo}
                  :
                  {' '}
                  {item.qty}
                  {' '}
                  {item.unit}
                  {' — '}
                  {item.specificationLines
                    .map(
                      (line) =>
                        line.text,
                    )
                    .join('; ')}
                </p>
              ),
            )}
          </>
        )}
      </div>
    )
  }

  // ============================================================
  // PAGE
  // ============================================================

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
              // Keep draft available.
            }
          }}
        >
          Back
        </button>

        <h1>
          Bid Docs PDF Editor
        </h1>

        <span
          className={
            'save-status save-' +
            persistence.status
              .split(' ')[0]
              .replace(
                '...',
                '',
              )
              .toLowerCase()
          }
          role="status"
        >
          {persistence.status}
        </span>

        {persistence.status ===
          'Error saving' && (
          <button
            className="button-secondary"
            onClick={() =>
              persistence
                .retry()
                .catch(
                  () => {},
                )
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
            {
              persistence.saveError
            }
          </span>
        )}
      </header>

      <div className="pdf-editor-body">
        <ProjectSidebar
          activeDocument={
            activeDocument
          }
          onSelectDocument={
            setActiveDocument
          }
          sectionStatuses={
            persistence.sectionStatuses
          }
          renderEditor={
            renderEditor
          }
        >
          <DocumentSetup
            value={setup}
            onChange={
              changeSetup
            }
          />
        </ProjectSidebar>

        <main className="pdf-preview-workspace">
          {!selected ? (
            <p className="neutral-preview">
              Select a document component to preview.
            </p>
          ) : (
            <>
              <header className="preview-heading">
                <h2>
                  {
                    selected.title
                  }
                </h2>

                <p>
                  {
                    setup.projectTitle
                  }
                </p>

                <p>
                  Reference No.{' '}
                  {
                    setup.referenceNumber
                  }
                </p>
              </header>

              {preview ? (
                <>
                  <p className="pdf-preview-notice">
                    {activeDocument ===
                    'contents'
                      ? 'Live preview — project information is filled automatically.'
                      : 'Static template preview. Editing fields does not modify this PDF yet.'}
                  </p>

                  <PdfPreview
                    src={preview}
                    title={
                      selected.title
                    }
                  />
                </>
              ) : activeDocument ===
                'contents' ? (
                <p className="neutral-preview">
                  Generating Table of Contents preview...
                </p>
              ) : (
                <p className="neutral-preview">
                  A template for{' '}
                  {
                    selected.title
                  }{' '}
                  is not available yet.
                </p>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}