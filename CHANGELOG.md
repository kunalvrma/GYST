# Changelog

All notable changes to the GYST personal finance system are documented here.

---

## [2026-08-08] — v2.1

### Added

- **In-app Multi-Panel Drawer** — Hamburger menu now has sub-panels: Manage Accounts, How to Use (Guide), FAQ, and About. Each slides in with a back button. No more placeholder footer links.
- **In-app Guide** — Explains flow types, budget groups, the dashboard, and ghost money. Lives in the drawer, always accessible.
- **In-app FAQ** — Answers the 6 most common questions (forgot to log, balance mismatch, escrow vs transfer, adding accounts, editing entries, Adjustment category).
- **In-app About** — Product description, philosophy, version number.
- **Manage Accounts from HUD** — Users can add and remove accounts directly from the drawer without ever opening the Google Sheet. Changes write to HUDSettings via the new `updateAccounts` API endpoint and refresh the Log Entry form instantly.
- **Service Worker (PWA)** — Full offline support. App shell is cached on install. Stale-while-revalidate for assets. API calls always bypass the cache.
- **PWA Install Prompt** — `beforeinstallprompt` is captured and a native install banner appears on supported browsers (Android/Chrome). iOS users see manual "Add to Home Screen" instructions. Install state is persisted to localStorage to suppress the banner after install.
- **Config Version / Cache Busting** — `getHudConfig()` now returns a `version` field (`v2.1`). The HUD compares this on load and clears the config cache if the server version has changed, ensuring users always get fresh categories/settings after a Code.gs deployment.
- **MasterLog BudgetGroup column** — ARRAYFORMULA in column J of MasterLog maps each category to its BudgetGroup (Survival/Wealth/Wants/OneOff/Nonspend). Prepared for future direct MasterLog queries.
- **Flow-Specific Categories** — Log Entry form dynamically hides irrelevant categories based on the selected Flow (e.g., IN hides everything except Income, Escrow, and Adjustment).
- **Tag Suggestion Engine** — "Person / Tag" field now features the same suggestion chip system as the Description field, tracking frequently used tags per Flow+Account+Category combination.
- **Grouped Category Grid** — Categories are now clustered into 5 distinct groups (Nonspend, One-Off, Wealth, Survival, Wants) with vertical side-labels and subtle per-group color tints. Ordered top-to-bottom for optimized mobile thumb reach.

### Changed

- **`updateAccounts` endpoint** — New `doPost` action writes account list to HUDSettings, enabling HUD-side account management.
- **manifest.json** — Added `orientation: portrait`, `categories: ["finance","productivity"]`, maskable icon purpose. App name updated to `GYST — moneyFlow`.
- **README.md** — Complete rewrite. Accurate for current architecture: HUD-first, 4 sheet tabs, all features documented, privacy model explained.
- **package.json** — Version bumped to `2.1.0`. Fixed `main` entry. Removed incorrect `"type": "commonjs"`.

### Fixed

- **Negative net worth display** — `fmtRs()` now shows `−₹` prefix for negative values instead of stripping the sign. Net Worth hero card gets a red `.negative` CSS class when below zero.
- **MTD bucket zero-income guard** — `renderBuckets()` guards against division by zero when MTD income is ₹0 (start of month). Bars show 0% cleanly instead of NaN.
- **Runway `.toFixed()` crash** — Guarded `h.runway` with `Number()` cast before calling `.toFixed(1)` to prevent crashes if the value is returned as a string.
- **Accounts save performance** — Removed `SpreadsheetApp.flush()` from `updateAccounts` endpoint, cutting save time from 60 seconds to 2–5 seconds by no longer blocking the HUD while Dashboard formulas recalculate.
- **HUDSettings column bug** — Fixed initialization bug that incorrectly created "Categories" columns in `HUDSettings`. `updateAccounts` now features a self-healing routine that deletes extra columns and cleanly preserves only Column A for accounts.

## [2026-08-08]

### Added

- **HUD Dashboard View** — The HUD now has a full Dashboard screen accessible via a bottom tab bar (Log / Dashboard). Users never need to open the Google Sheet again. The Dashboard renders 7 sections: Hero, Accounts, MTD Board, YTD Board, Escrow/Lending, Monthly Expense History, and the Ghost Money Verify panel.
- **Bottom Tab Navigation** — A persistent bottom nav bar (Log + Dashboard) appears once the app is connected. Tapping Dashboard auto-fetches the current period snapshot.
- **Time Machine** — Dashboard includes a Month/Year selector. Selecting a past period writes the selector cells in the Sheet, forces a recalculation, and returns the historically accurate data for that period. Full analysis capability now lives inside the HUD, not the Sheet.
- **Ghost Money Verify Panel** — Accounts section now has a "Verify" button. Tapping it reveals an input panel where the user enters actual balances from their banking app. The HUD calculates the discrepancy per account instantly (client-side, zero sheet writes). Green = clean, red = investigate.
- **MTD/YTD BudgetGroup Progress Bars** — The MTD board shows Survival, Wealth, and Wants as animated progress bars with allowance, spent, and remaining. Green < 75%, amber < 100%, red = over budget. YTD shows the same groups as percentage-of-income vs target.
- **Per-Category Expense Niche** — Each category row in MTD/YTD shows name, amount, and a collapsible description (tap to expand/collapse) showing the actual sub-descriptions logged (e.g. "bakery ₹90 | snacks ₹21").
- **`getSnapshot` endpoint in Code.gs** — New `doPost` action that reads ~40 computed cell values from the Dashboard sheet and returns a structured JSON payload covering all 7 dashboard sections.

### Changed

- **Dashboard Restructured (v2)** — Rebuilt the Dashboard from scratch as a pure calculation engine. Hero section moved to top, Ghost Money columns removed, all formulas migrated to reference MasterLog exclusively (no more HUDLogs references in Dashboard). Time Machine selectors (M11=Month, N11=Year for MTD; N34=Year for YTD) now correctly wire both Month and Year — previous version ignored Y1/N11 and hardcoded YEAR(TODAY()) inside formulas.
- **Category System Finalized and Hardcoded** — Categories locked to 14 final entries. `Home Projects` renamed to `Overheads`. `Mandate` removed. Categories are now served directly from `DEFAULT_CATEGORIES` in Code.gs and are no longer read from HUDSettings. HUDSettings retains only the Accounts column.
- **BudgetGroups Named and Finalized** — Five budget groups: Survival (Groceries, Transport, Utilities, Health, Education), Wealth (Investments), Wants (Dining & Lifestyle, Relationships, Vice), OneOff (Overheads), Nonspend (Escrow/Lending, Transfer (Self), Adjustment, Income).
- **ICONS map synced to final 14 categories** — Removed `HOME` (Home Projects) and `MAN` (Mandate), added `OVH` (Overheads).
- **Ghost Money migrated from Sheet to HUD** — Columns C and D (Actual Balance, Ghost Money) removed from Dashboard permanently. Reconciliation is now an ephemeral HUD calculation, not a stored spreadsheet column.
- **Vault tab removed** — The personal insurance/policy reference tab was removed from the template as users interact exclusively through the HUD.
- **Expense by Month QUERY updated** — Migrated from HUDLogs to MasterLog. Exclusion list updated to use `Overheads` instead of `Home Projects`.
- **Runway formula tightened** — Simplified from a 6-cell chain to a 2-cell calculation. Monthly Survival Burn is a rolling YTD average (total Survival spend ÷ months elapsed).
- **MTD formulas use date-bounding** — Replaced slow `MONTH(A:A)=X` pattern with fast `DATE(Y,M,1)` to `EOMONTH(DATE(Y,M,1),0)` bounding. Bucket totals use FILTER+REGEXMATCH for multi-category grouping; single-category Wealth bucket uses faster SUMIFS.

### Fixed

- **Account balances showing ₹0 in HUD** — `getSnapshot` was reading column C (row index 1) for account balances, but Ghost Money column removal shifted the balance to column D (row index 2). Fixed index to `row[2]`.
- **YTD description formula ignoring year selector** — All YTD TEXTJOIN/QUERY description formulas had `YEAR(TODAY())` hardcoded instead of referencing `$N$34`. Fixed to use the selector cell.
- **MTD description formula ignoring year selector** — Same issue in MTD board; fixed to reference `$N$11`.
- **Expense by Month formula** — Was referencing `HUDLogs` directly. Migrated to `MasterLog` with corrected exclusion list.

## [2026-08-02]

### Fixed

- **OAuth Scope Inflation** — Removed a dead-code fallback in Code.gs (SpreadsheetApp.openById(), gated behind an always-empty constant) that was causing Apps Script to auto-detect and request the broad `spreadsheets` scope at deploy time. Added an explicit oauthScopes declaration in appsscript.json (spreadsheets.currentonly + script.external_request) so deployments now request only the narrow permissions the code actually uses. Verified via live OAuth consent screen on a test deployment.
- **Reset Database Link now guards unsynced entries** — If the offline sync queue contains pending entries when the user taps "Reset Database Link," a confirmation dialog warns them that N unsynced entries will be lost. Cancelling the dialog aborts the reset entirely. On confirmation (or if the queue is empty), the reset now also clears `mf_sync_queue`, preventing orphaned entries from silently posting to a different sheet on reconnect. `mf_history`, `mf_patterns`, and `mf_sugg` are intentionally preserved across resets.
- **Stale pattern/suggestion validation** — Submission now validates that the selected account, category, and destination account still exist in the connected sheet's current settings — a stale pattern or suggestion referencing a renamed, deleted, or foreign value is rejected with an on-screen message instead of silently syncing.

---

## [2026-06-23]

### Added

- **Unique Log ID** — Each log from the moneyFlow web app now carries a unique ID to prevent duplication of entries.

---

## [2026-06-17]

### Added

- **Bring Your Own Backend** — The HUD has been decoupled from Google's hosted Apps Script UI. It now loads instantly (<100ms) with zero Google Apps Script warning banners.
- **Zero-Latency Logging** — Hitting "Log Entry" now resets the form instantly via optimistic UI. No more waiting for Google to respond.
- **The Quick Fill Memory** — The HUD now remembers your patterns. Type an amount you log frequently, and a Quick Fill chip will instantly appear. Tap it to auto-fill the entire entry.

### Changed

- **Forced Intent** — Removed default account selection. The form now loads completely blank, forcing the user to actively choose where the money came from.

---

## [2026-06-15]

### Changed

- **Migrated to Apps Script Hosted HUD** — Removed the redundant Google Form layer. The HUD is now hosted by Apps Script. A HUDSettings sheet was added to easily modify accounts and categories moving forward.
- **Renamed Sheets** — `Form_Responses` → `HUDLog`, reflecting the new direct-input architecture from the Apps Script hosted HUD web app.

---

## [2026-05-29]

### Removed

- **Deleted `__sys_config_cache__`** — Icarus offline forever.

---

## [2026-04-29]

### Fixed

- **Updated Today's Expenses Formula** — Redacted entries were excluded from the daily expense total, causing it to underreport. Added the sum of redacted entries from `__sys_config_cache__` to correct the figure.

---

## [2026-04-28]

### Added

- **Frontend Migration** — Deployed the moneyFlow HUD (HTML/JS) on GitHub Pages to replace the high-friction Google Forms workflow.
- **Data Sanitization** — Deployed `instantSanitize` Apps Script (OnFormSubmit trigger) for redacted-entry laundering.
- **Forensic Mirror** — Initialized `__sys_config_cache__` with 24-hour Stress Heatmap and habit velocity tracking.
- **Runway Guardrail** — Implemented conditional formatting for the Runway metric: triggers a "Blood Red" alert when R12 drops below 3.

### Changed

- **Removed Home Projects Bloat** — Decoupled "Home Projects" from B1/B2/B3 to preserve habit data integrity.
- **Updated `instantSanitize` for `__sys_config_cache__`** — Modified `instantSanitize` to drop Description, Category, and Account values before appending to `__sys_config_cache__`.

---

## [2026-01-09]

### Added

- **Init** — Revamped the old PFTv1 to PFTv2 (GYST) with automated calculations for amounts and related fields.
