import { useState } from 'react'
import { createSpecificationLine, createTechnicalItem, validateTechnicalItems } from '../lib/technicalSpecs'

export default function TechnicalSpecsEditor({ project, value, onChange, onSave }) {
  const [errors, setErrors] = useState([])
  const [saveNote, setSaveNote] = useState('')
  const title = project?.title || project?.project_title || project?.projectTitle || 'Untitled Project'
  const reference = project?.reference_number || project?.reference_no || project?.referenceNumber || '—'

  function update(items) {
    setErrors([])
    setSaveNote('')
    onChange(items)
  }

  function updateItem(id, changes) {
    update(value.map((item) => item.id === id ? { ...item, ...changes } : item))
  }

  function updateLine(item, lineId, changes) {
    updateItem(item.id, { specificationLines: item.specificationLines.map((line) => line.id === lineId ? { ...line, ...changes } : line) })
  }

  async function save() {
    const issues = validateTechnicalItems(value)
    setErrors(issues)
    setSaveNote('')
    if (issues.length) return
    try {
      if (onSave) {
        await onSave(value)
      } else {
        console.info('Technical specifications draft (not persisted):', value)
        setSaveNote('Draft validated and logged to the browser console. It has not been stored.')
      }
    } catch (error) {
      setErrors([error.message || 'Unable to process the draft.'])
    }
  }

  return (
    <section className="technical-editor" aria-labelledby="technical-title">
      <header className="technical-header">
        <div><span className="eyebrow">Bidding documents</span><h2 id="technical-title">Technical Specifications</h2><p>{title}</p><p>Reference No. {reference}</p></div>
        <button type="button" className="button-secondary" onClick={() => update([...value, createTechnicalItem(value.length + 1)])}>+ Add Item</button>
      </header>
      <p className="technical-help">Each item shares one quantity and unit. Use + Add line for another specification; Enter adds a newline within the current field.</p>
      <div className="technical-items">
        {value.map((item, itemIndex) => (
          <section className="technical-item" key={item.id} aria-label={`Item group ${itemIndex + 1}`}>
            <header className="technical-item-heading"><h3>Item {itemIndex + 1}</h3><button type="button" className="technical-remove" onClick={() => update(value.filter((row) => row.id !== item.id).map((row, index) => ({ ...row, itemNo: String(index + 1) })))}>Remove item {itemIndex + 1}</button></header>
            <div className="technical-table-scroll" role="region" aria-label={`Item ${itemIndex + 1} specifications`} tabIndex={0}>
              <table className="technical-table">
                <colgroup><col className="technical-number" /><col className="technical-text" /><col className="technical-qty" /><col className="technical-unit" /><col className="technical-compliance" /><col className="technical-action" /></colgroup>
                <thead><tr><th scope="col">Item No.</th><th scope="col">Specifications</th><th scope="col">Qty</th><th scope="col">Unit</th><th scope="col">Statement of Compliance</th><th scope="col">Actions</th></tr></thead>
                <tbody>{item.specificationLines.map((line, lineIndex) => (
                  <tr key={line.id}>
                    {lineIndex === 0 && <td rowSpan={item.specificationLines.length}><input aria-label={`Item ${itemIndex + 1} number`} value={item.itemNo} onChange={(event) => updateItem(item.id, { itemNo: event.target.value })} /></td>}
                    <td><textarea rows={4} aria-label={`Item ${itemIndex + 1} specification ${lineIndex + 1}`} placeholder="Enter specification details" value={line.text} onChange={(event) => updateLine(item, line.id, { text: event.target.value })} /></td>
                    {lineIndex === 0 && <><td rowSpan={item.specificationLines.length}><input aria-label={`Item ${itemIndex + 1} quantity`} value={item.qty} onChange={(event) => updateItem(item.id, { qty: event.target.value })} /></td><td rowSpan={item.specificationLines.length}><input aria-label={`Item ${itemIndex + 1} unit`} value={item.unit} onChange={(event) => updateItem(item.id, { unit: event.target.value })} /></td></>}
                    <td><textarea rows={4} aria-label={`Item ${itemIndex + 1} compliance ${lineIndex + 1}`} value={line.compliance} onChange={(event) => updateLine(item, line.id, { compliance: event.target.value })} /></td>
                    <td><button type="button" className="technical-remove" aria-label={`Remove item ${itemIndex + 1} line ${lineIndex + 1}`} disabled={item.specificationLines.length === 1} title={item.specificationLines.length === 1 ? 'Keep at least one specification line per item' : 'Remove specification line'} onClick={() => { if (item.specificationLines.length > 1) updateItem(item.id, { specificationLines: item.specificationLines.filter((row) => row.id !== line.id) }) }}>Remove</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <footer className="technical-item-footer"><button type="button" className="button-secondary" onClick={() => updateItem(item.id, { specificationLines: [...item.specificationLines, createSpecificationLine()] })}>+ Add line</button><span>{item.specificationLines.length} specification {item.specificationLines.length === 1 ? 'line' : 'lines'}</span></footer>
          </section>
        ))}
        {value.length === 0 && <p className="message">No items. Select + Add Item to start drafting.</p>}
      </div>
      <footer className="technical-save">
        <p>Local draft only. Leaving this project or refreshing clears your changes. Save validates and logs the draft; database saving is not available yet.</p>
        <button type="button" onClick={save}>Save</button>
        {errors.length > 0 && <div className="technical-validation" role="alert"><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
        {saveNote && <p className="technical-save-note" role="status">{saveNote}</p>}
      </footer>
    </section>
  )
}
