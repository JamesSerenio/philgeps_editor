import { useRef } from 'react'
import {
  formatLongDate,
  representatives,
} from '../lib/documentSetup'

export default function DocumentSetup({
  value,
  onChange,
}) {
  const dateInputRef = useRef(null)

  const fields = [
    ['province', 'Province'],
    ['municipality', 'Municipality'],
    ['projectTitle', 'Project Title'],
    ['referenceNumber', 'Reference Number'],
    ['procuringEntity', 'Procuring Entity'],
    ['bidderName', 'Bidder Name'],
    ['businessAddress', 'Business Address'],
  ]

  function openDatePicker() {
    const input = dateInputRef.current

    if (!input) {
      return
    }

    if (typeof input.showPicker === 'function') {
      input.showPicker()
    } else {
      input.click()
    }
  }

  function handleDateChange(event) {
    onChange({
      ...value,
      date: event.target.value,
    })
  }

  return (
    <section className="document-setup">
      <h2>Document Setup</h2>

      <h3>Project Information</h3>

      {fields.map(([key, label]) => (
        <label key={key}>
          {label}

          {[
            'projectTitle',
            'businessAddress',
          ].includes(key) ? (
            <textarea
              aria-label={label}
              rows={2}
              value={value[key] || ''}
              onChange={(event) =>
                onChange({
                  ...value,
                  [key]: event.target.value,
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
                  [key]: event.target.value,
                })
              }
            />
          )}
        </label>
      ))}

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
            onChange={handleDateChange}
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
          value={value.submittedBy || ''}
          onChange={(event) => {
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
          }}
        >
          <option value="">
            Select representative
          </option>

          {value.submittedBy &&
            !representatives.some(
              (person) =>
                person.name ===
                value.submittedBy,
            ) && (
              <option
                value={value.submittedBy}
              >
                {value.submittedBy}
              </option>
            )}

          {representatives.map(
            (person) => (
              <option
                key={person.name}
                value={person.name}
              >
                {person.name}
              </option>
            ),
          )}
        </select>
      </label>

      <label>
        Designation

        <input
          aria-label="Designation"
          type="text"
          value={value.designation || ''}
          onChange={(event) =>
            onChange({
              ...value,
              designation:
                event.target.value,
            })
          }
        />
      </label>
    </section>
  )
}