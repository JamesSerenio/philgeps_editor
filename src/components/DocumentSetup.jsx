
import { useRef } from 'react'
import TemplateSelector from './TemplateSelector'
import {
  changeBidderAddress,
  selectBidder,
} from '../lib/bidderAddresses'

import {
  bidders,
  formatLongDate,
  representatives,
} from '../lib/documentSetup'

export default function DocumentSetup({
  value,
  onChange,
  templateVariant = 'old_default',
  onTemplateChange,
  isBlankEditor = false,
}) {
  const dateInputRef = useRef(null)
const deadlineInputRef = useRef(null)

  const selectedBidder = bidders.find(
    (bidder) =>
      bidder.id === value.bidderId ||
      bidder.name === value.bidderName ||
      (bidder.aliases || []).includes(value.bidderName),
  )

  // Supports the saved flag or the project-level prop.
const showBlankDeadline = isBlankEditor === true

  const closingDate = String(
    value.closingDate ?? '',
  ).slice(0, 10)

  const validClosingDate =
    /^\d{4}-\d{2}-\d{2}$/.test(closingDate)
      ? closingDate
      : ''

  const textFields = [
    ['province', 'Province'],
    ['municipality', 'Municipality'],
    ['projectTitle', 'Project Title'],
    ['referenceNumber', 'Reference Number'],
    ['procuringEntity', 'Procuring Entity'],
  ]

  function updateField(key, fieldValue) {
    onChange({
      ...value,
      [key]: fieldValue,
    })
  }

  function openDatePicker() {
    const input = dateInputRef.current

    if (!input) return

    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker()
      } else {
        input.click()
      }
    } catch {
      input.focus()
    }
  }


function openDeadlinePicker() {
  const input = deadlineInputRef.current

  if (!input) return

  try {
    if (typeof input.showPicker === 'function') {
      input.showPicker()
    } else {
      input.click()
    }
  } catch {
    input.focus()
  }
}


  function handleBidderChange(event) {
    onChange(
      selectBidder(value, event.target.value),
    )
  }

  function handleRepresentativeChange(event) {
    const submittedBy = event.target.value

    const representative = representatives.find(
      (person) => person.name === submittedBy,
    )

    onChange({
      ...value,
      submittedBy,
      designation:
        representative?.designation || '',
    })
  }

  function handleClosingDateChange(event) {
    const nextDate = event.target.value

    // Keep the value date-only (YYYY-MM-DD).
    // Do not convert it to a UTC timestamp here.
    onChange({
      ...value,
      isBlankEditor: true,
      closingDate: nextDate,
    })
  }

  return (
    <section className="document-setup">
      <div className="document-setup-heading">
        <h2>Document Setup</h2>

        {onTemplateChange && (
          <TemplateSelector
            value={templateVariant}
            onChange={onTemplateChange}
          />
        )}
      </div>

      <h3>Project Information</h3>

      {/* PROJECT INFORMATION */}

      {textFields.map(([key, label]) => (
        <label key={key}>
          {label}

          {key === 'projectTitle' ? (
            <textarea
              aria-label={label}
              rows={2}
              value={value[key] || ''}
              onChange={(event) =>
                updateField(
                  key,
                  event.target.value,
                )
              }
            />
          ) : (
            <input
              aria-label={label}
              type="text"
              value={value[key] || ''}
              onChange={(event) =>
                updateField(
                  key,
                  event.target.value,
                )
              }
            />
          )}
        </label>
      ))}

      {/* BIDDER NAME */}

      <label>
        Bidder Name

        <select
          aria-label="Bidder Name"
          value={selectedBidder?.name || ''}
          onChange={handleBidderChange}
        >
          <option value="">
            Select bidder
          </option>

          {bidders.map((bidder) => (
            <option
              key={bidder.name}
              value={bidder.name}
            >
              {bidder.name}
            </option>
          ))}
        </select>
      </label>

      {/* BUSINESS ADDRESS */}

      <label>
        Business Address

        <textarea
          aria-label="Business Address"
          rows={2}
          value={value.businessAddress || ''}
          onChange={(event) =>
            onChange(
              changeBidderAddress(
                value,
                event.target.value,
              ),
            )
          }
        />
      </label>

      {/* DOCUMENT DATE */}

      <label>
        Date

        <div
          style={{
            position: 'relative',
          }}
        >
          <input
            aria-label="Date"
            type="text"
            value={
              formatLongDate(value.date) || ''
            }
            readOnly
            onClick={openDatePicker}
            style={{
              cursor: 'pointer',
              paddingRight: '38px',
            }}
          />

          <button
            type="button"
            aria-label="Choose date"
            title="Choose date"
            onClick={openDatePicker}
            style={{
              position: 'absolute',
              right: '6px',
              top: '50%',
              transform: 'translateY(-50%)',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '4px 6px',
              fontSize: '16px',
              lineHeight: 1,
            }}
          >
            📅
          </button>

          <input
            ref={dateInputRef}
            type="date"
            value={value.date || ''}
            onChange={(event) =>
              updateField(
                'date',
                event.target.value,
              )
            }
            tabIndex={-1}
            aria-hidden="true"
            style={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              opacity: 0,
              pointerEvents: 'none',
            }}
          />
        </div>
      </label>


{/* NEW BLANK EDITOR DEADLINE */}
{/* LONG DATE FORMAT - REQUIRED */}

{showBlankDeadline && (
  <label>
    Closing / Deadline (Required)

    <div
      style={{
        position: 'relative',
      }}
    >
      <input
        aria-label="Closing / Deadline"
        type="text"
        value={
          validClosingDate
            ? formatLongDate(validClosingDate)
            : ''
        }
        placeholder="Select deadline"
        readOnly
        onClick={openDeadlinePicker}
        aria-required="true"
        style={{
          cursor: 'pointer',
          paddingRight: '38px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />

      <button
        type="button"
        aria-label="Choose closing deadline"
        title="Choose closing deadline"
        onClick={openDeadlinePicker}
        style={{
          position: 'absolute',
          right: '6px',
          top: '50%',
          transform: 'translateY(-50%)',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          padding: '4px 6px',
          fontSize: '16px',
          lineHeight: 1,
        }}
      >
        📅
      </button>

      <input
        ref={deadlineInputRef}
        type="date"
        aria-label="Choose closing deadline date"
        value={validClosingDate}
        onChange={handleClosingDateChange}
        required
        tabIndex={-1}
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    </div>

    {!validClosingDate && (
      <small
        style={{
          display: 'block',
          marginTop: '5px',
          color: '#b45309',
          fontSize: '11px',
        }}
      >
        Please select a closing date before
        generating bid documents.
      </small>
    )}
  </label>
)}


      {/* SUBMITTED BY */}

      <label>
        Submitted By

        <select
          aria-label="Submitted By"
          value={value.submittedBy ?? ''}
          onChange={handleRepresentativeChange}
        >
          <option value="">
            Select Submitted By
          </option>

          {value.submittedBy &&
            !representatives.some(
              (person) =>
                person.name === value.submittedBy,
            ) && (
              <option value={value.submittedBy}>
                {value.submittedBy}
              </option>
            )}

          <option value="JHO ANN Q. CLEOPAS">
            JHO ANN Q. CLEOPAS
          </option>

          <option value="CARLOS RAFAEL A. JAMILO">
            CARLOS RAFAEL A. JAMILO
          </option>

          <option value="MARLJONE BLAIRE B. TINGTING">
            MARLJONE BLAIRE B. TINGTING
          </option>
        </select>
      </label>

      {/* DESIGNATION */}

      <label>
        Designation

        <input
          aria-label="Designation"
          type="text"
          value={value.designation || ''}
          readOnly
        />
      </label>
    </section>
  )
}
