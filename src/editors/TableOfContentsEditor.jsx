import {
  formatLongDate,
} from '../lib/documentSetup'

export default function TableOfContentsEditor({
  project,
}) {
  const province =
    String(
      project?.province ?? '',
    )
      .trim()
      .toUpperCase()

  const municipality =
    String(
      project?.municipality ?? '',
    ).trim()

  const projectTitle =
    String(
      project?.projectTitle ?? '',
    ).trim()

  const bidderName =
    String(
      project?.bidderName ?? '',
    ).trim()

  const date =
    formatLongDate(
      project?.date,
    )

  return (
    <div className="toc-editor">
      <div className="editor-section-heading">
        <div>
          <h3>
            Table of Contents
          </h3>

          <p>
            Project information is filled automatically.
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: 12,
          border:
            '1px solid #d7e4dc',
          borderRadius: 8,
          background:
            '#f7fbf8',
          lineHeight: 1.55,
        }}
      >
        <strong>
          Automatic Header
        </strong>

        <div
          style={{
            marginTop: 8,
          }}
        >
          Republic of the Philippines
        </div>

        <div>
          PROVINCE OF{' '}
          {province}
        </div>

        <div>
          Municipality of{' '}
          {municipality}
        </div>

        <div
          style={{
            marginTop: 10,
          }}
        >
          <strong>
            Project:
          </strong>{' '}
          {projectTitle}
        </div>

        <div>
          <strong>
            Date:
          </strong>{' '}
          {date}
        </div>

        <div>
          <strong>
            Name of Bidder:
          </strong>{' '}
          {bidderName}
        </div>
      </div>
    </div>
  )
}