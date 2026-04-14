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
