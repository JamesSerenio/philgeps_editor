import DashboardIcon from './DashboardIcon'
import { firstProjectText } from '../lib/projectMetadata'
import { getDeadline, getTimeRemaining, formatDateTime, formatPeso } from '../lib/projectFormatters'

export default function ProjectCard({ project, onOpenEditor, now }) {
  const title = firstProjectText(project,['title','project_title','projectTitle'],'Untitled Project')
  const reference = firstProjectText(project,['reference_number','reference_no','referenceNumber'],'—')
  const entity = firstProjectText(project,['procuring_entity','procuringEntity','entity'],'—')
  const deadline = getDeadline(project)
  const countdown = getTimeRemaining(deadline, now)
  const tags = [
    { label: 'Municipality / LGU', value: firstProjectText(project,['lgu','municipality']), icon: 'folder', style: 'lgu-chip' },
    { label: 'Procurement category', value: project.classification, icon: null },
    { label: 'Delivery area', value: firstProjectText(project,['area_of_delivery','areaOfDelivery','province','location']), icon: 'pin' },
  ].filter((tag) => tag.value && String(tag.value).trim())
  return (
    <article className="project-card">
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
      <div className="card-actions"><button className="edit-button" onClick={() => onOpenEditor(project.id)}>Open Editor <DashboardIcon name="arrow" /></button></div>
    </article>
  )

}
