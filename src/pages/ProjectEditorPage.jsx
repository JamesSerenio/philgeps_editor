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
  generateOngoingContractsPreview,
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

function ProjectEditorContent({
  id,
}) {
  const navigate =
    useNavigate()

  const [
    project,
    setProject,
  ] = useState(null)

  const [
    error,
    setError,
  ] = useState('')

  const [
    activeDocument,
    setActiveDocument,
  ] = useState(null)

  // ============================================================
  // PDF PREVIEWS
  // ============================================================

  const [
    contentsPreview,
    setContentsPreview,
  ] = useState(null)

  const [
    ongoingPreview,
    setOngoingPreview,
  ] = useState(null)

  const contentsPreviewRef =
    useRef(null)

  const ongoingPreviewRef =
    useRef(null)

  // ============================================================
  // EDITOR STATES
  // ============================================================

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
          [
            createTechnicalItem(
              1,
            ),
          ]

        setTechnical(
          items,
        )

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
    let cancelled =
      false

    getProjectById(id)
      .then(
        ({
          data,
          error,
        }) => {
          if (error) {
            throw error
          }

          if (!cancelled) {
            setProject(
              data,
            )
          }
        },
      )
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
  // SAFE SHARED SETUP
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

  // ============================================================
  // SAFE PRIMITIVE VALUES FOR EFFECT DEPENDENCIES
  // ============================================================

  const previewProvince =
    sharedProject?.province ??
    ''

  const previewMunicipality =
    sharedProject
      ?.municipality ??
    ''

  const previewProjectTitle =
    sharedProject
      ?.projectTitle ??
    ''

  const previewReferenceNumber =
    sharedProject
      ?.referenceNumber ??
    ''

  const previewProcuringEntity =
    sharedProject
      ?.procuringEntity ??
    ''

  const previewDate =
    sharedProject?.date ??
    ''

  const previewBidderName =
    sharedProject
      ?.bidderName ??
    ''

  const previewBusinessAddress =
    sharedProject
      ?.businessAddress ??
    ''

  const previewSubmittedBy =
    sharedProject
      ?.submittedBy ??
    ''

  const previewDesignation =
    sharedProject
      ?.designation ??
    ''

  // ============================================================
  // TABLE OF CONTENTS LIVE PREVIEW
  // ============================================================

  useEffect(() => {
    if (
      activeDocument !==
        'contents' ||
      !sharedProject
    ) {
      return undefined
    }

    let cancelled = false

    const previewData = {
      province:
        previewProvince,

      municipality:
        previewMunicipality,

      projectTitle:
        previewProjectTitle,

      referenceNumber:
        previewReferenceNumber,

      procuringEntity:
        previewProcuringEntity,

      date:
        previewDate,

      bidderName:
        previewBidderName,

      businessAddress:
        previewBusinessAddress,

      submittedBy:
        previewSubmittedBy,

      designation:
        previewDesignation,
    }

    generateTableOfContentsPreview(
      previewData,
    )
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(
            url,
          )

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

        setContentsPreview(
          url,
        )
      })
      .catch(
        (previewError) => {
          if (cancelled) {
            return
          }

          console.error(
            'Table of Contents preview failed',
            previewError,
          )
        },
      )

    return () => {
      cancelled = true
    }
  }, [
    activeDocument,
    previewProvince,
    previewMunicipality,
    previewProjectTitle,
    previewReferenceNumber,
    previewProcuringEntity,
    previewDate,
    previewBidderName,
    previewBusinessAddress,
    previewSubmittedBy,
    previewDesignation,
  ])

  // ============================================================
  // ONGOING CONTRACTS LIVE PREVIEW
  // ============================================================

  useEffect(() => {
    if (
      activeDocument !==
        'ongoing' ||
      !sharedProject
    ) {
      return undefined
    }

    let cancelled = false

    const previewData = {
      province:
        previewProvince,

      municipality:
        previewMunicipality,

      projectTitle:
        previewProjectTitle,

      referenceNumber:
        previewReferenceNumber,

      procuringEntity:
        previewProcuringEntity,

      date:
        previewDate,

      bidderName:
        previewBidderName,

      businessAddress:
        previewBusinessAddress,

      submittedBy:
        previewSubmittedBy,

      designation:
        previewDesignation,
    }

    generateOngoingContractsPreview(
      previewData,
    )
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(
            url,
          )

          return
        }

        if (
          ongoingPreviewRef.current &&
          ongoingPreviewRef.current.startsWith(
            'blob:',
          )
        ) {
          URL.revokeObjectURL(
            ongoingPreviewRef.current,
          )
        }

        ongoingPreviewRef.current =
          url

        setOngoingPreview(
          url,
        )
      })
      .catch(
        (previewError) => {
          if (cancelled) {
            return
          }

          console.error(
            'Ongoing Contracts preview failed',
            previewError,
          )
        },
      )

    return () => {
      cancelled = true
    }
  }, [
    activeDocument,
    previewProvince,
    previewMunicipality,
    previewProjectTitle,
    previewReferenceNumber,
    previewProcuringEntity,
    previewDate,
    previewBidderName,
    previewBusinessAddress,
    previewSubmittedBy,
    previewDesignation,
  ])

  // ============================================================
  // CLEAN GENERATED BLOB URLS
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

      if (
        ongoingPreviewRef.current &&
        ongoingPreviewRef.current.startsWith(
          'blob:',
        )
      ) {
        URL.revokeObjectURL(
          ongoingPreviewRef.current,
        )

        ongoingPreviewRef.current =
          null
      }
    }
  }, [])

  // ============================================================
  // ERROR
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

  // ============================================================
  // LOADING
  // ============================================================

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
  // COMMON VALUES
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
  // PDF PREVIEW SOURCE
  // ============================================================

  const preview =
    activeDocument ===
    'contents'
      ? contentsPreview
      : activeDocument ===
          'ongoing'
        ? ongoingPreview
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

  function changeSetup(
    value,
  ) {
    setDocumentSetup(
      value,
    )

    const next = {
      ...bidValue,
      documentSetup:
        value,
    }

    setBidSecurity(
      next,
    )

    persistence.change(
      'bid_security',
      next,
    )
  }

  // ============================================================
  // TECHNICAL SPECS
  // ============================================================

  function changeTechnical(
    value,
  ) {
    setTechnical(
      value,
    )

    persistence.change(
      'technical_specs',
      value,
    )
  }

  // ============================================================
  // SCHEDULE
  // ============================================================

  function schedulePayload(
    value,
  ) {
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

  function changeSchedule(
    value,
  ) {
    const next =
      schedulePayload(
        value,
      )

    setSchedule(
      next,
    )

    persistence.change(
      'schedule_requirements',
      next,
    )
  }

  // ============================================================
  // BID SECURITY
  // ============================================================

  function changeBid(
    value,
  ) {
    const next = {
      ...value,
      documentSetup:
        setup,
    }

    setBidSecurity(
      next,
    )

    persistence.change(
      'bid_security',
      next,
    )
  }

  // ============================================================
  // OMNIBUS
  // ============================================================

  function changeOmnibus(
    value,
  ) {
    setOmnibus(
      value,
    )

    persistence.change(
      'omnibus',
      value,
    )
  }

  // ============================================================
  // EDITOR RENDERER
  // ============================================================

  function renderEditor(
    document,
  ) {
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
    // ONGOING CONTRACTS
    // ----------------------------------------------------------

    if (
      document.id ===
      'ongoing'
    ) {
      return (
        <div className="pending-component">
          <p>
            Project information is filled automatically from Document Setup.
          </p>

          <p>
            <strong>
              Procuring Entity:
            </strong>{' '}
            {
              sharedProject.procuringEntity
            }
          </p>

          <p>
            <strong>
              Project Title:
            </strong>{' '}
            {
              sharedProject.projectTitle
            }
          </p>

          <p>
            <strong>
              Reference Number:
            </strong>{' '}
            {
              sharedProject.referenceNumber
            }
          </p>

          <p>
            <strong>
              Registered Business Name:
            </strong>{' '}
            {
              sharedProject.bidderName
            }
          </p>

          <p>
            <strong>
              Business Address:
            </strong>{' '}
            {
              sharedProject.businessAddress
            }
          </p>

          <p>
            <strong>
              Submitted By:
            </strong>{' '}
            {
              sharedProject.submittedBy
            }
          </p>

          <p>
            <strong>
              Designation:
            </strong>{' '}
            {
              sharedProject.designation
            }
          </p>
        </div>
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
    // SCHEDULE
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
    // OTHER DOCUMENTS
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
                <p
                  key={
                    item.id
                  }
                >
                  Item{' '}
                  {
                    item.itemNo
                  }
                  :
                  {' '}
                  {
                    item.qty
                  }
                  {' '}
                  {
                    item.unit
                  }
                  {' — '}
                  {item.specificationLines
                    .map(
                      (line) =>
                        line.text,
                    )
                    .join(
                      '; ',
                    )}
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
          {
            persistence.status
          }
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
            value={
              setup
            }
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
                    {[
                      'contents',
                      'ongoing',
                    ].includes(
                      activeDocument,
                    )
                      ? 'Live preview — project information is filled automatically.'
                      : 'Static template preview. Editing fields does not modify this PDF yet.'}
                  </p>

                  <PdfPreview
                    src={
                      preview
                    }
                    title={
                      selected.title
                    }
                  />
                </>
              ) : [
                  'contents',
                  'ongoing',
                ].includes(
                  activeDocument,
                ) ? (
                <p className="neutral-preview">
                  Generating PDF preview...
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