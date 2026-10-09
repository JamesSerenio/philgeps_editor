import DashboardIcon from '../components/DashboardIcon'

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
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
  generateFullBidPackagePdf,
} from '../services/pdf/fullBidPackagePdf'

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

import {
  generatePriceSchedulePreview,
} from '../services/pdf/priceSchedulePdf'

import {
  generateSummaryPreview,
} from '../services/pdf/summaryPdf'

import {
  generateBidFormPreview,
} from '../services/pdf/bidFormPdf'

// NEW: SECRETARY'S CERTIFICATE
import {
  generateSecretaryCertificatePreview,
} from '../services/pdf/secretarysCertificatePdf'

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
import PriceScheduleEditor from '../editors/PriceScheduleEditor'
import SummaryEditor from '../editors/SummaryEditor'
import BidFormEditor from '../editors/BidFormEditor'
import BidSecurityEditor from '../editors/BidSecurityEditor'
import OmnibusEditor from '../editors/OmnibusEditor'
import AfterSalesEditor from '../editors/AfterSalesEditor'
import WarrantyEditor from '../editors/WarrantyEditor'
import SLCCEditor from '../editors/SLCCEditor'

// =====================================================
// DOCUMENT IDENTIFIERS
// =====================================================

const AFTER_SALES_ID =
  projectDocuments.find((doc) =>
    /after[\s-]*sales/i.test(
      `${doc.title || ''} ${doc.id || ''}`
    )
  )?.id ?? 'afterSales'

const WARRANTY_ID =
  projectDocuments.find((doc) =>
    /certificate of product warranty/i.test(
      `${doc.title || ''} ${doc.id || ''}`
    )
  )?.id ?? 'warranty'

const BID_FORM_ID =
  projectDocuments.find((doc) =>
    /^bid\s*form$/i.test(
      String(doc.title ?? '').trim()
    ) ||
    /^bid[_-]?form$/i.test(
      String(doc.id ?? '')
    )
  )?.id ?? 'bidForm'

// NEW: SECRETARY'S CERTIFICATE IDENTIFIER
const SECRETARY_ID = 'secretaryCertificate'

// =====================================================
// DOCUMENT PREVIEW CONFIGURATION
// =====================================================

const PREVIEW_ONLY = new Set([
  'contents',
  'ongoing',
  'nfcc',
  'manpower',

  // Secretary's Certificate gets its values
  // automatically from Document Setup.
  SECRETARY_ID,
])

const LIVE_PREVIEW = new Set([
  'contents',
  'ongoing',
  'slcc',
  'technical',
  'schedule',
  'priceSchedule',
  'summary',
  BID_FORM_ID,
  'nfcc',
  'bidSecurity',
  'manpower',
  'omnibus',
  AFTER_SALES_ID,
  WARRANTY_ID,

  // NEW
  SECRETARY_ID,
])

// =====================================================
// HELPERS
// =====================================================

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

// =====================================================
// TECHNICAL TO SCHEDULE SYNCHRONIZATION
// =====================================================

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

  const sharedPeriod = String(
    savedItems.find(
      (item) => item?.deliveryPeriod != null
    )?.deliveryPeriod ??
    defaultPeriod ??
    ''
  )

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
        text: String(line?.text ?? ''),
        marker: String(line?.marker ?? ''),
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
      id: String(existing?.id ?? technicalId),
      sharedItemId: technicalId,
      itemNo: String(index + 1),
      qty: String(item?.qty ?? ''),
      unit: String(item?.unit ?? ''),
      specificationLines,
      deliveryPeriod: sharedPeriod,
    }
  })
}

// =====================================================
// MAIN PAGE
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
  const [panelOpen, setPanelOpen] = useState(false)

  // ===================================================
  // STATES
  // ===================================================

  const [project, setProject] = useState(null)
  const [error, setError] = useState('')

  const [
    activeDocument,
    setActiveDocument,
  ] = useState(null)

  const [technical, setTechnical] = useState(
    () => [createTechnicalItem(1)]
  )

  const [schedule, setSchedule] = useState([])
  const [bidSecurity, setBidSecurity] = useState(null)
  const [omnibus, setOmnibus] = useState(null)

  const [
    documentSetup,
    setDocumentSetup,
  ] = useState(null)

  // ===================================================
  // PRICE SCHEDULE STATE
  // ===================================================

  const [priceValues, setPriceValues] = useState({})

  // ===================================================
  // SHARED PRICE DATA
  // USED BY SUMMARY AND BID FORM
  // ===================================================

  const [pricingRefresh, setPricingRefresh] = useState(0)

  const [pricingSaved, setPricingSaved] = useState({
    key: '',
    status: 'idle',
    prices: {},
    error: '',
  })

  // ===================================================
  // PDF STATES
  // ===================================================

  const [previews, setPreviews] = useState({})
  const [previewErrors, setPreviewErrors] = useState({})

  const previewUrlsRef = useRef({})

  // ===================================================
  // COMPLETE PDF GENERATION STATES
  // ===================================================

  const [generatingAll, setGeneratingAll] = useState(false)
  const [generateAllError, setGenerateAllError] = useState('')

  // ===================================================
  // SUPABASE EDITOR PERSISTENCE
  // ===================================================

  const persistence = useEditorPersistence(
    id,
    (saved) => {
      setTechnical(
        Array.isArray(saved?.technical_specs)
          ? saved.technical_specs
          : [createTechnicalItem(1)]
      )

      setSchedule(
        Array.isArray(saved?.schedule_requirements)
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
        saved?.bid_security?.documentSetup ?? null
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
  // DOCUMENT SETUP
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

  const defaultDeliveryPeriod =
    project?.delivery_period ??
    project?.deliveryPeriod ??
    ''

  const scheduleItems =
    mergeScheduleWithTechnical(
      technical,
      schedule,
      defaultDeliveryPeriod
    )

  // ===================================================
  // LOAD SAVED PRICES FROM SUPABASE
  // FOR SUMMARY OF BID PRICES AND BID FORM
  // ===================================================

  const referenceNumber = String(
    setup?.referenceNumber ?? ''
  )

  const isPricingDocument =
    activeDocument === 'summary' ||
    activeDocument === BID_FORM_ID

  const pricingRequestKey =
    `${referenceNumber}:${pricingRefresh}`

  const pricingReady =
    pricingSaved.key === pricingRequestKey &&
    pricingSaved.status === 'ready'

  useEffect(() => {
    if (
      !isPricingDocument ||
      !referenceNumber
    ) {
      return undefined
    }

    let cancelled = false

    async function fetchPrices() {
      try {
        const {
          data,
          error: queryError,
        } = await supabase
          .from('bid_price_schedules')
          .select('total_prices_per_unit')
          .eq('reference_number', referenceNumber)
          .order('updated_at', {
            ascending: false,
          })
          .limit(1)

        if (queryError) {
          throw queryError
        }

        const remote =
          data?.[0]?.total_prices_per_unit ?? {}

        let cache = null

        try {
          cache = JSON.parse(
            window.localStorage.getItem(
              `philgeps-price-schedule:${referenceNumber}`
            ) || 'null'
          )
        } catch {
          // Ignore invalid local backup.
        }

        const prices =
          cache?.dirty &&
          cache.values &&
          typeof cache.values === 'object'
            ? {
                ...remote,
                ...cache.values,
              }
            : remote

        if (!cancelled) {
          setPricingSaved({
            key: pricingRequestKey,
            status: 'ready',
            prices,
            error: '',
          })
        }
      } catch (loadError) {
        if (!cancelled) {
          setPricingSaved({
            key: pricingRequestKey,
            status: 'error',
            prices: {},
            error:
              loadError?.message ||
              'Unable to load saved prices.',
          })
        }
      }
    }

    void fetchPrices()

    return () => {
      cancelled = true
    }
  }, [
    isPricingDocument,
    referenceNumber,
    pricingRequestKey,
  ])

  // ===================================================
  // LIVE PDF PREVIEW DATA
  // ===================================================

  const previewData =
    setup &&
    (
      !isPricingDocument ||
      pricingReady
    )
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

          // ============================================
          // NEW: SECRETARY'S CERTIFICATE DATA
          // ============================================

          corporateSecretaryName:
            setup.corporateSecretaryName ?? '',

          companyPresidentName:
            setup.companyPresidentName ?? '',

          boardMeetingDate:
            setup.boardMeetingDate ?? '',

          // ============================================
          // EXISTING FIELDS
          // ============================================

          servicePeriodYears:
            yearsFromSetup(setup),

          productWarrantyYears:
            setup.productWarrantyYears ?? 2,

          slccVariant:
            slccVariantFromSetup(setup),

          slccContractTypes:
            setup.slccContractTypes ?? {},

          slccEntries:
            setup.slccEntries ?? {},

          // ============================================
          // TECHNICAL ITEMS
          // ============================================

          items:
            activeDocument === 'technical' ||
            activeDocument === 'priceSchedule' ||
            activeDocument === 'summary' ||
            activeDocument === BID_FORM_ID
              ? technical
              : activeDocument === 'schedule'
                ? scheduleItems
                : undefined,

          // ============================================
          // PRICE SCHEDULE / SUMMARY / BID FORM VALUES
          // ============================================

          priceValues:
            activeDocument === 'priceSchedule'
              ? priceValues
              : isPricingDocument
                ? pricingSaved.prices
                : undefined,

          templateVariant:
            activeDocument === 'omnibus'
              ? (
                  omnibus?.templateVariant === 'initao_lgu'
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
      contents: generateTableOfContentsPreview,
      ongoing: generateOngoingContractsPreview,
      slcc: generateSlccPreview,
      technical: generateTechnicalSpecsPreview,
      schedule: generateScheduleRequirementsPreview,
      priceSchedule: generatePriceSchedulePreview,

      // ================================================
      // SUMMARY OF BID PRICES
      // ================================================

      summary: generateSummaryPreview,

      // ================================================
      // BID FORM
      // ================================================

      [BID_FORM_ID]: generateBidFormPreview,

      nfcc: generateNfccPreview,
      bidSecurity: generateBidSecurityPreview,
      manpower: generateManpowerPreview,
      omnibus: generateOmnibusPreview,

      // ================================================
      // NEW: SECRETARY'S CERTIFICATE
      // ================================================

      [SECRETARY_ID]:
        generateSecretaryCertificatePreview,

      // ================================================
      // EXISTING DOCUMENTS
      // ================================================

      [AFTER_SALES_ID]: generateAfterSalesPreview,
      [WARRANTY_ID]: generateProductWarrantyPreview,
    }

    const generator = generators[documentId]

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

        previewUrlsRef.current[documentId] = url

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
  // PDF URL CLEANUP
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
  // ERROR SCREEN
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
          onClick={() => window.location.reload()}
        >
          Retry Load
        </button>
      </div>
    )
  }

  // ===================================================
  // LOADING SCREEN
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
  // COMMON DOCUMENT FIELDS
  // ===================================================

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
    designation: setup.designation,
  }

  // ===================================================
  // SELECTED DOCUMENT
  // ===================================================

  const selected = projectDocuments.find(
    (doc) => doc.id === activeDocument
  )

  const generated = previews[activeDocument]

  const preview = LIVE_PREVIEW.has(activeDocument)
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
    previewErrors[activeDocument]?.key === previewKey
      ? previewErrors[activeDocument].message
      : ''

  // ===================================================
  // DOCUMENT SETUP SAVE
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
  // TECHNICAL SPECIFICATIONS SAVE
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
  // SCHEDULE REQUIREMENTS SAVE
  // ===================================================

  function schedulePayload(value) {
    return mergeScheduleWithTechnical(
      technical,
      value,
      defaultDeliveryPeriod
    )
  }

  function changeSchedule(value) {
    const next = schedulePayload(value)

    setSchedule(next)

    persistence.change(
      'schedule_requirements',
      next
    )
  }

  function saveSchedule(value) {
    const next = schedulePayload(value)

    setSchedule(next)

    return persistence.save(
      'schedule_requirements',
      next
    )
  }

  // ===================================================
  // BID SECURITY SAVE
  // ===================================================

  function changeBid(value) {
    const next = {
      ...bidSecurity,
      templateVariant: normalizeVariant(
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
      templateVariant: normalizeVariant(
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
  // OMNIBUS SAVE
  // ===================================================

  function changeOmnibus(value) {
    setOmnibus(value)

    persistence.change(
      'omnibus',
      value
    )
  }

  // ===================================================
  // GENERATE COMPLETE BID DOCUMENT PACKAGE
  // ===================================================


async function handleGenerateAll() {
  if (generatingAll || !setup) return

  setGeneratingAll(true)
  setGenerateAllError('')

  try {
    // ==========================================
    // 1. SAVE ALL PENDING EDITOR CHANGES
    // ==========================================

    await persistence.retry()

    // ==========================================
    // 2. PROJECT INFORMATION
    // ==========================================

    const ref = String(
      setup.referenceNumber ?? ''
    ).trim()

    if (!ref) {
      throw new Error(
        'Reference Number is missing.'
      )
    }

    const projectTitle = String(
      setup.projectTitle ?? ''
    ).trim()


    // ==========================================
    // 3. AUTOMATIC PDF FILENAME
    // ==========================================

    const cleanProjectTitle = String(
      projectTitle ?? ''
    )
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 150)
      .replace(/_+$/g, '')

    const pdfFilename = `${
      cleanProjectTitle ||
      `BID_DOCUMENTS_${ref}`
    }.pdf`


    // ==========================================
    // 4. LOAD SAVED PRICE SCHEDULE
    // ==========================================

    const {
      data,
      error: priceError,
    } = await supabase
      .from('bid_price_schedules')
      .select('total_prices_per_unit')
      .eq('reference_number', ref)
      .order('updated_at', {
        ascending: false,
      })
      .limit(1)

    if (priceError) {
      throw priceError
    }

    const remote =
      data?.[0]?.total_prices_per_unit ?? {}

    // ==========================================
    // 5. PRESERVE UNSYNCED LOCAL PRICE DATA
    // ==========================================

    let cache = null

    try {
      cache = JSON.parse(
        window.localStorage.getItem(
          `philgeps-price-schedule:${ref}`
        ) || 'null'
      )
    } catch {
      // Ignore invalid local cache.
    }

    const savedPrices = {
      ...remote,

      ...(
        cache?.dirty &&
        cache.values &&
        typeof cache.values === 'object'
          ? cache.values
          : {}
      ),

      ...priceValues,
    }

    // ==========================================
    // 6. GENERATE THE COMPLETE 21-DOCUMENT PDF
    // ==========================================

    const url = await generateFullBidPackagePdf({
      setup: {
        ...setup,

        slccVariant:
          slccVariantFromSetup(setup),

        servicePeriodYears:
          yearsFromSetup(setup),
      },

      technical,

      schedule: scheduleItems,

      priceValues: savedPrices,

      bidSecurity,

      omnibus,
    })

    if (
      typeof url !== 'string' ||
      !url
    ) {
      throw new Error(
        'Complete PDF generator returned no PDF URL.'
      )
    }

    // ==========================================
    // 7. DOWNLOAD USING PROJECT TITLE
    // ==========================================

    const link = document.createElement('a')

    link.href = url

    // IMPORTANT:
    // Filename now comes from Project Title.
    link.download = pdfFilename

    document.body.appendChild(link)

    link.click()

    link.remove()

    console.info(
      'Generated PDF filename:',
      pdfFilename
    )

    // ==========================================
    // 8. CLEAN UP TEMPORARY PDF URL
    // ==========================================

    if (url.startsWith('blob:')) {
      window.setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 60000)
    }

  } catch (generationError) {
    console.error(
      'Complete PDF generation failed:',
      generationError
    )

    setGenerateAllError(
      generationError?.message ||
      'Unable to generate complete bid PDF.'
    )

  } finally {
    setGeneratingAll(false)
  }
}


  // ===================================================
  // ALL DOCUMENT EDITORS
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

    // AFTER SALES
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

    // ================================================
    // PRICE SCHEDULE FOR GOODS
    // ================================================

    if (document.id === 'priceSchedule') {
      return (
        <PriceScheduleEditor
          key={setup.referenceNumber}
          items={technical}
          referenceNumber={setup.referenceNumber}
          onValuesChange={setPriceValues}
        />
      )
    }

    // ================================================
    // SUMMARY OF BID PRICES - VIEW ONLY
    // ================================================

    if (document.id === 'summary') {
      return (
        <SummaryEditor
          items={technical}
          priceValues={
            pricingReady
              ? pricingSaved.prices
              : {}
          }
          loading={
            !pricingReady &&
            pricingSaved.status !== 'error'
          }
          error={
            pricingSaved.key === pricingRequestKey
              ? pricingSaved.error
              : ''
          }
        />
      )
    }

    // ================================================
    // BID FORM - VIEW ONLY
    // ================================================

    if (document.id === BID_FORM_ID) {
      return (
        <BidFormEditor
          items={technical}
          priceValues={
            pricingReady
              ? pricingSaved.prices
              : {}
          }
          setup={setup}
          loading={
            !pricingReady &&
            pricingSaved.status !== 'error'
          }
          error={
            pricingSaved.key === pricingRequestKey
              ? pricingSaved.error
              : ''
          }
        />
      )
    }

    // ================================================
    // PREVIEW ONLY DOCUMENTS
    // INCLUDING SECRETARY'S CERTIFICATE
    // ================================================

    if (PREVIEW_ONLY.has(document.id)) {
      return null
    }

    // ================================================
    // TECHNICAL SPECIFICATIONS
    // ================================================

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

    // ================================================
    // SCHEDULE REQUIREMENTS
    // ================================================

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

    // ================================================
    // BID SECURITY DECLARATION
    // ================================================

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

    // ================================================
    // OMNIBUS SWORN STATEMENT
    // ================================================

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

    // OTHER DOCUMENTS
    return (
      <div className="pending-component">
        <p>{document.template}</p>
      </div>
    )
  }

  // ===================================================
  // MAIN INTERFACE
  // ===================================================

  return (
    <div className={`pdf-editor-shell${panelOpen ? ' panel-open' : ''}`}>
      <header className="pdf-editor-topbar">
        <button
          className="button-secondary editor-back"
          type="button"
          aria-label="Back to projects"
          onClick={async () => {
            try {
              await persistence.retry()
              navigate('/')
            } catch {
              // Keep editor open if saving fails.
            }
          }}
        >
          <DashboardIcon name="back" /><span className="back-label">Back</span>
        </button>

        <div className="editor-brand">
          <span className="editor-brand-mark"><DashboardIcon name="document" className="editor-icon" /></span>
          <div className="editor-brand-copy">
            <h1>Bid Docs PDF Editor</h1>
            <p className="editor-context" title={setup.projectTitle}>{setup.referenceNumber ? 'Ref. ' + setup.referenceNumber + ' / ' : ''}{setup.projectTitle}</p>
          </div>
        </div>
        <button type="button" className="button-secondary mobile-panel-toggle" aria-expanded={panelOpen} aria-controls="editor-setup-panel" onClick={() => setPanelOpen(!panelOpen)}>
          <DashboardIcon name="panel" />{panelOpen ? 'View preview' : 'Edit documents'}
        </button>

        {/* GENERATE COMPLETE PDF BUTTON */}
        <button
          className="generate-primary"
          type="button"
          aria-busy={generatingAll}
          onClick={handleGenerateAll}
          disabled={generatingAll}
        >
          {generatingAll ? <span className="editor-spinner" aria-hidden="true" /> : <DashboardIcon name="download" />}
          {generatingAll
            ? 'Generating PDF...'
            : 'Generate PDF'}
        </button>

        {generateAllError && (
          <span
            role="alert"
            className="save-error-detail"
          >
            {generateAllError}
          </span>
        )}

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
            type="button"
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
        <ProjectSidebar
          onShowPreview={() => setPanelOpen(false)}
          activeDocument={activeDocument}

          // Connect sidebar Generate PDF button.
          onGenerate={handleGenerateAll}
          generating={generatingAll}

          onSelectDocument={(nextId) => {
            // Reload saved prices when opening
            // Summary or Bid Form.
            if (
              nextId === 'summary' ||
              nextId === BID_FORM_ID
            ) {
              setPricingRefresh(
                (previous) => previous + 1
              )
            }

            setActiveDocument(nextId)
          }}
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
            <div className="neutral-preview">
              <span className="editor-brand-mark"><DashboardIcon name="document" width="28" height="28" /></span>
              <span className="workspace-kicker">Your document workspace</span>
              <h2>Prepare with confidence.</h2>
              <p>Select a document component to edit its details and review the PDF. Your project information is shared across your bid documents.</p>
              <small>Review your documents, then generate your complete bid package.</small>
            </div>
          ) : (
            <>
              <header className="preview-heading">
                <span className="workspace-kicker">Document preview</span>
                <h2>{selected.title}</h2>

                <p>{setup.projectTitle}</p>

                <p>
                  Reference No. {setup.referenceNumber}
                </p>
              </header>

              {isPricingDocument &&
                pricingSaved.key === pricingRequestKey &&
                pricingSaved.error && (
                  <p
                    role="alert"
                    className="message"
                  >
                    Unable to load price schedule:
                    {' '}
                    {pricingSaved.error}
                  </p>
                )}

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
                  {!PREVIEW_ONLY.has(activeDocument) && (
                    <p className="pdf-preview-notice">
                      {LIVE_PREVIEW.has(activeDocument)
                        ? (
                            [
                              AFTER_SALES_ID,
                              WARRANTY_ID,
                              'slcc',
                            ].includes(activeDocument)
                              ? 'Live PDF preview - original template with updated text overlay'
                              : 'Live PDF preview'
                          )
                        : 'Static template preview. Editing fields does not modify this PDF yet.'}
                    </p>
                  )}

                  {/* AFTER SALES DOWNLOAD */}
                  {activeDocument === AFTER_SALES_ID && (
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
                  {activeDocument === WARRANTY_ID && (
                    <p>
                      <a
                        href={preview}
                        download="Certificate-of-Product-Warranty.pdf"
                      >
                        Download Updated Warranty PDF
                      </a>
                    </p>
                  )}

                  {/* TECHNICAL SPECS DOWNLOAD */}
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

                  {/* SCHEDULE DOWNLOAD */}
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

                  {/* PRICE SCHEDULE DOWNLOAD */}
                  {activeDocument === 'priceSchedule' && (
                    <p>
                      <a
                        href={preview}
                        download={`Price_Schedule_for_Goods_${setup.referenceNumber || 'document'}.pdf`}
                      >
                        Download Updated Price Schedule PDF
                      </a>
                    </p>
                  )}

                  {/* SUMMARY OF BID PRICES DOWNLOAD */}
                  {activeDocument === 'summary' && (
                    <p>
                      <a
                        href={preview}
                        download={`Summary_of_Bid_Prices_${setup.referenceNumber || 'document'}.pdf`}
                      >
                        Download Updated Summary of Bid Prices PDF
                      </a>
                    </p>
                  )}

                  {/* BID FORM DOWNLOAD */}
                  {activeDocument === BID_FORM_ID && (
                    <p>
                      <a
                        href={preview}
                        download={`Bid_Form_${setup.referenceNumber || 'document'}.pdf`}
                      >
                        Download Updated Bid Form PDF
                      </a>
                    </p>
                  )}

                  {/* ====================================
                      NEW: SECRETARY'S CERTIFICATE
                      DOWNLOAD
                  ==================================== */}

                  {activeDocument === SECRETARY_ID && (
                    <p>
                      <a
                        href={preview}
                        download={`Secretarys_Certificate_${setup.referenceNumber || 'document'}.pdf`}
                      >
                        Download Updated Secretary's Certificate PDF
                      </a>
                    </p>
                  )}

                  {/* SLCC DOWNLOAD */}
                  {activeDocument === 'slcc' && (
                    <p>
                      <a
                        href={preview}
                        download={
                          previewData.slccVariant === 'cctv'
                            ? 'SLCC_CCTV.pdf'
                            : 'SLCC_STREETLIGHT.pdf'
                        }
                      >
                        Download Updated SLCC PDF
                      </a>
                    </p>
                  )}

                  <PdfPreview
                    src={preview}
                    title={selected.title}
                  />
                </>
              ) : LIVE_PREVIEW.has(activeDocument) ? (
                <p className="neutral-preview">
                  {previewError
                    ? 'PDF generation failed.'
                    : isPricingDocument &&
                        pricingSaved.error
                      ? 'Unable to load prices for this document.'
                      : 'Generating PDF preview...'}
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
