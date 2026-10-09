
import {
  summaryRows,
  summaryTotal,
  peso,
} from '../lib/summaryPrices'

export default function SummaryEditor({
  items = [],
  priceValues = {},
  loading = false,
  error = '',
}) {
  const rows = summaryRows(
    items,
    priceValues
  )

  const total = summaryTotal(rows)

  return (
    <section
      style={{
        padding: 12,
        color: '#174632',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <strong style={{ fontSize: 13 }}>
        Summary of Bid Prices
      </strong>

      <p
        style={{
          fontSize: 11,
          color: '#64748b',
          lineHeight: 1.5,
        }}
      >
        View only. Items and specifications come
        from Technical Specifications. Prices
        come from the saved Price Schedule
        for Goods.
      </p>

      {loading && (
        <p role="status">
          Loading saved prices...
        </p>
      )}

      {error && (
        <p
          role="alert"
          style={{ color: '#b42318' }}
        >
          {error}
        </p>
      )}

      {rows.map((row) => (
        <div
          key={row.id}
          style={{
            border: '1px solid #d5e5dc',
            borderRadius: 9,
            padding: 10,
            marginBottom: 10,
            background: '#f7fbf8',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <strong style={{ fontSize: 12 }}>
              ITEM {row.itemNo}
            </strong>

            <span style={{ fontSize: 11 }}>
              {row.quantity} {row.unit}
            </span>
          </div>

          <div
            style={{
              marginTop: 7,
              fontSize: 11,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {row.specifications.length ? (
              row.specifications.map((line, i) => (
                <div
                  key={i}
                  style={{
                    fontWeight: line.bold
                      ? 700
                      : 400,
                  }}
                >
                  {line.marker
                    ? `${line.marker} `
                    : ''}
                  {line.text}
                </div>
              ))
            ) : (
              <span
                style={{
                  color: '#64748b',
                }}
              >
                No specifications entered.
              </span>
            )}
          </div>

          <div
            style={{
              borderTop: '1px solid #d5e5dc',
              paddingTop: 8,
              marginTop: 9,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
            }}
          >
            <span>Total delivered price</span>

            <strong>
              {!loading && row.amountCents !== null
                ? peso(row.amountCents)
                : '—'}
            </strong>
          </div>
        </div>
      ))}

      <div
        style={{
          padding: 11,
          borderRadius: 8,
          background: '#e4f3ea',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 6,
          fontSize: 12,
        }}
      >
        <strong>GRAND TOTAL</strong>

        <strong>
          {!loading && rows.some((row) => row.hasPrice)
            ? peso(total)
            : '—'}
        </strong>
      </div>

      <p
        style={{
          color: '#64748b',
          fontSize: 10,
        }}
      >
        No editing is available here.
        To change an item, use Technical
        Specifications. To change a price,
        use Price Schedule for Goods.
      </p>
    </section>
  )
}
