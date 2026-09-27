import { projectDocuments } from '../lib/projectDocuments'

export default function ProjectSidebar({ activeDocument, onSelectDocument, children }) {
  return (
    <aside className="editor-sidebar">
      {children}
      <nav className="document-nav" aria-label="Project documents">
        <h2 className="eyebrow">Project documents</h2>
        {projectDocuments.map(({ id, title }) => (
          <button key={id} className={`nav-item ${activeDocument === id ? 'active' : ''}`} aria-current={activeDocument === id ? 'page' : undefined} onClick={() => onSelectDocument(id)}>
            <span aria-hidden="true" className="document-icon">▤</span>{title}
          </button>
        ))}
      </nav>
    </aside>
  )
}
