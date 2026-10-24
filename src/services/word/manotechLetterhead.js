import { ImageRun, TextWrappingType } from 'docx'

// PDF.js can merge adjacent same-font title runs despite different ink colors.
// Restore the two editable brand runs for this header only.
export function prepareMegaPlutoHeader(page, logo) {
  if (logo.companyId !== 'mega-pluto') return
  page.fragments = page.fragments.flatMap(part => {
    if (!/^MEGA\s*PLUTO$/i.test(part.str.trim()) || part.size < 20) return [part]
    const offset = part.size * 3.278
    return [{ ...part, str: 'MEGA', width: part.size * 3, color: '0F573B' },
      { ...part, str: 'PLUTO', x: part.x + offset, width: Math.max(1, part.width - offset), color: 'AD8C45' }]
  })
}

// Code-drawn separator; the address remains editable text from the PDF layout.
export function manotechLetterheadRule(logo, layout) {
  if (logo.companyId !== 'manotech') return []
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="100"><rect width="1" height="100" fill="#666666"/></svg>'
  const pixel = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAABHNCSVQICAgIfAhkiAAAAAFzUkdCAK7OHOkAAAANSURBVAiZY0hLS/sPAASaAjKXwZSTAAAAAElFTkSuQmCC'), c => c.charCodeAt(0))
  return [new ImageRun({ type: 'svg', data: new TextEncoder().encode(svg), fallback: { type: 'png', data: pixel },
    transformation: { width: .7 * 96 / 72, height: layout.separatorHeight * 96 / 72 },
    floating: { horizontalPosition: { relative: 'page', offset: Math.round(layout.separatorX * 12700) },
      verticalPosition: { relative: 'page', offset: Math.round(layout.separatorTop * 12700) },
      wrap: { type: TextWrappingType.NONE }, allowOverlap: true },
    altText: { name: 'Company header separator', title: 'Header separator', description: 'Vertical separator between logo and editable address' },
  })]
}
