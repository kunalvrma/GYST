# GYST — moneyFlow

**A personal finance system built for imperfect humans.**

> *"Where the hell did my money go?"*

Most finance tools fail because they assume you are disciplined, consistent, and never forget anything. GYST assumes the opposite — and keeps working anyway.

The only discipline it requires: **log transactions when money moves.**

---

## How It Works

Built on two boring tools — Google Sheets and Google Apps Script. Boring tools are good. They tend to work.

- **Google Sheet** — your private database. Stores every transaction and does all the math. Lives in your Google Drive. Nobody else has access.
- **moneyFlow HUD** — a fast web app (this repo) that gives you a clean interface to log entries and see your financial picture. Loads in under a second.

---

## Setup (One-time)

1. **Get the template** — Make a copy of the [GYST Google Sheet template](#) into your Google Drive.
2. **Deploy the script** — Inside the sheet: *Extensions → Apps Script → Deploy → New Deployment → Web App*. Set "Who has access" to "Anyone". Copy the URL.
3. **Connect the HUD** — Open [gystmoneyflow.vercel.app](https://gystmoneyflow.vercel.app), paste the URL, tap Link.
4. **Add to Home Screen** — On Android: tap the browser menu → *Add to Home Screen*. On iOS: tap Share → *Add to Home Screen*. You now have a native-feeling app.

That's it. You never open the sheet again for daily use.

---

## Features

### Log Entry (5 seconds)
Pick flow type (In / Out / Transfer), amount, account, category. Optional description and person/tag. Hit log. Done.

### Dashboard
Full financial snapshot — fetched on demand, always current:
- **Hero** — Net Worth, Total Liquidity, True Wealth, Today's Spend, Runway, Monthly Burn
- **Accounts** — All account balances with Ghost Money verification
- **MTD Board** — Month-to-date spending by BudgetGroup (progress bars) and per category
- **YTD Board** — Year-to-date with income percentage targets
- **Escrow / Lending** — Who owes you, who you owe
- **Monthly Expense History** — Rolling history

### Time Machine
Change the month/year in the Dashboard to see any past period's data. The sheet recalculates and returns historical numbers.

### Ghost Money
Bank balance doesn't match GYST? Tap **Verify** in Accounts, enter your real balances, see the discrepancy per account. Log an Adjustment to reconcile.

### Offline Sync
Log entries with no connection. They queue locally and sync automatically when you're back online. No duplicates, no data loss.

### Manage Accounts
Add or remove accounts directly from the app menu. No Sheet interaction needed.

---

## Budget Groups

| Group | Categories | Logic |
|---|---|---|
| **Survival** | Groceries, Transport, Utilities, Health, Education | Non-negotiable |
| **Wealth** | Investments | Money working for you |
| **Wants** | Dining & Lifestyle, Relationships, Vice | Quality of life |
| **OneOff** | Overheads | Irregular/one-time |
| **Nonspend** | Escrow/Lending, Transfer (Self), Adjustment, Income | Not real spending |

---

## Sheet Structure

| Tab | Purpose | Touch it? |
|---|---|---|
| `Dashboard` | Calculation engine. Formulas derive all metrics from MasterLog. | No |
| `HUDSettings` | Account list. Managed from the app. | Only if needed |
| `HUDLogs` | Raw transaction log. Every entry from the HUD lands here. | No |
| `MasterLog` | Computed log with FINAL_MATH. Source of truth for all Dashboard formulas. | No |

---

## Philosophy

GYST tracks spending **intention-wise**, not transaction-wise.

A ₹500 Amazon order is Overheads. A ₹500 dinner is Dining. The category reflects *why* you spent, not *where* you spent it. This makes the numbers honest and the patterns clear.

Ghost money is expected. Imperfect logging is expected. The system absorbs both without breaking.

---

## Tech Stack

- **Frontend** — Vanilla HTML / CSS / JS. No framework. Deployed on Vercel.
- **Backend** — Google Apps Script (bound to user's Sheet). Handles auth, reads, writes, and the snapshot API.
- **Database** — User's private Google Sheet. Zero third-party storage.
- **PWA** — Service worker, install prompt, offline support.

---

## Privacy

Your data never leaves your Google account. The HUD talks directly to your Apps Script deployment using the URL you provide. There is no central server, no database, no account system.

The URL is stored only in your browser's localStorage.
