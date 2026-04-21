/**
 * Utils - Helpers puros (extraídos del bundle)
 * Este archivo contiene TODOS los helpers del sistema
 */

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function Utils_ok(data) {
  return jsonResponse({ success: true, data: data || {}, error: null });
}

function Utils_fail(message, data) {
  return jsonResponse({ success: false, data: data || null, error: String(message || 'Error') });
}

function normalizarNumero(valor, fallback, min, max) {
  const num = Number(valor);
  if (!isFinite(num)) return fallback;
  let out = num;
  if (min !== undefined) out = Math.max(min, out);
  if (max !== undefined) out = Math.min(max, out);
  return out;
}

function parsePaginacion(input) {
  const page = Math.floor(normalizarNumero(input && input.page, 1, 1));
  const requested = Math.floor(normalizarNumero(input && input.pageSize, 1000, 1));
  const pageSize = Math.min(requested, 2000);
  return { page: page, pageSize: pageSize };
}

function paginarArreglo(items, page, pageSize) {
  const total = items.length;
  const offset = (page - 1) * pageSize;
  const data = items.slice(offset, offset + pageSize);
  return { total: total, page: page, pageSize: pageSize, hasMore: (offset + data.length) < total, data: data };
}

function withRetry(fn, contexto) {
  const MAX_ATTEMPTS = 3;
  const BASE_SLEEP_MS = 120;
  let ultimoError = null;
  for (let intento = 1; intento <= MAX_ATTEMPTS; intento++) {
    try { return fn(); } catch (error) {
      ultimoError = error;
      console.error(JSON.stringify({ contexto: contexto || 'withRetry', mensaje: error.message, intento: intento }));
      if (intento < MAX_ATTEMPTS) Utilities.sleep(BASE_SLEEP_MS * intento);
    }
  }
  throw ultimoError;
}

function withDocumentLock(fn, timeoutMs) {
  const lock = LockService.getDocumentLock();
  const maxWait = Math.max(1000, Number(timeoutMs || 10000));
  lock.waitLock(maxWait);
  try { return fn(); } finally { lock.releaseLock(); }
}

function normalizarTelefono(valor) { return String(valor || '').replace(/\D/g, ''); }
function boolFromCheck(valor) { return valor === true || ['SI','SÍ','TRUE','1'].includes(String(valor || '').trim().toUpperCase()); }
function checkToText(valor) { return boolFromCheck(valor) ? 'SÍ' : 'NO'; }
function validarEmailSimple(email) { return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim()); }

function obtenerSiguienteFolio(key, prefix) {
  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const actual = Number(props.getProperty(key) || 0);
    const siguiente = actual + 1;
    props.setProperty(key, String(siguiente));
    return `${prefix}${String(siguiente).padStart(5, '0')}`;
  } finally { lock.releaseLock(); }
}

function parseFechaFlexible(valor) {
  if (!valor) return null;
  if (Object.prototype.toString.call(valor) === '[object Date]') return isNaN(valor.getTime()) ? null : new Date(valor.getTime());
  if (typeof valor === 'number' && isFinite(valor)) { const ms = valor > 9999999999 ? valor : valor * 1000; const d = new Date(ms); return isNaN(d.getTime()) ? null : d; }
  const str = String(valor).trim();
  if (!str) return null;
  if (/^\d{10,13}$/.test(str)) { const raw = Number(str); if (isFinite(raw)) { const ms = str.length === 13 ? raw : raw * 1000; const d = new Date(ms); if (!isNaN(d.getTime())) return d; } }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) { const d = new Date(str + 'T00:00:00'); return isNaN(d.getTime()) ? null : d; }
  const d = new Date(str); return isNaN(d.getTime()) ? null : d;
}

function formatearFechaYMD(fecha) { return Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function formatearFechaYMDOrEmpty(valor) { const d = parseFechaFlexible(valor); return d ? formatearFechaYMD(d) : ''; }
function parseFechaFiltro(valor) { if (!valor) return null; if (/^\d{4}-\d{2}-\d{2}$/.test(String(valor))) { const d = new Date(valor + 'T00:00:00'); return isNaN(d.getTime()) ? null : d; } return parseFechaFlexible(valor); }
function cumpleRango(fecha, from, to) { if (!from && !to) return true; if (!fecha || isNaN(fecha.getTime())) return false; if (from && fecha < from) return false; if (to && fecha > to) return false; return true; }
function normalizarSucursalId(valor) { const out = String(valor || '').trim().toUpperCase(); return out || 'MATRIZ'; }
function normalizarUrlImagen(valor) { const s = String(valor || '').trim(); if (!s) return ''; if (/^data:image\//.test(s)) return s; const id = extraerDriveFileId(s); return id ? urlDriveImagen(id) : s; }
function extraerDriveFileId(url) { const s = String(url || '').trim(); if (!s) return ''; let m = s.match(/\/d\/([a-zA-Z0-9_-]+)/); if (m && m[1]) return m[1]; m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/); return (m && m[1]) ? m[1] : ''; }
function urlDriveImagen(fileId) { const id = String(fileId || '').trim(); return id ? 'https://drive.google.com/uc?export=view&id=' + id : ''; }
function normalizarSeguimientoFotos(raw) { if (!raw) return '[]'; let arr = []; if (Array.isArray(raw)) arr = raw; else { try { const parsed = JSON.parse(String(raw)); arr = Array.isArray(parsed) ? parsed : []; } catch(e) { const single = normalizarUrlImagen(raw); arr = single ? [single] : []; } } const clean = arr.map(normalizarUrlImagen).filter(Boolean); return JSON.stringify(clean); }
function safeParseJsonArray(raw) { if (!raw) return []; try { const parsed = JSON.parse(String(raw)); return Array.isArray(parsed) ? parsed : []; } catch(e) { return []; } }
function mapearFila(headers, row) { const out = {}; headers.forEach((h, i) => { out[String(h || '').trim()] = row[i]; }); return out; }
function logError(contexto, error, extra) { console.error(JSON.stringify({ contexto: contexto || 'sin_contexto', mensaje: error && error.message ? error.message : String(error || ''), stack: error && error.stack ? String(error.stack) : '', extra: extra || null })); }
function Utils_normalizeEntity(entityName, raw) { const entity = String(entityName || '').trim().toLowerCase(); const obj = raw || {}; if (entity === 'tarea' && typeof normalizarTareaForApi === 'function') return normalizarTareaForApi(obj); if (entity === 'proveedor' && typeof normalizarProveedorForApi === 'function') return normalizarProveedorForApi(obj); if (entity === 'producto' && typeof normalizarProductoForApi === 'function') return normalizarProductoForApi(obj); if (entity === 'gasto' && typeof normalizarGastoForApi === 'function') return normalizarGastoForApi(obj); if (entity === 'cliente' && typeof normalizarClienteForApi === 'function') return normalizarClienteForApi(obj); if (entity === 'equipo' && typeof normalizarEquipoForApi === 'function') return normalizarEquipoForApi(obj); if (entity === 'orden_compra' && typeof normalizarOrdenCompraForApi === 'function') return normalizarOrdenCompraForApi(obj); if (entity === 'orden_compra_item' && typeof normalizarOrdenCompraItemForApi === 'function') return normalizarOrdenCompraItemForApi(obj); return obj; }
