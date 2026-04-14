// Configuración central - UNIFICADA
window.SRFIX_CONFIG = window.SRFIX_CONFIG || {};
window.SRFIX_CONFIG.BACKEND_URL = (function() {
  var stored = localStorage.getItem('srfix_backend_url');
  if (stored) return stored;
  return 'https://script.google.com/macros/s/AKfycby7ImB8qOFGJbB9OYASi_pysQi9KvWHgzeRm_JPdEMR69RPHNREgB-T_K_Km_HojrAw/exec';
})();

// Compatibilidad con código legacy que usa SRFIX_BACKEND_URL
window.SRFIX_BACKEND_URL = window.SRFIX_CONFIG.BACKEND_URL;

// Sucursal activa
window.SRFIX_CONFIG.getSucursalActiva = function() {
  return localStorage.getItem('srfix_sucursal_activa') || 'GLOBAL';
};
window.SRFIX_CONFIG.WHATSAPP = '528117006536';
