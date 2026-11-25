import { getSlccVariant, getSlccContractType, getSlccEntry } from '../lib/slccEntries'
import { useEffect, useRef, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { appendPdfAsA4 } from '../services/pdf/fullBidPackagePdf'

// =====================================================
// STYLES
// =====================================================

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  marginBottom: '6px',
  color: '#374151',
}

const inputStyle = {
  display: 'block',
  width: '100%',
  padding: '9px',
  fontSize: '12px',
  border: '1px solid #d1d5db',
  borderRadius: '5px',
  backgroundColor: '#ffffff',
  color: '#111827',
  boxSizing: 'border-box',
}

const groupStyle = {
  marginBottom: '15px',
}

// =====================================================
// MAIN SLCC EDITOR
// =====================================================

export default function SLCCEditor({
  value = {},
  onChange,
}) {
  const variant = getSlccVariant(value)
  const contractType = getSlccContractType(value, variant)
  const entry = getSlccEntry(value, variant, contractType)
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const latest = useRef(value)
  const active = useRef(true)
  useEffect(() => { latest.current = value }, [value])
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])

  async function uploadSupporting(file) {
    if (!file) return
    const bidderId = value.bidderId
    setUploading(true)
    setUploadError('')
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Choose a PDF smaller than 10 MB.')
      const source = await PDFDocument.load(await file.arrayBuffer())
      if (!source.getPageCount()) throw new Error('The PDF has no pages.')
      const normalized = await PDFDocument.create()
      await appendPdfAsA4(normalized, source)
      const bytes = await normalized.save()
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Unable to read PDF.'))
        reader.readAsDataURL(new Blob([bytes], { type: 'application/pdf' }))
      })
      if (active.current && latest.current.bidderId === bidderId) {
        onChange?.({ ...latest.current, slccSupportingUpload: { name: file.name, dataUrl } })
      }
    } catch (error) {
      if (active.current) setUploadError(error.message || 'Unable to upload PDF.')
    } finally {
      if (active.current) setUploading(false)
    }
  }

  // ===================================================
  // UPDATE SELECTED TEMPLATE
  // ===================================================

  function updateTemplate(nextVariant) {
    onChange?.({
      ...value,
      slccVariant: nextVariant,
    })
  }

  // ===================================================
  // UPDATE CONTRACT TYPE
  // ===================================================

  function updateContractType(nextType) {
    onChange?.({
      ...value,

      slccContractTypes: {
        ...(value.slccContractTypes ?? {}),
        [variant]: nextType,
      },
    })
  }

  // ===================================================
  // UPDATE CONTRACT DETAILS
  // ===================================================

  function updateField(field, newValue) {
    onChange?.({
      ...value,

      slccEntries: {
        ...(value.slccEntries ?? {}),

        [variant]: {
          ...(value.slccEntries?.[variant] ?? {}),

          [contractType]: {
            ...entry,
            [field]: newValue,
          },
        },
      },
    })
  }

  // ===================================================
  // UI
  // ===================================================

  return (
    <div
      className="slcc-editor"
      style={{
        padding: '12px',
        fontSize: '12px',
      }}
    >
      <h4
        style={{
          marginTop: 0,
          marginBottom: '16px',
          fontSize: '13px',
        }}
      >
        SLCC Editor
      </h4>

      {/* ============================================= */}
      {/* TEMPLATE DROPDOWN */}
      {/* ============================================= */}

      <div style={groupStyle}>
        <label
          htmlFor="slcc-template"
          style={labelStyle}
        >
          SLCC Supporting Docs
        </label>

        <select
          id="slcc-template"
          value={variant}
          onChange={(event) =>
            updateTemplate(event.target.value)
          }
          style={inputStyle}
        >
          <option value="cctv">
            CCTV
          </option>

          <option value="streetlight">
            STREETLIGHT
          </option>
          <option value="none">NONE</option>
        </select>
      </div>

      <div style={groupStyle}>
        <label htmlFor="slcc-supporting-upload" style={labelStyle}>Upload supporting PDF</label>
        <input id="slcc-supporting-upload" type="file" accept="application/pdf,.pdf" disabled={uploading}
          onChange={event => { void uploadSupporting(event.target.files?.[0]); event.target.value = '' }} />
        <p>{uploading ? 'Converting PDF to A4...' : 'Uploaded pages are resized to A4 and included immediately after the SLCC in the bid package.'}</p>
        {uploadError && <p role="alert">{uploadError}</p>}
        {value.slccSupportingUpload?.dataUrl && <>
          <a href={value.slccSupportingUpload.dataUrl} target="_blank" rel="noreferrer">{value.slccSupportingUpload.name} (A4)</a>
          <button type="button" disabled={uploading} onClick={() => onChange?.({ ...value, slccSupportingUpload: null })}>Remove PDF</button>
        </>}
      </div>

      <fieldset disabled={variant === 'none'} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>

      {/* ============================================= */}
      {/* CONTRACT TYPE DROPDOWN */}
      {/* ============================================= */}

      <div style={groupStyle}>
        <label
          htmlFor="slcc-contract-type"
          style={labelStyle}
        >
          Contract Type
        </label>

        <select
          id="slcc-contract-type"
          value={contractType}
          onChange={(event) =>
            updateContractType(event.target.value)
          }
          style={inputStyle}
        >
          <option value="government">
            GOVERNMENT
          </option>

          <option value="private">
            PRIVATE
          </option>
        </select>
      </div>

      {/* ============================================= */}
      {/* OWNER'S DETAILS - ONE INPUT ONLY */}
      {/* ============================================= */}

      <div style={groupStyle}>
        <label
          htmlFor="slcc-owner"
          style={labelStyle}
        >
          Owner's Name / Address /
          Telephone Number
        </label>

        <textarea
          id="slcc-owner"
          rows={4}
          value={entry.ownerDetails ?? ''}
          placeholder={
            'Enter Owner Name, Address, and Telephone Number'
          }
          onChange={(event) =>
            updateField(
              'ownerDetails',
              event.target.value
            )
          }
          style={{
            ...inputStyle,
            resize: 'vertical',
          }}
        />
      </div>

      {/* ============================================= */}
      {/* NATURE OF WORK */}
      {/* ============================================= */}

      <div style={groupStyle}>
        <label
          htmlFor="slcc-nature"
          style={labelStyle}
        >
          Nature of Work
        </label>

        <textarea
          id="slcc-nature"
          rows={3}
          value={entry.natureOfWork ?? ''}
          onChange={(event) =>
            updateField(
              'natureOfWork',
              event.target.value
            )
          }
          style={{
            ...inputStyle,
            resize: 'vertical',
          }}
        />

        <small
          style={{
            color: '#6b7280',
            fontSize: '10px',
          }}
        >
          Default: SUPPLY AND DELIVERY.
          You can change this anytime.
        </small>
      </div>

      {/* ============================================= */}
      {/* DESCRIPTION */}
      {/* ============================================= */}

      <div style={groupStyle}>
        <label
          htmlFor="slcc-description"
          style={labelStyle}
        >
          Description
        </label>

        <textarea
          id="slcc-description"
          rows={4}
          value={entry.description ?? ''}
          placeholder="Enter Description"
          onChange={(event) =>
            updateField(
              'description',
              event.target.value
            )
          }
          style={{
            ...inputStyle,
            resize: 'vertical',
          }}
        />
      </div>

      {[
        ['percentage', "Bidder's Role (%)", 1],
        ['awardCompletion', 'Amount of Award / Amount at Completion / Duration', 4],
        ['dates', 'Date Awarded / Contract Effectivity / Date Completed', 4],
      ].map(([field, label, rows]) => (
        <div key={field} style={groupStyle}>
          <label htmlFor={'slcc-' + field} style={labelStyle}>{label}</label>
          <textarea
            id={'slcc-' + field}
            rows={rows}
            value={entry[field] ?? ''}
            onChange={event => updateField(field, event.target.value)}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          {rows > 1 && <small>Keep each amount, duration, or date on its own line.</small>}
        </div>
      ))}

      {/* ============================================= */}
      {/* CURRENT SELECTION INFORMATION */}
      {/* ============================================= */}

      </fieldset>

      <div
        style={{
          padding: '10px',
          backgroundColor: '#f3f4f6',
          borderRadius: '5px',
          border: '1px solid #e5e7eb',
          marginTop: '12px',
        }}
      >
        <strong
          style={{
            display: 'block',
            marginBottom: '6px',
          }}
        >
          Current Selection
        </strong>

        <p style={{ margin: '4px 0' }}>
          Template:{' '}
          <strong>
            {variant.toUpperCase()}
          </strong>
        </p>

        <p style={{ margin: '4px 0' }}>
          Contract:{' '}
          <strong>
            {contractType.toUpperCase()}
          </strong>
        </p>

        <p
          style={{
            fontSize: '11px',
            margin: '8px 0 0',
            color: '#4b5563',
          }}
        >
          {variant === 'none' ? 'All GOVERNMENT and PRIVATE row values will show NONE.' : contractType === 'government'
            ? 'GOVERNMENT details are editable. All PRIVATE row values will show NONE.'
            : 'PRIVATE details are editable. All GOVERNMENT row values will show NONE.'}
        </p>
      </div>

      <p
        style={{
          marginTop: '12px',
          color: '#6b7280',
          fontSize: '11px',
          lineHeight: 1.5,
        }}
      >
        The PDF preview updates automatically.
        Project information, bidder details,
        and signature fields follow the
        Document Setup above.
      </p>
    </div>
  )
}
