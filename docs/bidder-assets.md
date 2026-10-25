# Supported bidder assets

Only these four bidders are configured and available in Document Setup:

| Bidder | Asset folder |
| --- | --- |
| MIKATA CORPORATION | MIKATA_CORPORATION |
| BUILTECH SOLUTIONS | BUILTECH_SOLUTIONS |
| MANOTECH | MANOTECH |
| MEGA PLUTO | MEGA_PLUTO |

Each folder is used under public/images and public/pdf/templates, static and reference. Shared assets remain where required by the four supported bidders. Company-private certificates are never substituted from another bidder.

The generated inventory is src/lib/bidderAssetManifest.json. Refresh it with npm.cmd run assets:sync; production builds run this automatically.

Unused company directories, their configuration, dedicated conversion scripts/tests and obsolete inventory reports have been removed. The shared editable Omnibus reflow used by Mega Pluto is retained as src/services/pdf/bidderOmnibusLayout.js.

No Supabase project records were deleted. An older project referencing a removed bidder must select one of the four supported bidders before exporting that bidder's documents.

Validation:

    npm.cmd run lint
    npm.cmd run build
    node --test tests/bidder-assets.test.mjs tests/bidder-addresses.test.mjs tests/builtech-templates.test.mjs tests/manotech.test.mjs tests/mega-pluto.test.mjs
