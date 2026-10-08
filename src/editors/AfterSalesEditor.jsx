
function numberWords(n) {
  const small = [
    'zero', 'one', 'two', 'three', 'four',
    'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen',
    'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen',
  ]

  const tens = [
    '', '', 'twenty', 'thirty', 'forty',
    'fifty', 'sixty', 'seventy',
    'eighty', 'ninety',
  ]

  if (n < 20) return small[n]

  if (n < 100) {
    return (
      tens[Math.floor(n / 10)] +
      (n % 10
        ? '-' + numberWords(n % 10)
        : '')
    )
  }

  if (n < 1000) {
    return (
      numberWords(Math.floor(n / 100)) +
      ' hundred' +
      (n % 100
        ? ' ' + numberWords(n % 100)
        : '')
    )
  }

  return (
    numberWords(Math.floor(n / 1000)) +
    ' thousand' +
    (n % 1000
      ? ' ' + numberWords(n % 1000)
      : '')
  )
}

function savedYears(value) {
  if (
    value?.servicePeriodYears !== undefined &&
    value?.servicePeriodYears !== null
  ) {
    return value.servicePeriodYears
  }

  const old = String(
    value?.servicePeriod || ''
  ).match(/\((\d+)\)/)

  return old ? Number(old[1]) : 1
}

export default function AfterSalesEditor({
  value = {},
  onChange,
}) {
  const raw = savedYears(value)
  const years = Number(raw)

  const valid =
    Number.isSafeInteger(years) &&
    years >= 1 &&
    years <= 999999

  const words = valid
    ? `${numberWords(years)} (${years}) ${
        years === 1 ? 'year' : 'years'
      }`
    : 'Enter a whole number from 1 to 999999.'

  function changeYears(text) {
    onChange?.({
      ...value,
      servicePeriodYears:
        text === '' ? '' : Number(text),
    })
  }

  return (
    <div
      className="after-sales-editor"
      style={{ padding: 10 }}
    >
      <label
        style={{
          display: 'block',
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        Service Warranty (Years)
      </label>

      <input
        type="number"
        min="1"
        max="999999"
        step="1"
        value={raw}
        onChange={(event) =>
          changeYears(event.target.value)
        }
        onBlur={() => {
          if (!valid) changeYears('1')
        }}
        style={{
          width: '100%',
          boxSizing: 'border-box',
        }}
      />

      <p
        style={{
          marginTop: 6,
          fontSize: 11,
        }}
      >
        PDF: {words}
      </p>

      <p
        style={{
          fontSize: 11,
          opacity: 0.7,
        }}
      >
        Company, project, municipality,
        submitted by, designation, and date
        follow Document Setup above.
      </p>
    </div>
  )
}
