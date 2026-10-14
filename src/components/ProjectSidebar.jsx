import DashboardIcon from './DashboardIcon'

import { projectDocuments } from '../lib/projectDocuments'

export default function ProjectSidebar({
  onShowPreview,
  hidden = false,
  activeDocument,
  onSelectDocument,
  sectionStatuses = {},
  renderEditor,
  children,
  onGenerate,
  generating = false,
}) {
  function selectDocument(event, nextId) {
    const panel = event.currentTarget.closest('.setup-panel')
    const cards = [...panel.querySelectorAll('.component-accordion')]
    const heights = cards.map((card) => {
      card.getAnimations().forEach((animation) => animation.cancel())
      return card.getBoundingClientRect().height
    })

    onSelectDocument(nextId)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Animate only the surrounding cards; editor mounting and focus stay unchanged.
    requestAnimationFrame(() => {
      const duration = parseFloat(getComputedStyle(panel).getPropertyValue('--editor-expand')) || 220
      cards.forEach((card, index) => {
        if (!card.isConnected) return
        const height = card.getBoundingClientRect().height
        if (height !== heights[index]) {
          card.animate(
            [{ height: heights[index] + 'px' }, { height: height + 'px' }],
            { duration, easing: 'ease-out' },
          )
        }
      })
    })
  }

  return (
    <aside className="setup-panel" id="editor-setup-panel" aria-label="Document setup and components" inert={hidden}>
      <div className="sidebar-mobile-heading">
        <strong>Documents</strong>
        <button type="button" className="button-secondary sidebar-close" aria-label="Close documents and view preview" onClick={onShowPreview}>
          <svg className="editor-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M6 18 18 6" /></svg>
        </button>
      </div>
      {/* DOCUMENT SETUP */}
      {children}

      <h2 className="components-heading">
        Document Components <span className="component-count">{projectDocuments.length}</span>
      </h2>

      {/* ALL EXISTING DOCUMENT COMPONENTS */}
      {projectDocuments.map((document) => {
        const open = activeDocument === document.id

        const status = document.section
          ? (
              sectionStatuses[document.section] ||
              'Unsaved'
            )
          : 'Document preview'

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
              onClick={(event) =>
                selectDocument(event, open ? null : document.id)
              }
            >
              <DashboardIcon name="document" className="editor-icon" />

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

              <DashboardIcon name="chevron" className="accordion-chevron" />
            </button>

            {open && (
              <div
                id={
                  'component-' + document.id
                }
                className="accordion-content"
              >
                {renderEditor(document)}
                <button type="button" className="button-secondary mobile-preview-button" onClick={onShowPreview}>View PDF preview <DashboardIcon name="arrow" /></button>
              </div>
            )}
          </section>
        )
      })}

      {/* GENERATE COMPLETE PDF */}
      <footer className="generate-footer">
        <button
          className="generate-primary"
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
          {generating ? <span className="editor-spinner" aria-hidden="true" /> : <DashboardIcon name="download" />}
          {generating
            ? 'Generating PDF...'
            : 'Generate'}
        </button>
        <p>Your complete bid package, in document order.</p>
      </footer>
    </aside>
  )
}
