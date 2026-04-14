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

function Repository_getSolicitudesSheet() {
  const ss = Core_getSpreadsheet();
  return obtenerHojaSolicitudes(ss);
}

function Repository_readSolicitudesTable() {
  const hoja = Repository_getSolicitudesSheet();
  const data = withRetry(function() {
    return hoja.getDataRange().getValues();
  }, 'Repository_readSolicitudesTable');
  if (!data || data.length < 1) return { headers: [], rows: [] };
  return {
    headers: data[0] || [],
    rows: data.slice(1)
  };
}

function Repository_appendSolicitud(payload) {
  const hoja = Repository_getSolicitudesSheet();
  return withRetry(function() {
    hoja.appendRow([
      Utilities.getUuid(),
      payload.folioCotizacion,
      payload.fechaSolicitud,
      payload.nombre,
      payload.telefono,
      payload.email,
      payload.dispositivo,
      payload.modelo,
      payload.problemas,
      payload.descripcion,
      payload.urgencia,
      payload.estado,
      payload.fechaCotizacion,
      payload.cotizacionJson,
      payload.cotizacionTotal,
      payload.folioCotizacionManual,
      payload.sucursalId,
      payload.solicitudOrigenIp
    ]);
    return true;
  }, 'Repository_appendSolicitud');
}

function Repository_findSolicitudByFolio(folio) {
  const target = String(folio || '').trim().toUpperCase();
  if (!target) return null;

  const table = Repository_readSolicitudesTable();
  const headers = table.headers || [];
  const idxFolio = headers.indexOf('FOLIO_COTIZACION');
  if (idxFolio < 0) return null;

  const row = (table.rows || []).find(function(r) {
    return String(r[idxFolio] || '').trim().toUpperCase() === target;
  });
  if (!row) return null;
  return mapearFila(headers, row);
}

function Repository_updateSolicitudEstado(folio, nuevoEstado) {
  const target = String(folio || '').trim();
  if (!target) return false;
  const hoja = Repository_getSolicitudesSheet();
  const data = withRetry(function() {
    return hoja.getDataRange().getValues();
  }, 'Repository_updateSolicitudEstado.read');
  if (!data || data.length < 2) return false;
  const headers = data[0];
  const idxEstado = headers.indexOf('ESTADO');
  const idxFolio = headers.indexOf('FOLIO_COTIZACION');
  if (idxEstado < 0 || idxFolio < 0) return false;

  const rowIndex = data.findIndex(function(row, i) {
    return i > 0 && String(row[idxFolio] || '') === target;
  });
  if (rowIndex < 1) return false;

  withRetry(function() {
    hoja.getRange(rowIndex + 1, idxEstado + 1).setValue(String(nuevoEstado || ''));
    return true;
  }, 'Repository_updateSolicitudEstado.write');
  return true;
}
