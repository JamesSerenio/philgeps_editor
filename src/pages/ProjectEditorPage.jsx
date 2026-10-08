
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

import {
  generateAfterSalesPreview,
} from '../services/pdf/afterSalesPdf'

import {
  generateProductWarrantyPreview,
} from '../services/pdf/warrantyPdf'

import {
  generateSlccPreview,
} from '../services/pdf/slccPdf'

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

import ProjectSidebar from '../components/ProjectSidebar'
import DocumentSetup from '../components/DocumentSetup'
import PdfPreview from '../components/PdfPreview'

import TechnicalSpecsEditor from '../editors/TechnicalSpecsEditor'
import ScheduleEditor from '../editors/ScheduleEditor'
import BidSecurityEditor from '../editors/BidSecurityEditor'
import OmnibusEditor from '../editors/OmnibusEditor'
import AfterSalesEditor from '../editors/AfterSalesEditor'
import WarrantyEditor from '../editors/WarrantyEditor'
import SLCCEditor from '../editors/SLCCEditor'

// =====================================================
// DOCUMENT CONFIGURATION
// =====================================================

const AFTER_SALES_ID = projectDocuments.find(
  (doc) =>
    /after[\s-]*sales/i.test(
      `${doc.title || ''} ${doc.id || ''}`
    )
)?.id ?? 'afterSales'

const WARRANTY_ID = projectDocuments.find(
  (doc) =>
    /certificate of product warranty/i.test(
      `${doc.title || ''} ${doc.id || ''}`
    )
)?.id ?? 'warranty'

const PREVIEW_ONLY = new Set([
  'contents',
  'ongoing',
  'nfcc',
  'manpower',
])

const LIVE_PREVIEW = new Set([
  'contents',
  'ongoing',
  'slcc',
  'nfcc',
  'bidSecurity',
  'manpower',
  'omnibus',
  AFTER_SALES_ID,
  WARRANTY_ID,
])

function normalizeVariant(value) {
  return value === 'with_table'
    ? 'with_table'
    : 'without_table'
}

function yearsFromSetup(setup) {
  const old = String(
    setup?.servicePeriod ?? ''
  ).match(/\((\d+)\)/)

  return (
    setup?.servicePeriodYears ??
    (old ? Number(old[1]) : 1)
  )
}

function slccVariantFromSetup(setup) {
  if (
    setup?.slccVariant === 'cctv' ||
    setup?.slccVariant === 'streetlight'
  ) {
    return setup.slccVariant
  }

  return /cctv/i.test(
    setup?.projectTitle ?? ''
  )
    ? 'cctv'
    : 'streetlight'
}

// =====================================================
// MAIN COMPONENT
// =====================================================

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

  const [technical, setTechnical] = useState(
    () => [createTechnicalItem(1)]
  )

  const [schedule, setSchedule] =
    useState([])

  const [bidSecurity, setBidSecurity] =
    useState(null)

  const [omnibus, setOmnibus] =
    useState(null)

  const [documentSetup, setDocumentSetup] =
    useState(null)

  const [previews, setPreviews] =
    useState({})

  const [previewErrors, setPreviewErrors] =
    useState({})

  const previewUrlsRef = useRef({})

  // ===================================================
  // LOAD SAVED DATA FROM SUPABASE
  // ===================================================

  const persistence = useEditorPersistence(
    id,
    (saved) => {
      const items =
        saved?.technical_specs ??
        [createTechnicalItem(1)]

      setTechnical(items)

      setSchedule(
        alignScheduleItems(
          items,
          saved?.schedule_requirements ?? []
        )
      )

      setBidSecurity(
        saved?.bid_security ?? null
      )

      setOmnibus(
        saved?.omnibus ?? null
      )

      setDocumentSetup(
        saved?.bid_security?.documentSetup ??
        null
      )
    }
  )

  // ===================================================
  // LOAD PROJECT
  // ===================================================

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
            loadError.message ||
            'Unable to load project.'
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [id])

  // ===================================================
  // SHARED DOCUMENT SETUP
  // ===================================================

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

  const templateVariant = normalizeVariant(
    bidSecurity?.templateVariant
  )

  // ===================================================
  // LIVE PREVIEW INFORMATION
  // ===================================================

  const previewData = setup
    ? {
        province:
          setup.province ?? '',

        municipality:
          setup.municipality ?? '',

        projectTitle:
          setup.projectTitle ?? '',

        referenceNumber:
          setup.referenceNumber ?? '',

        procuringEntity:
          setup.procuringEntity ?? '',

        date:
          setup.date ?? '',

        bidderName:
          setup.bidderName ?? '',

        businessAddress:
          setup.businessAddress ?? '',

        submittedBy:
          setup.submittedBy ?? '',

        authorizedRepresentative:
          setup.submittedBy ?? '',

        designation:
          setup.designation ?? '',

        representativeDesignation:
          setup.designation ?? '',

        // AFTER-SALES
        servicePeriodYears:
          yearsFromSetup(setup),

        // PRODUCT WARRANTY
        productWarrantyYears:
          setup.productWarrantyYears ?? 2,

        // SLCC TEMPLATE
        slccVariant:
          slccVariantFromSetup(setup),

        // Separate contract selection for
        // CCTV and STREETLIGHT.
        slccContractTypes:
          setup.slccContractTypes ?? {},

        // Saved owner, nature and description
        // for each template and contract type.
        slccEntries:
          setup.slccEntries ?? {},

        // BID SECURITY / OMNIBUS
        templateVariant:
          activeDocument === 'omnibus'
            ? (
                omnibus?.templateVariant ===
                'initao_lgu'
                  ? 'initao_lgu'
                  : 'old_default'
              )
            : templateVariant,
      }
    : null

  const previewKey = JSON.stringify({
    document: activeDocument,
    data: previewData,
  })

  // ===================================================
  // LIVE PDF GENERATION
  // ===================================================

  useEffect(() => {
    const {
      document: documentId,
      data,
    } = JSON.parse(previewKey)

    if (
      !data ||
      !LIVE_PREVIEW.has(documentId)
    ) {
      return undefined
    }

    const generators = {
      contents:
        generateTableOfContentsPreview,

      ongoing:
        generateOngoingContractsPreview,

      slcc:
        generateSlccPreview,

      nfcc:
        generateNfccPreview,

      bidSecurity:
        generateBidSecurityPreview,

      manpower:
        generateManpowerPreview,

      omnibus:
        generateOmnibusPreview,

      [AFTER_SALES_ID]:
        generateAfterSalesPreview,

      [WARRANTY_ID]:
        generateProductWarrantyPreview,
    }

    const generator =
      generators[documentId]

    if (!generator) {
      return undefined
    }

    let cancelled = false

    Promise.resolve()
      .then(() => generator(data))
      .then((url) => {
        if (
          !url ||
          typeof url !== 'string'
        ) {
          throw new Error(
            'PDF generator returned no PDF URL.'
          )
        }

        if (cancelled) {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url)
          }

          return
        }

        const oldUrl =
          previewUrlsRef.current[documentId]

        previewUrlsRef.current[documentId] =
          url

        setPreviews((current) => ({
          ...current,

          [documentId]: {
            url,
            key: previewKey,
          },
        }))

        setPreviewErrors((current) => ({
          ...current,
          [documentId]: null,
        }))

        if (
          oldUrl &&
          oldUrl !== url &&
          oldUrl.startsWith('blob:')
        ) {
          URL.revokeObjectURL(oldUrl)
        }
      })
      .catch((previewError) => {
        if (cancelled) {
          return
        }

        console.error(
          `${documentId} PDF generation failed:`,
          previewError
        )

        setPreviewErrors((current) => ({
          ...current,

          [documentId]: {
            key: previewKey,
            message:
              previewError.message ||
              'Unable to generate PDF preview.',
          },
        }))
      })

    return () => {
      cancelled = true
    }
  }, [previewKey])

  // ===================================================
  // CLEANUP GENERATED PDF URLS
  // ===================================================

  useEffect(() => {
    const urls = previewUrlsRef.current

    return () => {
      Object.values(urls).forEach((url) => {
        if (url?.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [])

  // ===================================================
  // ERRORS
  // ===================================================

  if (error || persistence.loadError) {
    return (
      <div
        className="message"
        role="alert"
      >
        <p>
          {error || persistence.loadError}
        </p>

        <button
          type="button"
          onClick={() => navigate('/')}
        >
          Back
        </button>

        <button
          type="button"
          onClick={() =>
            window.location.reload()
          }
        >
          Retry Load
        </button>
      </div>
    )
  }

  // ===================================================
  // LOADING
  // ===================================================

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

  // ===================================================
  // SHARED DOCUMENT FIELDS
  // ===================================================

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

    businessAddress:
      setup.businessAddress,

    authorizedRepresentative:
      setup.submittedBy,

    submittedBy:
      setup.submittedBy,
  }

  const bidValue = {
    ...createInitialBidSecurityState(
      sharedProject
    ),

    ...bidSecurity,

    ...common,

    templateVariant,

    representativeDesignation:
      setup.designation,

    designation:
      setup.designation,
  }

  const omnibusValue = {
    ...(
      omnibus ??
      createInitialOmnibusState(
        sharedProject
      )
    ),

    ...common,

    designation:
      setup.designation,
  }

  const scheduleItems = sharedScheduleItems(
    technical,
    schedule
  )

  const selected = projectDocuments.find(
    (doc) => doc.id === activeDocument
  )

  const generated =
    previews[activeDocument]

  // Only display the PDF generated from
  // the currently selected form values.
  const preview = LIVE_PREVIEW.has(
    activeDocument
  )
    ? (
        generated?.key === previewKey
          ? generated.url
          : null
      )
    : (
        selected?.template
          ? `/pdf/templates/${encodeURIComponent(
              selected.template
            )}`
          : null
      )

  const previewError =
    previewErrors[activeDocument]?.key ===
    previewKey
      ? previewErrors[activeDocument].message
      : ''

  // ===================================================
  // SAVE DOCUMENT SETUP
  // ===================================================

  function changeSetup(value) {
    setDocumentSetup(value)

    const next = {
      ...bidSecurity,
      templateVariant,
      documentSetup: value,
    }

    setBidSecurity(next)

    persistence.change(
      'bid_security',
      next
    )
  }

  // ===================================================
  // TECHNICAL SPECIFICATIONS
  // ===================================================

  function changeTechnical(value) {
    setTechnical(value)

    persistence.change(
      'technical_specs',
      value
    )
  }

  // ===================================================
  // SCHEDULE REQUIREMENTS
  // ===================================================

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
    const next =
      schedulePayload(value)

    setSchedule(next)

    persistence.change(
      'schedule_requirements',
      next
    )
  }

  // ===================================================
  // BID SECURITY
  // ===================================================

  function changeBid(value) {
    const next = {
      ...bidSecurity,

      templateVariant:
        normalizeVariant(
          value?.templateVariant
        ),

      documentSetup: setup,
    }

    setBidSecurity(next)

    persistence.change(
      'bid_security',
      next
    )
  }

  function saveBid(value) {
    const next = {
      ...bidSecurity,

      templateVariant:
        normalizeVariant(
          value?.templateVariant
        ),

      documentSetup: setup,
    }

    setBidSecurity(next)

    return persistence.save(
      'bid_security',
      next
    )
  }

  // ===================================================
  // OMNIBUS SWORN STATEMENT
  // ===================================================

  function changeOmnibus(value) {
    setOmnibus(value)

    persistence.change(
      'omnibus',
      value
    )
  }

  // ===================================================
  // SIDEBAR EDITORS
  // ===================================================

  function renderEditor(document) {
    if (document.id === 'slcc') {
      return (
        <SLCCEditor
          value={setup}
          onChange={changeSetup}
        />
      )
    }

    if (document.id === AFTER_SALES_ID) {
      return (
        <AfterSalesEditor
          value={setup}
          onChange={changeSetup}
        />
      )
    }

    if (document.id === WARRANTY_ID) {
      return (
        <WarrantyEditor
          value={setup}
          onChange={changeSetup}
        />
      )
    }

    if (PREVIEW_ONLY.has(document.id)) {
      return null
    }

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

    return (
      <div className="pending-component">
        <p>{document.template}</p>

        {[
          'priceSchedule',
          'summary',
        ].includes(document.id) && (
          <>
            <p>
              Shared items from
              Technical Specifications:
            </p>

            {technical.map((item) => (
              <p key={item.id}>
                Item {item.itemNo}:{' '}
                {item.qty} {item.unit}
                {' - '}
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

  // ===================================================
  // MAIN USER INTERFACE
  // ===================================================

  return (
    <div className="pdf-editor-shell">
      <header className="pdf-editor-topbar">
        <button
          className="button-secondary"
          type="button"
          onClick={async () => {
            try {
              await persistence.retry()
              navigate('/')
            } catch {
              // Keep unsaved changes.
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
              .replace('...', '')
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
            type="button"
            onClick={() =>
              persistence
                .retry()
                .catch(() => {})
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

        <main className="pdf-preview-workspace">
          {!selected ? (
            <p className="neutral-preview">
              Select a document component
              to preview.
            </p>
          ) : (
            <>
              <header className="preview-heading">
                <h2>{selected.title}</h2>

                <p>{setup.projectTitle}</p>

                <p>
                  Reference No.{' '}
                  {setup.referenceNumber}
                </p>
              </header>

              {previewError && (
                <p
                  role="alert"
                  className="message"
                >
                  {previewError}
                </p>
              )}

              {preview ? (
                <>
                  {!PREVIEW_ONLY.has(
                    activeDocument
                  ) && (
                    <p className="pdf-preview-notice">
                      {LIVE_PREVIEW.has(
                        activeDocument
                      )
                        ? (
                            [
                              AFTER_SALES_ID,
                              WARRANTY_ID,
                              'slcc',
                            ].includes(
                              activeDocument
                            )
                              ? 'Live PDF preview - original template with updated text overlay'
                              : 'Live PDF preview'
                          )
                        : 'Static template preview. Editing fields does not modify this PDF yet.'}
                    </p>
                  )}

                  {activeDocument ===
                    AFTER_SALES_ID && (
                    <p>
                      <a
                        href={preview}
                        download="After-Sales-Service-Certificate.pdf"
                      >
                        Download Updated
                        After-Sales PDF
                      </a>
                    </p>
                  )}

                  {activeDocument ===
                    WARRANTY_ID && (
                    <p>
                      <a
                        href={preview}
                        download="Certificate-of-Product-Warranty.pdf"
                      >
                        Download Updated
                        Warranty PDF
                      </a>
                    </p>
                  )}

                  {activeDocument === 'slcc' && (
                    <p>
                      <a
                        href={preview}
                        download={
                          previewData.slccVariant ===
                          'cctv'
                            ? 'SLCC_CCTV.pdf'
                            : 'SLCC_STREETLIGHT.pdf'
                        }
                      >
                        Download Updated
                        SLCC PDF
                      </a>
                    </p>
                  )}

                  <PdfPreview
                    src={preview}
                    title={selected.title}
                  />
                </>
              ) : LIVE_PREVIEW.has(
                  activeDocument
                ) ? (
                <p className="neutral-preview">
                  {previewError
                    ? 'PDF generation failed.'
                    : 'Generating PDF preview...'}
                </p>
              ) : (
                <p className="neutral-preview">
                  A template for{' '}
                  {selected.title} is not
                  available yet.
                </p>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
