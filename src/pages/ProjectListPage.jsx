import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBiddingProjects } from '../services/projectService'
import { getDeadline, parseProjectDate } from '../lib/projectFormatters'
import ProjectCard from '../components/ProjectCard'
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
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function loadProjects() {
    setLoading(true)
    setError('')

    try {
      const { data, error } = await getBiddingProjects()

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
        const { data, error } = await getBiddingProjects()

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
          {visibleProjects.map((project) => (
            <ProjectCard key={project.id} project={project} now={now} onOpenEditor={(projectId) => navigate(`/project/${projectId}`)} />
          ))}
        </div>
      </main>
    </div>
  )
}
