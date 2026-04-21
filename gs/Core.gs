/**
 * Core - infraestructura base (inicio de arquitectura por capas).
 * Nota: se mantiene compatible con código legacy existente.
 */

const CORE_SHEETS = {
  EQUIPOS: 'Equipos',
  SOLICITUDES: 'Solicitudes',
  TAREAS: 'Tareas',
  PRODUCTOS: 'Productos',
  PROVEEDORES: 'Proveedores',
  ORDENES_COMPRA: 'OrdenesCompra',
  ORDENES_COMPRA_ITEMS: 'OrdenesCompraItems',
  GASTOS: 'Gastos',
  CLIENTES: 'Clientes'
};

let CORE_DB_INSTANCE = null;

function Core_getSpreadsheet() {
  if (CORE_DB_INSTANCE) return CORE_DB_INSTANCE;
  CORE_DB_INSTANCE = SpreadsheetApp.getActiveSpreadsheet();
  return CORE_DB_INSTANCE;
}

function Core_getSheet(sheetName) {
  const ss = Core_getSpreadsheet();
  return ss ? ss.getSheetByName(sheetName) : null;
}

function Core_resetSpreadsheetCache() {
  CORE_DB_INSTANCE = null;
}
