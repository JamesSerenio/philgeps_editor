import { ImageRun, TextWrappingType } from 'docx'

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
    altText: { name: 'Manotech header separator', title: 'Header separator', description: 'Vertical separator between logo and editable address' },
  })]
}
