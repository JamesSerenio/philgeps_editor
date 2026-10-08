
const ONES = [
  'zero', 'one', 'two', 'three', 'four',
  'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen',
  'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
]

const TENS = [
  '', '', 'twenty', 'thirty', 'forty',
  'fifty', 'sixty', 'seventy',
  'eighty', 'ninety',
]

function words(n) {
  if (n < 20) return ONES[n]

  if (n < 100) {
    return TENS[Math.floor(n / 10)] +
      (n % 10 ? `-${words(n % 10)}` : '')
  }

  if (n < 1000) {
    return `${words(Math.floor(n / 100))} hundred` +
      (n % 100 ? ` ${words(n % 100)}` : '')
  }

  return `${words(Math.floor(n / 1000))} thousand` +
    (n % 1000 ? ` ${words(n % 1000)}` : '')
}

export default function WarrantyEditor({
  value = {},
  onChange,
}) {
  const raw = value.productWarrantyYears ?? 2
  const n = Number(raw)

  const valid =
    raw !== '' &&
    Number.isSafeInteger(n) &&
    n >= 1 &&
    n <= 999999

  const description = valid
    ? `${words(n)} (${n}) ${
        n === 1 ? 'year' : 'years'
      }`
    : 'Enter a number from 1 to 999999.'

  function update(next) {
    onChange?.({
      ...value,
      productWarrantyYears:
        next === '' ? '' : Number(next),
    })
  }

  return (
    <div
      className="warranty-editor"
      style={{ padding: 10 }}
    >
      <label
        htmlFor="product-warranty-years"
        style={{
          display: 'block',
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        Product Warranty (Years)
      </label>

      <input
        id="product-warranty-years"
        type="number"
        min="1"
        max="999999"
        step="1"
        value={raw}
        onChange={(event) =>
          update(event.target.value)
        }
        onBlur={() => {
          if (!valid) update(2)
        }}
        style={{
          width: '100%',
          boxSizing: 'border-box',
        }}
      />

      <p
        style={{
          fontSize: 11,
          marginTop: 6,
        }}
      >
        PDF: {description}
      </p>

      <p
        style={{
          fontSize: 11,
          opacity: 0.7,
        }}
      >
        Company, address, project, procuring entity,
        submitted by, designation, and date are
        taken from Document Setup above.
      </p>
    </div>
  )
}
