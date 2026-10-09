export default function ScheduleEditor({
  value = [],
  onChange,
}) {
  const items = Array.isArray(value)
    ? value
    : []

  // One Delivery Period for ALL items.
  const deliveryPeriod = String(
    items[0]?.deliveryPeriod ?? ''
  )

  function updateDeliveryPeriod(newValue) {
    // Apply the same value to all items.
    const updatedItems = items.map((item) => ({
      ...item,
      deliveryPeriod: newValue,
    }))

    // ProjectEditorPage handles Supabase autosave.
    onChange?.(updatedItems)
  }

  return (
    <div
      style={{
        padding: '12px',
        fontSize: '12px',
        color: '#17452f',
      }}
    >
      <h4
        style={{
          marginTop: 0,
          marginBottom: '14px',
          fontSize: '13px',
          fontWeight: 700,
        }}
      >
        Schedule of Requirements
      </h4>

      <div
        style={{
          marginBottom: '12px',
        }}
      >
        <label
          htmlFor="shared-delivery-period"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '7px',
          }}
        >
          Delivery Period
        </label>

        <input
          id="shared-delivery-period"
          type="text"
          value={deliveryPeriod}
          placeholder="Example: 30 Day/s"
          onChange={(event) =>
            updateDeliveryPeriod(
              event.target.value
            )
          }
          disabled={!items.length}
          style={{
            display: 'block',
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px',
            border: '1px solid #cddbd3',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            color: '#173e2e',
            fontSize: '12px',
            outlineColor: '#166534',
          }}
        />

        <small
          style={{
            display: 'block',
            marginTop: '7px',
            fontSize: '10px',
            color: '#64766d',
            lineHeight: 1.5,
          }}
        >
          Applied automatically to all items.
          Changes are saved automatically.
        </small>
      </div>
    </div>
  )
}
