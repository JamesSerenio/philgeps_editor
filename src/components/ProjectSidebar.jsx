import { projectDocuments } from '../lib/projectDocuments'

export default function ProjectSidebar({ activeDocument, onSelectDocument, sectionStatuses, renderEditor, children }) {
  return <aside className="setup-panel">{children}<h2 className="components-heading">Document Components</h2>
    {projectDocuments.map((document) => {
      const open = activeDocument === document.id
      const status = document.section ? (sectionStatuses[document.section] || 'Unsaved') : 'Editor pending'
      return <section className="component-accordion" key={document.id}>
        <button className="accordion-trigger" aria-expanded={open} aria-controls={'component-' + document.id} onClick={() => onSelectDocument(open ? null : document.id)}><span aria-hidden="true">▤</span><span><strong>{document.title}</strong><small className={status === 'Error saving' ? 'save-error' : ''}>{status === 'Saved' ? 'Saved automatically' : status}</small></span><span aria-hidden="true">{open ? '⌃' : '⌄'}</span></button>
        {open && <div id={'component-' + document.id} className="accordion-content">{renderEditor(document)}</div>}
      </section>
    })}<footer className="generate-footer"><button disabled title="PDF generation is not implemented yet">Generate PDF</button><p>PDF generation is not available yet.</p></footer></aside>
}
