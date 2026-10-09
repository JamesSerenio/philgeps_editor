
function toCents(value) {
  const n = Number(
    String(value ?? '').replace(/,/g, '')
  )

  return Number.isFinite(n) && n > 0
    ? Math.round(n * 100)
    : 0
}

function priceRows(items, prices) {
  return (Array.isArray(items) ? items : []).map(
    (item, index) => {
      const key = String(
        item?.id ?? `item-${index + 1}`
      )

      const saved =
        prices?.[key] ??
        prices?.[String(index + 1)] ??
        prices?.[index] ??
        {}

      const entry =
        typeof saved === 'object' &&
        saved !== null
          ? saved
          : { price: saved }

      const rawPrice =
        entry.price ??
        entry.totalPricePerUnit ??
        ''

      const hasPrice =
        String(rawPrice).trim() !== '' &&
        toCents(rawPrice) > 0

      const unitPriceCents = Math.max(
        0,
        toCents(rawPrice) -
        toCents(entry.deduction)
      )

      const qty = Number(
        String(item?.qty ?? '0').replace(/,/g, '')
      )

      const quantity =
        Number.isFinite(qty) && qty > 0
          ? qty
          : 0

      return {
        itemNo: String(
          item?.itemNo ?? index + 1
        ),
        hasPrice:
          hasPrice && unitPriceCents > 0,
        amountCents:
          hasPrice &&
          unitPriceCents > 0 &&
          quantity > 0
            ? Math.round(
                unitPriceCents * quantity
              )
            : null,
      }
    }
  )
}

const ONES = [
  'Zero', 'One', 'Two', 'Three', 'Four',
  'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen',
  'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
]

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty',
  'Fifty', 'Sixty', 'Seventy', 'Eighty',
  'Ninety',
]

const SCALES = [
  '', 'Thousand', 'Million',
  'Billion', 'Trillion',
]

function hundreds(value) {
  const parts = []
  let n = value

  if (n >= 100) {
    parts.push(
      `${ONES[Math.floor(n / 100)]} Hundred`
    )
    n %= 100
  }

  if (n >= 20) {
    const tens = TENS[Math.floor(n / 10)]
    const last = n % 10

    parts.push(
      last
        ? `${tens}-${ONES[last]}`
        : tens
    )
  } else if (n > 0) {
    parts.push(ONES[n])
  }

  return parts.join(' ')
}

export function integerToEnglish(value) {
  const n = Number(value)

  if (
    !Number.isSafeInteger(n) ||
    n < 0
  ) {
    throw new Error(
      'The bid amount is not a supported amount.'
    )
  }

  if (n === 0) return 'Zero'

  const chunks = []
  let remainder = n
  let index = 0

  while (remainder > 0) {
    const chunk = remainder % 1000

    if (chunk > 0) {
      chunks.unshift(
        [
          hundreds(chunk),
          SCALES[index],
        ].filter(Boolean).join(' ')
      )
    }

    remainder = Math.floor(
      remainder / 1000
    )

    index += 1

    if (
      index > SCALES.length &&
      remainder > 0
    ) {
      throw new Error(
        'The bid amount is too large.'
      )
    }
  }

  return chunks.join(' ')
}

export function amountInWords(cents) {
  if (
    !Number.isSafeInteger(cents) ||
    cents < 0
  ) {
    throw new Error(
      'Invalid price total.'
    )
  }

  const whole = Math.floor(
    cents / 100
  )
  const fraction = cents % 100

  const pesoLabel =
    whole === 1 ? 'Peso' : 'Pesos'

  if (!fraction) {
    return `${integerToEnglish(whole)} ${pesoLabel} Only`
  }

  const centLabel =
    fraction === 1
      ? 'Centavo'
      : 'Centavos'

  return (
    `${integerToEnglish(whole)} ${pesoLabel} ` +
    `and ${integerToEnglish(fraction)} ` +
    `${centLabel} Only`
  )
}

export function formatBidMoney(cents) {
  return `PHP ${(cents / 100).toLocaleString(
    'en-PH',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`
}

export function formatBidDate(value) {
  const raw = String(
    value ?? ''
  ).trim()

  const parts =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)

  if (!parts) return raw

  const date = new Date(
    Date.UTC(
      Number(parts[1]),
      Number(parts[2]) - 1,
      Number(parts[3])
    )
  )

  if (
    date.getUTCFullYear() !== Number(parts[1]) ||
    date.getUTCMonth() + 1 !== Number(parts[2]) ||
    date.getUTCDate() !== Number(parts[3])
  ) {
    return raw
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }
  ).format(date)
}

export function buildBidFormData(data = {}) {
  const rows = priceRows(
    data.items ?? [],
    data.priceValues ?? {}
  )

  const totalCents = rows.reduce(
    (sum, row) =>
      sum + (row.amountCents ?? 0),
    0
  )

  const complete =
    rows.length > 0 &&
    rows.every(
      (row) =>
        row.hasPrice &&
        row.amountCents !== null
    )

  return {
    rows,
    totalCents,
    complete,

    missingPriceItems: rows
      .filter(
        (row) =>
          !row.hasPrice ||
          row.amountCents === null
      )
      .map((row) => row.itemNo),

    amountWords: complete
      ? amountInWords(totalCents)
      : '',

    amountFormatted: complete
      ? formatBidMoney(totalCents)
      : '',

    referenceNumber: String(
      data.referenceNumber ?? ''
    ),

    procuringEntity: String(
      data.procuringEntity ?? ''
    ),

    projectTitle: String(
      data.projectTitle ?? ''
    ),

    bidderName: String(
      data.bidderName ?? ''
    ),

    submittedBy: String(
      data.submittedBy ??
      data.authorizedRepresentative ??
      ''
    ),

    designation: String(
      data.designation ??
      data.representativeDesignation ??
      ''
    ),

    date: formatBidDate(data.date),
  }
}
