import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createBlankBiddingProject, getBiddingProjects } from '../services/projectService'
import ProjectCard from '../components/ProjectCard'
import { isBiddingProjectClosed } from '../lib/projectFormatters'
import DashboardIcon from '../components/DashboardIcon'

export default function ProjectListPage() {
  const [search, setSearch] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const requestVersion = useRef(0)

  async function loadProjects() {
    const version = ++requestVersion.current
    setLoading(true)
    setError('')

    try {
      const { data, error } = await getBiddingProjects()

      if (error) throw error

      if (version === requestVersion.current) setProjects(data ?? [])
    } catch (err) {
      console.error(err)
      if (version === requestVersion.current) setError(`Unable to load projects: ${err.message || 'Failed to load projects'}`)
    } finally {
      if (version === requestVersion.current) setLoading(false)
    }
  }

  async function openBlankEditor() {
    setCreating(true)
    setError('')

    try {
      const { data, error: createError } = await createBlankBiddingProject()
      if (createError) throw createError
      navigate(`/project/${data.id}`)
    } catch (err) {
      console.error(err)
      setError(`Unable to create a blank editor: ${err.message || 'Failed to create a blank bidding document project'}`)
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function initialLoad() {
      setNow(Date.now())
      const version = ++requestVersion.current
      setLoading(true)
      setError('')

      try {
        const { data, error } = await getBiddingProjects()

        if (error) throw error

        if (!cancelled && version === requestVersion.current) {
          setProjects(data ?? [])
        }
      } catch (err) {
        console.error(err)

        if (!cancelled && version === requestVersion.current) {
          setError(`Unable to load projects: ${err.message || 'Failed to load projects'}`)
        }
      } finally {
        if (!cancelled && version === requestVersion.current) {
          setLoading(false)
        }
      }
    }

    initialLoad()
    window.addEventListener('focus', initialLoad)
    window.addEventListener('project-metadata-saved', initialLoad)

    return () => {
      cancelled = true
      window.removeEventListener('focus', initialLoad)
      window.removeEventListener('project-metadata-saved', initialLoad)
    }
  }, [])
  const query = search.trim().toLowerCase()
  const activeProjects = projects.filter(project => !isBiddingProjectClosed(project, now))
  const visibleProjects = activeProjects.filter((project) => [
    project.title, project.project_title, project.projectTitle,
    project.reference_number, project.reference_no, project.referenceNumber,
    project.procuring_entity, project.entity, project.lgu,
    project.classification, project.area_of_delivery,
  ].some((value) => String(value ?? '').toLowerCase().includes(query)))

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div><span className="eyebrow">PhilGEPS • BID DOCS EDITOR</span><h1>Bidding Documents</h1><p>Projects selected for bidding document preparation</p></div>
          <div className="header-actions">
            <button className="button-primary new-editor-button" onClick={openBlankEditor} disabled={creating}><DashboardIcon name="document" />{creating ? 'Opening…' : 'New Blank Editor'}</button>
            <button className="button-secondary refresh-button" onClick={loadProjects} disabled={loading || creating}><DashboardIcon name="refresh" />{loading ? 'Refreshing…' : 'Refresh'}</button>
          </div>
        </div>
      </header>
      <main className="project-content" aria-busy={loading}>
        <section className="search-panel" aria-labelledby="search-title">
          <h2 id="search-title">Search Bidding Documents</h2>
          <p>Search selected projects by title, LGU, reference number, or procuring entity.</p>
          <div className="search-field"><DashboardIcon name="search" /><input type="search" aria-label="Search bidding document projects" placeholder="Search project title, LGU, reference no., procuring entity…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        </section>
        {loading && <div className="message" role="status">Loading projects…</div>}
        {error && <div className="error" role="alert">{error}</div>}
        {!loading && !error && <p className="results-summary" role="status">Showing <span>Bidding Documents</span> {visibleProjects.length} {visibleProjects.length === 1 ? 'result' : 'results'}</p>}
        <div className="section-heading"><div><h2>Projects for preparation</h2><p>Prepare bidding documents for your selected projects</p></div><span>All times in Philippine time</span></div>
        {!loading && !error && activeProjects.length === 0 && <div className="message bidding-empty" role="status"><h2>No open projects for bidding document preparation.</h2><p>Select an open project using the thumbs-up button in the PhilGEPS monitoring app. Closed projects are hidden; their saved documents are retained.</p></div>}
        {!loading && !error && activeProjects.length > 0 && visibleProjects.length === 0 && <div className="message">No projects match “{search}”. Try another title, reference number, or location.</div>}
        <div className="project-grid">
          {visibleProjects.map((project) => (
            <ProjectCard key={project.id} project={project} now={now} onOpenEditor={(projectId) => navigate(`/project/${projectId}`)} />
          ))}
        </div>
      </main>
    </div>
  )
}
