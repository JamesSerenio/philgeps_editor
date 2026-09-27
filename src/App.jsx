import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { supabase } from './supabase'
import './App.css'

function ProjectList() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function loadProjects() {
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('philgeps_posts')
        .select('*')
        .eq('is_bidding_doc', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      setProjects(data ?? [])
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function initialLoad() {
      setLoading(true)
      setError('')

      try {
        const { data, error } = await supabase
          .from('philgeps_posts')
          .select('*')
          .eq('is_bidding_doc', true)
          .order('created_at', { ascending: false })

        if (error) throw error

        if (!cancelled) {
          setProjects(data ?? [])
        }
      } catch (err) {
        console.error(err)

        if (!cancelled) {
          setError(err.message || 'Failed to load projects')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    initialLoad()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="app">
      <header className="header"><div className="header-inner">
        <div>
          <h1>PhilGEPS Bid Docs Editor</h1>
          <p>Projects marked for bidding document preparation</p>
        </div>

        <button className="button-secondary" onClick={loadProjects} disabled={loading}>{loading ? 'Refreshing…' : '↻ Refresh'}</button>
      </div></header>

      <main className="project-content" aria-busy={loading}>
      {loading && (
        <div className="message" role="status">
          Loading projects...
        </div>
      )}

      {error && (
        <div className="error" role="alert">
          Supabase error: {error}
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="message" role="status">
          No projects ready for document preparation. Mark a project for bidding documents, then refresh this page.
        </div>
      )}

      <div className="section-heading"><h2>Projects</h2><span>{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span></div><div className="project-grid">
        {projects.map((project) => {
          const title =
            project.title ||
            project.project_title ||
            project.projectTitle ||
            'Untitled Project'

          const reference =
            project.reference_number ||
            project.reference_no ||
            project.referenceNumber ||
            '—'

          const entity =
            project.procuring_entity ||
            project.entity ||
            '—'

          return (
            <div
              className="project-card"
              key={project.id}
            >
              <div className="badge">
                Bidding Doc
              </div>

              <h2>{title}</h2>

              <div className="details">
                <p>
                  <strong>Reference:</strong>{' '}
                  {reference}
                </p>

                <p>
                  <strong>Procuring Entity:</strong>{' '}
                  {entity}
                </p>

                <p>
                  <strong>ABC:</strong>{' '}
                  {project.abc || project.ebc || '—'}
                </p>

                <p>
                  <strong>Deadline:</strong>{' '}
                  {project.deadline || '—'}
                </p>
              </div>

              <button
                className="edit-button"
                onClick={() =>
                  navigate(`/project/${project.id}`)
                }
              >
                Open Editor
              </button>
            </div>
          )
        })}
      </div></main>
    </div>
  )
}

function ProjectEditor() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [activeDocument, setActiveDocument] = useState('Technical Specifications')
  const [items, setItems] = useState([{ id: 1, specification: '', quantity: '', unit: '', compliance: '' }])
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadProject() {
      setLoading(true)
      setError('')

      try {
        const { data, error } = await supabase
          .from('philgeps_posts')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error

        if (!cancelled) {
          setProject(data)
        }
      } catch (err) {
        console.error(err)

        if (!cancelled) {
          setError(
            err.message || 'Failed to load project'
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProject()

    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="editor-page">
        Loading project...
      </div>
    )
  }

  if (error) {
    return (
      <div className="editor-page">
        <button onClick={() => navigate('/')}>
          ← Back
        </button>

        <p className="error" role="alert">
          {error}
        </p>
      </div>
    )
  }

  const projectTitle =
    project?.title ||
    project?.project_title ||
    project?.projectTitle ||
    'Untitled Project'

  const referenceNumber =
    project?.reference_number ||
    project?.reference_no ||
    project?.referenceNumber ||
    '—'

  const procuringEntity =
    project?.procuring_entity ||
    project?.entity ||
    '—'

  return (
    <div className="editor-page">
      <header className="editor-topbar">
        <button className="button-secondary back-button" onClick={() => navigate('/')}>← Back</button>
        <div className="editor-heading"><span className="eyebrow">Bid document editor</span><h1>{projectTitle}</h1><p>Reference No. {referenceNumber}</p></div>
        <span className="badge">Bidding Doc</span>
        <div className="topbar-actions"><button className="button-secondary" disabled title="PDF preview is not available yet">Preview PDF</button><button disabled title="Document saving is not available yet">Save</button></div>
      </header>
      <div className="editor-layout">
        <aside className="editor-sidebar">
          <section className="project-summary">
            <h2 className="eyebrow">Project information</h2>
            <label htmlFor="project-title">Project Title</label><textarea id="project-title" value={projectTitle} readOnly rows={3} />
            <label htmlFor="project-reference">Reference Number</label><input id="project-reference" value={referenceNumber} readOnly />
            <label htmlFor="project-entity">Procuring Entity</label><textarea id="project-entity" value={procuringEntity} readOnly rows={2} />
            <label htmlFor="project-abc">ABC</label><input id="project-abc" value={project?.abc || project?.ebc || ''} readOnly />
            <label htmlFor="project-deadline">Deadline</label><input id="project-deadline" value={project?.deadline || '—'} readOnly />
          </section>
          <nav className="document-nav" aria-label="Project documents">
            <h2 className="eyebrow">Project documents</h2>
            {documentNames.map((name) => <button key={name} className={`nav-item ${activeDocument === name ? 'active' : ''}`} aria-current={activeDocument === name ? 'page' : undefined} onClick={() => setActiveDocument(name)}><span aria-hidden="true" className="document-icon">▤</span>{name}</button>)}
          </nav>
        </aside>
        <main className="editor-workspace">
          <div className="workspace-heading"><span>Project documents <span aria-hidden="true">/</span> <strong>{activeDocument}</strong></span><span className="draft-label">Unsaved draft</span></div>
          <section className="document-card" aria-labelledby="document-title">
            <header className="document-header"><div><span className="eyebrow">Bidding documents</span><h2 id="document-title">{activeDocument}</h2><p>{projectTitle}</p><p className="reference">Reference No. {referenceNumber}</p></div>
              {activeDocument === 'Technical Specifications' && <button className="button-secondary" onClick={() => setItems([...items, { id: crypto.randomUUID(), specification: '', quantity: '', unit: '', compliance: '' }])}>+ Add Item</button>}
            </header>
            {activeDocument === 'Technical Specifications' ? <>
              <div className="document-instructions">Enter the required specifications and your statement of compliance for each item.</div>
              <div className="table-scroll" tabIndex={0} role="region" aria-label="Technical specifications table">
                <table className="specifications-table"><colgroup><col className="col-number" /><col className="col-specification" /><col className="col-quantity" /><col className="col-unit" /><col className="col-compliance" /><col className="col-action" /></colgroup>
                  <thead><tr><th scope="col">Item No.</th><th scope="col">Specifications</th><th scope="col">Qty</th><th scope="col">Unit</th><th scope="col">Compliance</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>{items.map((item, index) => <tr key={item.id}><td className="item-number">{String(index + 1).padStart(2, '0')}</td>
                    {['specification', 'quantity', 'unit', 'compliance'].map((field) => <td key={field}>{field === 'specification' || field === 'compliance' ? <textarea rows={4} aria-label={`Item ${index + 1} ${field}`} placeholder={field === 'specification' ? 'Describe the item and technical requirements…' : 'Statement of compliance…'} value={item[field]} onChange={(event) => setItems(items.map((row) => row.id === item.id ? { ...row, [field]: event.target.value } : row))} /> : <input aria-label={`Item ${index + 1} ${field}`} type={field === 'quantity' ? 'number' : 'text'} min={field === 'quantity' ? '0' : undefined} step={field === 'quantity' ? 'any' : undefined} placeholder={field === 'quantity' ? '0' : 'Unit'} value={item[field]} onChange={(event) => setItems(items.map((row) => row.id === item.id ? { ...row, [field]: event.target.value } : row))} />}</td>)}
                    <td><button className="delete-button" aria-label={`Delete item ${index + 1}`} onClick={() => setItems(items.filter((row) => row.id !== item.id))}>×</button></td></tr>)}
                    {items.length === 0 && <tr><td colSpan={6} className="empty-table">No items yet. Select “Add Item” to begin.</td></tr>}
                  </tbody>
                </table>
              </div>
              <footer className="document-footer"><p role="status">Local draft only. Changes are lost when you leave or refresh. Saving and PDF preview are not available yet.</p><div className="footer-actions"><button disabled title="Document saving is not available yet">Save</button><button className="button-secondary" disabled title="PDF preview is not available yet">Preview PDF</button></div></footer>
            </> : <div className="empty-editor"><span className="empty-icon" aria-hidden="true">▤</span><h3>{activeDocument}</h3><p>This document editor is not available yet.</p><button className="button-secondary" onClick={() => setActiveDocument('Technical Specifications')}>Edit Technical Specifications</button></div>}
          </section>
        </main>
      </div>
    </div>
  )
}

const documentNames = ['Checklist', 'Technical Specifications', 'Schedule of Requirements', 'Bid Securing Declaration', 'Omnibus Sworn Statement', 'Manpower', 'After-Sales', 'Warranty', 'Bid Form', 'Price Schedule', 'Summary of Bid Prices']
function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<ProjectList />}
      />

      <Route
        path="/project/:id"
        element={<ProjectEditor />}
      />
    </Routes>
  )
}

export default App