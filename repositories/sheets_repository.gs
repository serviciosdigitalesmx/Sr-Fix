/**
 * Repository de acceso a Google Sheets.
 * Toda lectura/escritura nueva del HUB debe pasar por aquí.
 */
function SheetsRepository_getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function SheetsRepository_getSheet(sheetName) {
  const ss = SheetsRepository_getSpreadsheet();
  return ss ? ss.getSheetByName(sheetName) : null;
}

function SheetsRepository_readRows(sheetName) {
  const hoja = SheetsRepository_getSheet(sheetName);
  if (!hoja) return { headers: [], rows: [] };
  const data = withRetry(function() {
    return hoja.getDataRange().getValues();
  }, 'SheetsRepository_readRows.' + sheetName);
  if (!data || !data.length) return { headers: [], rows: [] };
  return {
    headers: data[0] || [],
    rows: data.slice(1)
  };
}

function SheetsRepository_readObjects(sheetName) {
  const parsed = SheetsRepository_readRows(sheetName);
  const headers = parsed.headers || [];
  const rows = parsed.rows || [];
  return rows.map(function(row) {
    return mapearFila(headers, row);
  });
}

function SheetsRepository_findOneByField(sheetName, field, value) {
  const parsed = SheetsRepository_readRows(sheetName);
  const headers = parsed.headers || [];
  const idx = headers.indexOf(field);
  if (idx < 0) return null;
  const row = (parsed.rows || []).find(function(r) {
    return String(r[idx] || '').trim() === String(value || '').trim();
  });
  return row ? mapearFila(headers, row) : null;
}
