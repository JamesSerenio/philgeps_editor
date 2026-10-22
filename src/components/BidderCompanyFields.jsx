import { nfccDefaults } from '../lib/nfccDefaults'
import { secretaryDefaults } from '../lib/secretaryDefaults'

export default function BidderCompanyFields({ value, onChange }) {
  if (value.bidderId !== 'builtech' && value.bidderName !== 'BUILTECH SOLUTIONS') return null
  const fields = [
    ['phone', 'Company Phone'], ['email', 'Company Email'],
    ['submittedBy', 'BUILTECH Authorized Representative'], ['designation', 'Representative Designation'],
    ['representativeResidence', 'Representative Residence'], ['civilStatus', 'Representative Civil Status'],
    ['nationality', 'Representative Nationality'], ['corporateSecretaryName', 'Corporate Secretary'],
    ['companyPresidentName', 'Company President / Proprietor'],
  ]
  return <>
    <h3>BUILTECH Company Details</h3>
    {fields.map(([key, label]) => <label key={key}>{label}<input aria-label={label} type="text"
      value={value[key] || secretaryDefaults[key] || ''} onChange={event => onChange({ ...value, [key]: event.target.value })} /></label>)}
    <h3>BUILTECH NFCC</h3>
    {['currentAssets', 'currentLiabilities', 'outstandingContracts'].map(key => <label key={key}>
      {{ currentAssets: 'Current Assets', currentLiabilities: 'Current Liabilities', outstandingContracts: 'Outstanding Contracts' }[key]}
      <input aria-label={key} type="number" min="0" step="0.01" value={value.financials?.[key] === '' ? nfccDefaults[key] : value.financials?.[key] ?? nfccDefaults[key]}
        onChange={event => onChange({ ...value, financials: { ...value.financials, [key]: event.target.value } })} />
    </label>)}
    <label>Manpower — one Name | Position per line (up to five)
      <textarea aria-label="BUILTECH Manpower" rows={5} value={value.manpower ?? ''}
        onChange={event => onChange({ ...value, manpower: event.target.value })} />
    </label>
    <h3>BUILTECH Ongoing Contracts</h3>
    <p>Enter owner | nature of work | description | percentage | award/duration | dates. Leave blank if not yet supplied.</p>
    {['government', 'private'].map(type => <label key={type}>{type} contract
      <textarea aria-label={'BUILTECH ' + type + ' ongoing contract'} rows={3} value={value.ongoingEntries?.[type] ?? ''}
        onChange={event => onChange({ ...value, ongoingEntries: { ...value.ongoingEntries, [type]: event.target.value } })} />
    </label>)}
  </>
}
