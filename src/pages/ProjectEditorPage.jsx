
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

import {
  generateTechnicalSpecsPreview,
} from '../services/pdf/technicalSpecsPdf'

import {
  generateScheduleRequirementsPreview,
} from '../services/pdf/schedulePdf'

import useEditorPersistence from '../hooks/useEditorPersistence'

import { createTechnicalItem } from '../lib/technicalSpecs'

import {
  createInitialBidSecurityState,
} from '../lib/bidSecurity'

import {
  createInitialOmnibusState,
} from '../lib/omnibus'

import {
  createDocumentSetup,
  setupProject,
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

// ======================================================
// DOCUMENT IDS
// ======================================================

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

// ======================================================
// PREVIEW CONFIGURATION
// ======================================================

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
  'technical',
  'schedule',
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

function yearsFromSetup(value) {
  const match = String(
    value?.servicePeriod ?? ''
  ).match(/\b(\d+)\b/)

  return value?.servicePeriodYears ??
    (match ? Number(match[1]) : 1)
}

function slccVariantFromSetup(value) {
  if (
    ['cctv', 'streetlight'].includes(
      value?.slccVariant
    )
  ) {
    return value.slccVariant
  }

  return /cctv/i.test(
    value?.projectTitle ?? ''
  )
    ? 'cctv'
    : 'streetlight'
}

// ======================================================
// TECHNICAL + SCHEDULE SYNCHRONIZATION
// ======================================================

// Technical Specifications supplies:
// - Item Number
// - Specification Lines
// - Qty
// - Unit
// - Markers
// - Bold formatting
//
// Schedule Requirements supplies:
// - Delivery Period (editable)
//
// Match by the original Technical Item ID.
// Use Item Number as a fallback for older records.

function mergeScheduleWithTechnical(
  technical,
  schedule,
  defaultPeriod = ''
) {
  const techItems = Array.isArray(technical)
    ? technical
    : []

  const savedItems = Array.isArray(schedule)
    ? schedule
    : []

  return techItems.map((item, index) => {
    const technicalId = String(
      item?.id ?? `technical-${index + 1}`
    )

    const existing =
      savedItems.find(
        (saved) =>
          String(
            saved.sharedItemId ??
            saved.id ??
            ''
          ) === technicalId
      ) ??
      savedItems.find(
        (saved) =>
          String(saved.itemNo ?? '') ===
          String(index + 1)
      )

    const sourceLines = Array.isArray(
      item?.specificationLines
    )
      ? item.specificationLines
      : []

    const specificationLines =
      sourceLines.map((line, lineIndex) => ({
        id: String(
          line?.id ??
          `${technicalId}-line-${lineIndex}`
        ),

        text: String(
          line?.text ?? ''
        ),

        marker: String(
          line?.marker ?? ''
        ),

        bold: line?.bold === true,

        compliance: String(
          line?.compliance ?? 'COMPLY'
        ),
      }))

    if (!specificationLines.length) {
      specificationLines.push({
        id: `${technicalId}-line-0`,
        text: '',
        marker: '',
        bold: false,
        compliance: 'COMPLY',
      })
    }

    return {
      id: String(
        existing?.id ?? technicalId
      ),

      sharedItemId: technicalId,

      itemNo: String(index + 1),

      qty: String(
        item?.qty ?? ''
      ),

      unit: String(
        item?.unit ?? ''
      ),

      specificationLines,

      deliveryPeriod: String(
        existing?.deliveryPeriod ??
        defaultPeriod ??
        ''
      ),
    }
  })
}

// ======================================================
// MAIN COMPONENT
// ======================================================

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

  // ===================================================
  // STATES
  // ===================================================

  const [project, setProject] =
    useState(null)

  const [error, setError] =
    useState('')

  const [
    activeDocument,
    setActiveDocument,
  ] = useState(null)

  const [technical, setTechnical] =
    useState(() => [createTechnicalItem(1)])

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
      const items = Array.isArray(
        saved?.technical_specs
      )
        ? saved.technical_specs
        : [createTechnicalItem(1)]

      setTechnical(items)

      setSchedule(
        Array.isArray(
          saved?.schedule_requirements
        )
          ? saved.schedule_requirements
          : []
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
      .then(({ data, error: loadError }) => {
        if (loadError) {
          throw loadError
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
  // AUTOMATIC DELIVERY PERIOD
  // ===================================================

  const defaultDeliveryPeriod =
    project?.delivery_period ??
    project?.deliveryPeriod ??
    ''

  // ===================================================
  // SYNCHRONIZED SCHEDULE ITEMS
  // ===================================================

  const scheduleItems =
    mergeScheduleWithTechnical(
      technical,
      schedule,
      defaultDeliveryPeriod
    )

  // ===================================================
  // PREVIEW DATA
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

        // SLCC

        slccVariant:
          slccVariantFromSetup(setup),

        slccContractTypes:
          setup.slccContractTypes ?? {},

        slccEntries:
          setup.slccEntries ?? {},

        // =========================================
        // TECHNICAL + SCHEDULE
        // =========================================

        items:
          activeDocument === 'technical'
            ? technical
            : activeDocument === 'schedule'
              ? scheduleItems
              : undefined,

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

    // ===============================================
    // PDF GENERATORS
    // ===============================================

    const generators = {
      contents:
        generateTableOfContentsPreview,

      ongoing:
        generateOngoingContractsPreview,

      slcc:
        generateSlccPreview,

      technical:
        generateTechnicalSpecsPreview,

      // DYNAMIC SCHEDULE PDF

      schedule:
        generateScheduleRequirementsPreview,

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
          typeof url !== 'string' ||
          !url
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

        setPreviews((previous) => ({
          ...previous,

          [documentId]: {
            url,
            key: previewKey,
          },
        }))

        setPreviewErrors((previous) => ({
          ...previous,

          [documentId]: null,
        }))

        // Release previous PDF preview.

        if (
          oldUrl &&
          oldUrl !== url &&
          oldUrl.startsWith('blob:')
        ) {
          URL.revokeObjectURL(oldUrl)
        }
      })
      .catch((generationError) => {
        if (cancelled) {
          return
        }

        console.error(
          `${documentId} PDF generation failed:`,
          generationError
        )

        setPreviewErrors((previous) => ({
          ...previous,

          [documentId]: {
            key: previewKey,

            message:
              generationError.message ||
              'Unable to generate PDF preview.',
          },
        }))
      })

    return () => {
      cancelled = true
    }
  }, [previewKey])

  // ===================================================
  // CLEAN UP GENERATED PDF URLS
  // ===================================================

  useEffect(() => {
    const urls =
      previewUrlsRef.current

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

  // ===================================================
  // BID SECURITY VALUES
  // ===================================================

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

  // ===================================================
  // OMNIBUS VALUES
  // ===================================================

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

  // ===================================================
  // SELECTED DOCUMENT
  // ===================================================

  const selected = projectDocuments.find(
    (doc) => doc.id === activeDocument
  )

  const generated =
    previews[activeDocument]

  // Only show PDF matching current values.

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

  function saveTechnical(value) {
    const next = Array.isArray(value)
      ? value
      : technical

    setTechnical(next)

    return persistence.save(
      'technical_specs',
      next
    )
  }

  // ===================================================
  // SCHEDULE REQUIREMENTS
  // ===================================================

  function schedulePayload(value) {
    return mergeScheduleWithTechnical(
      technical,
      value,
      defaultDeliveryPeriod
    )
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

  function saveSchedule(value) {
    const next =
      schedulePayload(value)

    setSchedule(next)

    return persistence.save(
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
  // SIDEBAR DOCUMENT EDITORS
  // ===================================================

  function renderEditor(document) {
    // SLCC

    if (document.id === 'slcc') {
      return (
        <SLCCEditor
          value={setup}
          onChange={changeSetup}
        />
      )
    }

    // AFTER-SALES

    if (document.id === AFTER_SALES_ID) {
      return (
        <AfterSalesEditor
          value={setup}
          onChange={changeSetup}
        />
      )
    }

    // WARRANTY

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

    // ===============================================
    // TECHNICAL SPECIFICATIONS
    // ===============================================

    if (document.id === 'technical') {
      return (
        <TechnicalSpecsEditor
          compact
          project={sharedProject}
          value={technical}
          onChange={changeTechnical}
          onSave={saveTechnical}
        />
      )
    }

    // ===============================================
    // SCHEDULE REQUIREMENTS
    // ===============================================

    if (document.id === 'schedule') {
      return (
        <ScheduleEditor
          project={sharedProject}
          value={scheduleItems}
          onChange={changeSchedule}
          onSave={saveSchedule}
        />
      )
    }

    // ===============================================
    // BID SECURITY
    // ===============================================

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

    // ===============================================
    // OMNIBUS
    // ===============================================

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

    // ===============================================
    // OTHER DOCUMENTS
    // ===============================================

    return (
      <div className="pending-component">
        <p>
          {document.template}
        </p>

        {[
          'priceSchedule',
          'summary',
        ].includes(document.id) && (
          <>
            <p>
              Shared items from Technical Specifications:
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
  // MAIN INTERFACE
  // ===================================================

  return (
    <div className="pdf-editor-shell">

      {/* TOP HEADER */}

      <header className="pdf-editor-topbar">
        <button
          className="button-secondary"
          type="button"
          onClick={async () => {
            try {
              await persistence.retry()
              navigate('/')
            } catch {
              // Keep unsaved changes
              // if network save fails.
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

      {/* BODY */}

      <div className="pdf-editor-body">

        {/* LEFT SIDEBAR */}

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

        {/* RIGHT PDF PREVIEW */}

        <main className="pdf-preview-workspace">

          {!selected ? (
            <p className="neutral-preview">
              Select a document component to preview.
            </p>
          ) : (
            <>
              <header className="preview-heading">
                <h2>
                  {selected.title}
                </h2>

                <p>
                  {setup.projectTitle}
                </p>

                <p>
                  Reference No.{' '}
                  {setup.referenceNumber}
                </p>
              </header>

              {/* PREVIEW ERROR */}

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

                  {/* PREVIEW STATUS */}

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

                  {/* AFTER-SALES DOWNLOAD */}

                  {activeDocument ===
                    AFTER_SALES_ID && (
                    <p>
                      <a
                        href={preview}
                        download="After-Sales-Service-Certificate.pdf"
                      >
                        Download Updated After-Sales PDF
                      </a>
                    </p>
                  )}

                  {/* WARRANTY DOWNLOAD */}

                  {activeDocument ===
                    WARRANTY_ID && (
                    <p>
                      <a
                        href={preview}
                        download="Certificate-of-Product-Warranty.pdf"
                      >
                        Download Updated Warranty PDF
                      </a>
                    </p>
                  )}

                  {/* TECHNICAL SPECIFICATIONS DOWNLOAD */}

                  {activeDocument === 'technical' && (
                    <p>
                      <a
                        href={preview}
                        download={`Technical_Specifications_${setup.referenceNumber || 'document'}.pdf`}
                      >
                        Download Updated Technical Specifications PDF
                      </a>
                    </p>
                  )}

                  {/* SCHEDULE REQUIREMENTS DOWNLOAD */}

                  {activeDocument === 'schedule' && (
                    <p>
                      <a
                        href={preview}
                        download={`Schedule_of_Requirements_${setup.referenceNumber || 'document'}.pdf`}
                      >
                        Download Updated Schedule of Requirements PDF
                      </a>
                    </p>
                  )}

                  {/* SLCC DOWNLOAD */}

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
                        Download Updated SLCC PDF
                      </a>
                    </p>
                  )}

                  {/* LIVE PDF VIEW */}

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
                  {selected.title} is not available yet.
                </p>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
