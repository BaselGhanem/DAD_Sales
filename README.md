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

## Authoritative credentials (updated)

Only credentials.csv controls login. Columns: Username, Medical Representative, PIN. Username is the stable unique account ID; Medical Representative must exactly match MR in data/Up.xlsx; PIN contains exactly four ASCII digits (preserve leading zeros). Teams is removed and is inferred from all Team values on the representative's workbook rows.

Rename a representative in the CSV and replace the historical MR names in the workbook. Change the PIN when an employee leaves. A name/PIN change invalidates that account's existing sessions on the next refresh; open dashboards check for published workbook and credential changes every 30 seconds and on return. Existing sessions created before this update require one new sign-in. accounts.json is legacy and is no longer read by the application. Updating the workbook alone does not create or rename login accounts.

## Supervisor accounts

The supervisor role is active at supervisor.html. credentials.csv now has Role and Team columns:
- Role=rep: Team stays blank; membership is inferred from the workbook by MR.
- Role=supervisor: Team must exactly match one workbook Team.
- The Medical Representative column holds the display name for either role.
- Vacant accounts are distinct per team, with unique Username and PIN. Replace only the display name and PIN when the post is filled; retain Username, Role and Team.
- Named supervisors: Azord / محمد الرمحي; Clavodar / قاسم سمور; Matador / مي الششتري. Eight other teams have Vacant accounts.
- Default view is the whole team; representative filter and representative comparison chart apply to team-scoped rows.
- Team is part of the supervisor session version, so changing assignment invalidates saved supervisor sessions.
- Bonus is excluded from both supervisor and representative views.
- Business Unit roles are configured as documented below.

## Business Unit accounts

Two active roles and pages:
- chronic → business-unit-chronic.html: Cardio 1, Cardio 2, Cardio 3, Cardio 4
- anti-infective → business-unit-anti-infective.html: Azord, Clavodar, Hairgrow, Matador, Mixif, Non-Promoted, URO

Both accounts are in credentials.csv with distinct four-digit PINs. Team contains pipe-separated exact workbook Team names for BU roles, for example Cardio 1 | Cardio 2 | Cardio 3 | Cardio 4. Keep Role and Username stable when changing the display name/PIN. Team assignments are included in session validation.

Business Unit pages show only their assigned teams for sales records, representative comparison, team comparison and targets. Team, supervisor, representative, date, area, customer, group and item filters intersect. Supervisors are resolved from the same credentials.csv file. Bonus is excluded. Existing opportunity and profile views preserve aggregate-only visibility for products outside the relevant portfolio.

## Country Manager

- Username and Role: country-manager. Password-only login uses credentials.csv; Team stays blank.
- country-manager.html reads all workbook sales rows, including future teams. Bonus excluded.
- Cascading Business unit, Supervisor, Team and Medical representative filters; existing period, area, customer, group and item filters remain available.
- BU membership comes from BU accounts in credentials.csv. Unmapped teams stay visible as Unassigned.
- Business unit, team and representative comparison charts support the same filters, labels and premium tooltips.
- Opportunities and follow-up priorities include independent BU/supervisor/team/representative filters.
- Targets stay hidden without matching valid target data; area and customer filters remain excluded.
- Auto refresh checks run every ten minutes.
