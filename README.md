# Get Your Shit Together (GYST) System

**A personal finance system built for imperfect humans.**

A few years ago I noticed something mildly disturbing.
I was earning money… but somehow it kept disappearing.

Not in a dramatic way. Nothing illegal. No fraud. Just the classic quiet mystery of adult life:

> *"Where the hell did my money go?"*

So I did what everyone does — I tried fixing it with tools.

* Budgeting apps
* Expense trackers
* Spreadsheets
* A few extremely aesthetic Notion templates made by people who apparently never forget to log a ₹15 chai.

Every single one of them failed for the same reason. They assumed life behaves nicely.

**Life does not behave nicely.**

The problem wasn't discipline. The problem was systems designed for perfect humans.

So instead of trying to become more disciplined, I built a system that assumes you're imperfect and keeps working anyway — something that quietly helps you get your shit together.

## What I Actually Needed

Turns out I didn't need a complex finance system. I only needed answers to four simple questions:

* How much money do I actually have?
* Who owes me money?
* Who do I owe money to?
* Where is my money generally going?

That's it. Not twenty dashboards. Not 300 categories. Just clarity.

I also added two simple time views: **Month-to-date (MTD)** and **Year-to-date (YTD)**. Enough to see patterns without turning this into a CA internship.

---

## Initial Setup (Do this once and never again)

Since Google's native screens take 5 seconds to load (which is 4 seconds too long), the GYST HUD is hosted externally to be lightning-fast.

1. Open **Extensions > Apps Script** in your Google Sheet and deploy it as a "Web App". Copy the URL it gives you.
2. Open the GYST HUD website on your phone.
3. Paste the URL to securely connect your private database.
4. "Add to Home Screen" on your phone. You now have a blazing fast native app.

---

## How GYST Works

The system is built using two extremely boring tools — Google Sheets and Google Apps Script. Boring tools are good. They tend to work.

**Step 1:** A dashboard in Google Sheets lists every place where money exists — Kotak, Axis, SBI, Cash, FDs (yes, cash and fixed deposits are accounts too). This becomes the financial control panel.

**Step 2:** Whenever money moves, open the HUD and log the transaction. Takes about five seconds.

Money moving includes:
* Buying something
* Receiving income
* Lending money
* Repaying someone
* Someone paying you back

Once the form is submitted, everything else happens automatically. Balances update. Loans update. Spending patterns update. Net worth updates. You don't maintain anything. You just log and move on.

---

## About Human Imperfection

Here's an important truth: **You will forget to log things.** Everyone does.

Maybe you forgot a ₹1 cashback. Maybe the bank credited ₹12 interest. Maybe you bought chai and didn't bother logging it.

Eventually the numbers between your sheet and your bank account won't match. This is normal. I call this **ghost money**.

Most finance systems break when ghost money appears. GYST doesn't panic.

Whenever you want to reconcile, open the dashboard and check your real bank balances. If numbers don't match, you have two options:

* **Option 1 — Go full detective:** search the logs, find the missing transaction, enter it properly.
* **Option 2 — Behave like a normal human:** use the Adjustments category, write off the ghost money, and move on.

System fixed. Life continues.

---

## Sheet Structure

The sheet has six tabs. Each one exists for a specific reason.

### Dashboard
The only tab you'll actually look at most of the time. Shows account balances, net worth, loans given/taken, spending summaries, and MTD/YTD numbers. Think of it as the financial mirror.

### Vault
Not connected to calculations. Simply stores references for important things like insurance policies, policy numbers, and coverage notes. Future-you will appreciate this.

### HUDSettings
You add your Accounts and Categories (already added but customizable) from here.

### HUDLogs
Stores all raw logs coming from the HUD. You do not touch this tab. Seriously. Leave it alone.

### MasterLog
Where the spreadsheet does its internal math. Converts raw logs into something the dashboard can understand. Not a tab you should edit.

### ReadMe
This tab. Exists for the day when you open the sheet months later and wonder what past-you was thinking.

---

## Daily Usage (Very Complicated)

**Money flows → log it.** That's it.

Examples:
* You bought something
* You received income
* You lent money
* Someone repaid you

**Open the form → Log the transaction → Five seconds → Everything else happens automatically.**

---

## The Only Discipline Required

You don't need to:
* Track expenses every day
* Manually calculate balances
* Review finances constantly

**You only need to do one thing: Log transactions when money moves.**

If you do that consistently, the system takes care of the rest.

---

## Final Thought

Money management should not require daily spreadsheet rituals, complex budgeting systems, or financial anxiety.

GYST simply records reality. Whenever you want clarity, open the dashboard. The numbers will be there.

And sometimes they will gently remind you to get your shit together. Which, in case it wasn't obvious by now, is the entire gist of GYST.
