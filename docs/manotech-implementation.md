MANOTECH implementation and validation
====================================

Update October 23, 2026: at the user's request, the additional Manotech sidebar
sections are hidden. Document Setup now shows the same fields, representative
dropdown and automatic designation as Mikata. Existing saved Manotech profile
data and template/export support are retained. The company-details and upload
components below remain available in source but are no longer mounted there.

Manotech now uses its own 22 applicant-controlled PDF forms and supplied logo.
The saved address is retained: Purok 4, Poblacion, Linamon, Lanao del Norte.
Contact, representative, secretary, president, financial, staff and contract
details are editable and isolated in the existing per-bidder Document Setup
profiles. Existing Supabase editor-state serialization retains those fields.
No new database schema or external account changes were made.

The existing document order is unchanged. The implementation actually has
23 default package sections (tabbing plus the existing 22), or 26 with Initao
dividers. These counts and generator identities match Mikata exactly.

Missing genuine documents
-------------------------

No genuine Manotech official certificates were supplied. All seven remain
Missing Document until uploaded in the Manotech Document Setup fields:

- SEC Registration Certificate.pdf
- Mayor’s Permit  Municipal License (CY 2026).pdf
- TAX_template.pdf
- Certificate of Registration (COR).pdf
- Latest Income and Business Tax Returns.pdf
- PhilGEPS Platinum Certificate.pdf
- Audited Financial Statements.pdf

Uploads are checked as readable PDFs, limited to 10 MB each, and saved with
the existing project Document Setup JSON. They are tagged with the bidder ID
and cannot be reused automatically by another bidder. The package generator
keeps missing official documents blocked, rather than substituting another
company's certificates. Other missing Manotech details remain editable and
must be supplied; no phone, email, representative or financial values are
invented. Secretary's Certificate requires the actual secretary and president.

Conversion and formatting
-------------------------

All 22 original forms have separate Manotech copies. Four image-only forms
were sanitized with English OCR and actual pixel/text redaction. The original
page geometry, orientation and page count were verified for every copy. No
template conversion was left incomplete. Source and output hashes are recorded
in manotech-template-conversion.json; source Mikata and Builtech PDFs and all
official certificates were left untouched.

Runtime generators fill current project fields and render the Manotech logo
with its aspect ratio preserved. Letterhead address/contact details are text,
not an image of a whole letterhead. Word exports use the existing editable
text/table generators and embed only logos and genuine official PDF pages as
images. Manotech never uses Mikata's sample SLCC, NFCC or staff data.

Validation results
------------------

- 17 automated tests passed, including existing Mikata/Builtech regressions,
  original asset hashes, all Manotech template paths, profile switching,
  editor-state JSON round trips, uploaded-document ownership and document order.
- All generated forms exercised in a real browser for both default and Initao
  variants, including streetlight/CCTV and both bid-security formats.
- Visible generated PDF text checked for foreign company/person/address data.
- Default full PDF and editable DOCX generated successfully. Word XML contains
  editable tables, landscape sections and the exact supplied Manotech logo.
- Actual Generate Documents modal tested for PDF canvas preview and Word
  preview, with downloads verified byte-for-byte against the displayed files.
- Actual Document Setup tested for contact/representative edits, switching
  between Mikata and Manotech, Missing Document statuses and PDF uploads.
- Visual review completed for cover, manpower, NFCC, Omnibus, after-sales and
  warranty pages. The actual Word viewer displays the logo beside editable text.
- All 23 Manotech production asset URLs returned HTTP 200 and exact source
  bytes from the built Vite preview server, using the app's URL encoding rules.
- npm run lint: passed, zero errors; one pre-existing useEffect cleanup warning
  at src/editors/PriceScheduleEditor.jsx:353.
- npm run build: passed; existing bundle-size advisory remains.

Browser package tests used clearly labeled in-memory TEST FIXTURE PDFs for
the missing official documents. These were never installed as Manotech assets
or saved to a real project. Tests made no Supabase writes. Actual production
Supabase saving and a live Vercel deployment were not exercised; the existing
save flow and built asset paths were verified locally. Browser Word pagination
can differ from desktop Microsoft Word, as noted by the existing preview UI.

New files
----------

- scripts/create-manotech-templates.py
- src/components/CompanyCertificates.jsx
- src/components/ManotechCompanyFields.jsx
- src/services/pdf/manotechDataPdf.js
- tests/manotech.test.mjs
- tests/manotech-browser.mjs
- tests/manotech-preview-browser.mjs
- tests/manotech-setup-harness.mjs
- docs/manotech-template-conversion.json
- docs/manotech-implementation.md
- public/images/MANOTECH/MANOTECH-logo.png (user-supplied)
- public/pdf/templates/MANOTECH/MANOTECH - After Sales.pdf
- public/pdf/templates/MANOTECH/MANOTECH - Bid Security with table.pdf
- public/pdf/templates/MANOTECH/MANOTECH - Bid Security without table.pdf
- public/pdf/templates/MANOTECH/MANOTECH - BID_FORM_CLEAN_TEMPLATE.pdf
- public/pdf/templates/MANOTECH/MANOTECH - Manpower Requirements.pdf
- public/pdf/templates/MANOTECH/MANOTECH - New_tab_and_pages_Initao_LGU_template.pdf
- public/pdf/templates/MANOTECH/MANOTECH - NFCC_Template.pdf
- public/pdf/templates/MANOTECH/MANOTECH - Omnibus Sworn Statement Initao.pdf
- public/pdf/templates/MANOTECH/MANOTECH - Omnibus Sworn Statement.pdf
- public/pdf/templates/MANOTECH/MANOTECH - PRICE SCHEDULE FOR GOODS.pdf
- public/pdf/templates/MANOTECH/MANOTECH - Production Delivery Schedule.pdf
- public/pdf/templates/MANOTECH/MANOTECH - SECRETARY’S CERTIFICATE .pdf
- public/pdf/templates/MANOTECH/MANOTECH - SLCC_table_cctv.pdf
- public/pdf/templates/MANOTECH/MANOTECH - SLCC_table_streetlight.pdf
- public/pdf/templates/MANOTECH/MANOTECH - Statement of Ongoing Government and Private Contracts,.pdf
- public/pdf/templates/MANOTECH/MANOTECH - SUMMARY OF BID PRICES.pdf
- public/pdf/templates/MANOTECH/MANOTECH - TABBING.pdf
- public/pdf/templates/MANOTECH/MANOTECH - TABLE OF CONTENTS.pdf
- public/pdf/templates/MANOTECH/MANOTECH - Technical Specifications.pdf
- public/pdf/templates/MANOTECH/MANOTECH - Warranty.pdf
- public/pdf/templates/MANOTECH/INITAO/MANOTECH - TABLE OF CONTENTS-INITAO.pdf
- public/pdf/templates/MANOTECH/INITAO/MANOTECH - TECHNICAL COMPONENT ENVELOPE.pdf

Modified files
---------------

- .gitignore (ignore generated test/OCR artifacts)
- src/components/DocumentSetup.jsx
- src/lib/bidderAssetManifest.json
- src/lib/bidderAssets.js
- src/lib/bidderCompanies.js
- src/lib/bidderProfiles.js
- src/services/pdf/builtechDataPdf.js (dispatch to independent Manotech filler)
- src/services/pdf/omnibusPdf.js
- src/services/pdf/secretarysCertificatePdf.js
- src/services/pdf/slccPdf.js
- src/services/word/index.js
- src/services/word/pdfPageImages.js
- tests/bidder-assets.test.mjs

Re-running validation
---------------------

Run npm run lint and npm run build. Run Node tests with:

    node --test tests/bidder-assets.test.mjs tests/bidder-addresses.test.mjs tests/builtech-templates.test.mjs tests/manotech.test.mjs

For the browser checks, start Vite on 127.0.0.1:5175. Install Playwright or set
PLAYWRIGHT_MODULE to an existing playwright-core index.mjs and, when needed,
PLAYWRIGHT_EXECUTABLE to its WebKit binary. Then run:

    node tests/manotech-browser.mjs
    node tests/manotech-preview-browser.mjs

The second browser test uses the first test's ignored .tmp/manotech-validation
outputs. Source-conversion reproduction instructions are in the Python script.
