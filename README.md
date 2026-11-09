# DAD Sales
Static GitHub Pages sales portal. No Firebase and no backend.

## Phase one
- Almarai Arabic UI, loader, four role choices, personal representative accounts
- 40 named representatives extracted from Data.MR in Up.xlsx
- Excluded non-person labels: Others, Non Promoted, Vacant S.A
- All observed Team values retained per representative (including multiple teams)
- Supervisors and Business Units intentionally inactive until their accounts and team assignments are supplied
- Successful login currently displays an account confirmation; representative reporting is the next phase

## Accounts
`accounts.json` contains individual IDs, names, roles, teams and salted SHA-256 PIN hashes. `credentials.csv` lists the generated four-digit PINs for initial distribution. Change PINs with `python scripts/set-password.py`, then commit accounts.json and update the CSV.

This is client-side obfuscation, NOT secure authorization. Four-digit PIN hashes are easily brute-forced. Session values can be modified. The public credentials CSV is available to anyone with the repository URL. Do not rely on this implementation to protect confidential sales records. The original workbook and customer transaction data are not published in phase one.

Future data filtering must match MR exactly to the configured representative name, never just Team. Supervisor and BU access requires explicit team mappings; no team access should be granted to accounts lacking a mapping.

## GitHub Pages
Settings → Pages → Deploy from a branch → main → /(root).

## Local preview
`npm run dev -- --host 0.0.0.0 --port 4173 --strictPort`
