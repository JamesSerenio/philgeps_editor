# BUILTECH SOLUTIONS template support

The separate set contains **22 applicant-controlled PDF templates** in `public/pdf/templates/BUILTECH_SOLUTIONS/`. Each filename starts with `BUILTECH SOLUTIONS - `. The two Initao-specific PDFs remain in its `INITAO/` subfolder. Mikata source templates and all original government/static certificates were left unchanged.

The selected bidder resolves its own template set automatically. The supplied logo is used directly from `public/images/BUILTECH_SOLUTIONS/BUILTECH_SOLUTIONS-logo.png`, fitted proportionally inside the existing logo area. This works in the PDF and editable Word letterheads without renaming the supplied image.

## What changed

- Created real, independent copies of every Mikata template. Old company text was removed from PDF content streams before replacement. In scanned templates, OCR located the affected image regions and the old text pixels were removed. Logo/header image regions were replaced with the supplied Builtech logo. Page sizes, orientation and page counts remain the same as each source.
- Four scanned source templates—Technical Specifications, Production Delivery Schedule, Price Schedule, and Summary—were edited in place as separate copies rather than discarded or left with Mikata identity. Existing native runtime generators continue providing their editable PDF/Word layouts using active project data.
- Mikata-only amounts, staff, contract history, contacts and representative names were cleared in the Builtech copies. Their layouts, tables and borders remain. Existing generic legal/technical/financial tab artwork was retained after visual inspection.
- Added editable Builtech phone, email, representative/designation, residence, civil status, nationality, corporate secretary, president/proprietor, NFCC inputs, manpower and ongoing-contract fields. Existing SLCC controls now include the remaining Builtech contract values without loading Mikata sample defaults.
- These values use the existing project Document Setup JSON and autosave. Bidder profiles retain their own values when switching companies and refreshing; entering Builtech does not inherit another bidder's people, contacts or financial history. Address aliases stay synchronized, including intentional blank edits.
- Added Builtech-only private-table filling for NFCC, manpower, ongoing contracts, and SLCC. NFCC uses the existing template's multiplier of 15, with amounts computed only from supplied assets, liabilities and outstanding-contract inputs. Missing figures remain blank. Manpower retains the template's five-row capacity and reports an explicit error if exceeded.
- PDF previews receive the new setup fields. Full exports prioritize current setup identity over stale declaration values. Existing Word adapters consume those same generated PDFs and the selected logo, so text and supported tables remain editable. Export order was retained.
- Secretary's Certificate does not fall back to Mikata officers for Builtech: enter the real corporate secretary and president/proprietor in Document Setup. Omnibus likewise uses Builtech's saved personal details rather than Mikata representative profiles.

## Genuine documents still required

No official certificate was converted or relabelled. The following seven genuine Builtech files are not supplied and must be placed in `public/pdf/static/BUILTECH_SOLUTIONS/`, each prefixed with `BUILTECH SOLUTIONS - `:

- `SEC Registration Certificate.pdf`
- `Mayor’s Permit  Municipal License (CY 2026).pdf` (two spaces after Permit)
- `TAX_template.pdf`
- `Certificate of Registration (COR).pdf`
- `Latest Income and Business Tax Returns.pdf`
- `PhilGEPS Platinum Certificate.pdf`
- `Audited Financial Statements.pdf`

Applicant document previews work independently. Complete Builtech PDF/Word package exports explicitly identify missing official files instead of substituting Mikata certificates. No applicant-controlled template was left unconverted. Missing genuine certificates cannot be safely produced by editing Mikata records.

After adding actual files, run `npm run assets:sync` and restart the dev server, or rebuild for deployment. Build automatically refreshes the manifest. The PDF conversion utility is development-only; deployment does not require Python or OCR dependencies. To reproduce conversion into an empty destination, use `scripts/create-builtech-templates.py` with PyMuPDF and an English tessdata directory. It refuses to overwrite existing destination files.

## Validation performed

- All 22 Builtech copies retain source page count, page size and orientation; their hashes are recorded in `builtech-template-conversion.json`.
- All retained Mikata source hashes continue matching the verified originals.
- Extracted text from every copied template and OCR of the four scanned copies found no old Mikata company/person identity. Letterhead samples and legacy tab artwork were visually inspected.
- **35 applicant-document runs**, covering Default and Initao, generated PDF and editable Word successfully with no Mikata identity in either extracted PDF text or rendered Word text. CCTV/Streetlight, both Bid Security forms and both Omnibus variants were exercised. Entered staff, SLCC details and calculated NFCC values were checked.
- All **54** inventoried public asset URLs returned valid content without asset errors. Filenames/case and encoded URLs were checked locally; no deployment was performed.
- Builtech PDF and Word downloads matched their preview object URLs, with no regeneration on Download.
- Real Document Setup and persistence-hook browser checks verified editable Builtech fields, saving, remote-response reload, and switching back to the unchanged Mikata profile. Test Supabase responses were isolated; real project records were not modified.
- Mobile form check at 375px found no horizontal overflow.
- First-page raster comparisons and page-count comparisons against the pre-change implementations matched for six modified Mikata generators: NFCC, ongoing contracts, manpower, SLCC, Omnibus and Secretary's Certificate. This was not an every-page pixel comparison.
- Complete Mikata PDF and Word exports succeeded for both Default (23 sections) and Initao (26 sections). Synthetic one-item validation fixtures produced 65/68 PDF pages respectively; production page counts depend on actual project contents.

Browser evidence: `builtech-browser-validation.json`, `builtech-regression-validation.json`, and `builtech-asset-download-validation.json`. The mobile screenshot is `builtech-mobile-fields.png`. The final changed/added file inventory is in `builtech-files.txt`.

Final checks: 12 automated tests passed; lint completed with zero errors and one pre-existing PriceScheduleEditor.jsx warning; production build passed with its existing chunk-size advisory; git diff --check passed.
