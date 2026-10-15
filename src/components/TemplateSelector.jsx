export default function TemplateSelector({ value, onChange }) {
  return (
    <label className="setup-template-selector">
      <span>Template</span>
      <select aria-label="Template" value={value} onChange={event => onChange(event.target.value)}>
        <option value="old_default">Default</option>
        <option value="initao_lgu">Initao</option>
      </select>
    </label>
  )
}
