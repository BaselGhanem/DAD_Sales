# DAD Sales

Static GitHub Pages portal. No Firebase or backend.

## Representative dashboard

- Login redirects enabled representatives to representative.html
- Reads data/Up.xlsx → Data on every dashboard load; worker keeps parsing off the UI thread
- Exact MR name matching; current month based on latest workbook date, one-click YTD and custom range
- Net Value and Units include returns; active customers are distinct customer IDs with positive net Value
- Four animated Chart.js views: trend, products/items, areas, customers
- Searchable multiselect cascading filters: month, team, area, customer, product group, item; filter chips and reset
- Newest-first details table, 25 rows per page, mobile stacked rows; no export and no Bonus field
- Comparison uses same date endpoints shifted one month, or twelve months for YTD, clamped to valid calendar dates; unavailable coverage is disclosed
- Optional data/Targets.xlsx → Data with MR, Item Name, Year, Month, Value, Units. One row per rep/item/year/month. All target UI hidden without matching valid targets. See targets/README.md
- Target and actual use full selected months and matching targeted items; ignore customer/area filters. Other scope filters apply
- Library scripts bundled under vendor; public source URLs and versions in vendor/README.md

## Accounts and scope

accounts.json contains representative IDs, roles, exact names, teams and salted SHA-256 PIN hashes. Initial distribution PINs are in credentials.csv. Update with python scripts/set-password.py.

Supervisors and Business Units remain inactive pending explicit accounts and team mappings. Non-person MR labels are excluded. Multiple observed Team associations are retained.

This client-side implementation is obfuscation, not secure authorization. Public repository files, including the workbook and initial credential list, can be downloaded. Four-digit PINs and client sessions do not protect confidential records.

## Daily updates

Replace data/Up.xlsx with the complete updated workbook using the same name, sheet Data and existing headers. Reload the dashboard to read the new version.

## Validation

Worker reconciled against the uploaded workbook and supplied report: 2026-11-08 data, reference MR November net 1,917.94, units 359, active customers 7, movements 12. Unit checks cover returns, positive-net customer counts, filter intersections, month-end clamping and year boundaries. Login redirect tested in live browser without a session. Authenticated visual QA remains pending.
