const MONEYFLOW = {
  SPREADSHEET_ID: '',
  TRANSACTIONS_SHEET_NAME: 'HUDLogs',
  SETTINGS_SHEET_NAME: 'HUDSettings',
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
    'Investments',
    'Transport',
    'Utilities',
    'Income',
    'Dining & Lifestyle',
    'Health',
    'Education',
    'Groceries',
    'Home Projects',
    'Relationships',
    'Escrow / Lending',
    'Mandate',
    'Adjustment',
    'Transfer (Self)',
    'Vice',
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
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
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
    accounts: getSettingsList_(settings, 'Accounts', MONEYFLOW.DEFAULT_ACCOUNTS),
    categories: getSettingsList_(settings, 'Categories', MONEYFLOW.DEFAULT_CATEGORIES),
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
  if (MONEYFLOW.SPREADSHEET_ID) {
    return SpreadsheetApp.openById(MONEYFLOW.SPREADSHEET_ID);
  }

  const ss = SpreadsheetApp.getActive();
  if (!ss) {
    throw new Error('No active spreadsheet. Bind this script to your sheet or set MONEYFLOW.SPREADSHEET_ID.');
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
