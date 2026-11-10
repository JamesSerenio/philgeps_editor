import {
  getOngoingContractEntries,
  getOngoingContractType,
  ongoingContractDefaults,
  ongoingContractFields as fields,
} from '../lib/ongoingContracts'

export default function OngoingContractsEditor({ value = {}, onChange }) {
  const type = getOngoingContractType(value)
  const entries = getOngoingContractEntries(value, type)
  const selectedIndex = Math.min(Number(value.ongoingContractIndex?.[type] ?? 0), entries.length - 1)
  const entry = entries[selectedIndex]
  const totalRows = getOngoingContractEntries(value, 'government').length + getOngoingContractEntries(value, 'private').length
  const update = (nextEntries, nextIndex = selectedIndex) => onChange?.({
    ...value,
    ongoingEntries: {
      ...(value.ongoingEntries ?? {}),
      [type]: nextEntries,
    },
    ongoingContractIndex: {
      ...(value.ongoingContractIndex ?? {}),
      [type]: nextIndex,
    },
  })
  const change = (field, nextValue) => update(entries.map((item, index) => index === selectedIndex
    ? { ...item, [field]: nextValue }
    : item))
  const addEntry = () => update([...entries, { ...ongoingContractDefaults }], entries.length)
  const removeEntry = () => {
    if (entries.length <= 1) return
    const next = entries.filter((_, index) => index !== selectedIndex)
    update(next, Math.max(0, selectedIndex - 1))
  }

  return <div className="slcc-editor" style={{ padding: '12px', fontSize: '12px' }}>
    <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '13px' }}>Ongoing Contracts Editor</h4>
    <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
      Contract Type
      <select value={type} onChange={event => onChange?.({
        ...value,
        ongoingContractType: event.target.value,
      })}
        style={{ display: 'block', width: '100%', marginTop: 6, padding: 9 }}>
        <option value="government">GOVERNMENT</option>
        <option value="private">PRIVATE</option>
      </select>
    </label>
    <p style={{ color: '#6b7280', lineHeight: 1.45 }}>Auto-filled as NONE. Each added row is saved under its selected contract type.</p>
    {entries.length > 1 && <label style={{ display: 'block', fontWeight: 600, marginBottom: 10 }}>
      {type === 'government' ? 'Government' : 'Private'} Entry
      <select value={selectedIndex} onChange={event => update(entries, Number(event.target.value))}
        style={{ display: 'block', width: '100%', marginTop: 6, padding: 9 }}>
        {entries.map((_, index) => <option key={index} value={index}>Entry {index + 1}</option>)}
      </select>
    </label>}
    {fields.map(([field, label]) => <label key={field} style={{ display: 'block', fontWeight: 600, marginTop: 13 }}>
      {label}
      <textarea rows={field === 'ownerDetails' || field === 'description' ? 3 : 2} value={entry[field] ?? ''}
        onChange={event => change(field, event.target.value)}
        style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 6, padding: 9, resize: 'vertical' }} />
    </label>)}
    <button type="button" onClick={addEntry} disabled={totalRows >= 5}
      style={{ width: '100%', marginTop: 14, padding: 9 }}>
      + Add {type === 'government' ? 'Government' : 'Private'} Contract
    </button>
    {entries.length > 1 && <button type="button" onClick={removeEntry}
      style={{ width: '100%', marginTop: 8, padding: 9 }}>
      Remove This Entry
    </button>}
    {totalRows >= 5 && <p style={{ color: '#6b7280', lineHeight: 1.45 }}>Maximum of five rows per page so the table and signature stay readable.</p>}
  </div>
}
