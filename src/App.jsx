import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { supabase } from './supabase'
import './App.css'

// Verified against live philgeps_posts rows and Flutter's ProjectPost model.
function getDeadline(project) {
  return project.closing_date || project.closingDate || null
}

function parseProjectDate(value) {
  if (!value || typeof value !== 'string') return null
  const text = value.trim()
  // Supabase supplies timezone-aware ISO dates; unzoned ISO values are Philippine time.
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? `${text}T00:00:00+08:00`
    : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(text)
      ? `${text}+08:00` : text
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateTime(value, fallback = 'Not available') {
  const date = parseProjectDate(value)
  if (!date) return value ? 'Date unavailable' : fallback
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }).format(date)
  const time = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true }).format(date)
  return `${day} · ${time}`
}

function getTimeRemaining(value, now) {
  const date = parseProjectDate(value)
  if (!date) return value ? 'Date unavailable' : 'No deadline'
  const remaining = date.getTime() - now
  if (remaining <= 0) return 'Expired'
  const minutes = Math.floor(remaining / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `Closes in ${days}d ${hours % 24}h`
  if (hours > 0) return `Closes in ${hours}h ${minutes % 60}m`
  return minutes > 0 ? `Closes in ${minutes}m` : 'Closes in <1m'
}

function formatPeso(value) {
  if (value == null || String(value).trim() === '') return 'Not available'
  const amount = typeof value === 'number' ? value : Number(String(value).replace(/PHP|₱|,/gi, '').trim())
  return Number.isFinite(amount) ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount) : 'Not available'
}

function DashboardIcon({ name, ...props }) {
  const paths = {
    folder: 'M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11H3Z',
    clock: 'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z',
    search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    refresh: 'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-2l2 3M4 16l2 3a7 7 0 0 0 12-2',
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    pin: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM14 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  }
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.folder} /></svg>
}
function ProjectList() {
  const [search, setSearch] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])
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
  const nearDeadline = projects.filter((project) => {
    const deadline = parseProjectDate(getDeadline(project))
    const remaining = deadline ? deadline.getTime() - now : -1
    return remaining > 0 && remaining <= 72 * 60 * 60 * 1000
  }).length
  const newProjects = projects.filter((project) => project.status === 'new').length
  const query = search.trim().toLowerCase()
  const visibleProjects = projects.filter((project) => [
    project.title, project.project_title, project.projectTitle,
    project.reference_number, project.reference_no, project.referenceNumber,
    project.procuring_entity, project.entity, project.lgu,
    project.classification, project.area_of_delivery,
  ].some((value) => String(value ?? '').toLowerCase().includes(query)))

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div><span className="eyebrow">PhilGEPS · Bid Docs Editor</span><h1>Bidding Documents</h1><p>Projects selected for preparation</p></div>
          <button className="button-secondary refresh-button" onClick={loadProjects} disabled={loading}><DashboardIcon name="refresh" />{loading ? 'Refreshing…' : 'Refresh'}</button>
        </div>
      </header>
      <main className="project-content" aria-busy={loading}>
        <section className="summary-grid" aria-label="Bidding document summary">
          {[
            { label: 'Total Bidding Docs', count: projects.length, note: 'Selected for preparation', icon: 'folder', style: 'total' },
            { label: 'Near Deadline', count: nearDeadline, note: 'Closing within 72 hours', icon: 'clock', style: 'near' },
            { label: 'New Projects', count: newProjects, note: 'Recently flagged as new', icon: 'spark', style: 'new' },
          ].map((stat) => <div className={`summary-card ${stat.style}`} key={stat.label}><div className="summary-top"><h2>{stat.label}</h2><span className="summary-icon"><DashboardIcon name={stat.icon} /></span></div><strong>{loading || error ? '—' : stat.count}</strong><p>{stat.note}</p></div>)}
        </section>
        <section className="search-panel" aria-labelledby="search-title">
          <h2 id="search-title">Search Projects</h2>
          <p>Find a project by title, LGU, reference number, entity, or delivery area.</p>
          <div className="search-field"><DashboardIcon name="search" /><input type="search" aria-label="Search bidding document projects" placeholder="Search project title, LGU, reference no., procuring entity…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        </section>
        {loading && <div className="message" role="status">Loading projects…</div>}
        {error && <div className="error" role="alert">Unable to load projects: {error}</div>}
        {!loading && !error && <p className="results-summary" role="status">Showing <span>Bidding Documents</span> {visibleProjects.length} {visibleProjects.length === 1 ? 'result' : 'results'}</p>}
        <div className="section-heading"><div><h2>Projects for preparation</h2><p>Manage your selected PhilGEPS procurement documents</p></div><span>All times in Philippine time</span></div>
        {!loading && !error && projects.length === 0 && <div className="message">No projects selected for preparation. Mark a project for bidding documents, then refresh.</div>}
        {!loading && !error && projects.length > 0 && visibleProjects.length === 0 && <div className="message">No projects match “{search}”. Try another title, reference number, or location.</div>}
        <div className="project-grid">
          {visibleProjects.map((project) => {
            const title = project.title || project.project_title || project.projectTitle || 'Untitled Project'
            const reference = project.reference_number || project.reference_no || project.referenceNumber || '—'
            const entity = project.procuring_entity || project.entity || '—'
            const deadline = getDeadline(project)
            const countdown = getTimeRemaining(deadline, now)
            const tags = [
              { label: 'Municipality / LGU', value: project.lgu, icon: 'folder', style: 'lgu-chip' },
              { label: 'Procurement category', value: project.classification, icon: null },
              { label: 'Delivery area', value: project.area_of_delivery, icon: 'pin' },
            ].filter((tag) => tag.value && String(tag.value).trim())
            return (
              <article className="project-card" key={project.id}>
                <div className="card-badges"><span className="badge">BIDDING DOC</span><span className={`deadline-badge ${countdown === 'Expired' ? 'expired' : ''}`}><DashboardIcon name="clock" />{countdown}</span></div>
                <h2>{title}</h2>
                <p className="project-entity">{entity}</p>
                {tags.length > 0 && <div className="project-tags">{tags.map((tag) => <span className={`project-chip ${tag.style || ''}`} key={tag.label} title={tag.label}>{tag.icon && <DashboardIcon name={tag.icon} />}{tag.value}</span>)}</div>}
                <dl className="project-info">
                  <div><dt>Reference No.</dt><dd>{reference}</dd></div>
                  <div><dt>ABC</dt><dd className="project-amount">{formatPeso(project.abc ?? project.ebc)}</dd></div>
                  <div><dt>Posted</dt><dd>{formatDateTime(project.posting_date || project.postingDate)}</dd></div>
                  <div><dt>Closing / Deadline</dt><dd className="project-closing">{formatDateTime(deadline, 'No deadline')}</dd></div>
                </dl>
                <div className="card-actions"><button className="edit-button" onClick={() => navigate(`/project/${project.id}`)}>Open Editor <DashboardIcon name="arrow" /></button></div>
              </article>
            )
          })}
        </div>
      </main>
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
            <label htmlFor="project-deadline">Deadline</label><input id="project-deadline" value={formatDateTime(getDeadline(project), 'No deadline')} readOnly />
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