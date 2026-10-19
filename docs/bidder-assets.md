# Cleanup update — 2026-10-20

At the user's subsequent request, 25 unused PDF/image files were deleted (90,308,615 bytes, about 86.1 MiB). These include superseded legacy static/private templates, obsolete static SLCC PDFs, misplaced duplicate images/PDFs, a duplicate reference PDF, and starter artwork. Active company assets, generic shared templates, the shared reference PDF, and favicon remain. The manifest now contains 48 assets. Current Mikata uses 30 verified company assets; their SHA-256 hashes are tracked in tests/fixtures/mikata-assets.sha256.json. See unused-assets-cleanup.json for every removed path and its recovery-copy location outside the project.

The original migration report below is historical; its statements about keeping legacy originals and 69 assets describe the pre-cleanup state.

# Bidder assets

Backup branch: `backup/bidder-assets-2026-10-20`. Original PDFs, images, reference files, and nested `templates/INITAO` files remain available. The existing interface and database schema were retained.

## Folder structure

Each of these four roots now contains the company folders below:

```text
public/images/<company>/
public/pdf/static/<company>/
public/pdf/templates/<company>/
public/pdf/reference/<company>/
```

| Stable ID | Folder | Company |
| --- | --- | --- |
| mikata | MIKATA_CORPORATION | MIKATA CORPORATION |
| magnus | MAGNUS | MAGNUS ELECTRONICS AND ELECTRICAL SUPPLIES TRADING |
| builtech | BUILTECH_SOLUTIONS | BUILTECH SOLUTIONS |
| fjq | FJQ_CONSTRUCTION | FJQ CONSTRUCTION |
| golden-m | GOLDEN_M | GOLDEN M ELECTRICAL AND INDUSTRIAL SUPPLIES AND TRADING |
| manotech | MANOTECH | MANOTECH |
| r-and-l | R_AND_L_BUILDERS | R&L BUILDERS AND CONSTRUCTION SUPPLY |
| migoy-bugoy | MIGOY_BUGOY | MIGOY BUGOY ENTERPRISES |
| wdc | WDC_BUILDERS | WDC BUILDERS & SUPPLIES |
| mega-pluto | MEGA_PLUTO | MEGA PLUTO |

There are 40 company directories, tracked with `.gitkeep` files. Mikata has 32 byte-identical copies: nine static PDFs, 22 templates (including two nested INITAO templates), and one logo. Shared reference files were not moved. Additional unprefixed files already present in company folders were left intact.

## Selection and naming

The existing **Bidder Name** dropdown now exposes all ten companies. Selection stores a stable `bidderId` alongside the existing display name, selects the company folders and logo, and fills the configured business address. Unknown company addresses are left blank for entry. Existing Mikata names and aliases continue resolving without a database migration.

Company filenames use the exact configured display name followed by ` - ` and the original filename. For example:

```text
public/pdf/static/BUILTECH_SOLUTIONS/BUILTECH SOLUTIONS - SEC Registration Certificate.pdf
public/pdf/templates/BUILTECH_SOLUTIONS/BUILTECH SOLUTIONS - NFCC_Template.pdf
public/images/BUILTECH_SOLUTIONS/BUILTECH SOLUTIONS - logo.png
public/pdf/templates/MIKATA_CORPORATION/INITAO/MIKATA CORPORATION - TABLE OF CONTENTS-INITAO.pdf
```

PNG, JPG, and JPEG logos are supported. Non-Mikata logos keep their aspect ratio. The centralized resolver encodes public URLs and checks the asset manifest before loading, with errors identifying the company, missing filename, and expected local path. It also rejects HTML responses masquerading as PDFs.

Company-specific static certificates never fall back to another company. The five private templates listed below also require the selected company's actual files. Other generic templates can use shared originals, with company-specific versions preferred when supplied. Logo-bearing output replaces the letterhead for other companies using their actual logo and entered details; it does not invent contact details.

## Missing files

Only Mikata's actual logo and company documents were available for this implementation. **Magnus, Builtech, FJQ, Golden M, Manotech, R&L, Migoy Bugoy, WDC, and Mega Pluto each still need these 13 assets:**

- One actual logo, named `<company name> - logo.png` (or `.jpg` / `.jpeg`).
- Seven static PDFs: `SEC Registration Certificate.pdf`, `Mayor’s Permit  Municipal License (CY 2026).pdf` (two spaces after Permit), `TAX_template.pdf`, `Certificate of Registration (COR).pdf`, `Latest Income and Business Tax Returns.pdf`, `PhilGEPS Platinum Certificate.pdf`, and `Audited Financial Statements.pdf`.
- Five private templates: `NFCC_Template.pdf`, `Manpower Requirements.pdf`, `Statement of Ongoing Government and Private Contracts,.pdf`, `SLCC_table_cctv.pdf`, and `SLCC_table_streetlight.pdf`.

Prefix each filename with `<company name> - ` and place it in that company's matching directory. Both SLCC variants are listed so either selection can work. No substitute certificates, history, financial data, staff lists, or fabricated logos were supplied. Full exports for those nine companies deliberately report missing assets until the real files are provided.

After copying actual files:

```sh
npm run assets:sync
npm run dev
```

Restart an already-running dev server after changing the manifest. `npm run build` automatically refreshes it for deployment. `npm run assets:organize` safely creates absent company directories and absent Mikata copies; it never overwrites existing files.

## Preservation and verification

- Pricing calculations, Supabase tables, existing document IDs, autosave hooks, editor controls, and document order were retained.
- Current packages contain 23 Default sections and 26 Initao sections, including existing TABBING and Initao dividers. The attachment's older 21-section count was not used to remove current sections.
- The nine-page TABBING template remains intact. Existing red date-only deadline handling remains unchanged.
- Existing Mikata project 13261581 opened and displayed its live PDF preview. Full PDF and editable Word generation succeeded: Default 74 pages; Initao PDF 77 pages. Default Word preview rendered 74 pages. Initao Word generation succeeded; its preview was not separately rendered in this run.
- Ten Mikata generators were compared with backup implementations: first-page raster output and document page counts matched for TABBING, TOC, ongoing contracts, NFCC, bid security, manpower, Omnibus, after sales, warranty, and bid form. This was not an every-page pixel comparison.
- All 32 copied Mikata assets matched their originals by SHA-256.
- CCTV SLCC, Bid Security with table, and Initao Omnibus generated in both PDF and Word; Streetlight and default variants were exercised by the full-package run.
- All 69 inventoried public assets and 11 legacy registry entries returned valid content types without asset errors in the browser checks. No browser runtime errors were recorded.
- All nine other bidders blocked PDF and Word exports when actual company assets were missing, rather than using Mikata certificates.
- Controlled bidder switching updated company IDs and address fields while retaining the reference number; no database writes were performed by these checks.
- At a 375px mobile viewport, the bidder selector exposed all ten bidders plus the placeholder, with no horizontal page overflow.
- Preview and download used the same generated PDF/Word object URLs; downloading did not regenerate a different document.

Browser results are recorded in `bidder-assets-validation.json`. Automated checks: `npm run test:bidder-assets`, `npm run lint`, and `npm run build`. Development server startup was also verified on port 5174 without replacing the existing server on port 5173. Final results: five asset tests passed; lint completed with zero errors and one existing PriceScheduleEditor.jsx warning; production build passed with the existing large-chunk advisory. The diff whitespace check only flagged a pre-existing trailing blank line in the user-edited bid-export-preview.css, which was left intact.

## File inventory

The complete source-change and copied-asset inventory is in `bidder-assets-files.txt`. The pre-existing user edits to `src/lib/projectDocuments.js` and `src/styles/bid-export-preview.css` were preserved and are not attributed to this implementation.
