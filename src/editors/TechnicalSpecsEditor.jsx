
import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'

// ==========================================
// AVAILABLE SYMBOLS
// ==========================================

const MARKERS = [
  { value: '', label: 'None' },
  { value: '•', label: '•' },
  { value: '○', label: '○' },
  { value: '■', label: '■' },
  { value: '➢', label: '➢' },
  { value: '✓', label: '✓' },
]

// ==========================================
// SEARCHABLE / EDITABLE UNITS
// ==========================================

const UNITS = [
  'unit', 'units', 'set', 'sets',
  'pc', 'pcs', 'piece', 'pieces',
  'lot', 'pair', 'roll', 'sheet',
  'box', 'boxes', 'pack', 'box/pack',
  'bag', 'bags', 'bd.ft',
  'm', 'mm', 'cm', 'km',
  'sq.m', 'm²', 'cu.m', 'm³',
  'lm', 'l', 'ml', 'gal',
  'kg', 'g', 'mg', 'lb', 'ton',
  'hour', 'hours', 'day', 'days',
  'month', 'months',
]

// ==========================================
// STYLES
// ==========================================

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: 8,
  fontSize: 12,
  border: '1px solid #ccd8d1',
  borderRadius: 6,
  background: '#fff',
  color: '#111827',
}

const buttonStyle = {
  padding: '6px 9px',
  fontSize: 11,
  border: '1px solid #c5d9cf',
  borderRadius: 6,
  background: '#f7fbf8',
  color: '#11593b',
  cursor: 'pointer',
}

const labelStyle = {
  display: 'block',
  fontSize: 11,
  color: '#31554a',
  margin: '8px 0 4px',
}

// ==========================================
// UNIQUE ID
// ==========================================

function makeId() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `id_${Date.now()}_${Math.random().toString(36).slice(2)}`
  )
}

// ==========================================
// NORMALIZE SPECIFICATION LINE
// ==========================================

function normalizeLine(
  line,
  lineIndex,
  itemIndex
) {
  const source =
    typeof line === 'string'
      ? { text: line }
      : (line || {})

  const rawText = String(
    source.text ??
    source.specification ??
    ''
  )

  const match = rawText.match(
    /^\s*([•○■➢✓])\s*/u
  )

  return {
    ...source,

    id: String(
      source.id ||
      `line_${itemIndex}_${lineIndex}`
    ),

    marker: String(
      source.marker ??
      match?.[1] ??
      ''
    ),

    text:
      source.marker == null && match
        ? rawText.slice(match[0].length)
        : rawText,

    compliance: String(
      source.compliance ?? 'COMPLY'
    ),

    // BOLD STATE
    bold: source.bold === true,
  }
}

// ==========================================
// NORMALIZE SPECIFICATION ITEM
// ==========================================

function normalizeItem(item, itemIndex) {
  const source = item || {}

  const sourceLines =
    Array.isArray(source.specificationLines)
      ? source.specificationLines
      : Array.isArray(source.lines)
        ? source.lines
        : Array.isArray(source.specifications)
          ? source.specifications
          : typeof source.specification === 'string'
            ? source.specification.split('\n')
            : []

  const specificationLines = (
    sourceLines.length
      ? sourceLines
      : ['']
  ).map(
    (line, index) =>
      normalizeLine(
        line,
        index,
        itemIndex
      )
  )

  return {
    ...source,

    id: String(
      source.id ||
      `item_${itemIndex + 1}`
    ),

    itemNo: String(itemIndex + 1),

    qty: String(source.qty ?? ''),

    unit: String(source.unit ?? ''),

    selectedMarker: String(
      source.selectedMarker ??
      specificationLines.at(-1)?.marker ??
      ''
    ),

    specificationLines,
  }
}

// ==========================================
// MAIN TECHNICAL SPECS EDITOR
// ==========================================

export default function TechnicalSpecsEditor({
  value = [],
  onChange,
  onSave,
  compact = false,
}) {
  const listId = useId().replace(/:/g, '_')

  const inputs = useRef({})

  const pendingFocus = useRef(null)

  // ========================================
  // CURRENT ITEMS
  // ========================================

  const items = useMemo(() => {
    const source =
      Array.isArray(value) && value.length
        ? value
        : [{}]

    return source.map(normalizeItem)
  }, [value])

  // ========================================
  // AUTOMATIC FOCUS ON NEXT LINE
  // ========================================

  useLayoutEffect(() => {
    const id = pendingFocus.current

    if (!id) return

    const target = inputs.current[id]

    if (!target) return

    target.focus()

    target.setSelectionRange(0, 0)

    target.scrollIntoView({
      block: 'nearest',
      behavior: 'auto',
    })

    pendingFocus.current = null
  }, [items])

  // ========================================
  // APPLY ALL CHANGES
  // ========================================

  function apply(nextItems) {
    onChange?.(
      nextItems.map((item, index) => ({
        ...item,

        itemNo: String(index + 1),

        qty: String(item.qty ?? ''),

        unit: String(item.unit ?? ''),

        specificationLines:
          item.specificationLines.map(
            (line) => ({
              ...line,

              text: String(line.text ?? ''),

              marker: String(
                line.marker ?? ''
              ),

              compliance: String(
                line.compliance ?? 'COMPLY'
              ),

              // SEND BOLD TO SAVING SYSTEM
              bold: line.bold === true,
            })
          ),
      }))
    )
  }

  // ========================================
  // UPDATE ITEM
  // ========================================

  function updateItem(
    itemIndex,
    changes
  ) {
    apply(
      items.map((item, index) =>
        index === itemIndex
          ? {
              ...item,
              ...changes,
            }
          : item
      )
    )
  }

  // ========================================
  // UPDATE SPECIFICATION LINE
  // ========================================

  function updateLine(
    itemIndex,
    lineIndex,
    changes
  ) {
    const item = items[itemIndex]

    if (!item) return

    updateItem(itemIndex, {
      specificationLines:
        item.specificationLines.map(
          (line, index) =>
            index === lineIndex
              ? {
                  ...line,
                  ...changes,
                }
              : line
        ),
    })
  }

  // ========================================
  // ADD LINE UNDER SAME ITEM
  // ========================================

  function addLine(
    itemIndex,
    afterIndex,
    marker
  ) {
    const item = items[itemIndex]

    if (!item) return

    const id = makeId()

    const specificationLines = [
      ...item.specificationLines,
    ]

    specificationLines.splice(
      afterIndex + 1,
      0,
      {
        id,
        text: '',

        marker: String(
          marker ??
          item.selectedMarker ??
          ''
        ),

        compliance: 'COMPLY',

        // NEW LINE STARTS NORMAL
        bold: false,
      }
    )

    pendingFocus.current = id

    updateItem(itemIndex, {
      specificationLines,
    })
  }

  // ========================================
  // REMOVE LINE
  // ========================================

  function removeLine(
    itemIndex,
    lineIndex
  ) {
    const item = items[itemIndex]

    if (!item) return

    let specificationLines =
      item.specificationLines.filter(
        (_, index) =>
          index !== lineIndex
      )

    if (!specificationLines.length) {
      specificationLines = [
        {
          id: makeId(),
          text: '',
          marker: '',
          compliance: 'COMPLY',
          bold: false,
        },
      ]
    }

    updateItem(itemIndex, {
      specificationLines,
    })
  }

  // ========================================
  // SELECT SYMBOL
  // ========================================

  function chooseMarker(
    itemIndex,
    marker
  ) {
    const item = items[itemIndex]

    if (!item) return

    const specificationLines = [
      ...item.specificationLines,
    ]

    const lastIndex =
      specificationLines.length - 1

    const lastLine =
      specificationLines[lastIndex]

    // If the last line contains text,
    // automatically create a new line.

    if (lastLine.text.trim()) {
      const id = makeId()

      specificationLines.push({
        id,
        text: '',
        marker,
        compliance: 'COMPLY',
        bold: false,
      })

      pendingFocus.current = id
    } else {
      specificationLines[lastIndex] = {
        ...lastLine,
        marker,
      }

      pendingFocus.current =
        lastLine.id
    }

    updateItem(itemIndex, {
      selectedMarker: marker,
      specificationLines,
    })
  }

  // ========================================
  // ADD NEW SPECIFICATION ITEM
  // ========================================

  function addItem() {
    const id = makeId()
    const lineId = makeId()

    pendingFocus.current = lineId

    apply([
      ...items,
      {
        id,

        itemNo: String(
          items.length + 1
        ),

        qty: '',
        unit: '',
        selectedMarker: '',

        specificationLines: [
          {
            id: lineId,
            text: '',
            marker: '',
            compliance: 'COMPLY',
            bold: false,
          },
        ],
      },
    ])
  }

  // ========================================
  // REMOVE ITEM
  // ========================================

  function removeItem(itemIndex) {
    const remaining = items.filter(
      (_, index) =>
        index !== itemIndex
    )

    apply(
      remaining.length
        ? remaining
        : [
            {
              id: makeId(),

              itemNo: '1',

              qty: '',
              unit: '',
              selectedMarker: '',

              specificationLines: [
                {
                  id: makeId(),
                  text: '',
                  marker: '',
                  compliance: 'COMPLY',
                  bold: false,
                },
              ],
            },
          ]
    )
  }

  // ========================================
  // ENTER = ADD LINE
  // SHIFT + ENTER = NORMAL NEWLINE
  // ========================================

  function handleSpecificationKeyDown(
    event,
    itemIndex,
    lineIndex
  ) {
    if (
      event.key !== 'Enter' ||
      event.shiftKey
    ) {
      return
    }

    if (
      event.nativeEvent?.isComposing ||
      event.keyCode === 229
    ) {
      return
    }

    event.preventDefault()

    addLine(
      itemIndex,
      lineIndex
    )
  }

  // ========================================
  // USER INTERFACE
  // ========================================

  return (
    <section
      style={{
        padding: compact ? 8 : 16,
        color: '#173e2e',
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        Technical Specifications
      </div>

      <p
        style={{
          fontSize: 11,
          color: '#5d7369',
          lineHeight: 1.5,
        }}
      >
        Enter = add and focus the next line.
        Shift+Enter = newline in the current
        line. Click B to bold only that
        specification line. Each new line
        starts with COMPLY.
      </p>

      {/* ================================== */}
      {/* SPECIFICATION ITEMS */}
      {/* ================================== */}

      {items.map((item, itemIndex) => (
        <div
          key={item.id}
          style={{
            border:
              '1px solid #d6e3db',

            background: '#f8fbf9',

            padding: 10,

            borderRadius: 10,

            marginBottom: 12,
          }}
        >
          {/* ITEM HEADER */}

          <div
            style={{
              display: 'flex',

              alignItems: 'center',

              justifyContent:
                'space-between',

              gap: 5,
            }}
          >
            <strong
              style={{
                fontSize: 12,
              }}
            >
              Item {itemIndex + 1}
            </strong>

            <button
              type="button"

              style={{
                ...buttonStyle,
                color: '#b33939',
              }}

              onClick={() =>
                removeItem(itemIndex)
              }
            >
              Remove item
            </button>
          </div>

          <label style={labelStyle}>
            Specification lines
          </label>

          {/* ================================= */}
          {/* INDIVIDUAL SPECIFICATION LINES */}
          {/* ================================= */}

          {item.specificationLines.map(
            (line, lineIndex) => (
              <div
                key={line.id}

                style={{
                  display: 'grid',

                  gridTemplateColumns:
                    '24px minmax(0,1fr) 59px 22px',

                  gap: 4,

                  alignItems: 'start',

                  marginBottom: 7,
                }}
              >
                {/* SYMBOL SELECT */}

                <select
                  aria-label={
                    `Marker for line ${lineIndex + 1}`
                  }

                  value={line.marker}

                  onChange={(event) =>
                    updateLine(
                      itemIndex,
                      lineIndex,
                      {
                        marker:
                          event.target.value,
                      }
                    )
                  }

                  style={{
                    ...inputStyle,

                    padding: 0,

                    width: 24,

                    height: 29,

                    marginTop: 8,
                  }}
                >
                  {MARKERS.map((marker) => (
                    <option
                      key={marker.label}
                      value={marker.value}
                    >
                      {marker.value || '–'}
                    </option>
                  ))}
                </select>

                {/* =========================== */}
                {/* TEXTAREA + BOLD BUTTON */}
                {/* =========================== */}

                <div
                  style={{
                    position: 'relative',
                    minWidth: 0,
                  }}
                >
                  <textarea
                    ref={(node) => {
                      if (node) {
                        inputs.current[
                          line.id
                        ] = node
                      } else {
                        delete inputs.current[
                          line.id
                        ]
                      }
                    }}

                    rows={2}

                    value={line.text}

                    placeholder={
                      'Enter specification'
                    }

                    aria-label={
                      `Specification line ${lineIndex + 1}`
                    }

                    onChange={(event) =>
                      updateLine(
                        itemIndex,
                        lineIndex,
                        {
                          text:
                            event.target.value,
                        }
                      )
                    }

                    onKeyDown={(event) =>
                      handleSpecificationKeyDown(
                        event,
                        itemIndex,
                        lineIndex
                      )
                    }

                    style={{
                      ...inputStyle,

                      minHeight: 50,

                      paddingTop: 32,

                      resize: 'vertical',

                      // BOLD IN EDITOR
                      fontWeight:
                        line.bold ? 700 : 400,
                    }}
                  />

                  {/* ========================= */}
                  {/* BOLD ON / OFF BUTTON */}
                  {/* ========================= */}

                  <button
                    type="button"

                    aria-label={
                      `${
                        line.bold
                          ? 'Disable'
                          : 'Enable'
                      } bold for line ${lineIndex + 1}`
                    }

                    aria-pressed={line.bold}

                    title={
                      line.bold
                        ? 'Bold ON - click to turn off'
                        : 'Bold OFF - click to turn on'
                    }

                    onClick={() =>
                      updateLine(
                        itemIndex,
                        lineIndex,
                        {
                          bold: !line.bold,
                        }
                      )
                    }

                    style={{
                      position: 'absolute',

                      top: 5,

                      left: 5,

                      padding: '2px 8px',

                      borderRadius: 4,

                      border:
                        `1px solid ${
                          line.bold
                            ? '#116547'
                            : '#c5d9cf'
                        }`,

                      background:
                        line.bold
                          ? '#116547'
                          : '#fff',

                      color:
                        line.bold
                          ? '#fff'
                          : '#11593b',

                      fontWeight: 800,

                      fontSize: 12,

                      cursor: 'pointer',
                    }}
                  >
                    B
                  </button>
                </div>

                {/* =========================== */}
                {/* COMPLIANCE PER LINE */}
                {/* =========================== */}

                <input
                  type="text"

                  aria-label={
                    `Compliance for line ${lineIndex + 1}`
                  }

                  value={line.compliance}

                  onChange={(event) =>
                    updateLine(
                      itemIndex,
                      lineIndex,
                      {
                        compliance:
                          event.target.value,
                      }
                    )
                  }

                  style={{
                    ...inputStyle,

                    padding: '8px 2px',

                    fontSize: 10,

                    textAlign: 'center',
                  }}
                />

                {/* REMOVE LINE */}

                <button
                  type="button"

                  aria-label={
                    `Remove line ${lineIndex + 1}`
                  }

                  onClick={() =>
                    removeLine(
                      itemIndex,
                      lineIndex
                    )
                  }

                  style={{
                    ...buttonStyle,

                    padding: '7px 2px',

                    color: '#c22',
                  }}
                >
                  ×
                </button>
              </div>
            )
          )}

          {/* ================================= */}
          {/* SYMBOL BUTTONS */}
          {/* ================================= */}

          <div
            style={{
              display: 'flex',

              flexWrap: 'wrap',

              gap: 4,

              marginBottom: 8,
            }}
          >
            {MARKERS.map((marker) => (
              <button
                type="button"

                key={marker.label}

                title={
                  `Use ${marker.label} on the next line`
                }

                onClick={() =>
                  chooseMarker(
                    itemIndex,
                    marker.value
                  )
                }

                style={{
                  ...buttonStyle,

                  padding: '4px 8px',

                  background:
                    item.selectedMarker ===
                    marker.value
                      ? '#d9f3e6'
                      : '#ffffff',
                }}
              >
                {marker.label}
              </button>
            ))}
          </div>

          {/* ================================= */}
          {/* ADD LINE */}
          {/* ================================= */}

          <button
            type="button"

            style={buttonStyle}

            onClick={() =>
              addLine(
                itemIndex,
                item.specificationLines.length - 1
              )
            }
          >
            + Add line
          </button>

          {/* ================================= */}
          {/* QUANTITY AND UNIT */}
          {/* ================================= */}

          <div
            style={{
              display: 'grid',

              gridTemplateColumns:
                '1fr 1fr',

              gap: 7,

              marginTop: 10,
            }}
          >
            <div>
              <label style={labelStyle}>
                Qty
              </label>

              <input
                type="text"

                inputMode="decimal"

                value={item.qty}

                onChange={(event) =>
                  updateItem(
                    itemIndex,
                    {
                      qty:
                        event.target.value,
                    }
                  )
                }

                style={inputStyle}
              />
            </div>

            <div>
              <label
                htmlFor={
                  `${listId}_unit_${itemIndex}`
                }

                style={labelStyle}
              >
                Unit (searchable and editable)
              </label>

              <input
                id={
                  `${listId}_unit_${itemIndex}`
                }

                type="text"

                list={
                  `${listId}_units_${itemIndex}`
                }

                autoComplete="off"

                placeholder={
                  'Type or select unit'
                }

                value={item.unit}

                onChange={(event) =>
                  updateItem(
                    itemIndex,
                    {
                      unit:
                        event.target.value,
                    }
                  )
                }

                style={inputStyle}
              />

              <datalist
                id={
                  `${listId}_units_${itemIndex}`
                }
              >
                {UNITS.map((unit) => (
                  <option
                    key={unit}
                    value={unit}
                  />
                ))}
              </datalist>

              <small
                style={{
                  display: 'block',

                  marginTop: 4,

                  fontSize: 10,

                  color: '#63756d',
                }}
              >
                Type to search or enter
                your own unit.
              </small>
            </div>
          </div>
        </div>
      ))}

      {/* ================================== */}
      {/* ADD NEW ITEM */}
      {/* ================================== */}

      <button
        type="button"

        onClick={addItem}

        style={{
          ...buttonStyle,

          width: '100%',

          padding: 10,

          fontWeight: 700,
        }}
      >
        + Add Specification
        (Item {items.length + 1})
      </button>

      {/* ================================== */}
      {/* MANUAL SAVE */}
      {/* ================================== */}

      {onSave && (
        <button
          type="button"

          onClick={() =>
            onSave(items)
          }

          style={{
            ...buttonStyle,

            background: '#116547',

            color: '#fff',

            marginTop: 10,
          }}
        >
          Save
        </button>
      )}
    </section>
  )
}
