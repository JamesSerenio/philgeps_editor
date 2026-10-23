R&L Builders PDF and Word integration
===================================

Implemented for R&L BUILDERS AND CONSTRUCTION SUPPLY, stable ID r-and-l,
using public/pdf/templates/R_AND_L_BUILDERS/ and the supplied, unchanged
public/images/R_AND_L_BUILDERS/R&L Builders Construction Supply Logo.png.

The existing configured address is authoritative:
Brgy. Baloy Extension, Gusa, Cagayan de Oro City, Misamis Oriental, Philippines.
The supplied logo contains no contact details, so none were invented.
Saved custom addresses continue to take precedence.

Behavior
--------

- 22 separate applicant-controlled forms, including scanned forms and Initao
  variants. Original page dimensions and counts verified during conversion.
- Original Mikata, Builtech, Manotech and official certificate files untouched.
  Source/output hashes are in r-and-l-template-conversion.json.
- Strict R&L template resolution; missing R&L templates cannot silently fall
  back to another company's form. URL encoding preserves path ampersands and
  commas using the existing resolver.
- Shared standard sidebar, representative dropdown and automatic designation;
  no extra financial, staff, officer or certificate-upload sidebar sections.
- Isolated profiles, including legacy representative aliases, financial and
  contract history, officer details, identity-document type and legal structure.
  Existing Supabase editor-state JSON round trips retain these values.
- Letterheads follow the latest supplied R&L reference: a wide banner with
  centered printed address and contact/email lines underneath. Empty source
  image margins are trimmed during rendering; the source asset stays unchanged.
  The printed L. R. Borja Extension header address is independent of the saved
  project business address. Footer text remains editable in Word. Other
  companies' approved letterheads are unchanged.
- Complete Manpower and NFCC grids with saved data only. Missing data stays
  blank. NFCC supports the saved multiplier (financials.multiplier,
  nfcc.multiplier or multiplier), otherwise the existing factor 15 applies.
- SLCC CCTV/Streetlight uses only R&L saved contract records, not sample
  Mikata contracts. Other document editors retain their normal controls.
- Representative personal details come from an explicitly selected directory
  entry or saved override. Unknown people do not receive invented details.
- R&L Omnibus reflows the complete existing legal clauses at normal font size
  to accommodate its long registered name. Both variants retain the same
  current implementation's numbering. The tested default remained three pages.
- Existing package order is unchanged: 23 default sections including tabbing,
  or 26 with Initao dividers. PDF and Word share the existing document list.
- Preview/download flow and stale-preview protections remain in place.

Missing information
-------------------

No R&L officer names or genuine official certificates were supplied.
Secretary's Certificate displays Missing Required Information until the actual
Corporate Secretary and President / Proprietor names are saved. It does not
use Mikata/Manotech officer defaults. An explicitly saved non-corporate legal
structure is blocked from the corporate certificate layout and requires the
appropriate authorization form. Unknown secretary nationality and identity
document type remain blank; they are not copied from another person's records.

The following seven genuine R&L documents remain missing:

- SEC Registration Certificate.pdf
- Mayor’s Permit  Municipal License (CY 2026).pdf
- TAX_template.pdf
- Certificate of Registration (COR).pdf
- Latest Income and Business Tax Returns.pdf
- PhilGEPS Platinum Certificate.pdf
- Audited Financial Statements.pdf

Existing document resolution reports Missing Document and prevents a complete
package from substituting another company's certificates. No new sidebar
upload interface was added. The existing resolver can use correctly tagged
saved uploads or actual files at the company-specific static paths.

Validation
----------

- 21 automated tests passed: existing company regressions, source hashes,
  R&L asset routing, independent profile switching and editor-state persistence,
  missing documents, officer validation and unchanged document sequence.
- Browser generation exercised every applicant-controlled form in default and
  Initao variants, including CCTV/Streetlight and both bid-security layouts.
- Full default PDF and editable DOCX generated; Word XML checked for native
  tables, landscape sections, supplied logo bytes and absence of other
  companies' names/private sample data.
- Actual Generate Documents modal displayed both PDF canvas and Word previews.
  Both modal downloads matched the generated file bytes exactly.
- Actual sidebar and switching tested: R&L starts with its own address and no
  inherited representative, selecting a representative sets the designation,
  and switching restores each company's selected representative.
- Declaration and SLCC variant selections now persist separately by bidder in
  the existing editor-state JSON. A targeted switching/serialization regression
  passed; the updated regression suite contains 21 passing tests. This final
  state-handler addition was linted and built, but was not retested against a
  live Supabase project.
- Rendered PDF/Word headers and PDF Manpower, NFCC and Omnibus visually reviewed.
- Final targeted check passed for the cleaned R&L header, Word rendering,
  selected representative details, a saved NFCC multiplier of 10 and text bounds.
- All 100 production asset URLs, including the 23 R&L assets, returned HTTP 200
  and byte-for-byte source matches through the built Vite preview server.
- npm run lint and npm run build were run. Existing unrelated lint warning:
  PriceScheduleEditor.jsx:353 (effect cleanup ref). Existing bundle-size advisory
  remains. Final outcomes are also reported in the completion message.

Browser tests used clearly labeled in-memory TEST FIXTURE PDFs for missing
official documents and fictional test officer names. No fixture was installed
as a real company document, no real project was edited and no Supabase write
was made. Local editor-state serialization was tested; a live Supabase save
and an actual Vercel deployment were not performed.

Files
-----

New implementation/test files:

- scripts/create-r-and-l-templates.py
- src/services/pdf/rAndLOmnibusLayout.js
- tests/r-and-l.test.mjs
- docs/r-and-l-template-conversion.json
- docs/r-and-l-implementation.md
- User-supplied logo listed above
- 22 PDFs listed individually in r-and-l-template-conversion.json, under
  public/pdf/templates/R_AND_L_BUILDERS/ (including INITAO/).

Modified files:

- .gitignore
- vite.config.js (ignore locked temporary browser downloads in Windows watcher)
- scripts/create-manotech-templates.py (reusable target name; existing PDFs unchanged)
- src/editors/SLCCEditor.jsx
- src/lib/bidderAssetManifest.json
- src/lib/bidderAssets.js
- src/lib/bidderCompanies.js
- src/lib/bidderProfiles.js
- src/pages/ProjectEditorPage.jsx (restore company-specific declaration variants)
- src/services/pdf/bidderLetterhead.js
- src/services/pdf/builtechDataPdf.js (dispatch to shared clean table filler)
- src/services/pdf/manotechDataPdf.js (R&L configured multiplier)
- src/services/pdf/omnibusPdf.js
- src/services/pdf/secretarysCertificatePdf.js
- src/services/pdf/slccPdf.js
- src/services/pdf/tabbingPdf.js
- src/services/word/manotechLetterhead.js (shared separator)
- tests/bidder-assets.test.mjs
- tests/manotech-browser.mjs (optional TEST_BIDDER=r-and-l parameter)
- tests/manotech-preview-browser.mjs (same parameter)

Reproduction
------------

Run npm run lint and npm run build, then:

    node --test tests/bidder-assets.test.mjs tests/bidder-addresses.test.mjs tests/builtech-templates.test.mjs tests/manotech.test.mjs tests/r-and-l.test.mjs

For browser tests, run Vite on 127.0.0.1:5175. Set TEST_BIDDER=r-and-l and
provide a Playwright installation (or PLAYWRIGHT_MODULE and, if needed,
PLAYWRIGHT_EXECUTABLE), then run:

    node tests/manotech-browser.mjs
    node tests/manotech-preview-browser.mjs

Outputs are ignored under .tmp/r-and-l-validation/. The conversion script
refuses to overwrite templates unless verifying already generated copies;
it never modifies source company files or official certificates.
