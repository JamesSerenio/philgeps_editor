import fontkit from '@pdf-lib/fontkit'

let fontBytes
export async function embedBookmanFonts(pdf) {
  fontBytes ??= Promise.all(['BookmanOldStyle.ttf', 'BookmanOldStyle-Bold.ttf'].map(async name => {
    const response = await fetch(`/fonts/bookman/${name}`)
    if (!response.ok) throw new Error(`Unable to load Bookman Old Style: ${name}`)
    return new Uint8Array(await response.arrayBuffer())
  })).catch(error => { fontBytes = null; throw error })
  pdf.registerFontkit(fontkit)
  const [regularBytes, boldBytes] = await fontBytes
  const [regular, bold] = await Promise.all([
    pdf.embedFont(regularBytes, { subset: true }), pdf.embedFont(boldBytes, { subset: true }),
  ])
  return { regular, bold }
}
