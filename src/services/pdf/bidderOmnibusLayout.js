import { StandardFonts, rgb } from 'pdf-lib'

// The longer registered name needs real paragraph reflow, not fitted text slots.
// Clauses follow the existing default Omnibus form; only applicant data changes.
export async function drawBidderOmnibusBody(pdf, data) {
  const regular = await pdf.embedFont(StandardFonts.TimesRoman)
  const emphasis = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic)
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const size = 12, leading = 13.8, right = 543, ink = rgb(0, 0, 0)
  const dimensions = pdf.getPage(0).getSize()
  pdf.removePage(0)
  pdf.removePage(0)
  pdf.insertPage(0, [dimensions.width, dimensions.height])
  pdf.insertPage(1, [dimensions.width, dimensions.height])
  let index = 0, page = pdf.getPage(0), top = 143.8
  const normal = text => ({ text, font: regular })
  const strong = text => ({ text, font: emphasis })
  const company = () => strong(data.bidderName)
  const draw = (text, x, baselineTop, font = regular, fontSize = size) => page.drawText(text,
    { x, y: page.getHeight() - baselineTop, font, size: fontSize, color: ink })
  const advancePage = () => {
    index += 1
    if (index >= pdf.getPageCount() - 1) pdf.insertPage(index, [dimensions.width, dimensions.height])
    page = pdf.getPage(index)
    top = 72
  }
  function paragraph(spans, { firstX = 108, nextX = 72, label, gap = 12 } = {}) {
    if (top + leading * 2 > page.getHeight() - 62) advancePage()
    if (label) draw(label, firstX - 18, top + size)
    let x = firstX, pending = 0, afterCompany = false
    for (const span of spans) {
      for (const token of String(span.text ?? '').split(/(\s+)/).filter(Boolean)) {
        if (/^\s+$/.test(token)) { pending = afterCompany ? 7 : regular.widthOfTextAtSize(' ', size); continue }
        const width = span.font.widthOfTextAtSize(token, size)
        if (x + pending + width > right && x > nextX) {
          top += leading
          if (top + size > page.getHeight() - 62) advancePage()
          x = nextX
          pending = 0
        }
        draw(token, x + pending, top + size, span.font)
        x += pending + width
        pending = 0
        afterCompany = false
      }
      afterCompany = span.text === data.bidderName
    }
    top += leading + gap
  }
  draw('REPUBLIC OF THE PHILIPPINES )', 72, 83)
  draw('CITY/MUNICIPALITY OF ______ ) S.S.', 72, 97)
  const title = 'OMNIBUS SWORN STATEMENT'
  draw(title, (page.getWidth() - bold.widthOfTextAtSize(title, 13)) / 2, 126, bold, 13)
  paragraph([normal('I, '), strong(data.representative.displayName), normal(', of legal age, '),
    strong(data.representative.civilStatus), normal(', '), strong(data.nationality), normal(', and with residence at '),
    strong(data.representative.residence), normal(', after having been duly sworn in accordance with law, do hereby depose and state that:')])
  paragraph([normal('I am the duly authorized and designated representative of '), company(), normal(' with office address at '),
    strong(data.businessAddress), normal(';')], { label: data.numbered ? '1.' : undefined })
  paragraph([normal('I am granted full power and authority to do, execute and perform any and all acts necessary to participate, submit the bid, and to sign and execute the ensuing contract for '),
    strong(data.projectTitle), normal(` of the Municipality of ${data.municipality}, ${data.province} as supported by the attached duly notarized Special Power of Attorney, Board/Partnership Resolution, or Secretary's Certificate, whichever is applicable;`)],
  { label: data.numbered ? '2.' : undefined })
  const item = (number, spans) => paragraph(spans, { firstX: 108, nextX: 108, label: number + ')' })
  item(1, [company(), normal(' is not “blacklisted” or barred from bidding by the Government of the Philippines or any of its agencies, offices, corporations, or Local Government Units, foreign government/foreign or international financing institution whose blacklisting rules have been recognized by the Government Procurement Policy Board; by itself or by relation, membership, association, affiliation, or controlling interest with another blacklisted person or entity;')])
  item(2, [normal('Each of the documents submitted in satisfaction of the bidding requirements is an authentic copy of the original, complete, and all statements and information provided therein are true and correct;')])
  item(3, [company(), normal(' is authorizing the Head of the Procuring Entity or its duly authorized representative(s) to verify all the documents submitted;')])
  item(4, [normal('The corporation or joint venture itself, and officers, directors, and controlling stockholders of '), company(), normal(' are not related by consanguinity or affinity up to the third civil degree to the Head of the Procuring Entity, Procurement Agent (if engaged), End-User or Implementing Unit, project consultants, head of the Project Management Office, or the members of the Bids and Awards Committee (BAC), the Technical Working Group, and the BAC Secretariat;')])
  item(5, [normal('It is understood that failure to faithfully disclose its relationship with the HoPE, members of the BAC, the TWG, and the BAC Secretariat, the head of the PMO or the end-user unit or implementing unit, and the project consultants of the Procuring Entity, or of the procurement agent by consanguinity or affinity up to the third civil degree, as well as its submission of beneficial ownership information containing false entries shall be subject to blacklisting under Section 100 of the IRR of RA No. 12009, without prejudice to criminal and civil liabilities under applicable laws, including their accessory penalties, if any.')])
  paragraph([company(), normal(' declares its beneficial ownership information consistent with its updated General Information Sheet or Beneficial Ownership Declaration Form or any other document duly submitted to the SEC and has maintained a valid and updated file therein in compliance with Sections 20.2.9.1, 81, and 82 of the IRR of Republic Act (RA) No. 12009.')], { firstX: 129, nextX: 129, label: '•' })
  item(6, [company(), normal(' complies with existing labor laws and standards; and')])
  item(7, [company(), normal(' is aware of and has undertaken the following responsibilities as a Bidder:')])
  for (const [label, text] of [
    ['a)', 'Carefully examine all of the Bidding Documents;'],
    ['b)', 'Acknowledge all conditions, local or otherwise, affecting the implementation of the Contract;'],
    ['c)', 'Made an estimate of the facilities available and needed for the contract to be bid, if any; and'],
  ]) paragraph([normal(text)], { firstX: 148, nextX: 148, label, gap: 0 })
  paragraph([normal('Inquire or secure Supplemental Bid Bulletin(s) issued for the '), strong('Procurement of ' + data.projectTitle)],
    { firstX: 148, nextX: 148, label: 'd)' })
  item(8, [company(), normal(' did not give or pay directly or indirectly, any commission, amount, fee, or any form of consideration, pecuniary or otherwise, to any person or official, personnel or representative of the government in relation to any procurement project or activity.')])
  item(9, [normal('In case advance payment was made or given to '), company(), normal(', failure to perform or deliver any of the obligations and undertakings in the contract shall be sufficient grounds to constitute criminal liability under existing laws.')])
  if (top + 170 > page.getHeight() - 62) advancePage()
  top += 12
  paragraph([normal('IN WITNESS WHEREOF, I have hereunto set my hand this '), strong(`${data.day} day of ${data.month} ${data.year}`),
    normal(' at '), strong(`Municipality of ${data.municipality}, ${data.province}`), normal(', Philippines.')])
  paragraph([normal('Duly authorized to sign the Bid for and behalf of:')], { firstX: 252, nextX: 252, gap: 12 })
  paragraph([company()], { firstX: 252, nextX: 252, gap: 24 })
  paragraph([strong(data.representative.displayName)], { firstX: 252, nextX: 252, gap: 0 })
  paragraph([{ text: data.designation, font: await pdf.embedFont(StandardFonts.TimesRomanItalic) }], { firstX: 252, nextX: 252, gap: 0 })
  paragraph([strong(data.fullDate)], { firstX: 252, nextX: 252, gap: 0 })
}
