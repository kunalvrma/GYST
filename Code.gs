const MONEYFLOW = {
  SPREADSHEET_ID: '',
  TRANSACTIONS_SHEET_NAME: 'HUDLogs',
  SETTINGS_SHEET_NAME: 'HUDSettings',
  DASHBOARD_SHEET_NAME: 'Dashboard',
  DEFAULT_HEADERS: [
    'Timestamp',
    'Account',
    'Flow Type',
    'Amount',
    'Destination Account',
    'Category',
    'Description',
    'Person / Tag',
    'ID',
  ],
  HEADER_ALIASES: {
    timestamp: ['Timestamp', 'Submitted At', 'Date', 'Date/Time'],
    account: ['Account', 'Source Account', 'Account / Source'],
    flow: ['Flow Type', 'Flow', 'Type', 'Transaction Type'],
    amount: ['Amount', 'Value'],
    destination: ['Destination Account', 'Destination', 'To Account', 'Transfer To'],
    category: ['Category', 'Spend Category'],
    description: ['Description', 'Notes', 'Memo', 'Particulars'],
    tag: ['Person / Tag', 'Person', 'Tag', 'Person/Tag'],
    id: ['ID', 'UUID', 'Transaction ID', 'Txn ID'],
  },
  DEFAULT_ACCOUNTS: ['Cash', 'UBI', 'Kotak811', 'SBI', 'Zerodha', 'Axis'],
  DEFAULT_CATEGORIES: [
    'Income',
    'Groceries',
    'Transport',
    'Utilities',
    'Health',
    'Education',
    'Dining & Lifestyle',
    'Relationships',
    'Vice',
    'Overheads',
    'Investments',
    'Escrow / Lending',
    'Transfer (Self)',
    'Adjustment',
  ],
  FLOW_TYPES: [
    { value: 'IN (+)', label: 'IN +', cls: 'in' },
    { value: 'OUT (-)', label: 'OUT -', cls: 'out' },
    { value: 'TRANSFER', label: 'TRANSFER', cls: 'tr' },
  ],
};

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'getConfig') {
    return ContentService.createTextOutput(JSON.stringify({ ok: true, data: getHudConfig() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('moneyFlow')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, interactive-widget=resizes-content');
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.action === 'getConfig') {
      return ContentService.createTextOutput(JSON.stringify({ ok: true, data: getHudConfig() }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (payload.action === 'submitEntry') {
      const result = submitEntry(payload.data);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, data: result }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (payload.action === 'getSnapshot') {
      const result = getSnapshot(payload.data || {});
      return ContentService.createTextOutput(JSON.stringify({ ok: true, data: result }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    throw new Error('Unknown action: ' + payload.action);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: error.message || String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getHudConfig() {
  const ss = getSpreadsheet_();
  const settings = getOrCreateSettingsSheet_(ss);

  return {
    // Accounts remain sheet-driven (vary per user setup)
    accounts: getSettingsList_(settings, 'Accounts', MONEYFLOW.DEFAULT_ACCOUNTS),
    // Categories are hardcoded — 14 final categories, never read from HUDSettings
    categories: MONEYFLOW.DEFAULT_CATEGORIES,
    flows: MONEYFLOW.FLOW_TYPES,
    defaults: {
      account: '',
      flow: 'OUT (-)',
      flowCls: 'out',
      transferCategory: 'Transfer (Self)',
    },
  };
}

function submitEntry(payload) {
  const entry = normalizeEntry_(payload);
  const lock = LockService.getDocumentLock() || LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const ss = getSpreadsheet_();
    const sheet = getTransactionsSheet_(ss);
    const headerMap = ensureTransactionHeaders_(sheet);

    if (entry.id && headerMap['id'] !== undefined) {
      const lastRow = sheet.getLastRow();
      const startRow = Math.max(2, lastRow - 50);
      const numRows = lastRow - startRow + 1;
      if (numRows > 0) {
        const idColIndex = headerMap['id'] + 1;
        const recentIds = sheet.getRange(startRow, idColIndex, numRows, 1).getValues();
        for (let i = 0; i < recentIds.length; i++) {
          if (recentIds[i][0] === entry.id) {
            return {
              ok: true,
              message: receipt_(entry) + ' (Duplicate)',
              row: startRow + i,
            };
          }
        }
      }
    }

    const row = new Array(sheet.getLastColumn()).fill('');

    setByKey_(row, headerMap, 'timestamp', new Date());
    setByKey_(row, headerMap, 'account', entry.account);
    setByKey_(row, headerMap, 'flow', entry.flow);
    setByKey_(row, headerMap, 'amount', entry.amount);
    setByKey_(row, headerMap, 'destination', entry.destination);
    setByKey_(row, headerMap, 'category', entry.category);
    setByKey_(row, headerMap, 'description', entry.description);
    setByKey_(row, headerMap, 'tag', entry.tag);
    setByKey_(row, headerMap, 'id', entry.id);

    sheet.appendRow(row);

    return {
      ok: true,
      message: receipt_(entry),
      row: sheet.getLastRow(),
    };
  } finally {
    lock.releaseLock();
  }
}

function getSpreadsheet_() {
  const ss = SpreadsheetApp.getActive();
  if (!ss) {
    throw new Error('No active spreadsheet. Bind this script to your sheet.');
  }
  return ss;
}

function normalizeEntry_(payload) {
  payload = payload || {};
  const id = cleanString_(payload.id);
  const flow = cleanString_(payload.flow);
  const account = cleanString_(payload.account);
  const destination = cleanString_(payload.destination);
  const description = cleanString_(payload.description);
  const tag = cleanString_(payload.tag);
  let category = cleanString_(payload.category);
  const amount = Number(payload.amount);

  if (!account) throw new Error('Select an account.');
  if (!flow) throw new Error('Select a flow type.');
  if (payload.amount === '' || payload.amount === null || payload.amount === undefined || Number.isNaN(amount) || amount < 0) {
    throw new Error('Enter a valid amount.');
  }

  if (flow === 'TRANSFER') {
    if (!destination) throw new Error('Select a destination account.');
    if (!category) category = 'Transfer (Self)';
  } else if (!category) {
    throw new Error('Select a category.');
  }

  return {
    id,
    flow,
    account,
    amount,
    destination: flow === 'TRANSFER' ? destination : '',
    category,
    description,
    tag,
  };
}

function getTransactionsSheet_(ss) {
  const named = ss.getSheetByName(MONEYFLOW.TRANSACTIONS_SHEET_NAME);
  if (named) return named;

  const sheets = ss.getSheets().filter(function (sheet) {
    return sheet.getName() !== MONEYFLOW.SETTINGS_SHEET_NAME;
  });

  if (sheets.length) return sheets[0];
  return ss.insertSheet('Transactions');
}

function ensureTransactionHeaders_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), MONEYFLOW.DEFAULT_HEADERS.length);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, MONEYFLOW.DEFAULT_HEADERS.length).setValues([MONEYFLOW.DEFAULT_HEADERS]);
  } else {
    const firstRow = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    const hasAnyHeader = firstRow.some(function (value) {
      return cleanString_(value);
    });
    if (!hasAnyHeader) {
      sheet.getRange(1, 1, 1, MONEYFLOW.DEFAULT_HEADERS.length).setValues([MONEYFLOW.DEFAULT_HEADERS]);
    }
  }

  let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(cleanString_);
  const requiredFields = [
    { key: 'timestamp', header: 'Timestamp' },
    { key: 'account', header: 'Account' },
    { key: 'flow', header: 'Flow Type' },
    { key: 'amount', header: 'Amount' },
    { key: 'destination', header: 'Destination Account' },
    { key: 'category', header: 'Category' },
    { key: 'description', header: 'Description' },
    { key: 'tag', header: 'Person / Tag' },
    { key: 'id', header: 'ID' },
  ];

  requiredFields.forEach(function (field) {
    const map = buildHeaderMap_(headers);
    if (map[field.key] === undefined) {
      sheet.getRange(1, headers.length + 1).setValue(field.header);
      headers.push(field.header);
    }
  });

  return buildHeaderMap_(headers);
}

function buildHeaderMap_(headers) {
  const map = {};
  Object.keys(MONEYFLOW.HEADER_ALIASES).forEach(function (key) {
    const aliases = MONEYFLOW.HEADER_ALIASES[key];
    for (let i = 0; i < headers.length; i += 1) {
      if (aliases.some(function (alias) { return sameHeader_(headers[i], alias); })) {
        map[key] = i;
        break;
      }
    }
  });
  return map;
}

function setByKey_(row, headerMap, key, value) {
  if (headerMap[key] === undefined) return;
  row[headerMap[key]] = value;
}

function getOrCreateSettingsSheet_(ss) {
  let sheet = ss.getSheetByName(MONEYFLOW.SETTINGS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(MONEYFLOW.SETTINGS_SHEET_NAME);
    sheet.getRange(1, 1, 1, 2).setValues([['Accounts', 'Categories']]);
    sheet.getRange(2, 1, MONEYFLOW.DEFAULT_ACCOUNTS.length, 1).setValues(
      MONEYFLOW.DEFAULT_ACCOUNTS.map(function (item) { return [item]; })
    );
    sheet.getRange(2, 2, MONEYFLOW.DEFAULT_CATEGORIES.length, 1).setValues(
      MONEYFLOW.DEFAULT_CATEGORIES.map(function (item) { return [item]; })
    );
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, 2);
  }

  ensureSettingsColumn_(sheet, 'Accounts', MONEYFLOW.DEFAULT_ACCOUNTS);
  ensureSettingsColumn_(sheet, 'Categories', MONEYFLOW.DEFAULT_CATEGORIES);
  return sheet;
}

function ensureSettingsColumn_(sheet, header, defaults) {
  const column = findHeaderColumn_(sheet, header);
  if (column) return column;

  const newColumn = sheet.getLastColumn() + 1;
  sheet.getRange(1, newColumn).setValue(header);
  sheet.getRange(2, newColumn, defaults.length, 1).setValues(
    defaults.map(function (item) { return [item]; })
  );
  return newColumn;
}

function getSettingsList_(sheet, header, defaults) {
  const column = ensureSettingsColumn_(sheet, header, defaults);
  const lastRow = Math.max(sheet.getLastRow(), defaults.length + 1);
  const values = sheet.getRange(2, column, lastRow - 1, 1)
    .getValues()
    .map(function (row) { return cleanString_(row[0]); })
    .filter(Boolean);

  const unique = [];
  values.forEach(function (value) {
    if (!unique.some(function (existing) { return existing.toLowerCase() === value.toLowerCase(); })) {
      unique.push(value);
    }
  });

  return unique.length ? unique : defaults;
}

function findHeaderColumn_(sheet, header) {
  const lastColumn = sheet.getLastColumn();
  if (!lastColumn) return 0;

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  for (let i = 0; i < headers.length; i += 1) {
    if (sameHeader_(headers[i], header)) return i + 1;
  }
  return 0;
}

function receipt_(entry) {
  const sign = entry.flow === 'IN (+)' ? '+' : entry.flow === 'OUT (-)' ? '-' : '<>';
  return sign + '₹' + entry.amount.toLocaleString('en-IN') + ' · ' + entry.category;
}

function cleanString_(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function normalizeHeader_(value) {
  return cleanString_(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w /()+-]/g, '');
}

function sameHeader_(left, right) {
  return normalizeHeader_(left) === normalizeHeader_(right);
}

// ─── Dashboard Snapshot ───────────────────────────────────────────────────────

/**
 * Reads computed values from the Dashboard sheet and returns a structured
 * JSON snapshot for the HUD Dashboard view.
 *
 * Accepts optional { month, year } in params for Time Machine mode.
 * If provided, writes the selectors, flushes, reads results, then returns.
 *
 * Called via doPost with action: 'getSnapshot'.
 */
function getSnapshot(params) {
  const ss = getSpreadsheet_();
  const dash = ss.getSheetByName(MONEYFLOW.DASHBOARD_SHEET_NAME);
  if (!dash) throw new Error('Dashboard sheet not found.');

  // ── Time Machine: write selectors if caller specified a period ──
  const hasTimeMachine = params && params.month && params.year;
  if (hasTimeMachine) {
    dash.getRange('M11').setValue(Number(params.month)); // MTD month
    dash.getRange('N11').setValue(Number(params.year));  // MTD year
    dash.getRange('N34').setValue(Number(params.year));  // YTD year
    SpreadsheetApp.flush();                              // force recalc
  }

  // ── Read current selector values (so HUD always knows what period is shown) ──
  const mtdMonth = dash.getRange('M11').getValue();
  const mtdYear  = dash.getRange('N11').getValue();
  const ytdYear  = dash.getRange('N34').getValue();

  // ── Hero ──
  const hero = {
    netWorth:       dash.getRange('B4').getValue(),
    totalLiquidity: dash.getRange('G4').getValue(),
    todayExpense:   dash.getRange('I4').getValue(),
    trueWealth:     dash.getRange('G7').getValue(),
    runway:         dash.getRange('I6').getValue(),
    monthlyBurn:    dash.getRange('N7').getValue(),
  };

  // ── Liquidity Accounts (B13:D27, up to 15 rows, skip blanks) ──
  const accountData = dash.getRange('B13:D27').getValues(); // 15-row cap
  const accounts = [];
  accountData.forEach(function(row) {
    const name = cleanString_(row[0]); // col B = name
    if (name) {
      accounts.push({ name: name, balance: row[2] }); // col D = balance (col C is empty after Ghost Money removal)
    }
  });

  // ── MTD Board ──
  const mtd = {
    period: { month: mtdMonth, year: mtdYear },
    income: dash.getRange('N13').getValue(),
    buckets: {
      survival: { allowance: dash.getRange('H15').getValue(), spent: dash.getRange('K15').getValue(), remaining: dash.getRange('M15').getValue() },
      wealth:   { allowance: dash.getRange('H16').getValue(), spent: dash.getRange('K16').getValue(), remaining: dash.getRange('M16').getValue() },
      wants:    { allowance: dash.getRange('H17').getValue(), spent: dash.getRange('K17').getValue(), remaining: dash.getRange('M17').getValue() },
    },
    categories: readCategoryRows_(dash, 'G21:H31', 'M21:M31'),
  };

  // ── YTD Board ──
  const ytd = {
    period: { year: ytdYear },
    income: dash.getRange('N36').getValue(),
    buckets: {
      survival: { spent: dash.getRange('H38').getValue(), pct: dash.getRange('K38').getValue(), target: 0.45 },
      wealth:   { spent: dash.getRange('H39').getValue(), pct: dash.getRange('K39').getValue(), target: 0.30 },
      wants:    { spent: dash.getRange('H40').getValue(), pct: dash.getRange('K40').getValue(), target: 0.25 },
    },
    categories: readCategoryRows_(dash, 'G44:H54', 'M44:M54'),
  };

  // ── Escrow / Lending (B31:D35, spill — up to 15 rows, skip header + blanks) ──
  const escrowRaw = dash.getRange('B31:D46').getValues(); // header + up to 15 entries
  const escrow = [];
  escrowRaw.forEach(function(row, i) {
    if (i === 0) return; // skip header row
    const person = cleanString_(row[0]);
    if (person) {
      escrow.push({
        person:      person,
        netPosition: row[1],
        asOf:        row[2] ? new Date(row[2]).toISOString() : null,
      });
    }
  });

  // ── Expense by Month (B50:D68+, spill — read until blank) ──
  const expenseRaw = dash.getRange('B50:D100').getValues();
  const expenseByMonth = [];
  expenseRaw.forEach(function(row, i) {
    if (i === 0) return; // skip header row
    const year = row[0];
    if (!year || year === 'Year') return;
    expenseByMonth.push({ year: year, month: row[1], total: row[2] });
  });

  return {
    generatedAt: new Date().toISOString(),
    hero,
    accounts,
    mtd,
    ytd,
    escrow,
    expenseByMonth,
  };
}

/**
 * Reads a block of category rows from the Dashboard.
 * labelRange: e.g. 'G21:H31' — col1 = category name, col2 = description
 * amountRange: e.g. 'M21:M31' — single column of amounts
 * Returns array of { category, amount, description }
 */
function readCategoryRows_(dash, labelRange, amountRange) {
  const labels  = dash.getRange(labelRange).getValues();
  const amounts = dash.getRange(amountRange).getValues();
  const result  = [];
  labels.forEach(function(row, i) {
    const cat = cleanString_(row[0]);
    if (cat) {
      result.push({
        category:    cat,
        description: cleanString_(row[1]),
        amount:      amounts[i][0] || 0,
      });
    }
  });
  return result;
}
