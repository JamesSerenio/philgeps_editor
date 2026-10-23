import manifest from './bidderAssetManifest.json'
import { bidderCompanies, getBidderCompany } from './bidderCompanies'

export { bidderCompanies, getBidderCompany }
const available = new Set(manifest)
const imageExtensions = ['png', 'jpg', 'jpeg']
const logoCandidates = company => [
  ...(company.logoFilename ? [encodeAssetUrl('/images/' + company.folder + '/' + company.logoFilename)] : []),
  ...imageExtensions.map(ext => encodeAssetUrl('/images/' + company.folder + '/' + company.name + ' - logo.' + ext)),
]
// These originals contain company history/financials/staff, so another bidder
// must supply its own file. They are never shared as another company's data.
const companyOnlyTemplates = new Set([
  'NFCC_Template.pdf', 'Manpower Requirements.pdf',
  'Statement of Ongoing Government and Private Contracts,.pdf',
  'SLCC_table_cctv.pdf', 'SLCC_table_streetlight.pdf',
])
export const staticDocumentNames = [
  'SEC Registration Certificate.pdf', 'Mayor\u2019s Permit  Municipal License (CY 2026).pdf',
  'TAX_template.pdf', 'Certificate of Registration (COR).pdf',
  'Latest Income and Business Tax Returns.pdf', 'PhilGEPS Platinum Certificate.pdf',
  'Audited Financial Statements.pdf',
]

// Commas and ampersands are safe inside path segments. Preserve them because
// Vite's public middleware uses decodeURI and will not decode those escapes.
export function encodeAssetUrl(path) {
  return path.split('/').map(part => encodeURIComponent(part).replace(/'/g, '%27').replace(/%2C/gi, ',').replace(/%26/gi, '&')).join('/')
}
function safeFile(filename) {
  const parts = String(filename).split('/')
  if (parts.some(part => !part || part === '.' || part === '..' || part.includes('\\'))) throw new Error('Invalid asset filename: ' + filename)
  return parts
}
export function sharedAssetPath(kind, filename) {
  safeFile(filename)
  const base = kind === 'images' ? '/images' : '/pdf/' + kind
  return encodeAssetUrl(base + '/' + filename)
}
export function getBidderPaths(value) {
  const company = getBidderCompany(value)
  return { ...company,
    logoPath: logoCandidates(company).find(assetExists) ?? encodeAssetUrl('/images/' + company.folder + '/' + company.name + ' - logo.png'),
    staticFolder: '/pdf/static/' + company.folder,
    templateFolder: '/pdf/templates/' + company.folder,
    referenceFolder: '/pdf/reference/' + company.folder,
    imageFolder: '/images/' + company.folder,
  }
}
export function expectedBidderAssetPath(value, kind, filename) {
  const company = getBidderCompany(value), parts = safeFile(filename)
  const last = parts.pop()
  const base = kind === 'images' ? '/images' : '/pdf/' + kind
  return base + '/' + company.folder + '/' + [...parts, company.name + ' - ' + last].join('/')
}
export function assetExists(path) {
  try { return available.has(decodeURIComponent(path.split('?')[0])) } catch { return false }
}
export function requireAsset(path, label = 'asset') {
  if (!assetExists(path)) throw new Error('Missing ' + label + '. Expected file: public' + decodeURIComponent(path.split('?')[0]) + '. Copy the actual company file there, then run npm run assets:sync and rebuild.')
  return path
}
export function getStaticDocumentPath(value, filename, { required = true } = {}) {
  const company = getBidderCompany(value)
  const uploaded = typeof value === 'object' && value?.certificateUploads?.[filename]
  if (uploaded?.bidderId === company.id && /^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/.test(uploaded.dataUrl)) return uploaded.dataUrl
  let path = encodeAssetUrl(expectedBidderAssetPath(company.id, 'static', filename))
  // Only Mikata may use its unchanged legacy originals.
  if (!assetExists(path) && company.id === 'mikata' && assetExists(sharedAssetPath('static', filename))) path = sharedAssetPath('static', filename)
  return required ? requireAsset(path, company.name + ' document: ' + filename) : path
}
export function getTemplatePath(filename, value, { required = true } = {}) {
  const company = getBidderCompany(value)
  let path = encodeAssetUrl(expectedBidderAssetPath(company.id, 'templates', filename))
  if (['r-and-l', 'mega-pluto'].includes(company.id)) return required ? requireAsset(path, company.name + ' template: ' + filename) : path
  if (!assetExists(path) && (company.id === 'mikata' || !companyOnlyTemplates.has(filename))) path = sharedAssetPath('templates', filename)
  // Generic layouts live with the original Mikata templates. Other bidders
  // may reuse layouts, but must supply their own history, staff and financials.
  if (!assetExists(path) && !companyOnlyTemplates.has(filename)) {
    path = encodeAssetUrl(expectedBidderAssetPath('mikata', 'templates', filename))
  }
  return required ? requireAsset(path, company.name + ' template: ' + filename) : path
}
export function getReferencePath(filename, value) {
  const own = encodeAssetUrl(expectedBidderAssetPath(value, 'reference', filename))
  return assetExists(own) ? own : requireAsset(sharedAssetPath('reference', filename), 'shared reference: ' + filename)
}
export function getLogoPath(value) {
  const company = getBidderCompany(value)
  const stem = '/images/' + company.folder + '/' + company.name + ' - logo.'
  const found = logoCandidates(company).find(assetExists)
  return found ?? requireAsset(encodeAssetUrl(stem + 'png'), company.name + ' logo')
}
export async function fetchAsset(path, options) {
  requireAsset(path)
  const response = await fetch(path, options)
  if (!response.ok) throw new Error('Unable to load asset: ' + decodeURIComponent(path) + ' (HTTP ' + response.status + ').')
  if (/\.pdf(?:\?|$)/i.test(path) && response.headers.get('content-type')?.includes('text/html')) throw new Error('Expected a PDF but the server returned HTML for ' + decodeURIComponent(path))
  return response
}
export async function getBidderLogo(value) {
  const path = getLogoPath(value)
  const response = await fetchAsset(path)
  let data = new Uint8Array(await response.arrayBuffer())
  const type = /\.jpe?g$/i.test(path) ? 'jpg' : 'png'
  const objectUrl = URL.createObjectURL(new Blob([data]))
  const image = new Image()
  let width, height
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = () => reject(new Error('Invalid company logo image: ' + path))
      image.src = objectUrl
    })
    width = image.naturalWidth
    height = image.naturalHeight
    if (getBidderCompany(value).id === 'r-and-l') {
      // Trim only the source's empty top/bottom padding when laying out the
      // supplied banner; preserve its artwork and original asset on disk.
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(0, 0, width, height).data
      let first = height, last = 0
      for (let y = 0; y < height; y++) {
        let dark = 0
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4
          if (pixels[i] < 110 && pixels[i + 1] < 130 && pixels[i + 2] < 170) dark++
        }
        if (dark > width * .3) { first = Math.min(first, y); last = y }
      }
      if (last > first) {
        height = last - first + 1
        const banner = document.createElement('canvas')
        banner.width = width; banner.height = height
        banner.getContext('2d').drawImage(canvas, 0, first, width, height, 0, 0, width, height)
        data = new Uint8Array(await (await new Promise(resolve => banner.toBlob(resolve, 'image/png'))).arrayBuffer())
      }
    }
  } finally { URL.revokeObjectURL(objectUrl) }
  return { path, data, type, width, height, companyId: getBidderCompany(value).id }
}
export function getMissingBidderAssets(value) {
  const company = getBidderCompany(value), missing = []
  for (const filename of staticDocumentNames) {
    try { getStaticDocumentPath(value, filename) } catch (error) { missing.push(error.message) }
  }
  try { getLogoPath(company.id) } catch (error) { missing.push(error.message) }
  for (const filename of companyOnlyTemplates) {
    try { getTemplatePath(filename, company.id) } catch (error) { missing.push(error.message) }
  }
  return missing
}

export function fitBidderLogo(logo, width, height) {
  if (logo.companyId === 'mikata') return { width, height }
  const ratio = Math.min(width / logo.width, height / logo.height)
  return { width: logo.width * ratio, height: logo.height * ratio }
}

export function letterheadLogoLayout(logo, slot) {
  if (logo.companyId === 'mega-pluto') {
    const fitted = fitBidderLogo(logo, 105, 82)
    return { ...fitted, x: slot.x + (105 - fitted.width) / 2, top: slot.top + (82 - fitted.height) / 2,
      separatorX: slot.x + 120, separatorTop: slot.top + 3, separatorHeight: 76 }
  }
  if (logo.companyId === 'r-and-l') {
    return { width: 540, height: 65, x: slot.x, top: slot.top }
  }
  if (logo.companyId === 'manotech') {
    const fitted = fitBidderLogo(logo, 190, slot.height)
    return { ...fitted, x: slot.x, top: slot.top + (slot.height - fitted.height) / 2,
      separatorX: slot.x + 200, separatorTop: slot.top + 5,
      separatorHeight: Math.min(72, slot.height - 10) }
  }
  const box = ['builtech', 'r-and-l'].includes(logo.companyId) ? { ...slot, width: 170, height: 72 } : slot
  const fitted = fitBidderLogo(logo, box.width, box.height)
  return {
    ...fitted,
    x: box.x + (['builtech', 'r-and-l'].includes(logo.companyId) ? (box.width - fitted.width) / 2 : 0),
    top: box.top + (['builtech', 'r-and-l'].includes(logo.companyId) ? (box.height - fitted.height) / 2 : 0),
  }
}
