import { rgb, StandardFonts } from 'pdf-lib'
import { getBidderCompany, getBidderLogo, letterheadLogoLayout } from '../../lib/bidderAssets'
import { getDefaultBidderAddress } from '../../lib/bidderAddresses'

export async function applyBidderLetterhead(document, page, setup, geometry, suppliedLogo) {
  const company = getBidderCompany(setup)
  // The existing Mikata rendering remains pixel-for-pixel unchanged.
  if (company.id === 'mikata') return
  const logo = suppliedLogo ?? await getBidderLogo(setup)
  const image = logo.type === 'jpg' ? await document.embedJpg(logo.data) : await document.embedPng(logo.data)
  const bold = await document.embedFont(StandardFonts.TimesRomanBold)
  const italic = await document.embedFont(StandardFonts.HelveticaBoldOblique)
  page.drawRectangle({ ...geometry.box,
    ...(['r-and-l', 'mega-pluto'].includes(company.id) ? { width: page.getWidth() - geometry.box.x } : {}),
    color: rgb(1, 1, 1) })
  if (company.id === 'mega-pluto') {
    const slot = geometry.logo
    const layout = letterheadLogoLayout(logo, { ...slot, top: page.getHeight() - slot.y - slot.height })
    page.drawImage(image, { x: layout.x, y: page.getHeight() - layout.top - layout.height, width: layout.width, height: layout.height })
    page.drawLine({ start: { x: layout.separatorX, y: page.getHeight() - layout.separatorTop },
      end: { x: layout.separatorX, y: page.getHeight() - layout.separatorTop - layout.separatorHeight }, thickness: .7, color: rgb(.4, .4, .4) })
    const font = await document.embedFont(StandardFonts.HelveticaBold)
    const x = layout.separatorX + 12, width = page.getWidth() - x - 24
    let top = layout.separatorTop + 15
    for (const [value, size] of [[setup.registeredBusinessName || setup.legalBusinessName || setup.bidderName || company.name, 14],
      [String(setup.businessAddress ?? setup.companyAddress ?? company.address).toUpperCase(), 10],
      [setup.phone || company.phone, 9], [setup.email || company.email, 9]]) {
      let line = ''
      for (const word of String(value ?? '').split(/\s+/).filter(Boolean)) {
        if (line && font.widthOfTextAtSize(line + ' ' + word, size) > width) {
          page.drawText(line, { x, y: page.getHeight() - top, size, font }); top += size + 3; line = ''
        }
        line += (line ? ' ' : '') + word
      }
      if (line) { page.drawText(line, { x, y: page.getHeight() - top, size, font }); top += size + 4 }
    }
    return
  }
  if (company.id === 'r-and-l') {
    const slot = geometry.logo
    const top = page.getHeight() - slot.y - slot.height
    const layout = letterheadLogoLayout(logo, { ...slot, top })
    page.drawImage(image, { x: layout.x, y: page.getHeight() - layout.top - layout.height,
      width: layout.width, height: layout.height })
    const font = await document.embedFont(StandardFonts.HelveticaBold)
    // The supplied reference is one wide banner with two centered footer lines.
    // Its printed address is separate from the project's saved business address.
    const details = [company.headerAddress,
      'Contact: ' + (setup.phone || company.phone) + ' | Email: ' + (setup.email || company.email)]
    details.forEach((line, index) => {
      let size = index === 0 ? 8 : 6.5
      while (font.widthOfTextAtSize(line, size) > layout.width - 12) size -= .1
      page.drawText(line, { x: layout.x + (layout.width - font.widthOfTextAtSize(line, size)) / 2,
        y: page.getHeight() - layout.top - layout.height - 10 - index * 9,
        size, font, color: rgb(0, 0, 0) })
    })
    return
  }
  if (company.id === 'manotech') {
    const slot = geometry.logo
    const layout = letterheadLogoLayout(logo, { ...slot, top: page.getHeight() - slot.y - slot.height })
    page.drawImage(image, { x: layout.x, y: page.getHeight() - layout.top - layout.height,
      width: layout.width, height: layout.height })
    page.drawLine({ start: { x: layout.separatorX, y: page.getHeight() - layout.separatorTop },
      end: { x: layout.separatorX, y: page.getHeight() - layout.separatorTop - layout.separatorHeight },
      thickness: .7, color: rgb(.4, .4, .4) })
    const font = await document.embedFont(StandardFonts.HelveticaBold)
    const address = String(setup.businessAddress ?? setup.companyAddress ?? company.address ?? '').trim().toUpperCase()
    const x = layout.separatorX + 12, available = page.getWidth() - x - 24
    let size = 11
    while (size > 6 && font.widthOfTextAtSize(address, size) > available) size -= .1
    if (address) page.drawText(address, { x, y: page.getHeight() - layout.separatorTop - layout.separatorHeight / 2 - size * .35,
      size, font, color: rgb(0, 0, 0) })
    return
  }
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
  if (company.id === 'builtech') {
    const top = page.getHeight() - slot.y - slot.height
    const layout = letterheadLogoLayout(logo, { x: slot.x, top, width: slot.width, height: slot.height })
    // Clear the full previous letterhead, including its original logo area.
    page.drawRectangle({ x: geometry.box.x, y: page.getHeight() - top - 84,
      width: page.getWidth() - geometry.box.x - 12, height: 90, color: rgb(1,1,1) })
    page.drawImage(image, { x: layout.x, y: page.getHeight() - layout.top - layout.height,
      width: layout.width, height: layout.height })
    const registration = 'PCAB Registered No. ' + company.pcabRegistration
    const registrationWidth = italic.widthOfTextAtSize(registration, 8.5)
    draw(registration, italic, slot.x + (170 - registrationWidth) / 2, page.getHeight() - top - 82, 8.5, 170)
    const x = slot.x + 180, width = page.getWidth() - x - 24
    const address = String(setup.businessAddress ?? setup.companyAddress ?? '').trim()
    const office = address && address.toUpperCase() !== getDefaultBidderAddress('builtech').toUpperCase()
      ? address : company.headerAddress
    draw('CDO Office: ' + office, italic, x, page.getHeight() - top - 42, 9, width)
    draw('Iligan Office: ' + (setup.additionalOffice || company.additionalOffice), italic, x, page.getHeight() - top - 57, 9, width)
    draw('Mobile No.: ' + (setup.phone || company.phone) + '  Email: ' + (setup.email || company.email), italic, x, page.getHeight() - top - 72, 9, width)
    return
  }
  draw(setup.bidderName || company.name, bold, text.x, text.y, text.size ?? 22, text.width)
  draw(setup.businessAddress || setup.companyAddress, italic, text.x, text.addressY, 10, text.width)
  draw(setup.phone ?? company.phone, italic, text.x, text.phoneY ?? text.addressY - 12, 9, text.width)
  draw(setup.email ?? company.email, italic, text.x, text.emailY ?? text.addressY - 23, 9, text.width)
}
