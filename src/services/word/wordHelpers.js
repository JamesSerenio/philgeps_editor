import { formatBidDate } from '../../lib/bidFormData'
import { AlignmentType, Bookmark, BorderStyle, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, SectionType, PageOrientation } from 'docx'

export const text = (value) => Array.from(String(value ?? '')).filter(char => char.charCodeAt(0) >= 32 || '\t\n\r'.includes(char)).join('')
export function paragraph(value = '', options = {}) {
  return new Paragraph({ spacing: { after: 100 }, children: text(value).split(/\r?\n/).map((line,index) => new TextRun({ text: line, break: index ? 1 : undefined, size: 22, ...options.run })), ...options })
}
export function sectionMarker(number) {
  return new Bookmark({ id: 'philgeps_section_' + String(number).padStart(2, '0'), children: [new TextRun('')] })
}
export function heading(title, number) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [sectionMarker(number), new TextRun({ text: title, bold: true, size: 28 })] })
}
export function section(children, landscape = false) {
  return { properties: { type: SectionType.NEXT_PAGE, page: { size: { width: 11906, height: 16838, orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children }
}
export function table(headers, rows, widths) {
  const cell = (value, index, header = false) => new TableCell({ width: { size: widths[index], type: WidthType.PERCENTAGE }, shading: header ? { fill: 'F0F2F2' } : undefined, margins: { top: 70, bottom: 70, left: 70, right: 70 }, children: Array.isArray(value) && value.length ? value : [paragraph(Array.isArray(value) ? '' : value, { spacing: { after: 40 }, run: { size: 18, bold: header } })] })
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: Object.fromEntries(['top','bottom','left','right','insideHorizontal','insideVertical'].map(key => [key, { style: BorderStyle.SINGLE, size: 4, color: '666666' }])), rows: [new TableRow({ tableHeader: true, children: headers.map((value, i) => cell(value, i, true)) }), ...rows.map(row => new TableRow({ children: row.map((value, i) => cell(value, i)) }))] })
}
export function specificationLines(item) {
  return (item.specificationLines ?? []).map(line => paragraph((line.marker === 'None' ? '' : text(line.marker)) + (line.marker && line.marker !== 'None' ? ' ' : '') + text(line.text), { run: { bold: line.bold === true, size: 20 }, spacing: { after: 70 } }))
}

export function details(setup) {
  return [
    paragraph(
      'Name of Procuring Entity: ' +
      (setup.procuringEntity ?? '')
    ),

    paragraph(
      'Project Title: ' +
      (setup.projectTitle ?? '')
    ),

    paragraph(
      'Reference No.: ' +
      (setup.referenceNumber ?? '')
    ),
  ]
}

export function signatures(setup) {
  return [
    paragraph(
      'Submitted by: ' +
      (setup.submittedBy ?? ''),
      {
        spacing: {
          before: 300,
          after: 60,
        },
      }
    ),

    paragraph(
      '(Printed Name & Signature)'
    ),

    paragraph(
      'Designation: ' +
      (setup.designation ?? '')
    ),

    paragraph(
      'Name of Firm: ' +
      (setup.bidderName ?? '')
    ),

    paragraph(
      'Date: ' +
      formatBidDate(setup.date)
    ),
  ]
}
