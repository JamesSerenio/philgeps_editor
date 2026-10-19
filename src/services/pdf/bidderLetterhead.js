import { rgb, StandardFonts } from 'pdf-lib'
import { getBidderCompany, getBidderLogo } from '../../lib/bidderAssets'

export async function applyBidderLetterhead(document, page, setup, geometry, suppliedLogo) {
  const company = getBidderCompany(setup)
  // The existing Mikata rendering remains pixel-for-pixel unchanged.
  if (company.id === 'mikata') return
  const logo = suppliedLogo ?? await getBidderLogo(setup)
  const image = logo.type === 'jpg' ? await document.embedJpg(logo.data) : await document.embedPng(logo.data)
  const bold = await document.embedFont(StandardFonts.TimesRomanBold)
  const italic = await document.embedFont(StandardFonts.HelveticaBoldOblique)
  page.drawRectangle({ ...geometry.box, color: rgb(1, 1, 1) })
  const slot = geometry.logo, ratio = Math.min(slot.width / image.width, slot.height / image.height)
  const width = image.width * ratio, height = image.height * ratio
  page.drawImage(image, { x: slot.x + (slot.width - width) / 2, y: slot.y + (slot.height - height) / 2, width, height })
  const draw = (value, font, x, y, start, maxWidth) => {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim()
    if (!text) return
    let size = start
    while (size > 5 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.25
    page.drawText(text, { x, y, font, size, color: rgb(0, 0, 0) })
  }
  const text = geometry.text
  draw(setup.bidderName || company.name, bold, text.x, text.y, text.size ?? 22, text.width)
  draw(setup.businessAddress || setup.companyAddress, italic, text.x, text.addressY, 10, text.width)
  draw(company.phone, italic, text.x, text.phoneY ?? text.addressY - 12, 9, text.width)
  draw(company.email, italic, text.x, text.emailY ?? text.addressY - 23, 9, text.width)
}
