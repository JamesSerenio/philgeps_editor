import CompanyCertificates from './CompanyCertificates'

export default function ManotechCompanyFields({ value, onChange }) {
  const fields = [
    ['phone', 'Contact Number'], ['email', 'Email Address'],
    ['representativeResidence', 'Representative Residence'], ['civilStatus', 'Representative Civil Status'],
    ['nationality', 'Representative Nationality'], ['corporateSecretaryName', 'Corporate Secretary'],
    ['companyPresidentName', 'Company President / Proprietor'], ['boardMeetingDate', 'Board Meeting Date'],
  ]
  return <>
    <h3>MANOTECH Company Details</h3>
    {fields.map(([key, label]) => <label key={key}>{label}<input aria-label={'MANOTECH ' + label}
      type={key === 'boardMeetingDate' ? 'date' : 'text'} value={value[key] ?? ''}
      onChange={event => onChange({ ...value, [key]: event.target.value })} /></label>)}
    <h3>MANOTECH NFCC</h3>
    {['currentAssets', 'currentLiabilities', 'outstandingContracts'].map(key => <label key={key}>
      {{ currentAssets: 'Current Assets', currentLiabilities: 'Current Liabilities', outstandingContracts: 'Outstanding Contracts' }[key]}
      <input aria-label={'MANOTECH ' + key} type="number" min="0" step="0.01" value={value.financials?.[key] ?? ''}
        onChange={event => onChange({ ...value, financials: { ...value.financials, [key]: event.target.value } })} />
    </label>)}
    <label>Manpower — Name | Position (one per line, up to five)
      <textarea rows={5} value={value.manpower ?? ''}
        onChange={event => onChange({ ...value, manpower: event.target.value })} />
    </label>
    <h3>MANOTECH Ongoing Contracts</h3>
    <p>Owner | Nature of work | Description | Percentage | Award / Duration | Dates</p>
    {['government', 'private'].map(type => <label key={type}>{type} contract
      <textarea rows={3} value={value.ongoingEntries?.[type] ?? ''}
        onChange={event => onChange({ ...value, ongoingEntries: { ...value.ongoingEntries, [type]: event.target.value } })} />
    </label>)}
    <CompanyCertificates value={value} onChange={onChange} />
  </>
}
