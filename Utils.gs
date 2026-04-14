/**
 * Utils - respuestas API estandarizadas.
 */

function Utils_ok(data) {
  return jsonResponse({
    success: true,
    data: data || {},
    error: null
  });
}

function Utils_fail(message, data) {
  const payload = {
    success: false,
    data: data || null,
    error: String(message || 'Error no especificado')
  };
  return jsonResponse(payload);
}

function Utils_normalizeEntity(entityName, raw) {
  const entity = String(entityName || '').trim().toLowerCase();
  const obj = raw || {};
  if (entity === 'tarea' && typeof normalizarTareaForApi === 'function') return normalizarTareaForApi(obj);
  if (entity === 'proveedor' && typeof normalizarProveedorForApi === 'function') return normalizarProveedorForApi(obj);
  if (entity === 'producto' && typeof normalizarProductoForApi === 'function') return normalizarProductoForApi(obj);
  if (entity === 'gasto' && typeof normalizarGastoForApi === 'function') return normalizarGastoForApi(obj);
  if (entity === 'cliente' && typeof normalizarClienteForApi === 'function') return normalizarClienteForApi(obj);
  if (entity === 'equipo' && typeof normalizarEquipoForApi === 'function') return normalizarEquipoForApi(obj);
  return obj;
}
