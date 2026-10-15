export default function TemplateSelector({ value, onChange }) {
  return (
    <section className="document-setup" aria-labelledby="template-selector-heading">
      <h2 id="template-selector-heading">Template</h2>
      <label>
        Template
        <select aria-label="Template" value={value} onChange={event => onChange(event.target.value)}>
          <option value="old_default">Default</option>
          <option value="initao_lgu">Initao</option>
        </select>
      </label>
    </section>
  )
}
