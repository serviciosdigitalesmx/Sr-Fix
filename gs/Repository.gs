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

function Repository_readPage(sheetName, page, pageSize) {
  const hoja = Core_getSheet(sheetName);
  if (!hoja) return { headers: [], rows: [], total: 0, page: page || 1, pageSize: pageSize || 0, hasMore: false };

  const lastRow = hoja.getLastRow();
  const lastCol = hoja.getLastColumn();
  if (lastRow < 1 || lastCol < 1) {
    return { headers: [], rows: [], total: 0, page: page || 1, pageSize: pageSize || 0, hasMore: false };
  }

  const safePage = Math.max(1, Number(page || 1));
  const safePageSize = Math.max(1, Number(pageSize || 20));
  const total = Math.max(0, lastRow - 1);
  const startDataRow = 2 + ((safePage - 1) * safePageSize);
  const available = Math.max(0, (lastRow - startDataRow + 1));
  const take = Math.max(0, Math.min(safePageSize, available));

  const headers = withRetry(function() {
    return hoja.getRange(1, 1, 1, lastCol).getValues()[0] || [];
  }, 'Repository_readPage.headers.' + sheetName);

  if (!take) {
    return {
      headers: headers,
      rows: [],
      total: total,
      page: safePage,
      pageSize: safePageSize,
      hasMore: ((safePage - 1) * safePageSize) < total
    };
  }

  const rows = withRetry(function() {
    return hoja.getRange(startDataRow, 1, take, lastCol).getValues();
  }, 'Repository_readPage.rows.' + sheetName);

  const consumed = ((safePage - 1) * safePageSize) + rows.length;
  return {
    headers: headers,
    rows: rows,
    total: total,
    page: safePage,
    pageSize: safePageSize,
    hasMore: consumed < total
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

function Repository_getTareasSheet() {
  const ss = Core_getSpreadsheet();
  return obtenerHojaTareas(ss);
}

function Repository_readTareasTable() {
  const hoja = Repository_getTareasSheet();
  const data = withRetry(function() {
    return hoja.getDataRange().getValues();
  }, 'Repository_readTareasTable');
  if (!data || data.length < 1) return { headers: [], rows: [] };
  return {
    headers: data[0] || [],
    rows: data.slice(1)
  };
}

function Repository_appendTarea(rowValues) {
  const hoja = Repository_getTareasSheet();
  return withRetry(function() {
    hoja.appendRow(rowValues || []);
    return true;
  }, 'Repository_appendTarea');
}

function Repository_findTareaByFolio(folio) {
  const target = String(folio || '').trim().toUpperCase();
  if (!target) return null;
  const table = Repository_readTareasTable();
  const headers = table.headers || [];
  const idxFolio = headers.indexOf('FOLIO_TAREA');
  if (idxFolio < 0) return null;
  const row = (table.rows || []).find(function(r) {
    return String(r[idxFolio] || '').trim().toUpperCase() === target;
  });
  return row ? mapearFila(headers, row) : null;
}

function Repository_updateTareaByFolio(folio, nextRowValues) {
  const target = String(folio || '').trim().toUpperCase();
  if (!target) return false;
  const hoja = Repository_getTareasSheet();
  const data = withRetry(function() {
    return hoja.getDataRange().getValues();
  }, 'Repository_updateTareaByFolio.read');
  if (!data || data.length < 2) return false;
  const headers = data[0];
  const idxFolio = headers.indexOf('FOLIO_TAREA');
  if (idxFolio < 0) return false;
  const rowIndex = data.findIndex(function(row, i) {
    return i > 0 && String(row[idxFolio] || '').trim().toUpperCase() === target;
  });
  if (rowIndex < 1) return false;
  withRetry(function() {
    hoja.getRange(rowIndex + 1, 1, 1, nextRowValues.length).setValues([nextRowValues]);
    return true;
  }, 'Repository_updateTareaByFolio.write');
  return true;
}

function Repository_getProveedoresSheet() {
  const ss = Core_getSpreadsheet();
  return obtenerHojaProveedores(ss);
}

function Repository_readProveedoresTable() {
  const hoja = Repository_getProveedoresSheet();
  const data = withRetry(function() {
    return hoja.getDataRange().getValues();
  }, 'Repository_readProveedoresTable');
  if (!data || data.length < 1) return { headers: [], rows: [] };
  return {
    headers: data[0] || [],
    rows: data.slice(1)
  };
}

function Repository_appendProveedor(rowValues) {
  const hoja = Repository_getProveedoresSheet();
  return withRetry(function() {
    hoja.appendRow(rowValues || []);
    return true;
  }, 'Repository_appendProveedor');
}

function Repository_findProveedorById(id) {
  const idNum = Number(id || 0);
  if (!idNum) return null;
  const table = Repository_readProveedoresTable();
  const headers = table.headers || [];
  const idxId = headers.indexOf('ID');
  if (idxId < 0) return null;
  const row = (table.rows || []).find(function(r) {
    return Number(r[idxId] || 0) === idNum;
  });
  return row ? mapearFila(headers, row) : null;
}

function Repository_updateProveedorById(id, nextRowValues) {
  const idNum = Number(id || 0);
  if (!idNum) return false;
  const hoja = Repository_getProveedoresSheet();
  const data = withRetry(function() {
    return hoja.getDataRange().getValues();
  }, 'Repository_updateProveedorById.read');
  if (!data || data.length < 2) return false;
  const headers = data[0];
  const idxId = headers.indexOf('ID');
  if (idxId < 0) return false;
  const rowIndex = data.findIndex(function(row, i) {
    return i > 0 && Number(row[idxId] || 0) === idNum;
  });
  if (rowIndex < 1) return false;
  withRetry(function() {
    hoja.getRange(rowIndex + 1, 1, 1, nextRowValues.length).setValues([nextRowValues]);
    return true;
  }, 'Repository_updateProveedorById.write');
  return true;
}

function Repository_getGastosSheet() {
  const ss = Core_getSpreadsheet();
  return obtenerHojaGastos(ss);
}

function Repository_readGastosTable() {
  const hoja = Repository_getGastosSheet();
  const data = withRetry(function() {
    return hoja.getDataRange().getValues();
  }, 'Repository_readGastosTable');
  if (!data || data.length < 1) return { headers: [], rows: [] };
  return {
    headers: data[0] || [],
    rows: data.slice(1)
  };
}

function Repository_appendGasto(rowValues) {
  const hoja = Repository_getGastosSheet();
  return withRetry(function() {
    hoja.appendRow(rowValues || []);
    return true;
  }, 'Repository_appendGasto');
}

function Repository_updateGastoById(id, nextRowValues) {
  const idNum = Number(id || 0);
  if (!idNum) return false;
  const hoja = Repository_getGastosSheet();
  const data = withRetry(function() {
    return hoja.getDataRange().getValues();
  }, 'Repository_updateGastoById.read');
  if (!data || data.length < 2) return false;
  const headers = data[0];
  const idxId = headers.indexOf('ID');
  if (idxId < 0) return false;
  const rowIndex = data.findIndex(function(row, i) {
    return i > 0 && Number(row[idxId] || 0) === idNum;
  });
  if (rowIndex < 1) return false;
  withRetry(function() {
    hoja.getRange(rowIndex + 1, 1, 1, nextRowValues.length).setValues([nextRowValues]);
    return true;
  }, 'Repository_updateGastoById.write');
  return true;
}

function Repository_deleteGastoById(id) {
  const idNum = Number(id || 0);
  if (!idNum) return false;
  const hoja = Repository_getGastosSheet();
  const data = withRetry(function() {
    return hoja.getDataRange().getValues();
  }, 'Repository_deleteGastoById.read');
  if (!data || data.length < 2) return false;
  const headers = data[0];
  const idxId = headers.indexOf('ID');
  if (idxId < 0) return false;
  const rowIndex = data.findIndex(function(row, i) {
    return i > 0 && Number(row[idxId] || 0) === idNum;
  });
  if (rowIndex < 1) return false;
  withRetry(function() {
    hoja.deleteRow(rowIndex + 1);
    return true;
  }, 'Repository_deleteGastoById.delete');
  return true;
}

function Repository_getClientesSheet() {
  const ss = Core_getSpreadsheet();
  return obtenerHojaClientes(ss);
}

function Repository_readClientesTable() {
  const hoja = Repository_getClientesSheet();
  const data = withRetry(function() {
    return hoja.getDataRange().getValues();
  }, 'Repository_readClientesTable');
  if (!data || data.length < 1) return { headers: [], rows: [] };
  return {
    headers: data[0] || [],
    rows: data.slice(1)
  };
}

function Repository_findClienteById(id) {
  const target = String(id || '').trim();
  if (!target) return null;
  const table = Repository_readClientesTable();
  const headers = table.headers || [];
  const idxId = headers.indexOf('ID');
  if (idxId < 0) return null;
  const row = (table.rows || []).find(function(r) {
    return String(r[idxId] || '').trim() === target;
  });
  return row ? mapearFila(headers, row) : null;
}

function Repository_getProductosSheet() {
  const ss = Core_getSpreadsheet();
  return obtenerHojaProductos(ss);
}

function Repository_readProductosTable() {
  const hoja = Repository_getProductosSheet();
  const data = withRetry(function() {
    return hoja.getDataRange().getValues();
  }, 'Repository_readProductosTable');
  if (!data || data.length < 1) return { headers: [], rows: [] };
  return {
    headers: data[0] || [],
    rows: data.slice(1)
  };
}

function Repository_findProductoBySku(sku) {
  const target = String(sku || '').trim().toUpperCase();
  if (!target) return null;
  const table = Repository_readProductosTable();
  const headers = table.headers || [];
  const idxSku = headers.indexOf('SKU');
  if (idxSku < 0) return null;
  const row = (table.rows || []).find(function(r) {
    return String(r[idxSku] || '').trim().toUpperCase() === target;
  });
  return row ? mapearFila(headers, row) : null;
}

function Repository_appendProducto(rowValues) {
  const hoja = Repository_getProductosSheet();
  return withRetry(function() {
    hoja.appendRow(rowValues || []);
    return true;
  }, 'Repository_appendProducto');
}

function Repository_updateProductoBySku(sku, nextRowValues) {
  const target = String(sku || '').trim().toUpperCase();
  if (!target) return false;
  const hoja = Repository_getProductosSheet();
  const data = withRetry(function() {
    return hoja.getDataRange().getValues();
  }, 'Repository_updateProductoBySku.read');
  if (!data || data.length < 2) return false;
  const headers = data[0];
  const idxSku = headers.indexOf('SKU');
  if (idxSku < 0) return false;
  const rowIndex = data.findIndex(function(row, i) {
    return i > 0 && String(row[idxSku] || '').trim().toUpperCase() === target;
  });
  if (rowIndex < 1) return false;
  withRetry(function() {
    hoja.getRange(rowIndex + 1, 1, 1, nextRowValues.length).setValues([nextRowValues]);
    return true;
  }, 'Repository_updateProductoBySku.write');
  return true;
}
