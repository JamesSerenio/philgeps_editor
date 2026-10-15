# Native Word bid-package export

The export follows the existing getBidPackageDocuments list: exactly 22 ordered sections. Every template section has a registered native builder. A missing builder causes an export error; templates cannot fall back to page images.

## Editable sections

- 1: tableOfContentsWord.js
- 7: ongoingContractsWord.js
- 8: slccWord.js (current CCTV/Streetlight selection)
- 11: nfccWord.js
- 12: technicalWord.js
- 13: bidSecurityWord.js (With Table/Without Table)
- 14: scheduleWord.js
- 15: manpowerWord.js
- 16: omnibusWord.js (OLD/INITAO)
- 17: afterSalesWord.js (existing builder preserved)
- 18: warrantyWord.js
- 19: bidFormWord.js (existing builder preserved)
- 20: secretarysCertificateWord.js
- 21: priceScheduleWord.js
- 22: summaryWord.js

Sections 2, 3, 4, 5, 6, 9 and 10 use images of the original static PDFs. TAX pages fit A4 without changing aspect ratio. No original assets are modified. The existing After-Sales logo remains a logo image; its surrounding text and signature table remain native.

## Reference layout

The template builders read the current generated PDF, preserving the selected variants and updated fields. pdfLayout.js reads font metadata, text positions, table rules and white overpainting. pdfTextToWord.js creates native runs and tables, including merged headers, widths, borders and repeated headers. Each source page preserves its paper dimensions and orientation. Conversion never embeds a template page screenshot.

Technical, delivery and monetary tables use the existing state and pricing helpers. Pricing breakdowns retain the existing PDF calculation rules; no alternative percentages are introduced. Bid Form uses buildBidFormData for its total and amount in words.

## Layout limits

Word can reflow edited text and tables, so line wrapping and pagination can differ from PDF. Converted paragraph layouts preserve reference font sizes, positions and styling but are not pixel-perfect. Decorative PDF graphics are not recreated by the text/table converter; the existing After-Sales builder preserves its original logo. The Omnibus long-company suffix is kept in legal reading order instead of overlapping the next reference line.

## Validation performed

- Actual live Word and PDF downloads, with project-title filenames.
- All 22 ordered bookmarks in the final DOCX.
- Final DOCX opened normally in installed Microsoft Word; text in all 15 native template sections and a table cell were edited and undone without saving those test edits.
- Both SLCC, Bid Security and Omnibus variant sets generated native Word files and opened in Word.
- 50 long specification lines tested: Technical and Delivery tables paginated to 6 pages, Price Schedule to 12 pages and Summary to 5 pages in Word.
- Price Schedule, Summary and Bid Form totals agreed for the price/deduction test.
- Final live export contained 35 static certificate page images and the preserved After-Sales logo. Static page images had no non-zero crop settings.
- Selected NFCC, SLCC and Omnibus pages were rendered by Word and inspected. A full-package Word-to-PDF diagnostic stalled and was stopped; the final DOCX opening/editability checks completed separately.
- The complete PDF package matched the preserved generator byte for byte.
- Modal widths 375, 768 and 1440 passed overflow checks.
- Build and lint passed, with the existing bundle-size and PriceScheduleEditor hook warnings.

## Manual regression check

1. Open a saved project and select Generate, then Microsoft Word.
2. Download and open the DOCX in Microsoft Word.
3. Use the philgeps_section_01 through philgeps_section_21 bookmarks to inspect order.
4. Edit template text and cells; check bold specifications, delivery period, representative details and totals.
5. Repeat with the other SLCC, Bid Security and Omnibus variants.
6. Inspect static certificates and TAX A4 sizing in print preview.
7. Generate PDF and confirm its original layout and order.

Run npm run build and npm run lint after changes.

Initao uses its own 22-document order from getBidPackageDocuments. Entries retain wordSection as a stable generator key; sectionNumber follows the actual export position for bookmarks and progress. Default ordering is unchanged.
