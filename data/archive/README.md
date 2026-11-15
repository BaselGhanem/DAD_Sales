# Annual sales archives

Upload the complete 2025 workbook here as `Sales-2025.xlsx`. Use a worksheet named `Data` with the same column headers as `data/Up.xlsx`. To correct an archive or update representative names, replace the workbook at the same path.

At the annual rollover, archive the completed year as `Sales-YYYY.xlsx` in this folder. Keep the daily workbook at `data/Up.xlsx` for the active year.

This repository is public. Upload only workbooks approved for public access.

Dashboards discover archives on the main branch using the filename above. An
archive must contain one calendar year matching its filename. A new file version
is downloaded and validated before it replaces the saved copy in the browser.
Continue to update the current workbook at its existing path.

At rollover, publish the completed-year archive before replacing `Up.xlsx` with
the first workbook for the new year. The active year is read from the
transactions in `Up.xlsx`, and archives for that year or later are ignored until
the active workbook advances.
