
// =====================================================
// DEFAULT VALUES FOR BOTH SLCC TEMPLATES
// =====================================================

const DEFAULT_ENTRIES = {
  cctv: {
    government: {
      ownerDetails: 'LGU MALITBOG',
      natureOfWork: 'SUPPLY AND DELIVERY',
      description:
        'PROCUREMENT AND INSTALLATION OF STREET SOLAR LIGHTS',
    },
    private: {
      ownerDetails: '',
      natureOfWork: 'SUPPLY AND DELIVERY',
      description: '',
    },
  },

  streetlight: {
    government: {
      ownerDetails: 'LGU SUMILAO',
      natureOfWork: 'SUPPLY AND DELIVERY',
      description:
        'PROCUREMENT OF SOLAR STREET LIGHTS FOR MUNICIPAL AND BARANGAY STREET',
    },
    private: {
      ownerDetails: '',
      natureOfWork: 'SUPPLY AND DELIVERY',
      description: '',
    },
  },
}

// =====================================================
// STYLES
// =====================================================

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  marginBottom: '6px',
  color: '#374151',
}

const inputStyle = {
  display: 'block',
  width: '100%',
  padding: '9px',
  fontSize: '12px',
  border: '1px solid #d1d5db',
  borderRadius: '5px',
  backgroundColor: '#ffffff',
  color: '#111827',
  boxSizing: 'border-box',
}

const groupStyle = {
  marginBottom: '15px',
}

// =====================================================
// MAIN SLCC EDITOR
// =====================================================

export default function SLCCEditor({
  value = {},
  onChange,
}) {
  // Select CCTV or STREETLIGHT.
  const variant =
    value.slccVariant === 'cctv' ||
    value.slccVariant === 'streetlight'
      ? value.slccVariant
      : /cctv/i.test(value.projectTitle ?? '')
        ? 'cctv'
        : 'streetlight'

  // Get selected contract type.
  const contractType =
    value.slccContractTypes?.[variant] === 'private'
      ? 'private'
      : 'government'

  // Get original default values.
  const defaults =
    DEFAULT_ENTRIES[variant][contractType]

  // Get saved values from Supabase state.
  const savedEntry =
    value.slccEntries?.[variant]?.[contractType] ??
    {}

  // Merge defaults with saved values.
  const entry = {
    ...defaults,
    ...savedEntry,
  }

  // ===================================================
  // UPDATE SELECTED TEMPLATE
  // ===================================================

  function updateTemplate(nextVariant) {
    onChange?.({
      ...value,
      slccVariant: nextVariant,
    })
  }

  // ===================================================
  // UPDATE CONTRACT TYPE
  // ===================================================

  function updateContractType(nextType) {
    onChange?.({
      ...value,

      slccContractTypes: {
        ...(value.slccContractTypes ?? {}),
        [variant]: nextType,
      },
    })
  }

  // ===================================================
  // UPDATE CONTRACT DETAILS
  // ===================================================

  function updateField(field, newValue) {
    onChange?.({
      ...value,

      slccEntries: {
        ...(value.slccEntries ?? {}),

        [variant]: {
          ...(value.slccEntries?.[variant] ?? {}),

          [contractType]: {
            ...entry,
            [field]: newValue,
          },
        },
      },
    })
  }

  // ===================================================
  // UI
  // ===================================================

  return (
    <div
      className="slcc-editor"
      style={{
        padding: '12px',
        fontSize: '12px',
      }}
    >
      <h4
        style={{
          marginTop: 0,
          marginBottom: '16px',
          fontSize: '13px',
        }}
      >
        SLCC Editor
      </h4>

      {/* ============================================= */}
      {/* TEMPLATE DROPDOWN */}
      {/* ============================================= */}

      <div style={groupStyle}>
        <label
          htmlFor="slcc-template"
          style={labelStyle}
        >
          SLCC Template
        </label>

        <select
          id="slcc-template"
          value={variant}
          onChange={(event) =>
            updateTemplate(event.target.value)
          }
          style={inputStyle}
        >
          <option value="cctv">
            CCTV
          </option>

          <option value="streetlight">
            STREETLIGHT
          </option>
        </select>
      </div>

      {/* ============================================= */}
      {/* CONTRACT TYPE DROPDOWN */}
      {/* ============================================= */}

      <div style={groupStyle}>
        <label
          htmlFor="slcc-contract-type"
          style={labelStyle}
        >
          Contract Type
        </label>

        <select
          id="slcc-contract-type"
          value={contractType}
          onChange={(event) =>
            updateContractType(event.target.value)
          }
          style={inputStyle}
        >
          <option value="government">
            GOVERNMENT
          </option>

          <option value="private">
            PRIVATE
          </option>
        </select>
      </div>

      {/* ============================================= */}
      {/* OWNER'S DETAILS - ONE INPUT ONLY */}
      {/* ============================================= */}

      <div style={groupStyle}>
        <label
          htmlFor="slcc-owner"
          style={labelStyle}
        >
          Owner's Name / Address /
          Telephone Number
        </label>

        <textarea
          id="slcc-owner"
          rows={4}
          value={entry.ownerDetails ?? ''}
          placeholder={
            'Enter Owner Name, Address, and Telephone Number'
          }
          onChange={(event) =>
            updateField(
              'ownerDetails',
              event.target.value
            )
          }
          style={{
            ...inputStyle,
            resize: 'vertical',
          }}
        />
      </div>

      {/* ============================================= */}
      {/* NATURE OF WORK */}
      {/* ============================================= */}

      <div style={groupStyle}>
        <label
          htmlFor="slcc-nature"
          style={labelStyle}
        >
          Nature of Work
        </label>

        <textarea
          id="slcc-nature"
          rows={3}
          value={entry.natureOfWork ?? ''}
          onChange={(event) =>
            updateField(
              'natureOfWork',
              event.target.value
            )
          }
          style={{
            ...inputStyle,
            resize: 'vertical',
          }}
        />

        <small
          style={{
            color: '#6b7280',
            fontSize: '10px',
          }}
        >
          Default: SUPPLY AND DELIVERY.
          You can change this anytime.
        </small>
      </div>

      {/* ============================================= */}
      {/* DESCRIPTION */}
      {/* ============================================= */}

      <div style={groupStyle}>
        <label
          htmlFor="slcc-description"
          style={labelStyle}
        >
          Description
        </label>

        <textarea
          id="slcc-description"
          rows={4}
          value={entry.description ?? ''}
          placeholder="Enter Description"
          onChange={(event) =>
            updateField(
              'description',
              event.target.value
            )
          }
          style={{
            ...inputStyle,
            resize: 'vertical',
          }}
        />
      </div>

      {/* ============================================= */}
      {/* CURRENT SELECTION INFORMATION */}
      {/* ============================================= */}

      <div
        style={{
          padding: '10px',
          backgroundColor: '#f3f4f6',
          borderRadius: '5px',
          border: '1px solid #e5e7eb',
          marginTop: '12px',
        }}
      >
        <strong
          style={{
            display: 'block',
            marginBottom: '6px',
          }}
        >
          Current Selection
        </strong>

        <p style={{ margin: '4px 0' }}>
          Template:{' '}
          <strong>
            {variant.toUpperCase()}
          </strong>
        </p>

        <p style={{ margin: '4px 0' }}>
          Contract:{' '}
          <strong>
            {contractType.toUpperCase()}
          </strong>
        </p>

        <p
          style={{
            fontSize: '11px',
            margin: '8px 0 0',
            color: '#4b5563',
          }}
        >
          {contractType === 'government'
            ? 'GOVERNMENT details are editable. All PRIVATE row values will show NONE.'
            : 'PRIVATE details are editable. All GOVERNMENT row values will show NONE.'}
        </p>
      </div>

      <p
        style={{
          marginTop: '12px',
          color: '#6b7280',
          fontSize: '11px',
          lineHeight: 1.5,
        }}
      >
        The PDF preview updates automatically.
        Project information, bidder details,
        and signature fields follow the
        Document Setup above.
      </p>
    </div>
  )
}
