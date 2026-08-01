# Changelog

All notable changes to the GYST personal finance system are documented here.

---

## [2026-08-02]

### Fixed

- **OAuth Scope Inflation** — Removed a dead-code fallback in Code.gs (SpreadsheetApp.openById(), gated behind an always-empty constant) that was causing Apps Script to auto-detect and request the broad `spreadsheets` scope at deploy time. Added an explicit oauthScopes declaration in appsscript.json (spreadsheets.currentonly + script.external_request) so deployments now request only the narrow permissions the code actually uses. Verified via live OAuth consent screen on a test deployment.

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
