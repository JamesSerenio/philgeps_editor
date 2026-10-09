
import { projectDocuments } from '../lib/projectDocuments'

export default function ProjectSidebar({
  activeDocument,
  onSelectDocument,
  sectionStatuses = {},
  renderEditor,
  children,
  onGenerate,
  generating = false,
}) {
  return (
    <aside className="setup-panel">
      {/* DOCUMENT SETUP */}
      {children}

      <h2 className="components-heading">
        Document Components
      </h2>

      {/* ALL EXISTING DOCUMENT COMPONENTS */}
      {projectDocuments.map((document) => {
        const open = activeDocument === document.id

        const status = document.section
          ? (
              sectionStatuses[document.section] ||
              'Unsaved'
            )
          : 'Editor pending'

        return (
          <section
            className="component-accordion"
            key={document.id}
          >
            <button
              type="button"
              className="accordion-trigger"
              aria-expanded={open}
              aria-controls={
                'component-' + document.id
              }
              onClick={() =>
                onSelectDocument(
                  open ? null : document.id
                )
              }
            >
              <span aria-hidden="true">
                ▤
              </span>

              <span>
                <strong>
                  {document.title}
                </strong>

                <small
                  className={
                    status === 'Error saving'
                      ? 'save-error'
                      : ''
                  }
                >
                  {status === 'Saved'
                    ? 'Saved automatically'
                    : status}
                </small>
              </span>

              <span aria-hidden="true">
                {open ? '⌃' : '⌄'}
              </span>
            </button>

            {open && (
              <div
                id={
                  'component-' + document.id
                }
                className="accordion-content"
              >
                {renderEditor(document)}
              </div>
            )}
          </section>
        )
      })}

      {/* GENERATE COMPLETE PDF */}
      <footer className="generate-footer">
        <button
          type="button"
          onClick={onGenerate}
          disabled={
            generating ||
            typeof onGenerate !== 'function'
          }
          aria-busy={generating}
          title={
            generating
              ? 'Generating bid documents...'
              : 'Generate complete bid documents'
          }
        >
          {generating
            ? 'Generating PDF...'
            : 'Generate PDF'}
        </button>
      </footer>
    </aside>
  )
}
