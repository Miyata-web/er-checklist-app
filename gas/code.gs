// ============================================================
// er-checklist-app  GAS WebApp
// スプレッドシート構成:
//   - items  : チェック項目マスタ
//   - records: チェック記録
// ============================================================

var SPREADSHEET_ID = ''; // ← デプロイ後にスプレッドシートIDを入力
var SHEET_ITEMS   = 'items';
var SHEET_RECORDS = 'records';

// ------------------------------------------------------------
// エントリポイント
// ------------------------------------------------------------
function doGet(e) {
  var action = e.parameter.action;
  var result;

  try {
    if (action === 'getItems') {
      result = getItems();
    } else if (action === 'getRecords') {
      var days = parseInt(e.parameter.days || '7', 10);
      result = getRecords(days);
    } else if (action === 'getMonthlyRecords') {
      result = getMonthlyRecords();
    } else {
      result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return buildResponse(result);
}

function doPost(e) {
  var result;
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;

    if (action === 'saveRecord') {
      result = saveRecord(body.data);
    } else if (action === 'saveItems') {
      result = saveItems(body.data);
    } else {
      result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return buildResponse(result);
}

// ------------------------------------------------------------
// CORS対応レスポンス
// ------------------------------------------------------------
function buildResponse(data) {
  var output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ------------------------------------------------------------
// itemsシート操作
// ------------------------------------------------------------
function getItems() {
  var ss    = getSpreadsheet();
  var sheet = getOrCreateSheet(ss, SHEET_ITEMS);
  var data  = sheet.getDataRange().getValues();

  if (data.length <= 1) return { categories: [] };

  var headers = data[0];
  var rows    = data.slice(1);

  var categoriesMap = {};
  rows.forEach(function(row) {
    var item = rowToItem(headers, row);
    if (!item.categoryId) return;

    if (!categoriesMap[item.categoryId]) {
      categoriesMap[item.categoryId] = {
        id       : item.categoryId,
        name     : item.categoryName,
        frequency: item.frequency,
        items    : []
      };
    }
    categoriesMap[item.categoryId].items.push({
      id           : item.itemId,
      name         : item.itemName,
      standardStock: item.standardStock
    });
  });

  return { categories: Object.values(categoriesMap) };
}

function saveItems(categories) {
  var ss    = getSpreadsheet();
  var sheet = getOrCreateSheet(ss, SHEET_ITEMS);

  // ヘッダー行
  var headers = ['categoryId', 'categoryName', 'frequency', 'itemId', 'itemName', 'standardStock'];
  var rows    = [headers];

  categories.forEach(function(cat) {
    cat.items.forEach(function(item) {
      rows.push([
        cat.id,
        cat.name,
        cat.frequency,
        item.id,
        item.name,
        item.standardStock
      ]);
    });
  });

  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  return { success: true };
}

// ------------------------------------------------------------
// recordsシート操作
// ------------------------------------------------------------
function saveRecord(record) {
  var ss    = getSpreadsheet();
  var sheet = getOrCreateSheet(ss, SHEET_RECORDS);

  // ヘッダーがなければ追加
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'recordId', 'date', 'shift', 'categoryId', 'categoryName',
      'itemId', 'itemName', 'inputValue', 'standardStock', 'diff', 'timestamp'
    ]);
  }

  var timestamp = new Date().toISOString();
  var date      = record.date;
  var shift     = record.shift;

  record.items.forEach(function(item) {
    var diff = item.inputValue - item.standardStock;
    sheet.appendRow([
      Utilities.getUuid(),
      date,
      shift,
      record.categoryId,
      record.categoryName,
      item.id,
      item.name,
      item.inputValue,
      item.standardStock,
      diff,
      timestamp
    ]);
  });

  return { success: true };
}

function getRecords(days) {
  var ss    = getSpreadsheet();
  var sheet = getOrCreateSheet(ss, SHEET_RECORDS);
  var data  = sheet.getDataRange().getValues();

  if (data.length <= 1) return { records: [] };

  var headers   = data[0];
  var rows      = data.slice(1);
  var cutoff    = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  var cutoffStr = formatDate(cutoff);

  var filtered = rows.filter(function(row) {
    var date = row[headers.indexOf('date')];
    return date >= cutoffStr;
  });

  return { records: filtered.map(function(row) {
    return rowToRecord(headers, row);
  })};
}

function getMonthlyRecords() {
  var ss    = getSpreadsheet();
  var sheet = getOrCreateSheet(ss, SHEET_RECORDS);
  var data  = sheet.getDataRange().getValues();

  if (data.length <= 1) return { records: [] };

  var headers   = data[0];
  var rows      = data.slice(1);
  var now       = new Date();
  var monthStr  = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

  var filtered = rows.filter(function(row) {
    var date = String(row[headers.indexOf('date')]);
    return date.startsWith(monthStr);
  });

  return { records: filtered.map(function(row) {
    return rowToRecord(headers, row);
  })};
}

// ------------------------------------------------------------
// ユーティリティ
// ------------------------------------------------------------
function getSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function rowToItem(headers, row) {
  return {
    categoryId   : row[headers.indexOf('categoryId')],
    categoryName : row[headers.indexOf('categoryName')],
    frequency    : row[headers.indexOf('frequency')],
    itemId       : row[headers.indexOf('itemId')],
    itemName     : row[headers.indexOf('itemName')],
    standardStock: Number(row[headers.indexOf('standardStock')])
  };
}

function rowToRecord(headers, row) {
  return {
    recordId     : row[headers.indexOf('recordId')],
    date         : row[headers.indexOf('date')],
    shift        : row[headers.indexOf('shift')],
    categoryId   : row[headers.indexOf('categoryId')],
    categoryName : row[headers.indexOf('categoryName')],
    itemId       : row[headers.indexOf('itemId')],
    itemName     : row[headers.indexOf('itemName')],
    inputValue   : Number(row[headers.indexOf('inputValue')]),
    standardStock: Number(row[headers.indexOf('standardStock')]),
    diff         : Number(row[headers.indexOf('diff')]),
    timestamp    : row[headers.indexOf('timestamp')]
  };
}

function formatDate(d) {
  return d.getFullYear() + '-'
    + String(d.getMonth() + 1).padStart(2, '0') + '-'
    + String(d.getDate()).padStart(2, '0');
}

// ------------------------------------------------------------
// 初期サンプルデータ投入（初回セットアップ用）
// ------------------------------------------------------------
function setupSampleData() {
  var ss    = getSpreadsheet();
  var sheet = getOrCreateSheet(ss, SHEET_ITEMS);

  sheet.clearContents();
  var headers = ['categoryId', 'categoryName', 'frequency', 'itemId', 'itemName', 'standardStock'];
  var rows = [
    headers,
    ['cat1', '拮抗薬', 'daily2', 'item1', 'アデノシン', 10],
    ['cat1', '拮抗薬', 'daily2', 'item2', 'アトロピン', 5],
    ['cat1', '拮抗薬', 'daily2', 'item3', 'フルマゼニル', 3],
    ['cat2', '救急物品A', 'daily2', 'item4', '生食100mL', 20],
    ['cat2', '救急物品A', 'daily2', 'item5', '生食500mL', 10],
    ['cat3', '処置用品', 'daily1', 'item6', '手袋（S）', 50],
    ['cat3', '処置用品', 'daily1', 'item7', '手袋（M）', 50],
    ['cat4', '月次点検A', 'monthly1', 'item8', '除細動器パッド', 2],
    ['cat4', '月次点検A', 'monthly1', 'item9', 'AEDバッテリー確認', 1],
  ];
  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  Logger.log('サンプルデータを投入しました');
}
