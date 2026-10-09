
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { supabase } from '../supabase'

// ==========================================
// PRICE FORMATTING
// ==========================================

const peso = (cents) =>
  `₱ ${new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)}`

const centsOf = (value) => {
  const number = Number(
    String(value ?? '').replace(/,/g, '')
  )

  return Number.isFinite(number) &&
    number > 0
    ? Math.round(number * 100)
    : 0
}

const itemKey = (item, index) =>
  String(item?.id ?? `item-${index + 1}`)

function toEntry(value) {
  if (
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return {
      price: String(value),
      deduction: '',
    }
  }

  return {
    price: String(
      value?.price ??
      value?.totalPricePerUnit ??
      ''
    ),

    deduction: String(
      value?.deduction ?? ''
    ),
  }
}

function firstSpecification(item) {
  return (item?.specificationLines ?? [])
    .map((line) =>
      String(line?.text ?? '').trim()
    )
    .find(Boolean) || 'No specification yet'
}

// ==========================================
// STYLES
// ==========================================

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #dae6df',
  borderRadius: 8,
  padding: '11px 10px',
  fontSize: 13,
  background: '#f7fbf9',
  outlineColor: '#13734e',
}

// ==========================================
// MAIN EDITOR
// ==========================================

export default function PriceScheduleEditor({
  items = [],
  referenceNumber = '',
  onValuesChange,
}) {
  const [values, setValues] = useState({})

  const [loaded, setLoaded] =
    useState(false)

  const [status, setStatus] =
    useState('Loading...')

  const [loadError, setLoadError] =
    useState('')

  const rowIdRef = useRef(null)
  const latestRef = useRef({})
  const dirtyRef = useRef(false)
  const versionRef = useRef(0)
  const saveTimerRef = useRef(null)
  const chainRef = useRef(Promise.resolve())
  const aliveRef = useRef(false)
  const notifyRef = useRef(onValuesChange)

  useEffect(() => {
    notifyRef.current = onValuesChange
  }, [onValuesChange])

  const storageKey =
    `philgeps-price-schedule:${referenceNumber}`

  // ========================================
  // SAVE PRICES TO SUPABASE
  // ========================================

  const persist = useCallback(
    (snapshot, version) => {
      if (!referenceNumber) {
        return Promise.resolve()
      }

      if (aliveRef.current) {
        setStatus('Saving...')
      }

      const task = chainRef.current
        .catch(() => {})
        .then(async () => {
          const payload = {
            reference_number:
              String(referenceNumber),

            total_prices_per_unit:
              snapshot,

            updated_at:
              new Date().toISOString(),
          }

          if (rowIdRef.current !== null) {
            const { data, error } =
              await supabase
                .from('bid_price_schedules')
                .update(payload)
                .eq('id', rowIdRef.current)
                .select('id')
                .single()

            if (error) throw error

            if (!data) {
              throw new Error(
                'Price record was not updated.'
              )
            }
          } else {
            const { data, error } =
              await supabase
                .from('bid_price_schedules')
                .insert(payload)
                .select('id')
                .single()

            if (error) throw error

            rowIdRef.current = data.id
          }
        })

      chainRef.current = task

      task
        .then(() => {
          if (
            version !==
            versionRef.current
          ) {
            return
          }

          dirtyRef.current = false

          try {
            window.localStorage.setItem(
              storageKey,
              JSON.stringify({
                dirty: false,
                values: snapshot,
              })
            )
          } catch {
            // Local backup is optional.
          }

          if (aliveRef.current) {
            setStatus('Saved')
          }
        })
        .catch((error) => {
          if (
            version !==
            versionRef.current
          ) {
            return
          }

          if (aliveRef.current) {
            setStatus(
              `Error saving: ${error.message}`
            )
          }
        })

      return task
    },
    [referenceNumber, storageKey]
  )

  // ========================================
  // LOAD SAVED PRICES
  // ========================================

  useEffect(() => {
    aliveRef.current = true

    let cancelled = false

    async function load() {
      if (!referenceNumber) {
        if (!cancelled) {
          setLoadError(
            'Missing reference number.'
          )
        }

        return
      }

      try {
        const { data, error } =
          await supabase
            .from('bid_price_schedules')
            .select(
              'id,total_prices_per_unit'
            )
            .eq(
              'reference_number',
              String(referenceNumber)
            )
            .order('updated_at', {
              ascending: false,
            })
            .limit(1)

        if (error) throw error
        if (cancelled) return

        const record = data?.[0] ?? null

        rowIdRef.current =
          record?.id ?? null

        const remote =
          record?.total_prices_per_unit ??
          {}

        let cache

        try {
          cache = JSON.parse(
            window.localStorage.getItem(
              storageKey
            ) || 'null'
          )
        } catch {
          cache = null
        }

        const restored = cache?.dirty
          ? {
              ...remote,
              ...cache.values,
            }
          : remote

        latestRef.current = restored

        setValues(restored)
        setLoaded(true)

        notifyRef.current?.(restored)

        if (cache?.dirty) {
          dirtyRef.current = true

          const version =
            ++versionRef.current

          setStatus('Unsaved')

          saveTimerRef.current =
            window.setTimeout(() => {
              void persist(
                restored,
                version
              )
            }, 650)
        } else {
          setStatus('Saved')
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error.message ||
            'Unable to load prices.'
          )
        }
      }
    }

    void load()

    return () => {
      cancelled = true
      aliveRef.current = false

      window.clearTimeout(
        saveTimerRef.current
      )

      // Save when switching documents.
      if (dirtyRef.current) {
        void persist(
          latestRef.current,
          versionRef.current
        )
      }
    }
  }, [
    referenceNumber,
    storageKey,
    persist,
  ])

  // ========================================
  // HANDLE PRICE INPUT
  // ========================================

  function changePrice(
    item,
    index,
    field,
    text
  ) {
    if (
      !/^\d*(?:\.\d{0,2})?$/.test(text)
    ) {
      return
    }

    const key = itemKey(item, index)

    const previous = toEntry(
      latestRef.current[key]
    )

    const next = {
      ...latestRef.current,

      [key]: {
        ...previous,
        [field]: text,
      },
    }

    latestRef.current = next
    dirtyRef.current = true

    const version =
      ++versionRef.current

    setValues(next)
    setStatus('Unsaved')

    notifyRef.current?.(next)

    // Instant local backup.
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          dirty: true,
          values: next,
        })
      )
    } catch {
      // Supabase remains primary storage.
    }

    window.clearTimeout(
      saveTimerRef.current
    )

    // Supabase autosave.
    saveTimerRef.current =
      window.setTimeout(() => {
        void persist(
          next,
          version
        )
      }, 650)
  }

  // ========================================
  // LOADING / ERROR
  // ========================================

  if (loadError) {
    return (
      <div
        style={{
          padding: 12,
          color: '#b42318',
          fontSize: 12,
        }}
      >
        Unable to load Price Schedule:
        {' '}
        {loadError}

        <p>
          Check Supabase access,
          then reopen this section.
        </p>
      </div>
    )
  }

  if (!loaded) {
    return (
      <p
        style={{
          padding: 12,
          fontSize: 12,
        }}
      >
        Loading saved prices...
      </p>
    )
  }

  // ========================================
  // MAIN UI
  // ========================================

  return (
    <div className="premium-pricing"
    >

      {/* TITLE / SAVE STATUS */}

      <div
        style={{
          marginBottom: 12,
        }}
      >
        <strong
          style={{
            fontSize: 14,
          }}
        >
          Price Schedule for Goods
        </strong>

        <div
          style={{
            fontSize: 11,
            marginTop: 5,
            color: status.startsWith('Error')
              ? '#b42318'
              : '#64776c',
          }}
        >
          {status === 'Saved'
            ? '✓ Saved automatically'
            : status}
        </div>

        {status.startsWith('Error') && (
          <button
            type="button"
            onClick={() => {
              void persist(
                latestRef.current,
                versionRef.current
              )
            }}
            style={{
              marginTop: 7,
            }}
          >
            Retry Save
          </button>
        )}
      </div>

      {/* EMPTY ITEMS */}

      {(
        !Array.isArray(items) ||
        !items.length
      ) && (
        <p
          style={{
            fontSize: 12,
          }}
        >
          Add items in Technical
          Specifications first.
        </p>
      )}

      {/* =================================== */}
      {/* ITEM CARDS */}
      {/* =================================== */}

      {(Array.isArray(items)
        ? items
        : []
      ).map((item, index) => {
        const entry = toEntry(
          values[itemKey(item, index)]
        )

        // ORIGINAL UNIT PRICE
        const priceCents =
          centsOf(entry.price)

        // OPTIONAL DEDUCTION
        const deductionCents =
          centsOf(entry.deduction)

        // ADJUSTED UNIT PRICE
        const adjustedCents = Math.max(
          0,
          priceCents - deductionCents
        )

        // AUTOMATIC BREAKDOWN
        const cost50 = Math.round(
          adjustedCents * 0.5
        )

        const transport20 = Math.round(
          adjustedCents * 0.2
        )

        const tax30 =
          adjustedCents -
          cost50 -
          transport20

        const quantity = Math.max(
          0,
          Number(
            String(item.qty ?? '')
              .replace(/,/g, '')
          ) || 0
        )

        // FINAL DELIVERED TOTAL
        const finalCents = Math.round(
          adjustedCents * quantity
        )

        const hasPrice =
          entry.price.trim() !== ''

        const deductionTooLarge =
          deductionCents > priceCents

        const title =
          firstSpecification(item)

        return (
          <article
            key={itemKey(item, index)}
            style={{
              background: '#fbfdfb',
              border: '1px solid #cfe1d6',
              borderRadius: 13,
              padding: 12,
              marginBottom: 12,
            }}
          >

            {/* ITEM HEADER */}

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                gap: 6,
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  background: '#08613f',
                  color: '#ffffff',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '5px 10px',
                  borderRadius: 20,
                }}
              >
                ITEM {index + 1}
              </span>

              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#4c6356',
                  textAlign: 'right',
                }}
              >
                {item.qty || '—'}{' '}
                {item.unit || ''}
              </span>
            </div>

            {/* ITEM DESCRIPTION */}

            <p
              style={{
                fontWeight: 700,
                fontSize: 12,
                lineHeight: 1.4,
                margin: '11px 0 12px',
                overflowWrap: 'anywhere',
              }}
            >
              {title}
            </p>

            {/* TOTAL PRICE PER UNIT */}

            <label
              style={{
                fontSize: 11,
                display: 'block',
                marginBottom: 4,
              }}
            >
              Total Price per Unit (100%)
            </label>

            <div
              style={{
                position: 'relative',
                marginBottom: 7,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 10,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                ₱
              </span>

              <input
                aria-label={
                  `Item ${index + 1} total price per unit`
                }
                inputMode="decimal"
                value={entry.price}
                placeholder="0.00"
                onChange={(e) =>
                  changePrice(
                    item,
                    index,
                    'price',
                    e.target.value
                  )
                }
                style={{
                  ...inputStyle,
                  paddingLeft: 29,
                }}
              />
            </div>

            <div
              style={{
                fontSize: 10,
                color: '#7a897f',
                marginBottom: 11,
              }}
            >
              Enter the 100% unit price
            </div>

            {/* OPTIONAL DEDUCTION */}

            <label
              style={{
                fontSize: 11,
                display: 'block',
                marginBottom: 4,
              }}
            >
              Deduction (optional)
            </label>

            <div
              style={{
                position: 'relative',
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 10,
                  fontSize: 12,
                }}
              >
                − ₱
              </span>

              <input
                aria-label={
                  `Item ${index + 1} deduction per unit`
                }
                inputMode="decimal"
                value={entry.deduction}
                placeholder="0.00"
                onChange={(e) =>
                  changePrice(
                    item,
                    index,
                    'deduction',
                    e.target.value
                  )
                }
                style={{
                  ...inputStyle,
                  paddingLeft: 36,
                  background: '#fff9f6',
                }}
              />
            </div>

            <div
              style={{
                fontSize: 10,
                color: deductionTooLarge
                  ? '#b42318'
                  : '#7a897f',
                marginBottom: 12,
              }}
            >
              {deductionTooLarge
                ? 'Deduction cannot exceed the unit price.'
                : 'Optional amount deducted from unit price'}
            </div>

            {/* PRICE COMPUTATIONS */}

            <div
              style={{
                fontSize: 11,
                lineHeight: 1.9,
              }}
            >
              {[
                [
                  'Adjusted Total Price per Unit',
                  adjustedCents,
                ],
                [
                  'Unit Price/Item (50%)',
                  cost50,
                ],
                [
                  'Transportation & Insurance (20%)',
                  transport20,
                ],
                [
                  'Sales & Other Taxes (30%)',
                  tax30,
                ],
              ].map(([label, amount]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      color: '#69788a',
                    }}
                  >
                    {label}
                  </span>

                  <strong
                    style={{
                      fontSize: 11,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {hasPrice
                      ? peso(amount)
                      : '—'}
                  </strong>
                </div>
              ))}
            </div>

            {/* TOTAL DELIVERED PRICE */}

            <div
              style={{
                borderTop:
                  '1px solid #d8e6de',
                marginTop: 12,
                paddingTop: 10,
              }}
            >
              <div
                style={{
                  borderRadius: 9,
                  background: '#e4f2ea',
                  padding: 10,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    gap: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#34634e',
                    marginBottom: 7,
                  }}
                >
                  <span>
                    TOTAL DELIVERED PRICE
                  </span>

                  <span>
                    AUTO
                  </span>
                </div>

                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: 7,
                    padding: '11px 9px',
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#075a3a',
                  }}
                >
                  {hasPrice
                    ? peso(finalCents)
                    : '₱ —'}
                </div>
              </div>
            </div>

          </article>
        )
      })}
    </div>
  )
}
