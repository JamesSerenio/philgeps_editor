import { representatives } from '../lib/documentSetup'

export default function DocumentSetup({ value, onChange }) {
  const fields = [['province', 'Province'], ['municipality', 'Municipality'], ['projectTitle', 'Project Title'], ['referenceNumber', 'Reference Number'], ['procuringEntity', 'Procuring Entity'], ['date', 'Date'], ['bidderName', 'Bidder Name'], ['businessAddress', 'Business Address']]
  return <section className="document-setup"><h2>Document Setup</h2><h3>Project Information</h3>
    {fields.map(([key, label]) => <label key={key}>{label}{['projectTitle', 'businessAddress'].includes(key) ? <textarea aria-label={label} rows={2} value={value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.value })} /> : <input aria-label={label} type={key === 'date' ? 'date' : 'text'} value={value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.value })} />}</label>)}
    <label>Submitted By<select aria-label="Submitted By" value={value.submittedBy} onChange={(e) => onChange({ ...value, submittedBy: e.target.value, designation: representatives.find((person) => person.name === e.target.value)?.designation || '' })}><option value="">Select representative</option>{value.submittedBy && !representatives.some((p) => p.name === value.submittedBy) && <option value={value.submittedBy}>{value.submittedBy}</option>}{representatives.map((p) => <option key={p.name}>{p.name}</option>)}</select></label>
    <label>Designation<input aria-label="Designation" value={value.designation} onChange={(e) => onChange({ ...value, designation: e.target.value })} /></label>
  </section>
}
