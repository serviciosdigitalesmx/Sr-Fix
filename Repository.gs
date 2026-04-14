/**
 * Repository - acceso a datos (Sheets I/O).
 * Todas las funciones son seguras para capas de servicio.
 */

function Repository_readTable(sheetName) {
  const hoja = Core_getSheet(sheetName);
  if (!hoja) return { headers: [], rows: [] };
  const values = withRetry(function() {
    return hoja.getDataRange().getValues();
  }, 'Repository_readTable.' + sheetName);
  if (!values || !values.length) return { headers: [], rows: [] };
  return {
    headers: values[0] || [],
    rows: values.slice(1)
  };
}

function Repository_readObjects(sheetName) {
  const table = Repository_readTable(sheetName);
  const headers = table.headers || [];
  return (table.rows || []).map(function(row) {
    return mapearFila(headers, row);
  });
}

function Repository_findByField(sheetName, field, value) {
  const table = Repository_readTable(sheetName);
  const idx = (table.headers || []).indexOf(field);
  if (idx < 0) return null;
  const row = (table.rows || []).find(function(r) {
    return String(r[idx] || '').trim() === String(value || '').trim();
  });
  return row ? mapearFila(table.headers, row) : null;
}
