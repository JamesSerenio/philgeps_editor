import { useId, useState } from 'react'
import { declarationGroups } from '../lib/declarationFields'

export default function DeclarationForm({ title, designationField, project, value, onChange, onSave, saveStatus }) {
  const formId = useId()
  const [error, setError] = useState('')
  function change(key, next) { setError(''); onChange({ ...value, [key]: next }) }
  async function save() {
    setError('')
    try { if (onSave) await onSave(value) } catch (err) { setError(err.message || 'Unable to save. Your edits remain in the form.') }
  }
  return (
    <section className="technical-editor declaration-editor" aria-label={title}>
      <header className="technical-header"><div><span className="eyebrow">Bidding documents</span><h2>{title}</h2><p>{project?.title || project?.project_title || project?.projectTitle}</p><p>Reference No. {value.referenceNumber}</p></div></header>
      <div className="declaration-fields">
        <fieldset><legend>Template Variant</legend><label>Template<select value={value.templateVariant} onChange={(event) => change('templateVariant', event.target.value)}><option value="old">OLD / Default</option><option value="initao_lgu">INITAO LGU</option></select></label></fieldset>
        {declarationGroups.map(([group, fields]) => <fieldset key={group}><legend>{group}</legend><div className="declaration-grid">{fields.map(([field, label, type = 'text']) => {
          const key = field === 'DESIGNATION' ? designationField : field
          return <label key={key} htmlFor={`${formId}-${key}`} className={type === 'textarea' ? 'declaration-wide' : ''}>{label}{type === 'textarea' ? <textarea aria-label={label} id={`${formId}-${key}`} rows={3} value={value[key] ?? ''} onChange={(event) => change(key, event.target.value)} /> : <input aria-label={label} id={`${formId}-${key}`} type={type} value={value[key] ?? ''} onChange={(event) => change(key, event.target.value)} />}</label>
        })}</div></fieldset>)}
      </div>
      <footer className="technical-save"><p>{onSave ? 'Changes save automatically. The preview is an unchanged template; form values are not written into the PDF.' : 'Saving requires the Bid Security / Omnibus database migration. These local edits will be lost on reload.'}</p><span>{saveStatus}</span><button type="button" onClick={save} disabled={!onSave}>Save</button>{error && <p role="alert" className="technical-validation">{error}</p>}</footer>
    </section>
  )
}
