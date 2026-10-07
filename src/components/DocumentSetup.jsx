import { useRef } from 'react'

import {
  bidders,
  formatLongDate,
  representatives,
} from '../lib/documentSetup'

export default function DocumentSetup({
  value,
  onChange,
}) {
  const dateInputRef = useRef(null)

  const textFields = [
    ['province', 'Province'],
    ['municipality', 'Municipality'],
    ['projectTitle', 'Project Title'],
    ['referenceNumber', 'Reference Number'],
    ['procuringEntity', 'Procuring Entity'],
  ]

  function openDatePicker() {
    const input = dateInputRef.current

    if (!input) return

    if (typeof input.showPicker === 'function') {
      input.showPicker()
    } else {
      input.click()
    }
  }

  function handleBidderChange(event) {
    const bidderName = event.target.value

    const selectedBidder =
      bidders.find(
        (bidder) =>
          bidder.name === bidderName,
      )

    onChange({
      ...value,
      bidderName,
      businessAddress:
        selectedBidder?.address || '',
    })
  }

  function handleRepresentativeChange(
    event,
  ) {
    const submittedBy =
      event.target.value

    const representative =
      representatives.find(
        (person) =>
          person.name ===
          submittedBy,
      )

    onChange({
      ...value,
      submittedBy,
      designation:
        representative?.designation ||
        '',
    })
  }

  return (
    <section className="document-setup">
      <h2>Document Setup</h2>

      <h3>Project Information</h3>

      {textFields.map(
        ([key, label]) => (
          <label key={key}>
            {label}

            {key === 'projectTitle' ? (
              <textarea
                aria-label={label}
                rows={2}
                value={value[key] || ''}
                onChange={(event) =>
                  onChange({
                    ...value,
                    [key]:
                      event.target.value,
                  })
                }
              />
            ) : (
              <input
                aria-label={label}
                type="text"
                value={value[key] || ''}
                onChange={(event) =>
                  onChange({
                    ...value,
                    [key]:
                      event.target.value,
                  })
                }
              />
            )}
          </label>
        ),
      )}

      <label>
        Bidder Name

        <select
          aria-label="Bidder Name"
          value={value.bidderName || ''}
          onChange={handleBidderChange}
        >
          <option value="">
            Select bidder
          </option>

          {value.bidderName &&
            !bidders.some(
              (bidder) =>
                bidder.name ===
                value.bidderName,
            ) && (
              <option
                value={value.bidderName}
              >
                {value.bidderName}
              </option>
            )}

          {bidders.map(
            (bidder) => (
              <option
                key={bidder.name}
                value={bidder.name}
              >
                {bidder.name}
              </option>
            ),
          )}
        </select>
      </label>

      <label>
        Business Address

        <textarea
          aria-label="Business Address"
          rows={2}
          value={
            value.businessAddress || ''
          }
          onChange={(event) =>
            onChange({
              ...value,
              businessAddress:
                event.target.value,
            })
          }
        />
      </label>

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
              formatLongDate(value.date) ||
              ''
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
              transform:
                'translateY(-50%)',
              border: 'none',
              background:
                'transparent',
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
              onChange({
                ...value,
                date:
                  event.target.value,
              })
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

      <label>
        Designation

        <input
          aria-label="Designation"
          type="text"
          value={
            value.designation || ''
          }
          readOnly
        />
      </label>
    </section>
  )
}