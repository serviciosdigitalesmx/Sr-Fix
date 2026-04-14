/**
 * SRFIX CLOUD - Backend con Contraseñas
 * Google Apps Script + Google Sheets
 */

// ==========================================
// CONFIGURACIÓN
// ==========================================
const CONFIG = {
  SHEET_NAME: 'SRFIX_DATABASE',
  API_VERSION: '2.5.0',
  SCRIPT_PROP_KEYS: {
    TECNICO: 'SRFIX_PASSWORD_TECNICO',
    OPERATIVO: 'SRFIX_PASSWORD_OPERATIVO',
    FOLIO_TAREA_SEQ: 'SRFIX_FOLIO_TAREA_SEQ',
    MOVIMIENTO_STOCK_SEQ: 'SRFIX_MOVIMIENTO_STOCK_SEQ',
    FOLIO_ORDEN_COMPRA_SEQ: 'SRFIX_FOLIO_ORDEN_COMPRA_SEQ',
    FOLIO_SUCURSAL_SEQ: 'SRFIX_FOLIO_SUCURSAL_SEQ',
    FOLIO_TRANSFERENCIA_SEQ: 'SRFIX_FOLIO_TRANSFERENCIA_SEQ',
    FOLIO_EQUIPO_SEQ: 'SRFIX_FOLIO_EQUIPO_SEQ',
    FOLIO_COTIZACION_SEQ: 'SRFIX_FOLIO_COTIZACION_SEQ',
    FOLIO_COTIZACION_MANUAL_SEQ: 'SRFIX_FOLIO_COTIZACION_MANUAL_SEQ',
    DRIVE_FOLDER_ID: 'SRFIX_DRIVE_FOLDER_ID'
  },
  LIMITS: {
    MAX_PAGE_SIZE: 2000,
    DEFAULT_PAGE_SIZE: 1000,
    MAX_FOTO_SIZE_BYTES: 3 * 1024 * 1024,
    MAX_SEGUIMIENTO_FOTOS: 8
  },
  RETRY: {
    MAX_ATTEMPTS: 3,
    BASE_SLEEP_MS: 120
  },
  ESTADOS: ['Recibido', 'En Diagnóstico', 'En Reparación', 'Esperando Refacción', 'Listo', 'Entregado']
};

// ==========================================
// AUTO-CONFIGURACIÓN
// ==========================================

function inicializarSistema() {
  try {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      ss = SpreadsheetApp.create(CONFIG.SHEET_NAME);
      Logger.log('✅ Nuevo Spreadsheet creado: ' + ss.getUrl());
    }

    crearHojaSiNoExiste(ss, 'Equipos', [
      'ID', 'FOLIO', 'FECHA_INGRESO', 'CLIENTE_NOMBRE', 'CLIENTE_TELEFONO',
      'DISPOSITIVO', 'MODELO', 'FALLA_REPORTADA', 'ESTADO', 'TECNICO_ASIGNADO',
      'YOUTUBE_ID', 'CHECK_CARGADOR', 'CHECK_PANTALLA', 'CHECK_PRENDE', 'CHECK_RESPALDO',
      'FOTO_RECEPCION', 'SEGUIMIENTO_CLIENTE', 'SEGUIMIENTO_FOTOS', 'FOLIO_COTIZACION_ORIGEN',
      'CASO_RESOLUCION_TECNICA', 'FECHA_ULTIMA_ACTUALIZACION'
    ]);

    crearHojaSiNoExiste(ss, 'Clientes', [
      'ID', 'NOMBRE', 'TELEFONO', 'EMAIL', 'FECHA_REGISTRO', 'ETIQUETA', 'NOTAS', 'FECHA_ACTUALIZACION'
    ]);

    crearHojaSiNoExiste(ss, 'Solicitudes', [
      'ID', 'FOLIO_COTIZACION', 'FECHA_SOLICITUD', 'NOMBRE', 'TELEFONO',
      'EMAIL', 'DISPOSITIVO', 'MODELO', 'PROBLEMAS', 'DESCRIPCION',
      'URGENCIA', 'ESTADO', 'FECHA_COTIZACION', 'COTIZACION_JSON', 'COTIZACION_TOTAL', 'FOLIO_COTIZACION_MANUAL', 'SOLICITUD_ORIGEN_IP'
    ]);

    crearHojaSiNoExiste(ss, 'Tareas', [
      'ID', 'FOLIO_TAREA', 'FECHA_CREACION', 'TITULO', 'DESCRIPCION',
      'ESTADO', 'PRIORIDAD', 'RESPONSABLE', 'FECHA_LIMITE', 'TIPO_RELACION',
      'FOLIO_RELACIONADO', 'NOTAS', 'HISTORIAL', 'FECHA_ACTUALIZACION'
    ]);

    crearHojaSiNoExiste(ss, 'Productos', [
      'ID', 'SKU', 'NOMBRE', 'CATEGORIA', 'MARCA', 'MODELO_COMPATIBLE',
      'PROVEEDOR', 'COSTO', 'PRECIO', 'STOCK_ACTUAL', 'STOCK_MINIMO',
      'UNIDAD', 'UBICACION', 'NOTAS', 'ESTATUS', 'FECHA_CREACION', 'FECHA_ACTUALIZACION'
    ]);

    crearHojaSiNoExiste(ss, 'MovimientosStock', [
      'ID', 'FECHA', 'SKU', 'PRODUCTO', 'TIPO_MOVIMIENTO', 'CANTIDAD',
      'COSTO_UNITARIO', 'FOLIO_EQUIPO', 'REFERENCIA', 'USUARIO', 'NOTAS'
    ]);

    crearHojaSiNoExiste(ss, 'Proveedores', [
      'ID', 'NOMBRE_COMERCIAL', 'RAZON_SOCIAL', 'CONTACTO', 'TELEFONO',
      'WHATSAPP', 'EMAIL', 'DIRECCION', 'CIUDAD_ESTADO', 'CATEGORIAS',
      'TIEMPO_ENTREGA', 'CONDICIONES_PAGO', 'CALIFICACION_PRECIO', 'CALIFICACION_RAPIDEZ',
      'CALIFICACION_CALIDAD', 'CALIFICACION_CONFIABILIDAD', 'NOTAS', 'ESTATUS',
      'FECHA_CREACION', 'FECHA_ACTUALIZACION'
    ]);

    crearHojaSiNoExiste(ss, 'OrdenesCompra', [
      'ID', 'FOLIO_OC', 'FECHA', 'PROVEEDOR', 'REFERENCIA', 'NOTAS',
      'CONDICIONES_PAGO', 'FECHA_ESTIMADA', 'FOLIO_RELACIONADO', 'ESTADO',
      'SUBTOTAL', 'IVA_PORCENTAJE', 'IVA_MONTO', 'TOTAL', 'FECHA_CREACION', 'FECHA_ACTUALIZACION'
    ]);

    crearHojaSiNoExiste(ss, 'OrdenesCompraItems', [
      'FOLIO_OC', 'ITEM_ID', 'SKU', 'PRODUCTO', 'CANTIDAD_PEDIDA',
      'COSTO_UNITARIO', 'SUBTOTAL', 'CANTIDAD_RECIBIDA'
    ]);

    crearHojaSiNoExiste(ss, 'Gastos', [
      'ID', 'FECHA', 'TIPO', 'CATEGORIA', 'CONCEPTO', 'DESCRIPCION',
      'MONTO', 'METODO_PAGO', 'PROVEEDOR', 'FOLIO_RELACIONADO',
      'COMPROBANTE_URL', 'NOTAS', 'FECHA_CREACION', 'FECHA_ACTUALIZACION'
    ]);

    asegurarUsuariosInternos(ss);
    obtenerHojaBitacoraSeguridad(ss);

    asegurarConfiguracionSeguridad(ss);

    asegurarEstructuraMultisucursal(ss);

    // Deja contraseñas de ejemplo si aún no existen.
    inicializarPasswordsPorDefecto();

    Logger.log('✅ Sistema listo. URL Web App: ' + ScriptApp.getService().getUrl());
    return { success: true, url: ScriptApp.getService().getUrl() };

  } catch (error) {
    Logger.log('❌ Error: ' + error);
    return { success: false, error: error.toString() };
  }
}

function crearHojaSiNoExiste(ss, nombre, headers) {
  let hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    hoja = ss.insertSheet(nombre);
    hoja.getRange(1, 1, 1, headers.length).setValues([headers]);
    hoja.setFrozenRows(1);
  } else {
    const lastCol = Math.max(hoja.getLastColumn(), 1);
    const actuales = hoja.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());
    const faltantes = headers.filter(h => !actuales.includes(h));
    if (faltantes.length > 0) {
      hoja.getRange(1, lastCol + 1, 1, faltantes.length).setValues([faltantes]);
    }
  }
  hoja.getRange(1, 1, 1, hoja.getLastColumn())
    .setFontWeight('bold').setBackground('#FFC107').setFontColor('#000');
  return hoja;
}

function inicializarPasswordsPorDefecto() {
  const props = PropertiesService.getScriptProperties();
  const actual = props.getProperties();

  const updates = {};
  if (!actual[CONFIG.SCRIPT_PROP_KEYS.TECNICO]) updates[CONFIG.SCRIPT_PROP_KEYS.TECNICO] = 'Admin1';
  if (!actual[CONFIG.SCRIPT_PROP_KEYS.OPERATIVO]) updates[CONFIG.SCRIPT_PROP_KEYS.OPERATIVO] = 'Admin1';

  if (Object.keys(updates).length > 0) {
    props.setProperties(updates, false);
  }
}

function hashPasswordSeguro(value) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value || ''),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b) {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function obtenerHojaUsuariosInternos(ss) {
  return crearHojaSiNoExiste(ss || SpreadsheetApp.getActiveSpreadsheet(), 'UsuariosInternos', [
    'ID', 'USUARIO', 'NOMBRE', 'ROL', 'PASSWORD_HASH', 'ACTIVO', 'NOTAS', 'FECHA_CREACION', 'FECHA_ACTUALIZACION'
  ]);
}

function obtenerHojaBitacoraSeguridad(ss) {
  return crearHojaSiNoExiste(ss || SpreadsheetApp.getActiveSpreadsheet(), 'BitacoraSeguridad', [
    'ID', 'FECHA', 'USUARIO', 'NOMBRE', 'ROL', 'ACCION', 'DETALLE', 'ORIGEN'
  ]);
}

function asegurarUsuariosInternos(ss) {
  const hoja = obtenerHojaUsuariosInternos(ss);
  const datos = withRetry(() => hoja.getDataRange().getValues(), 'asegurarUsuariosInternos.getValues');
  const existeAdmin = datos.slice(1).some(row => String(row[1] || '').trim().toLowerCase() === 'admin');
  if (!existeAdmin) {
    const ahora = new Date().toISOString();
    withRetry(() => hoja.appendRow([
      Utilities.getUuid(),
      'admin',
      'Administrador',
      'admin',
      hashPasswordSeguro('Admin1'),
      'SI',
      'Usuario inicial del sistema',
      ahora,
      ahora
    ]), 'asegurarUsuariosInternos.appendAdmin');
  }
  return hoja;
}

function registrarBitacoraSeguridad(entry) {
  try {
    const cfg = buildConfiguracionSeguridadPayload();
    if (!cfg.config || !cfg.config.bitacoraActiva) return;
    const hoja = obtenerHojaBitacoraSeguridad();
    withRetry(() => hoja.appendRow([
      Utilities.getUuid(),
      new Date().toISOString(),
      String(entry && entry.usuario || '').trim(),
      String(entry && entry.nombre || '').trim(),
      String(entry && entry.rol || '').trim(),
      String(entry && entry.accion || '').trim(),
      String(entry && entry.detalle || '').trim(),
      String(entry && entry.origen || '').trim()
    ]), 'registrarBitacoraSeguridad.append');
  } catch (e) {
    // Nunca reintentar en hojas al fallar bitácora para evitar cascadas de error por lock.
    console.error(JSON.stringify({
      contexto: 'registrarBitacoraSeguridad',
      mensaje: e && e.message ? e.message : String(e || ''),
      stack: e && e.stack ? String(e.stack) : '',
      accion: entry && entry.accion ? String(entry.accion) : '',
      usuario: entry && entry.usuario ? String(entry.usuario) : ''
    }));
  }
}

function normalizarUsuarioInternoForApi(rowObj) {
  return {
    ID: String(rowObj.ID || '').trim(),
    USUARIO: String(rowObj.USUARIO || '').trim(),
    NOMBRE: String(rowObj.NOMBRE || '').trim(),
    ROL: String(rowObj.ROL || 'operativo').trim().toLowerCase(),
    ACTIVO: String(rowObj.ACTIVO || 'NO').trim().toUpperCase() === 'SI',
    NOTAS: String(rowObj.NOTAS || '').trim(),
    FECHA_CREACION: String(rowObj.FECHA_CREACION || '').trim(),
    FECHA_ACTUALIZACION: String(rowObj.FECHA_ACTUALIZACION || '').trim()
  };
}

function listarUsuariosInternos() {
  const hoja = asegurarUsuariosInternos();
  const datos = withRetry(() => hoja.getDataRange().getValues(), 'listarUsuariosInternos.getValues');
  if (!datos || datos.length < 2) return jsonResponse({ usuarios: [] });
  const headers = datos[0];
  const usuarios = datos.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return normalizarUsuarioInternoForApi(obj);
  }).sort((a, b) => {
    if (a.ROL !== b.ROL) return a.ROL.localeCompare(b.ROL);
    return a.USUARIO.localeCompare(b.USUARIO);
  });
  return jsonResponse({ usuarios: usuarios });
}

function loginInterno(data) {
  const usuario = String(data && data.usuario || '').trim().toLowerCase();
  const password = String(data && data.password || '').trim();
  if (!usuario || !password) return jsonResponse({ error: 'Usuario y contraseña requeridos' });

  const hoja = asegurarUsuariosInternos();
  const datos = withRetry(() => hoja.getDataRange().getValues(), 'loginInterno.getValues');
  const headers = datos[0];
  const idxUsuario = headers.indexOf('USUARIO');
  const idxHash = headers.indexOf('PASSWORD_HASH');
  const idxActivo = headers.indexOf('ACTIVO');
  const fila = datos.find((row, i) =>
    i > 0 &&
    String(row[idxUsuario] || '').trim().toLowerCase() === usuario
  );
  if (!fila) return jsonResponse({ error: 'Credenciales inválidas' });
  if (String(fila[idxActivo] || '').trim().toUpperCase() !== 'SI') return jsonResponse({ error: 'Usuario inactivo' });
  if (String(fila[idxHash] || '').trim() !== hashPasswordSeguro(password)) return jsonResponse({ error: 'Credenciales inválidas' });

  const obj = {};
  headers.forEach((h, i) => obj[h] = fila[i]);
  const user = normalizarUsuarioInternoForApi(obj);
  registrarBitacoraSeguridad({
    usuario: user.USUARIO,
    nombre: user.NOMBRE,
    rol: user.ROL,
    accion: 'LOGIN_INTERNO',
    detalle: 'Inicio de sesión exitoso',
    origen: 'integrador'
  });
  return jsonResponse({
    success: true,
    user: user,
    passwords: obtenerPasswords()
  });
}

function guardarUsuarioInterno(data) {
  return withDocumentLock(function() {
    const adminPasswordActual = String(data && data.adminPasswordActual || '').trim();
    const cfg = leerConfiguracionSeguridad();
    const adminConfig = String(cfg.map.ADMIN_PASSWORD && cfg.map.ADMIN_PASSWORD.valor || '').trim();
    if (!adminPasswordActual || adminPasswordActual !== adminConfig) {
      throw new Error('Autorización administrativa inválida');
    }

    const usuario = String(data && data.usuario || '').trim().toLowerCase();
    const nombre = String(data && data.nombre || '').trim();
    const rol = String(data && data.rol || 'operativo').trim().toLowerCase();
    const activo = data && data.activo ? 'SI' : 'NO';
    const notas = String(data && data.notas || '').trim();
    const password = String(data && data.password || '').trim();
    const actor = data && data.actor || {};

    if (!usuario) throw new Error('Usuario requerido');
    if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) throw new Error('Usuario inválido');
    if (!nombre) throw new Error('Nombre requerido');
    if (['admin', 'operativo', 'tecnico', 'supervisor'].indexOf(rol) === -1) throw new Error('Rol inválido');

    const hoja = asegurarUsuariosInternos();
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'guardarUsuarioInterno.getValues');
    const headers = datos[0];
    const idxUsuario = headers.indexOf('USUARIO');
    const idxNombre = headers.indexOf('NOMBRE');
    const idxRol = headers.indexOf('ROL');
    const idxHash = headers.indexOf('PASSWORD_HASH');
    const idxActivo = headers.indexOf('ACTIVO');
    const idxNotas = headers.indexOf('NOTAS');
    const idxFechaActualizacion = headers.indexOf('FECHA_ACTUALIZACION');
    const idxFechaCreacion = headers.indexOf('FECHA_CREACION');
    const ahora = new Date().toISOString();

    let rowIdx = -1;
    for (let i = 1; i < datos.length; i++) {
      if (String(datos[i][idxUsuario] || '').trim().toLowerCase() === usuario) {
        rowIdx = i + 1;
        break;
      }
    }

    if (rowIdx === -1) {
      if (!password || password.length < 4) throw new Error('La contraseña del usuario debe tener al menos 4 caracteres');
      withRetry(() => hoja.appendRow([
        Utilities.getUuid(),
        usuario,
        nombre,
        rol,
        hashPasswordSeguro(password),
        activo,
        notas,
        ahora,
        ahora
      ]), 'guardarUsuarioInterno.append');
      registrarBitacoraSeguridad({
        usuario: String(actor.usuario || '').trim(),
        nombre: String(actor.nombre || '').trim(),
        rol: String(actor.rol || '').trim(),
        accion: 'CREAR_USUARIO_INTERNO',
        detalle: `Usuario ${usuario} (${rol}) creado`,
        origen: 'panel-seguridad'
      });
    } else {
      const row = datos[rowIdx - 1].slice();
      row[idxNombre] = nombre;
      row[idxRol] = rol;
      row[idxActivo] = activo;
      row[idxNotas] = notas;
      row[idxFechaActualizacion] = ahora;
      if (password) {
        if (password.length < 4) throw new Error('La contraseña del usuario debe tener al menos 4 caracteres');
        row[idxHash] = hashPasswordSeguro(password);
      }
      if (!row[idxFechaCreacion]) row[idxFechaCreacion] = ahora;
      withRetry(() => hoja.getRange(rowIdx, 1, 1, row.length).setValues([row]), 'guardarUsuarioInterno.update');
      registrarBitacoraSeguridad({
        usuario: String(actor.usuario || '').trim(),
        nombre: String(actor.nombre || '').trim(),
        rol: String(actor.rol || '').trim(),
        accion: 'ACTUALIZAR_USUARIO_INTERNO',
        detalle: `Usuario ${usuario} actualizado`,
        origen: 'panel-seguridad'
      });
    }

    return listarUsuariosInternos();
  }, 12000);
}

function obtenerHojaConfiguracionSeguridad(ss) {
  return crearHojaSiNoExiste(ss || SpreadsheetApp.getActiveSpreadsheet(), 'ConfiguracionSeguridad', [
    'CLAVE', 'VALOR', 'DESCRIPCION', 'FECHA_ACTUALIZACION'
  ]);
}

function defaultsConfiguracionSeguridad() {
  return [
    { clave: 'ADMIN_PASSWORD', valor: 'Admin1', descripcion: 'Clave administrativa para autorizar acciones críticas desde el dashboard.' },
    { clave: 'REQUIERE_ADMIN_ENTREGAR_EQUIPO', valor: 'SI', descripcion: 'Solicita autorización admin antes de marcar un equipo como entregado.' },
    { clave: 'REQUIERE_ADMIN_EDITAR_PRECIO', valor: 'SI', descripcion: 'Solicita autorización admin antes de cambiar el precio o costo estimado.' },
    { clave: 'REQUIERE_ADMIN_MARCAR_NO_REPARABLE', valor: 'SI', descripcion: 'Solicita autorización admin al marcar un equipo como no reparable.' },
    { clave: 'REQUIERE_ADMIN_REABRIR_CASO', valor: 'SI', descripcion: 'Solicita autorización admin al reabrir un caso cerrado o entregado.' },
    { clave: 'REQUIERE_ADMIN_EDITAR_FALLA_ENTREGA', valor: 'SI', descripcion: 'Solicita autorización admin para editar condiciones delicadas de entrega.' },
    { clave: 'BITACORA_SEGURIDAD_ACTIVA', valor: 'SI', descripcion: 'Activa el registro de auditoría para acciones críticas.' },
    { clave: 'MENSAJE_AUTORIZACION', valor: 'Esta acción requiere autorización administrativa.', descripcion: 'Mensaje mostrado al pedir elevación administrativa.' }
  ];
}

function asegurarConfiguracionSeguridad(ss) {
  const hoja = obtenerHojaConfiguracionSeguridad(ss);
  const datos = withRetry(() => hoja.getDataRange().getValues(), 'asegurarConfiguracionSeguridad.getValues');
  const existentes = {};
  datos.slice(1).forEach(row => {
    const clave = String(row[0] || '').trim();
    if (clave) existentes[clave] = true;
  });
  const ahora = new Date().toISOString();
  const faltantes = defaultsConfiguracionSeguridad()
    .filter(item => !existentes[item.clave])
    .map(item => [item.clave, item.valor, item.descripcion, ahora]);
  if (faltantes.length) {
    withRetry(() => hoja.getRange(hoja.getLastRow() + 1, 1, faltantes.length, 4).setValues(faltantes), 'asegurarConfiguracionSeguridad.insert');
  }
  return hoja;
}

function leerConfiguracionSeguridad(ss) {
  const hoja = asegurarConfiguracionSeguridad(ss || SpreadsheetApp.getActiveSpreadsheet());
  const datos = withRetry(() => hoja.getDataRange().getValues(), 'leerConfiguracionSeguridad.getValues');
  const map = {};
  datos.slice(1).forEach(row => {
    const clave = String(row[0] || '').trim();
    if (!clave) return;
    map[clave] = {
      valor: String(row[1] || '').trim(),
      descripcion: String(row[2] || '').trim(),
      fechaActualizacion: String(row[3] || '').trim()
    };
  });
  return { hoja: hoja, map: map };
}

function boolConfig(value, defaultValue) {
  const raw = String(value == null ? '' : value).trim().toUpperCase();
  if (!raw) return !!defaultValue;
  return ['SI', 'SÍ', 'TRUE', '1', 'YES', 'ON'].indexOf(raw) >= 0;
}

function buildConfiguracionSeguridadPayload() {
  const cfg = leerConfiguracionSeguridad();
  const map = cfg.map;
  const acciones = [
    {
      clave: 'REQUIERE_ADMIN_ENTREGAR_EQUIPO',
      accion: 'ENTREGAR_EQUIPO',
      titulo: 'Entregar equipo',
      descripcion: 'Evita cierres o entregas no autorizadas.',
      requiereAdmin: boolConfig(map.REQUIERE_ADMIN_ENTREGAR_EQUIPO && map.REQUIERE_ADMIN_ENTREGAR_EQUIPO.valor, true)
    },
    {
      clave: 'REQUIERE_ADMIN_EDITAR_PRECIO',
      accion: 'EDITAR_PRECIO',
      titulo: 'Editar precio o costo',
      descripcion: 'Protege cambios económicos y cotizaciones sensibles.',
      requiereAdmin: boolConfig(map.REQUIERE_ADMIN_EDITAR_PRECIO && map.REQUIERE_ADMIN_EDITAR_PRECIO.valor, true)
    },
    {
      clave: 'REQUIERE_ADMIN_MARCAR_NO_REPARABLE',
      accion: 'MARCAR_NO_REPARABLE',
      titulo: 'Marcar como no reparable',
      descripcion: 'Evita cierres con resultado técnico delicado sin aprobación.',
      requiereAdmin: boolConfig(map.REQUIERE_ADMIN_MARCAR_NO_REPARABLE && map.REQUIERE_ADMIN_MARCAR_NO_REPARABLE.valor, true)
    },
    {
      clave: 'REQUIERE_ADMIN_REABRIR_CASO',
      accion: 'REABRIR_CASO',
      titulo: 'Reabrir caso cerrado',
      descripcion: 'Protege cambios posteriores a cierres o entregas.',
      requiereAdmin: boolConfig(map.REQUIERE_ADMIN_REABRIR_CASO && map.REQUIERE_ADMIN_REABRIR_CASO.valor, true)
    },
    {
      clave: 'REQUIERE_ADMIN_EDITAR_FALLA_ENTREGA',
      accion: 'EDITAR_FALLA_ENTREGA',
      titulo: 'Editar observaciones delicadas de entrega',
      descripcion: 'Protege cambios de última milla en la entrega al cliente.',
      requiereAdmin: boolConfig(map.REQUIERE_ADMIN_EDITAR_FALLA_ENTREGA && map.REQUIERE_ADMIN_EDITAR_FALLA_ENTREGA.valor, true)
    }
  ];

  return {
    config: {
      adminPasswordConfigured: !!(map.ADMIN_PASSWORD && map.ADMIN_PASSWORD.valor),
      bitacoraActiva: boolConfig(map.BITACORA_SEGURIDAD_ACTIVA && map.BITACORA_SEGURIDAD_ACTIVA.valor, true),
      mensajeAutorizacion: (map.MENSAJE_AUTORIZACION && map.MENSAJE_AUTORIZACION.valor) || 'Esta acción requiere autorización administrativa.'
    },
    acciones: acciones,
    lastUpdate: new Date().toISOString()
  };
}

function obtenerConfiguracionSeguridad() {
  return jsonResponse(buildConfiguracionSeguridadPayload());
}

function guardarConfiguracionSeguridad(data) {
  return withDocumentLock(function() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const cfg = leerConfiguracionSeguridad(ss);
    const hoja = cfg.hoja;
    const map = cfg.map;
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'guardarConfiguracionSeguridad.getValues');
    const headers = datos[0];
    const idxClave = headers.indexOf('CLAVE');
    const idxValor = headers.indexOf('VALOR');
    const idxDesc = headers.indexOf('DESCRIPCION');
    const idxFecha = headers.indexOf('FECHA_ACTUALIZACION');
    const ahora = new Date().toISOString();
    const adminPasswordActual = String(data && data.adminPasswordActual || '').trim();
    const adminConfig = String(cfg.map.ADMIN_PASSWORD && cfg.map.ADMIN_PASSWORD.valor || '').trim();
    const actor = data && data.actor || {};

    if (!adminPasswordActual || adminPasswordActual !== adminConfig) {
      throw new Error('Autorización administrativa inválida');
    }

    const updates = {};
    if (data.adminPassword !== undefined && String(data.adminPassword || '').trim()) {
      updates.ADMIN_PASSWORD = {
        valor: String(data.adminPassword || '').trim(),
        descripcion: (map.ADMIN_PASSWORD && map.ADMIN_PASSWORD.descripcion) || 'Clave administrativa para autorizar acciones críticas desde el dashboard.'
      };
    }
    if (data.mensajeAutorizacion !== undefined) {
      updates.MENSAJE_AUTORIZACION = {
        valor: String(data.mensajeAutorizacion || '').trim() || 'Esta acción requiere autorización administrativa.',
        descripcion: (map.MENSAJE_AUTORIZACION && map.MENSAJE_AUTORIZACION.descripcion) || 'Mensaje mostrado al pedir elevación administrativa.'
      };
    }
    if (data.bitacoraActiva !== undefined) {
      updates.BITACORA_SEGURIDAD_ACTIVA = {
        valor: data.bitacoraActiva ? 'SI' : 'NO',
        descripcion: (map.BITACORA_SEGURIDAD_ACTIVA && map.BITACORA_SEGURIDAD_ACTIVA.descripcion) || 'Activa el registro de auditoría para acciones críticas.'
      };
    }

    const acciones = Array.isArray(data.acciones) ? data.acciones : [];
    acciones.forEach(item => {
      const clave = String(item && item.clave || '').trim();
      if (!clave) return;
      updates[clave] = {
        valor: item && item.requiereAdmin ? 'SI' : 'NO',
        descripcion: (map[clave] && map[clave].descripcion) || `Configuración editable para ${clave}`
      };
    });

    Object.keys(updates).forEach(clave => {
      let rowIdx = -1;
      for (let i = 1; i < datos.length; i++) {
        if (String(datos[i][idxClave] || '').trim() === clave) {
          rowIdx = i + 1;
          break;
        }
      }
      if (rowIdx === -1) {
        rowIdx = hoja.getLastRow() + 1;
        withRetry(() => hoja.getRange(rowIdx, 1, 1, 4).setValues([[clave, updates[clave].valor, updates[clave].descripcion, ahora]]), `guardarConfiguracionSeguridad.insert.${clave}`);
      } else {
        withRetry(() => hoja.getRange(rowIdx, idxValor + 1, 1, 3).setValues([[updates[clave].valor, updates[clave].descripcion, ahora]]), `guardarConfiguracionSeguridad.update.${clave}`);
      }
    });

    registrarBitacoraSeguridad({
      usuario: String(actor.usuario || '').trim(),
      nombre: String(actor.nombre || '').trim(),
      rol: String(actor.rol || '').trim(),
      accion: 'ACTUALIZAR_CONFIG_SEGURIDAD',
      detalle: `Configuración actualizada (${Object.keys(updates).join(', ')})`,
      origen: 'panel-seguridad'
    });

    return jsonResponse(buildConfiguracionSeguridadPayload());
  }, 12000);
}

function obtenerPoliticaAccionCritica(accion) {
  const target = String(accion || '').trim().toUpperCase();
  const payload = buildConfiguracionSeguridadPayload();
  const match = (payload.acciones || []).find(item => String(item.accion || '').trim().toUpperCase() === target);
  return jsonResponse({
    accion: target,
    requiereAdmin: !!(match && match.requiereAdmin),
    mensaje: payload.config && payload.config.mensajeAutorizacion
      ? payload.config.mensajeAutorizacion
      : 'Esta acción requiere autorización administrativa.'
  });
}

function validarAutorizacionAdmin(data) {
  const cfg = leerConfiguracionSeguridad();
  const guardada = String(cfg.map.ADMIN_PASSWORD && cfg.map.ADMIN_PASSWORD.valor || '').trim();
  const enviada = String(data && data.adminPassword || '').trim();
  return jsonResponse({
    success: !!guardada && guardada === enviada
  });
}

function obtenerPasswords() {
  const props = PropertiesService.getScriptProperties();
  const tecnico = props.getProperty(CONFIG.SCRIPT_PROP_KEYS.TECNICO);
  const operativo = props.getProperty(CONFIG.SCRIPT_PROP_KEYS.OPERATIVO);

  if (!tecnico || !operativo) {
    throw new Error('Configura SRFIX_PASSWORD_TECNICO y SRFIX_PASSWORD_OPERATIVO en Script Properties');
  }

  return { tecnico: tecnico, operativo: operativo };
}

function configurarPasswords(tecnico, operativo) {
  if (!tecnico || !operativo) {
    throw new Error('Debes enviar ambas contraseñas');
  }

  PropertiesService.getScriptProperties().setProperties({
    [CONFIG.SCRIPT_PROP_KEYS.TECNICO]: String(tecnico),
    [CONFIG.SCRIPT_PROP_KEYS.OPERATIVO]: String(operativo)
  }, false);

  return { success: true };
}

function asegurarEstructuraMultisucursal(ss) {
  const libro = ss || SpreadsheetApp.getActiveSpreadsheet();
  const hojaSucursales = crearHojaSiNoExiste(libro, 'Sucursales', [
    'ID', 'NOMBRE', 'DIRECCION', 'TELEFONO', 'EMAIL', 'ESTATUS', 'ES_MATRIZ', 'FECHA_CREACION', 'FECHA_ACTUALIZACION'
  ]);

  crearHojaSiNoExiste(libro, 'InventarioSucursales', [
    'SKU', 'SUCURSAL_ID', 'STOCK_ACTUAL', 'STOCK_MINIMO', 'FECHA_ACTUALIZACION'
  ]);

  crearHojaSiNoExiste(libro, 'TransferenciasStock', [
    'ID', 'FECHA', 'SKU', 'PRODUCTO', 'CANTIDAD', 'SUCURSAL_ORIGEN', 'SUCURSAL_DESTINO',
    'MOTIVO', 'USUARIO', 'ESTADO', 'NOTAS'
  ]);

  garantizarSucursalMatriz(hojaSucursales);

  [
    'Equipos',
    'Solicitudes',
    'Tareas',
    'MovimientosStock',
    'OrdenesCompra',
    'Gastos'
  ].forEach(nombre => {
    asegurarColumnaSucursal(libro.getSheetByName(nombre));
  });

  migrarInventarioMatriz(libro);
}

function garantizarSucursalMatriz(hojaSucursales) {
  const datos = withRetry(() => hojaSucursales.getDataRange().getValues(), 'garantizarSucursalMatriz.getValues');
  const existe = datos.slice(1).some(row => String(row[0] || '').trim().toUpperCase() === 'MATRIZ');
  if (existe) return;
  const now = new Date().toISOString();
  withRetry(() => hojaSucursales.appendRow([
    'MATRIZ',
    'Matriz',
    '',
    '',
    '',
    'activo',
    'si',
    now,
    now
  ]), 'garantizarSucursalMatriz.append');
}

function asegurarColumnaSucursal(hoja) {
  if (!hoja) return;
  const lastCol = Math.max(hoja.getLastColumn(), 1);
  const headers = hoja.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());
  if (headers.indexOf('SUCURSAL_ID') === -1) {
    const col = lastCol + 1;
    hoja.getRange(1, col).setValue('SUCURSAL_ID');
    if (hoja.getLastRow() > 1) {
      hoja.getRange(2, col, hoja.getLastRow() - 1, 1).setValue('MATRIZ');
    }
  } else {
    const col = headers.indexOf('SUCURSAL_ID') + 1;
    if (hoja.getLastRow() > 1) {
      const rango = hoja.getRange(2, col, hoja.getLastRow() - 1, 1);
      const valores = rango.getValues().map(row => [normalizarSucursalId(row[0])]);
      rango.setValues(valores);
    }
  }
}

function normalizarSucursalId(valor) {
  const out = String(valor || '').trim().toUpperCase();
  return out || 'MATRIZ';
}

function migrarInventarioMatriz(ss) {
  const libro = ss || SpreadsheetApp.getActiveSpreadsheet();
  const hojaProductos = libro.getSheetByName('Productos');
  const hojaInventario = libro.getSheetByName('InventarioSucursales');
  if (!hojaProductos || !hojaInventario) return;

  const datosProductos = withRetry(() => hojaProductos.getDataRange().getValues(), 'migrarInventarioMatriz.productos');
  const datosInventario = withRetry(() => hojaInventario.getDataRange().getValues(), 'migrarInventarioMatriz.inventario');
  const existentes = {};
  datosInventario.slice(1).forEach(row => {
    const key = `${String(row[0] || '').trim().toUpperCase()}::${normalizarSucursalId(row[1])}`;
    existentes[key] = true;
  });

  const rows = [];
  datosProductos.slice(1).forEach(row => {
    const sku = String(row[1] || '').trim().toUpperCase();
    if (!sku) return;
    const key = `${sku}::MATRIZ`;
    if (existentes[key]) return;
    rows.push([
      sku,
      'MATRIZ',
      Number(row[9] || 0),
      Number(row[10] || 0),
      new Date().toISOString()
    ]);
  });

  if (rows.length) {
    withRetry(() => hojaInventario.getRange(hojaInventario.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows), 'migrarInventarioMatriz.setValues');
  }
}

function obtenerHojaSucursales(ss) {
  asegurarEstructuraMultisucursal(ss);
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sucursales');
}

function obtenerHojaInventarioSucursales(ss) {
  asegurarEstructuraMultisucursal(ss);
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('InventarioSucursales');
}

function obtenerHojaTransferenciasStock(ss) {
  asegurarEstructuraMultisucursal(ss);
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('TransferenciasStock');
}

function obtenerIndiceInventario(datos, sku, sucursalId) {
  const skuNorm = String(sku || '').trim().toUpperCase();
  const sucursal = normalizarSucursalId(sucursalId);
  return datos.findIndex((row, idx) => idx > 0 && String(row[0] || '').trim().toUpperCase() === skuNorm && normalizarSucursalId(row[1]) === sucursal);
}

function obtenerStockProductoEnSucursal(ss, sku, sucursalId) {
  const hoja = obtenerHojaInventarioSucursales(ss);
  const datos = withRetry(() => hoja.getDataRange().getValues(), 'obtenerStockProductoEnSucursal.getValues');
  const sucursal = normalizarSucursalId(sucursalId);
  if (sucursal === 'GLOBAL') {
    return datos.slice(1)
      .filter(row => String(row[0] || '').trim().toUpperCase() === String(sku || '').trim().toUpperCase())
      .reduce((acc, row) => acc + Number(row[2] || 0), 0);
  }
  const idx = obtenerIndiceInventario(datos, sku, sucursal);
  if (idx < 1) return 0;
  return Number(datos[idx][2] || 0);
}

function obtenerStockMinimoProductoEnSucursal(ss, sku, sucursalId, fallbackMinimo) {
  const hoja = obtenerHojaInventarioSucursales(ss);
  const datos = withRetry(() => hoja.getDataRange().getValues(), 'obtenerStockMinimoProductoEnSucursal.getValues');
  const sucursal = normalizarSucursalId(sucursalId);
  if (sucursal === 'GLOBAL') return Number(fallbackMinimo || 0);
  const idx = obtenerIndiceInventario(datos, sku, sucursal);
  if (idx < 1) return Number(fallbackMinimo || 0);
  const minimo = Number(datos[idx][3] || 0);
  return isFinite(minimo) ? minimo : Number(fallbackMinimo || 0);
}

function asegurarInventarioSucursal(ss, sku, sucursalId, stockActual, stockMinimo) {
  const hoja = obtenerHojaInventarioSucursales(ss);
  const datos = withRetry(() => hoja.getDataRange().getValues(), 'asegurarInventarioSucursal.getValues');
  const idx = obtenerIndiceInventario(datos, sku, sucursalId);
  const now = new Date().toISOString();
  if (idx > 0) return idx;
  withRetry(() => hoja.appendRow([
    String(sku || '').trim().toUpperCase(),
    normalizarSucursalId(sucursalId),
    Number(stockActual || 0),
    Number(stockMinimo || 0),
    now
  ]), 'asegurarInventarioSucursal.append');
  return hoja.getLastRow() - 1;
}

function actualizarInventarioSucursal(ss, sku, sucursalId, stockActual, stockMinimo) {
  const hoja = obtenerHojaInventarioSucursales(ss);
  const datos = withRetry(() => hoja.getDataRange().getValues(), 'actualizarInventarioSucursal.getValues');
  let idx = obtenerIndiceInventario(datos, sku, sucursalId);
  const now = new Date().toISOString();
  if (idx < 1) {
    asegurarInventarioSucursal(ss, sku, sucursalId, stockActual, stockMinimo);
    idx = obtenerIndiceInventario(withRetry(() => hoja.getDataRange().getValues(), 'actualizarInventarioSucursal.getValuesRefresh'), sku, sucursalId);
  }
  withRetry(() => hoja.getRange(idx + 1, 3, 1, 3).setValues([[
    Number(stockActual || 0),
    Number(stockMinimo || 0),
    now
  ]]), 'actualizarInventarioSucursal.update');
}

function recalcularStockGlobalProducto(ss, sku) {
  const libro = ss || SpreadsheetApp.getActiveSpreadsheet();
  const hojaProductos = obtenerHojaProductos(libro);
  const datosProd = withRetry(() => hojaProductos.getDataRange().getValues(), 'recalcularStockGlobalProducto.productos');
  const idxProd = obtenerIndiceProductoPorSku(datosProd, sku);
  if (idxProd < 1) return 0;
  const headers = datosProd[0];
  const total = obtenerStockProductoEnSucursal(libro, sku, 'GLOBAL');
  const row = datosProd[idxProd].slice();
  row[headers.indexOf('STOCK_ACTUAL')] = total;
  row[headers.indexOf('FECHA_ACTUALIZACION')] = new Date().toISOString();
  withRetry(() => hojaProductos.getRange(idxProd + 1, 1, 1, row.length).setValues([row]), 'recalcularStockGlobalProducto.update');
  return total;
}

// ==========================================
// API REST
// ==========================================

function doGetLegacy(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const action = String(params.action || 'status').trim();
  try {
    return Legacy_dispatchRoute('GET', action, params);
  } catch (error) {
    logError('doGetLegacy', error, { action: action, params: params });
    return jsonResponse({ error: error.toString() });
  }
}

function doPostLegacy(e) {
  const data = parsePostData(e);
  const action = String(data && data.action || '').trim();
  try {
    return Legacy_dispatchRoute('POST', action, data || {});
  } catch (error) {
    logError('doPostLegacy', error, { action: action });
    return jsonResponse({ error: error.toString() });
  }
}

function Legacy_dispatchRoute(method, action, payload) {
  const routes = method === 'GET' ? Legacy_getGetRoutes() : Legacy_getPostRoutes();
  const route = routes[action];
  if (!route) return jsonResponse({ error: 'Acción no válida' });

  const required = Legacy_requireFields(payload || {}, route.required || []);
  if (!required.ok) return jsonResponse({ error: required.error });

  return route.handler(payload || {});
}

function Legacy_requireFields(data, requiredFields) {
  const missing = (requiredFields || []).filter(function(field) {
    const val = data && data[field];
    return val === undefined || val === null || String(val).trim() === '';
  });
  if (missing.length) return { ok: false, error: 'Campos requeridos: ' + missing.join(', ') };
  return { ok: true, error: '' };
}

function Legacy_getGetRoutes() {
  return {
    status: { required: [], handler: function() { return jsonResponse({ status: 'online', version: CONFIG.API_VERSION, storage: 'google_sheets' }); } },
    equipo: { required: ['folio'], handler: function(p) { return getEquipoByFolio(p.folio); } },
    semaforo: { required: [], handler: function(p) { return getSemaforoData(parsePaginacion(p)); } },
    listar_solicitudes: { required: [], handler: function(p) { const pag = parsePaginacion(p); return listarSolicitudes({ page: pag.page, pageSize: pag.pageSize }); } },
    solicitud: { required: ['folio'], handler: function(p) { return getSolicitudByFolio(p.folio); } },
    archivar_solicitud: { required: ['folio'], handler: function(p) { return archivarSolicitud({ folio: p.folio }); } },
    archivar_cotizacion: { required: ['folio'], handler: function(p) { return archivarCotizacion({ folio: p.folio, cotizacion: {} }); } },
    listar_archivo: { required: [], handler: function(p) { const pag = parsePaginacion(p); return listarArchivo({ from: p.from || '', to: p.to || '', tipo: p.tipo || 'todos', page: pag.page, pageSize: pag.pageSize }); } },
    listar_tareas: { required: [], handler: function(p) { const pag = parsePaginacion(p); return listarTareas({ texto: p.texto || '', estado: p.estado || '', prioridad: p.prioridad || '', responsable: p.responsable || '', fechaDesde: p.fechaDesde || '', fechaHasta: p.fechaHasta || '', sucursalId: p.sucursalId || '', tipoRelacion: p.tipoRelacion || '', page: pag.page, pageSize: pag.pageSize }); } },
    tarea: { required: ['folio'], handler: function(p) { return getTareaByFolio(p.folio); } },
    listar_productos: { required: [], handler: function(p) { const pag = parsePaginacion(p); return listarProductos({ texto: p.texto || '', categoria: p.categoria || '', marca: p.marca || '', proveedor: p.proveedor || '', estatus: p.estatus || '', nivelAlerta: p.nivelAlerta || '', soloAlertas: p.soloAlertas || '', page: pag.page, pageSize: pag.pageSize }); } },
    obtener_alertas_stock: { required: [], handler: function(p) { const pag = parsePaginacion(p); return obtenerAlertasStock({ texto: p.texto || '', categoria: p.categoria || '', marca: p.marca || '', proveedor: p.proveedor || '', nivelAlerta: p.nivelAlerta || '', estatus: p.estatus || '', page: pag.page, pageSize: pag.pageSize }); } },
    listar_movimientos_producto: { required: ['sku'], handler: function(p) { const pag = parsePaginacion(p); return listarMovimientosProducto({ sku: p.sku || '', sucursalId: p.sucursalId || '', page: pag.page, pageSize: pag.pageSize }); } },
    listar_folios_relacion: { required: [], handler: function() { return listarFoliosRelacion(); } },
    listar_proveedores: { required: [], handler: function(p) { const pag = parsePaginacion(p); return listarProveedores({ texto: p.texto || '', estatus: p.estatus || '', categoria: p.categoria || '', page: pag.page, pageSize: pag.pageSize }); } },
    proveedor: { required: ['id'], handler: function(p) { return getProveedorById(p.id); } },
    listar_nombres_proveedores: { required: [], handler: function() { return listarNombresProveedores(); } },
    listar_sucursales: { required: [], handler: function(p) { const pag = parsePaginacion(p); return listarSucursales({ texto: p.texto || '', soloActivas: p.soloActivas || '', page: pag.page, pageSize: pag.pageSize }); } },
    listar_usuarios_internos: { required: [], handler: function() { return listarUsuariosInternos(); } },
    obtener_config_seguridad: { required: [], handler: function() { return obtenerConfiguracionSeguridad(); } },
    politica_accion_critica: { required: [], handler: function(p) { return obtenerPoliticaAccionCritica(p.accion || ''); } },
    listar_transferencias_stock: { required: [], handler: function(p) { const pag = parsePaginacion(p); return listarTransferenciasStock({ texto: p.texto || '', sucursalId: p.sucursalId || '', page: pag.page, pageSize: pag.pageSize }); } },
    listar_ordenes_compra: { required: [], handler: function(p) { const pag = parsePaginacion(p); return listarOrdenesCompra({ texto: p.texto || '', estado: p.estado || '', proveedor: p.proveedor || '', sucursalId: p.sucursalId || '', page: pag.page, pageSize: pag.pageSize }); } },
    orden_compra: { required: ['folio'], handler: function(p) { return getOrdenCompraByFolio(p.folio); } },
    listar_gastos: { required: [], handler: function(p) { const pag = parsePaginacion(p); return listarGastos({ fechaDesde: p.fechaDesde || '', fechaHasta: p.fechaHasta || '', tipo: p.tipo || '', categoria: p.categoria || '', sucursalId: p.sucursalId || '', texto: p.texto || '', page: pag.page, pageSize: pag.pageSize }); } },
    resumen_gastos: { required: [], handler: function(p) { return resumenGastos({ fechaDesde: p.fechaDesde || '', fechaHasta: p.fechaHasta || '', sucursalId: p.sucursalId || '' }); } },
    resumen_finanzas: { required: [], handler: function(p) { return resumenFinanzas({ fechaDesde: p.fechaDesde || '', fechaHasta: p.fechaHasta || '', sucursalId: p.sucursalId || '' }); } },
    reporte_operativo: { required: [], handler: function(p) { return reporteOperativo({ tipo: p.tipo || 'diario', fechaDesde: p.fechaDesde || '', fechaHasta: p.fechaHasta || '', sucursalId: p.sucursalId || '' }); } },
    listar_clientes: { required: [], handler: function(p) { const pag = parsePaginacion(p); return listarClientes({ texto: p.texto || '', page: pag.page, pageSize: pag.pageSize }); } },
    cliente: { required: ['id'], handler: function(p) { return getClienteById(p.id); } },
    crear_solicitud: { required: [], handler: function(p) { return crearSolicitud({ nombre: p.nombre || '', telefono: p.telefono || '', email: p.email || '', dispositivo: p.dispositivo || '', modelo: p.modelo || '', problemas: (p.problemas || '').split(',').map(function(s) { return String(s).trim(); }).filter(Boolean), descripcion: p.descripcion || '', urgencia: p.urgencia || '' }); } }
  };
}

function Legacy_getPostRoutes() {
  return {
    crear_equipo: { required: [], handler: function(d) { return crearEquipo(d); } },
    actualizar_equipo: { required: [], handler: function(d) { return actualizarEquipo(d); } },
    semaforo: { required: [], handler: function(d) { return getSemaforoData(parsePaginacion(d)); } },
    crear_solicitud: { required: [], handler: function(d) { return crearSolicitud(d); } },
    login_interno: { required: ['usuario', 'password'], handler: function(d) { return loginInterno(d); } },
    listar_solicitudes: { required: [], handler: function(d) { const pag = parsePaginacion(d); return listarSolicitudes({ page: pag.page, pageSize: pag.pageSize }); } },
    solicitud: { required: ['folio'], handler: function(d) { return getSolicitudByFolio(d.folio); } },
    archivar_solicitud: { required: ['folio'], handler: function(d) { return archivarSolicitud(d); } },
    archivar_cotizacion: { required: ['folio'], handler: function(d) { return archivarCotizacion(d); } },
    listar_archivo: { required: [], handler: function(d) { const pag = parsePaginacion(d); return listarArchivo(Object.assign({}, d, { page: pag.page, pageSize: pag.pageSize })); } },
    crear_tarea: { required: [], handler: function(d) { return crearTarea(d); } },
    actualizar_tarea: { required: ['folio'], handler: function(d) { return actualizarTarea(d); } },
    listar_tareas: { required: [], handler: function(d) { const pag = parsePaginacion(d); return listarTareas(Object.assign({}, d, { page: pag.page, pageSize: pag.pageSize })); } },
    tarea: { required: ['folio'], handler: function(d) { return getTareaByFolio(d.folio); } },
    guardar_producto: { required: [], handler: function(d) { return guardarProducto(d); } },
    eliminar_producto: { required: ['sku'], handler: function(d) { return eliminarProducto(d); } },
    listar_productos: { required: [], handler: function(d) { const pag = parsePaginacion(d); return listarProductos(Object.assign({}, d, { page: pag.page, pageSize: pag.pageSize })); } },
    obtener_alertas_stock: { required: [], handler: function(d) { const pag = parsePaginacion(d); return obtenerAlertasStock(Object.assign({}, d, { page: pag.page, pageSize: pag.pageSize })); } },
    listar_movimientos_producto: { required: ['sku'], handler: function(d) { const pag = parsePaginacion(d); return listarMovimientosProducto(Object.assign({}, d, { page: pag.page, pageSize: pag.pageSize })); } },
    registrar_movimiento_stock: { required: ['sku', 'tipoMovimiento', 'cantidad'], handler: function(d) { return registrarMovimientoStock(d); } },
    listar_folios_relacion: { required: [], handler: function() { return listarFoliosRelacion(); } },
    guardar_proveedor: { required: [], handler: function(d) { return guardarProveedor(d); } },
    eliminar_proveedor: { required: ['id'], handler: function(d) { return eliminarProveedor(d); } },
    listar_proveedores: { required: [], handler: function(d) { const pag = parsePaginacion(d); return listarProveedores(Object.assign({}, d, { page: pag.page, pageSize: pag.pageSize })); } },
    proveedor: { required: ['id'], handler: function(d) { return getProveedorById(d.id); } },
    listar_nombres_proveedores: { required: [], handler: function() { return listarNombresProveedores(); } },
    listar_sucursales: { required: [], handler: function(d) { const pag = parsePaginacion(d); return listarSucursales(Object.assign({}, d, { page: pag.page, pageSize: pag.pageSize })); } },
    listar_usuarios_internos: { required: [], handler: function() { return listarUsuariosInternos(); } },
    guardar_usuario_interno: { required: [], handler: function(d) { return guardarUsuarioInterno(d); } },
    obtener_config_seguridad: { required: [], handler: function() { return obtenerConfiguracionSeguridad(); } },
    guardar_config_seguridad: { required: [], handler: function(d) { return guardarConfiguracionSeguridad(d); } },
    validar_admin_password: { required: ['password'], handler: function(d) { return validarAutorizacionAdmin(d); } },
    politica_accion_critica: { required: [], handler: function(d) { return obtenerPoliticaAccionCritica(d.accion || ''); } },
    guardar_sucursal: { required: [], handler: function(d) { return guardarSucursal(d); } },
    transferir_stock: { required: [], handler: function(d) { return transferirStock(d); } },
    listar_transferencias_stock: { required: [], handler: function(d) { const pag = parsePaginacion(d); return listarTransferenciasStock(Object.assign({}, d, { page: pag.page, pageSize: pag.pageSize })); } },
    guardar_orden_compra: { required: [], handler: function(d) { return guardarOrdenCompra(d); } },
    listar_ordenes_compra: { required: [], handler: function(d) { const pag = parsePaginacion(d); return listarOrdenesCompra(Object.assign({}, d, { page: pag.page, pageSize: pag.pageSize })); } },
    orden_compra: { required: ['folio'], handler: function(d) { return getOrdenCompraByFolio(d.folio); } },
    cambiar_estado_orden_compra: { required: ['folio', 'estado'], handler: function(d) { return cambiarEstadoOrdenCompra(d); } },
    recibir_orden_compra: { required: ['folio'], handler: function(d) { return recibirOrdenCompra(d); } },
    guardar_gasto: { required: [], handler: function(d) { return guardarGasto(d); } },
    eliminar_gasto: { required: ['id'], handler: function(d) { return eliminarGasto(d); } },
    listar_gastos: { required: [], handler: function(d) { const pag = parsePaginacion(d); return listarGastos(Object.assign({}, d, { page: pag.page, pageSize: pag.pageSize })); } },
    resumen_gastos: { required: [], handler: function(d) { return resumenGastos(d); } },
    resumen_finanzas: { required: [], handler: function(d) { return resumenFinanzas(d); } },
    reporte_operativo: { required: [], handler: function(d) { return reporteOperativo(d); } },
    listar_clientes: { required: [], handler: function(d) { const pag = parsePaginacion(d); return listarClientes(Object.assign({}, d, { page: pag.page, pageSize: pag.pageSize })); } },
    cliente: { required: ['id'], handler: function(d) { return getClienteById(d.id); } },
    guardar_cliente: { required: [], handler: function(d) { return guardarCliente(d); } }
  };
}

function doGet(e) {
  try {
    if (typeof Router_dispatchGet === 'function') {
      return Router_dispatchGet(e, doGetLegacy);
    }
    return doGetLegacy(e);
  } catch (error) {
    logError('doGet.entrypoint', error, { params: e && e.parameter ? e.parameter : {} });
    return jsonResponse({ error: error.toString() });
  }
}

function doPost(e) {
  try {
    if (typeof Router_dispatchPost === 'function') {
      return Router_dispatchPost(e, doPostLegacy);
    }
    return doPostLegacy(e);
  } catch (error) {
    logError('doPost.entrypoint', error, {});
    return jsonResponse({ error: error.toString() });
  }
}

function parsePostData(e) {
  if (!e) return {};
  const raw = e.postData && typeof e.postData.contents === 'string' ? e.postData.contents : '';

  // JSON directo (actual)
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (err) {
      // Fallback: formulario tipo action=...&payload={...}
      const form = parseQueryString(raw);
      if (form.payload) {
        try {
          const payload = JSON.parse(form.payload);
          return { ...form, ...payload };
        } catch (err2) {
          return form;
        }
      }
      return form;
    }
  }

  return (e.parameter || {});
}

function parseQueryString(qs) {
  const out = {};
  if (!qs) return out;
  qs.split('&').forEach(part => {
    const kv = part.split('=');
    const k = decodeURIComponent((kv[0] || '').replace(/\+/g, ' '));
    const v = decodeURIComponent((kv.slice(1).join('=') || '').replace(/\+/g, ' '));
    if (!k) return;
    out[k] = v;
  });
  return out;
}

function logError(contexto, error, extra) {
  const detalle = {
    contexto: contexto || 'sin_contexto',
    mensaje: error && error.message ? error.message : String(error || ''),
    stack: error && error.stack ? String(error.stack) : '',
    extra: extra || null
  };
  console.error(JSON.stringify(detalle));
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
  const requested = Math.floor(normalizarNumero(input && input.pageSize, CONFIG.LIMITS.DEFAULT_PAGE_SIZE, 1));
  const pageSize = Math.min(requested, CONFIG.LIMITS.MAX_PAGE_SIZE);
  return { page: page, pageSize: pageSize };
}

function paginarArreglo(items, page, pageSize) {
  const total = items.length;
  const offset = (page - 1) * pageSize;
  const data = items.slice(offset, offset + pageSize);
  return {
    total: total,
    page: page,
    pageSize: pageSize,
    hasMore: (offset + data.length) < total,
    data: data
  };
}

function withRetry(fn, contexto) {
  let ultimoError = null;
  for (let intento = 1; intento <= CONFIG.RETRY.MAX_ATTEMPTS; intento++) {
    try {
      return fn();
    } catch (error) {
      ultimoError = error;
      logError(contexto || 'withRetry', error, { intento: intento });
      if (intento < CONFIG.RETRY.MAX_ATTEMPTS) {
        Utilities.sleep(CONFIG.RETRY.BASE_SLEEP_MS * intento);
      }
    }
  }
  throw ultimoError;
}

function withDocumentLock(fn, timeoutMs) {
  const lock = LockService.getDocumentLock();
  const maxWait = Math.max(1000, Number(timeoutMs || 10000));
  lock.waitLock(maxWait);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function normalizarTelefono(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function boolFromCheck(valor) {
  if (valor === true) return true;
  const s = String(valor || '').trim().toUpperCase();
  return s === 'SI' || s === 'SÍ' || s === 'TRUE' || s === '1';
}

function checkToText(valor) {
  return boolFromCheck(valor) ? 'SÍ' : 'NO';
}

function validarEmailSimple(email) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function obtenerSiguienteFolio(key, prefix) {
  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const actual = Number(props.getProperty(key) || 0);
    const siguiente = actual + 1;
    props.setProperty(key, String(siguiente));
    return `${prefix}${String(siguiente).padStart(5, '0')}`;
  } finally {
    lock.releaseLock();
  }
}

function maybePersistImage(dataUrl, nombreBase) {
  const raw = String(dataUrl || '').trim();
  if (!raw) return '';
  if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(raw)) return normalizarUrlImagen(raw);

  const bytes = Utilities.base64Decode(raw.split(',')[1] || '');
  if (bytes.length > CONFIG.LIMITS.MAX_FOTO_SIZE_BYTES) {
    throw new Error('Imagen demasiado grande. Máximo 3MB por imagen.');
  }

  const folderId = PropertiesService.getScriptProperties().getProperty(CONFIG.SCRIPT_PROP_KEYS.DRIVE_FOLDER_ID);
  let folder = DriveApp.getRootFolder();
  if (folderId) {
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (error) {
      logError('maybePersistImage.folder', error, { folderId: folderId });
      folder = DriveApp.getRootFolder();
    }
  }
  const ext = (raw.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,/) || [])[1] || 'jpeg';
  const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const nombre = `${nombreBase}_${new Date().getTime()}.${ext}`;
  const blob = Utilities.newBlob(bytes, contentType, nombre);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return urlDriveImagen(file.getId());
}

function urlDriveImagen(fileId) {
  const id = String(fileId || '').trim();
  if (!id) return '';
  return `https://drive.google.com/uc?export=view&id=${id}`;
}

function extraerDriveFileId(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  let m = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];
  m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];
  return '';
}

function normalizarUrlImagen(valor) {
  const s = String(valor || '').trim();
  if (!s) return '';
  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(s)) return s;
  const id = extraerDriveFileId(s);
  if (id) return urlDriveImagen(id);
  return s;
}

function normalizarSeguimientoFotos(raw) {
  if (!raw) return '[]';
  let arr = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else {
    try {
      const parsed = JSON.parse(String(raw));
      arr = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      const single = normalizarUrlImagen(raw);
      arr = single ? [single] : [];
    }
  }
  const clean = arr
    .map(normalizarUrlImagen)
    .filter(Boolean);
  return JSON.stringify(clean);
}

// ==========================================
// LÓGICA DE NEGOCIO
// ==========================================

function getSemaforoData(pag) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Equipos');
  if (!hoja) return jsonResponse({ total: 0, urgentes: 0, atencion: 0, aTiempo: 0, equipos: [] });

  const datos = withRetry(() => hoja.getDataRange().getValues(), 'getSemaforoData.getValues');
  if (!datos || datos.length < 2) return jsonResponse({ total: 0, urgentes: 0, atencion: 0, aTiempo: 0, equipos: [] });

  const headers = datos[0];
  const p = parsePaginacion(pag || {});
  const equipos = datos.slice(1)
    .filter(row => String(row[8] || '') !== 'Entregado')
    .map(row => {
      const eq = normalizarEquipoForApi(mapearFilaEquipo(headers, row));
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const promesa = parseFechaFlexible(eq['FECHA_PROMESA']);
      eq['FECHA_PROMESA'] = promesa ? formatearFechaYMD(promesa) : '';
      let dias = 9999;
      if (promesa && !isNaN(promesa.getTime())) {
        promesa.setHours(0, 0, 0, 0);
        dias = Math.ceil((promesa - hoy) / (1000 * 60 * 60 * 24));
      }

      let color = 'verde';
      if (dias <= 2) color = 'rojo';
      else if (dias <= 4) color = 'amarillo';

      delete eq.FOTO_RECEPCION;
      delete eq.SEGUIMIENTO_FOTOS;
      return { ...eq, diasRestantes: dias, color: color };
    })
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  const totales = {
    total: equipos.length,
    urgentes: equipos.filter(e => e.color === 'rojo').length,
    atencion: equipos.filter(e => e.color === 'amarillo').length,
    aTiempo: equipos.filter(e => e.color === 'verde').length
  };
  const paginada = paginarArreglo(equipos, p.page, p.pageSize);
  return jsonResponse({
    ...totales,
    equipos: paginada.data,
    page: paginada.page,
    pageSize: paginada.pageSize,
    hasMore: paginada.hasMore
  });
}

function getEquipoByFolio(folio) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Equipos');
  if (!hoja) return jsonResponse({ error: 'No encontrado' });
  const datos = withRetry(() => hoja.getDataRange().getValues(), 'getEquipoByFolio.getValues');
  const headers = datos[0];

  const fila = datos.find(row => String(row[1] || '') === String(folio || ''));
  if (!fila) return jsonResponse({ error: 'No encontrado' });

  const equipo = normalizarEquipoForApi(mapearFilaEquipo(headers, fila));

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaPromesa = parseFechaFlexible(equipo.FECHA_PROMESA);
  if (fechaPromesa) {
    fechaPromesa.setHours(0, 0, 0, 0);
    equipo.FECHA_PROMESA = formatearFechaYMD(fechaPromesa);
    equipo.diasRestantes = Math.ceil((fechaPromesa - hoy) / (1000 * 60 * 60 * 24));
  } else {
    equipo.diasRestantes = 9999;
  }

  delete equipo.NOTAS_INTERNAS;

  return jsonResponse({ equipo: equipo });
}

function parseFechaFlexible(valor) {
  if (!valor) return null;

  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return isNaN(valor.getTime()) ? null : new Date(valor.getTime());
  }

  if (typeof valor === 'number' && isFinite(valor)) {
    const ms = valor > 9999999999 ? valor : valor * 1000;
    const dNum = new Date(ms);
    return isNaN(dNum.getTime()) ? null : dNum;
  }

  const str = String(valor).trim();
  if (!str) return null;

  if (/^\d{10,13}$/.test(str)) {
    const raw = Number(str);
    if (isFinite(raw)) {
      const ms = str.length === 13 ? raw : raw * 1000;
      const dTs = new Date(ms);
      if (!isNaN(dTs.getTime())) return dTs;
    }
  }

  // Formato simple yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(`${str}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  // ISO u otros formatos parseables por JS
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  return null;
}

function formatearFechaYMD(fecha) {
  return Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function formatearFechaYMDOrEmpty(valor) {
  const d = parseFechaFlexible(valor);
  return d ? formatearFechaYMD(d) : '';
}

function asegurarColumnaFechaTimestamp(hoja, campoFecha) {
  const tsField = String(campoFecha || '').trim() + '_TS';
  if (!tsField || !hoja) return 0;
  const lastCol = Math.max(hoja.getLastColumn(), 1);
  const headers = withRetry(function() {
    return hoja.getRange(1, 1, 1, lastCol).getValues()[0];
  }, 'asegurarColumnaFechaTimestamp.headers');
  let idx = headers.indexOf(tsField);
  if (idx >= 0) return idx + 1;
  withRetry(function() {
    hoja.getRange(1, lastCol + 1).setValue(tsField);
    return true;
  }, 'asegurarColumnaFechaTimestamp.add');
  return lastCol + 1;
}

function guardarTimestampParalelo(hoja, fila, campoFecha, valorFecha) {
  if (!hoja || !fila || fila < 2 || !campoFecha) return;
  const d = parseFechaFlexible(valorFecha) || new Date();
  const ts = d.getTime();
  const colTs = asegurarColumnaFechaTimestamp(hoja, campoFecha);
  if (!colTs) return;
  withRetry(function() {
    hoja.getRange(fila, colTs).setValue(ts);
    return true;
  }, 'guardarTimestampParalelo.' + campoFecha);
}

function normalizarHeaderKey(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function construirIndiceHeadersNormalizados(headers) {
  const out = {};
  (headers || []).forEach(function(header, index) {
    const key = normalizarHeaderKey(header);
    if (!key || Object.prototype.hasOwnProperty.call(out, key)) return;
    out[key] = { index: index, original: String(header || '').trim() };
  });
  return out;
}

function asignarCampoCanonicoDesdeHeaders(eq, headers, row, canonicalName, headerIndexMap) {
  if (!canonicalName) return;
  const canonicalKey = normalizarHeaderKey(canonicalName);
  if (eq[canonicalName] !== undefined && eq[canonicalName] !== null && String(eq[canonicalName]).trim() !== '') return;

  const direct = headerIndexMap[canonicalKey];
  if (direct && row[direct.index] !== undefined && row[direct.index] !== null && String(row[direct.index]).trim() !== '') {
    eq[canonicalName] = row[direct.index];
    return;
  }

  const keys = Object.keys(headerIndexMap || {});
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (k === canonicalKey) continue;
    if (k.indexOf(canonicalKey) === -1 && canonicalKey.indexOf(k) === -1) continue;
    const meta = headerIndexMap[k];
    const val = row[meta.index];
    if (val === undefined || val === null || String(val).trim() === '') continue;
    eq[canonicalName] = val;
    return;
  }
}

function mapearFilaEquipo(headers, row) {
  const eq = {};
  headers.forEach((h, i) => {
    if (h) eq[h] = row[i];
  });
  const idxNormalizado = construirIndiceHeadersNormalizados(headers || []);
  ['FOTO_RECEPCION', 'SEGUIMIENTO_CLIENTE', 'SEGUIMIENTO_FOTOS', 'FECHA_PROMESA', 'FECHA_ENTREGA', 'FECHA_ULTIMA_ACTUALIZACION'].forEach(function(field) {
    asignarCampoCanonicoDesdeHeaders(eq, headers, row, field, idxNormalizado);
  });

  return eq;
}

function normalizarEquipoForApi(eqRaw) {
  const eq = { ...eqRaw };
  eq.CLIENTE_TELEFONO = normalizarTelefono(eq.CLIENTE_TELEFONO);

  ['FECHA_INGRESO', 'FECHA_PROMESA', 'FECHA_ENTREGA'].forEach(k => {
    const d = parseFechaFlexible(eq[k]);
    eq[k] = d ? formatearFechaYMD(d) : '';
  });

  eq.CHECK_CARGADOR = checkToText(eq.CHECK_CARGADOR);
  eq.CHECK_PANTALLA = checkToText(eq.CHECK_PANTALLA);
  eq.CHECK_PRENDE = checkToText(eq.CHECK_PRENDE);
  eq.CHECK_RESPALDO = checkToText(eq.CHECK_RESPALDO);
  eq.CHECK_CARGADOR_BOOL = boolFromCheck(eq.CHECK_CARGADOR);
  eq.CHECK_PANTALLA_BOOL = boolFromCheck(eq.CHECK_PANTALLA);
  eq.CHECK_PRENDE_BOOL = boolFromCheck(eq.CHECK_PRENDE);
  eq.CHECK_RESPALDO_BOOL = boolFromCheck(eq.CHECK_RESPALDO);
  eq.CHECKLIST = {
    cargador: eq.CHECK_CARGADOR_BOOL,
    pantalla: eq.CHECK_PANTALLA_BOOL,
    prende: eq.CHECK_PRENDE_BOOL,
    respaldo: eq.CHECK_RESPALDO_BOOL
  };
  eq.FOTO_RECEPCION = normalizarUrlImagen(eq.FOTO_RECEPCION);
  eq.SEGUIMIENTO_FOTOS = normalizarSeguimientoFotos(eq.SEGUIMIENTO_FOTOS);

  return eq;
}

function crearEquipo(data) {
  return withDocumentLock(function() {
    const payload = validarPayloadCrearEquipo(data || {});
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName('Equipos');
    if (!hoja) throw new Error('Hoja Equipos no encontrada');
    asegurarColumnaSucursal(hoja);
    const sucursalId = normalizarSucursalId(data && data.sucursalId);

    const folio = obtenerSiguienteFolio(CONFIG.SCRIPT_PROP_KEYS.FOLIO_EQUIPO_SEQ, 'SRF-');
    const ahora = new Date().toISOString();

    const fotoRecepcion = payload.fotoRecepcion
      ? maybePersistImage(payload.fotoRecepcion, `${folio}_recepcion`)
      : '';
    const seguimientoFotos = (payload.seguimientoFotos || [])
      .slice(0, CONFIG.LIMITS.MAX_SEGUIMIENTO_FOTOS)
      .map((img, idx) => maybePersistImage(img, `${folio}_seg_${idx + 1}`))
      .filter(Boolean);

    withRetry(() => hoja.appendRow([
      Utilities.getUuid(), folio, ahora, payload.clienteNombre, payload.clienteTelefono,
      payload.dispositivo, payload.modelo, payload.falla, 'Recibido', 'Por asignar',
      payload.fechaPromesa, '', payload.costo, '', '',
      payload.checks.cargador ? 'SÍ' : 'NO',
      payload.checks.pantalla ? 'SÍ' : 'NO',
      payload.checks.prende ? 'SÍ' : 'NO',
      payload.checks.respaldo ? 'SÍ' : 'NO',
      fotoRecepcion,
      payload.seguimientoCliente,
      JSON.stringify(seguimientoFotos),
      payload.folioSolicitudOrigen || '',
      '', // CASO_RESOLUCION_TECNICA (vacio al inicio)
      ahora // FECHA_ULTIMA_ACTUALIZACION
    ]), 'crearEquipo.appendRow');
    const filaInsertada = hoja.getLastRow();
    guardarTimestampParalelo(hoja, filaInsertada, 'FECHA_INGRESO', ahora);
    guardarTimestampParalelo(hoja, filaInsertada, 'FECHA_PROMESA', payload.fechaPromesa || '');
    guardarTimestampParalelo(hoja, filaInsertada, 'FECHA_ULTIMA_ACTUALIZACION', ahora);

    if (payload.clienteNombre || payload.clienteTelefono || payload.clienteEmail) {
      upsertClienteLigero(ss, {
        nombre: payload.clienteNombre,
        telefono: payload.clienteTelefono,
        email: payload.clienteEmail || '',
        fechaRegistro: ahora,
        fechaActualizacion: ahora
      });
    }

    return jsonResponse({ success: true, folio: folio });
  }, 12000);
}

function actualizarEquipo(data) {
  return withDocumentLock(function() {
    const folio = String((data && data.folio) || '').trim();
    if (!folio) return jsonResponse({ error: 'Folio requerido' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName('Equipos');
    if (!hoja) return jsonResponse({ error: 'No encontrado' });
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'actualizarEquipo.getValues');
    const headers = datos[0] || [];

    const filaIdx = datos.findIndex(row => String(row[1] || '') === folio);
    if (filaIdx === -1) return jsonResponse({ error: 'No encontrado' });
    const fila = filaIdx + 1;

    const colIndex = {};
    headers.forEach((h, i) => colIndex[String(h).trim()] = i + 1);
    const camposRaw = data.campos || {};
    const campos = validarCamposActualizacion(camposRaw);
    const faltantes = Object.keys(campos).filter(k => k && !colIndex[k]);
    if (faltantes.length > 0) {
      const start = hoja.getLastColumn() + 1;
      withRetry(() => hoja.getRange(1, start, 1, faltantes.length).setValues([faltantes]), 'actualizarEquipo.crearColumnas');
      faltantes.forEach((k, idx) => {
        colIndex[k] = start + idx;
      });
    }

    Object.keys(campos).forEach(k => {
      if (k === 'FOTO_RECEPCION' && /^data:image\//.test(String(campos[k] || ''))) {
        campos[k] = maybePersistImage(campos[k], `${folio}_recepcion_upd`);
      }
      if (k === 'FOTO_RECEPCION') {
        campos[k] = normalizarUrlImagen(campos[k]);
      }
      if (k === 'SEGUIMIENTO_FOTOS' && Array.isArray(campos[k])) {
        const fotos = campos[k].slice(0, CONFIG.LIMITS.MAX_SEGUIMIENTO_FOTOS)
          .map((img, idx) => maybePersistImage(img, `${folio}_segupd_${idx + 1}`))
          .filter(Boolean);
        campos[k] = normalizarSeguimientoFotos(fotos);
      }
      if (colIndex[k]) {
        withRetry(() => hoja.getRange(fila, colIndex[k]).setValue(campos[k]), `actualizarEquipo.set.${k}`);
      }
    });

    if (campos.ESTADO === 'Entregado' && colIndex.FECHA_ENTREGA) {
      const fechaEntregaIso = new Date().toISOString();
      withRetry(() => hoja.getRange(fila, colIndex.FECHA_ENTREGA).setValue(fechaEntregaIso), 'actualizarEquipo.fechaEntrega');
      guardarTimestampParalelo(hoja, fila, 'FECHA_ENTREGA', fechaEntregaIso);
    }
    if (colIndex.FECHA_ULTIMA_ACTUALIZACION) {
      const fechaSyncIso = new Date().toISOString();
      withRetry(() => hoja.getRange(fila, colIndex.FECHA_ULTIMA_ACTUALIZACION).setValue(fechaSyncIso), 'actualizarEquipo.fechaSync');
      guardarTimestampParalelo(hoja, fila, 'FECHA_ULTIMA_ACTUALIZACION', fechaSyncIso);
    }
    if (campos.FECHA_PROMESA) {
      guardarTimestampParalelo(hoja, fila, 'FECHA_PROMESA', campos.FECHA_PROMESA);
    }

    return jsonResponse({ success: true });
  }, 12000);
}

function crearSolicitud(data) {
  return withDocumentLock(function() {
    const payload = validarPayloadCrearSolicitud(data || {});
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaSolicitudes(ss);
    asegurarColumnaSucursal(hoja);
    const sucursalId = normalizarSucursalId(data && data.sucursalId);

    const folioCotizacion = obtenerSiguienteFolio(CONFIG.SCRIPT_PROP_KEYS.FOLIO_COTIZACION_SEQ, 'COT-');
    const ahora = new Date().toISOString();
    const problemas = Array.isArray(payload.problemas) ? payload.problemas.join(', ') : payload.problemas;

    withRetry(() => hoja.appendRow([
      Utilities.getUuid(),
      folioCotizacion,
      ahora,
      payload.nombre,
      payload.telefono,
      payload.email,
      payload.dispositivo,
      payload.modelo,
      problemas,
      payload.descripcion,
      payload.urgencia,
      'pendiente',
      '',
      '',
      0,
      '',
      sucursalId,
      data.solicitud_origen_ip || '0.0.0.0'
    ]), 'crearSolicitud.appendRow');

    return jsonResponse({ success: true, folio: folioCotizacion });
  }, 12000);
}

function listarSolicitudes(pag) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = obtenerHojaSolicitudes(ss);

  const datos = withRetry(() => hoja.getDataRange().getValues(), 'listarSolicitudes.getValues');
  if (!datos || datos.length < 2) return jsonResponse({ solicitudes: [] });
  const headers = datos[0];
  const p = parsePaginacion(pag || {});

  const solicitudes = datos.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    obj.TELEFONO = normalizarTelefono(obj.TELEFONO);
    const fechaSol = parseFechaFlexible(obj.FECHA_SOLICITUD);
    obj.FECHA_SOLICITUD = fechaSol ? formatearFechaYMD(fechaSol) : '';
    const fechaCot = parseFechaFlexible(obj.FECHA_COTIZACION);
    obj.FECHA_COTIZACION = fechaCot ? formatearFechaYMD(fechaCot) : '';
    return obj;
  }).filter(s => String(s.ESTADO || '').toLowerCase() === 'pendiente');

  const paginada = paginarArreglo(solicitudes, p.page, p.pageSize);
  return jsonResponse({
    solicitudes: paginada.data,
    total: paginada.total,
    page: paginada.page,
    pageSize: paginada.pageSize,
    hasMore: paginada.hasMore
  });
}

function getSolicitudByFolio(folio) {
  const target = String(folio || '').trim().toUpperCase();
  if (!target) return jsonResponse({ error: 'Folio requerido' });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = obtenerHojaSolicitudes(ss);
  const datos = withRetry(() => hoja.getDataRange().getValues(), 'getSolicitudByFolio.getValues');
  if (!datos || datos.length < 2) return jsonResponse({ error: 'No encontrada' });

  const headers = datos[0];
  const idxFolio = headers.indexOf('FOLIO_COTIZACION');
  if (idxFolio === -1) return jsonResponse({ error: 'Estructura de hoja incorrecta' });

  const fila = datos.find((row, i) => i > 0 && String(row[idxFolio] || '').trim().toUpperCase() === target);
  if (!fila) return jsonResponse({ error: 'No encontrada' });

  const solicitud = {};
  headers.forEach((h, i) => solicitud[h] = fila[i]);
  solicitud.FOLIO_COTIZACION = String(solicitud.FOLIO_COTIZACION || '').trim().toUpperCase();
  solicitud.TELEFONO = normalizarTelefono(solicitud.TELEFONO || '');
  solicitud.FECHA_SOLICITUD = formatearFechaYMDOrEmpty(solicitud.FECHA_SOLICITUD || '');
  solicitud.FECHA_COTIZACION = formatearFechaYMDOrEmpty(solicitud.FECHA_COTIZACION || '');
  return jsonResponse({ solicitud: solicitud });
}

function archivarSolicitud(data) {
  return withDocumentLock(function() {
    const folio = String((data && data.folio) || '').trim();
    if (!folio) return jsonResponse({ error: 'Folio requerido' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaSolicitudes(ss);
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'archivarSolicitud.getValues');
    if (!datos || datos.length < 2) return jsonResponse({ error: 'Sin solicitudes' });
    const headers = datos[0];
    const idxEstado = headers.indexOf('ESTADO');
    const idxFolio = headers.indexOf('FOLIO_COTIZACION');
    if (idxEstado === -1 || idxFolio === -1) return jsonResponse({ error: 'Estructura de hoja incorrecta' });

    const filaIdx = datos.findIndex((row, i) => i > 0 && String(row[idxFolio] || '') === folio);
    if (filaIdx === -1) return jsonResponse({ error: 'No encontrada' });
    withRetry(() => hoja.getRange(filaIdx + 1, idxEstado + 1).setValue('archivado'), 'archivarSolicitud.setEstado');
    return jsonResponse({ success: true });
  }, 12000);
}

function obtenerHojaSolicitudes(ss) {
  return crearHojaSiNoExiste(ss, 'Solicitudes', [
    'ID', 'FOLIO_COTIZACION', 'FECHA_SOLICITUD', 'NOMBRE', 'TELEFONO',
    'EMAIL', 'DISPOSITIVO', 'MODELO', 'PROBLEMAS', 'DESCRIPCION',
    'URGENCIA', 'ESTADO', 'FECHA_COTIZACION', 'COTIZACION_JSON', 'COTIZACION_TOTAL', 'FOLIO_COTIZACION_MANUAL'
  ]);
}

function validarPayloadCrearEquipo(data) {
  const clienteNombre = String(data.clienteNombre || '').trim();
  const clienteTelefono = normalizarTelefono(data.clienteTelefono);
  const clienteEmail = String(data.clienteEmail || '').trim();
  const dispositivo = String(data.dispositivo || '').trim();
  const modelo = String(data.modelo || '').trim();
  const falla = String(data.falla || '').trim();
  const fechaPromesa = String(data.fechaPromesa || '').trim();
  const costo = normalizarNumero(data.costo, 0, 0);
  const checks = data.checks || {};
  const seguimientoRaw = Array.isArray(data.seguimientoFotos)
    ? data.seguimientoFotos
    : safeParseJsonArray(data.seguimientoFotos);
  const folioSolicitudOrigen = String(data.folioSolicitudOrigen || '').trim().toUpperCase();

  if (!clienteNombre) throw new Error('clienteNombre es obligatorio');
  if (!clienteTelefono || clienteTelefono.length !== 10) throw new Error('clienteTelefono inválido, deben ser 10 dígitos');
  if (!dispositivo) throw new Error('dispositivo es obligatorio');
  if (!modelo) throw new Error('modelo es obligatorio');
  if (!falla) throw new Error('falla es obligatoria');
  const fechaOk = parseFechaFlexible(fechaPromesa);
  if (!fechaOk) throw new Error('fechaPromesa inválida, usa yyyy-mm-dd');
  if (!validarEmailSimple(clienteEmail)) throw new Error('clienteEmail inválido');

  return {
    clienteNombre,
    clienteTelefono,
    clienteEmail,
    dispositivo,
    modelo,
    falla,
    fechaPromesa: formatearFechaYMD(fechaOk),
    costo,
    checks: {
      cargador: !!checks.cargador,
      pantalla: !!checks.pantalla,
      prende: !!checks.prende,
      respaldo: !!checks.respaldo
    },
    fotoRecepcion: String(data.fotoRecepcion || '').trim(),
    seguimientoCliente: String(data.seguimientoCliente || '').trim(),
    seguimientoFotos: seguimientoRaw.filter(Boolean),
    folioSolicitudOrigen: folioSolicitudOrigen
  };
}

function validarCamposActualizacion(camposRaw) {
  const campos = { ...camposRaw };
  if (campos.CLIENTE_TELEFONO !== undefined) {
    const tel = normalizarTelefono(campos.CLIENTE_TELEFONO);
    if (!tel || tel.length !== 10) throw new Error('CLIENTE_TELEFONO inválido, deben ser 10 dígitos');
    campos.CLIENTE_TELEFONO = tel;
  }
  if (campos.FECHA_PROMESA !== undefined) {
    const fecha = parseFechaFlexible(campos.FECHA_PROMESA);
    if (!fecha) throw new Error('FECHA_PROMESA inválida');
    campos.FECHA_PROMESA = formatearFechaYMD(fecha);
  }
  if (campos.ESTADO !== undefined) {
    const estado = String(campos.ESTADO || '').trim();
    if (estado && CONFIG.ESTADOS.indexOf(estado) === -1) throw new Error('ESTADO inválido');
    campos.ESTADO = estado;
  }
  if (campos.COSTO_ESTIMADO !== undefined) {
    campos.COSTO_ESTIMADO = normalizarNumero(campos.COSTO_ESTIMADO, 0, 0);
  }
  return campos;
}

function validarPayloadCrearSolicitud(data) {
  const nombre = String(data.nombre || '').trim();
  const telefono = normalizarTelefono(data.telefono);
  const email = String(data.email || '').trim();
  const dispositivo = String(data.dispositivo || '').trim();
  const modelo = String(data.modelo || '').trim();
  const descripcion = String(data.descripcion || '').trim();
  const urgencia = String(data.urgencia || '').trim();
  const problemas = Array.isArray(data.problemas)
    ? data.problemas.map(p => String(p || '').trim()).filter(Boolean)
    : String(data.problemas || '').split(',').map(p => String(p || '').trim()).filter(Boolean);

  if (!nombre) throw new Error('nombre es obligatorio');
  if (!telefono || telefono.length !== 10) throw new Error('telefono inválido, deben ser 10 dígitos');
  if (!dispositivo) throw new Error('dispositivo es obligatorio');
  if (!modelo) throw new Error('modelo es obligatorio');
  if (!descripcion) throw new Error('descripcion es obligatoria');
  if (!validarEmailSimple(email)) throw new Error('email inválido');

  return {
    nombre,
    telefono,
    email,
    dispositivo,
    modelo,
    descripcion,
    urgencia,
    problemas
  };
}

function safeParseJsonArray(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function sanitizarCotizacion(cotizacion) {
  const items = Array.isArray(cotizacion.items) ? cotizacion.items : [];
  const cleanItems = items.slice(0, 50).map(it => ({
    concepto: String(it && it.concepto || '').slice(0, 200),
    cantidad: normalizarNumero(it && it.cantidad, 1, 0),
    precio: normalizarNumero(it && it.precio, 0, 0),
    total: normalizarNumero(it && it.total, 0, 0)
  }));
  return {
    items: cleanItems,
    notas: String(cotizacion.notas || '').slice(0, 2000),
    aplicaIva: !!cotizacion.aplicaIva,
    ivaRate: normalizarNumero(cotizacion.ivaRate, 0.16, 0),
    subtotal: normalizarNumero(cotizacion.subtotal, 0, 0),
    iva: normalizarNumero(cotizacion.iva, 0, 0),
    total: normalizarNumero(cotizacion.total, 0, 0),
    anticipo: normalizarNumero(cotizacion.anticipo, 0, 0),
    saldo: normalizarNumero(cotizacion.saldo, 0, 0)
  };
}

function archivarCotizacion(data) {
  return withDocumentLock(function() {
    const folio = String((data && data.folio) || '').trim();
    if (!folio) return jsonResponse({ error: 'Folio requerido' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaSolicitudes(ss);
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'archivarCotizacion.getValues');
    if (!datos || datos.length < 2) return jsonResponse({ error: 'Sin solicitudes' });
    const headers = datos[0];

    const idxFolio = headers.indexOf('FOLIO_COTIZACION');
    const idxEstado = headers.indexOf('ESTADO');
    const idxFecha = headers.indexOf('FECHA_COTIZACION');
    const idxJson = headers.indexOf('COTIZACION_JSON');
    const idxTotal = headers.indexOf('COTIZACION_TOTAL');
    const idxFolioManual = headers.indexOf('FOLIO_COTIZACION_MANUAL');
    if ([idxFolio, idxEstado, idxFecha, idxJson, idxTotal, idxFolioManual].some(i => i === -1)) {
      return jsonResponse({ error: 'Estructura de hoja incorrecta' });
    }

    const filaIdx = datos.findIndex((row, i) => i > 0 && String(row[idxFolio] || '') === folio);
    if (filaIdx === -1) return jsonResponse({ error: 'No encontrada' });

    const fila = filaIdx + 1;
    const cotizacion = sanitizarCotizacion(data.cotizacion || {});
    const folioManualActual = String(datos[filaIdx][idxFolioManual] || '').trim();
    const folioCotizacionManual = folioManualActual || obtenerSiguienteFolio(CONFIG.SCRIPT_PROP_KEYS.FOLIO_COTIZACION_MANUAL_SEQ, 'CTM-');
    cotizacion.folioCotizacionManual = folioCotizacionManual;
    withRetry(() => hoja.getRange(fila, idxEstado + 1).setValue('cotizacion_archivada'), 'archivarCotizacion.estado');
    withRetry(() => hoja.getRange(fila, idxFecha + 1).setValue(new Date().toISOString()), 'archivarCotizacion.fecha');
    withRetry(() => hoja.getRange(fila, idxJson + 1).setValue(JSON.stringify(cotizacion)), 'archivarCotizacion.json');
    withRetry(() => hoja.getRange(fila, idxTotal + 1).setValue(Number(cotizacion.total || 0)), 'archivarCotizacion.total');
    withRetry(() => hoja.getRange(fila, idxFolioManual + 1).setValue(folioCotizacionManual), 'archivarCotizacion.folioManual');
    return jsonResponse({ success: true, folioCotizacionManual: folioCotizacionManual });
  }, 12000);
}

function listarArchivo(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tipo = String((data && data.tipo) || 'todos').toLowerCase();
  const from = parseFechaFiltro((data && data.from) || '');
  const to = parseFechaFiltro((data && data.to) || '');
  const p = parsePaginacion(data || {});
  if (to) to.setHours(23, 59, 59, 999);

  const archivo = [];
  const incluirSolicitudes = (tipo === 'todos' || tipo === 'solicitudes');
  const incluirCotizaciones = (tipo === 'todos' || tipo === 'cotizaciones');
  const incluirEquipos = (tipo === 'todos' || tipo === 'equipos');

  if (incluirSolicitudes || incluirCotizaciones) {
    const hojaSol = obtenerHojaSolicitudes(ss);
    const datosSol = withRetry(() => hojaSol.getDataRange().getValues(), 'listarArchivo.getSolicitudes');
    if (datosSol.length > 1) {
      const headers = datosSol[0];
      const idxEstado = headers.indexOf('ESTADO');
      datosSol.slice(1).forEach(row => {
        const estado = String(row[idxEstado] || '').toLowerCase();
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);

        const fechaBase = parseFechaFlexible(obj.FECHA_COTIZACION || obj.FECHA_SOLICITUD);
        if (!cumpleRango(fechaBase, from, to)) return;

        if (incluirSolicitudes && estado === 'archivado') {
          archivo.push({
            TIPO_ARCHIVO: 'solicitud',
            FECHA_ARCHIVO: formatearFechaYMDOrEmpty(obj.FECHA_SOLICITUD || ''),
            FOLIO: obj.FOLIO_COTIZACION || '',
            CLIENTE: obj.NOMBRE || '',
            TELEFONO: normalizarTelefono(obj.TELEFONO || ''),
            DETALLE: obj.DESCRIPCION || obj.PROBLEMAS || '',
            TOTAL: ''
          });
        }

        if (incluirCotizaciones && estado === 'cotizacion_archivada') {
          const folioCot = String(obj.FOLIO_COTIZACION_MANUAL || '').trim() || String(obj.FOLIO_COTIZACION || '');
          archivo.push({
            TIPO_ARCHIVO: 'cotizacion',
            FECHA_ARCHIVO: formatearFechaYMDOrEmpty(obj.FECHA_COTIZACION || obj.FECHA_SOLICITUD || ''),
            FOLIO: folioCot,
            CLIENTE: obj.NOMBRE || '',
            TELEFONO: normalizarTelefono(obj.TELEFONO || ''),
            DETALLE: obj.DESCRIPCION || obj.PROBLEMAS || '',
            TOTAL: Number(obj.COTIZACION_TOTAL || 0)
          });
        }
      });
    }
  }

  if (incluirEquipos) {
    const hojaEq = ss.getSheetByName('Equipos');
    if (hojaEq) {
      const datosEq = withRetry(() => hojaEq.getDataRange().getValues(), 'listarArchivo.getEquipos');
      if (datosEq.length > 1) {
        const headersEq = datosEq[0];
        const idxEstadoEq = headersEq.indexOf('ESTADO');
        const idxFolioEq = headersEq.indexOf('FOLIO');
        const idxClienteEq = headersEq.indexOf('CLIENTE_NOMBRE');
        const idxTelefonoEq = headersEq.indexOf('CLIENTE_TELEFONO');
        const idxModeloEq = headersEq.indexOf('MODELO');
        const idxDisEq = headersEq.indexOf('DISPOSITIVO');
        const idxFechaEntregaEq = headersEq.indexOf('FECHA_ENTREGA');
        const idxCostoEq = headersEq.indexOf('COSTO_ESTIMADO');

        datosEq.slice(1).forEach(row => {
          if (String(row[idxEstadoEq] || '') !== 'Entregado') return;
          const fechaEnt = parseFechaFlexible(row[idxFechaEntregaEq] || '');
          if (!cumpleRango(fechaEnt, from, to)) return;

          archivo.push({
            TIPO_ARCHIVO: 'equipo_entregado',
            FECHA_ARCHIVO: formatearFechaYMDOrEmpty(row[idxFechaEntregaEq] || ''),
            FOLIO: row[idxFolioEq] || '',
            CLIENTE: row[idxClienteEq] || '',
            TELEFONO: normalizarTelefono(row[idxTelefonoEq] || ''),
            DETALLE: `${row[idxDisEq] || ''} ${row[idxModeloEq] || ''}`.trim(),
            TOTAL: Number(row[idxCostoEq] || 0)
          });
        });
      }
    }
  }

  archivo.sort((a, b) => {
    const da = parseFechaFlexible(a.FECHA_ARCHIVO);
    const db = parseFechaFlexible(b.FECHA_ARCHIVO);
    const ta = da ? da.getTime() : 0;
    const tb = db ? db.getTime() : 0;
    return tb - ta;
  });

  const paginada = paginarArreglo(archivo, p.page, p.pageSize);
  return jsonResponse({
    archivo: paginada.data,
    total: paginada.total,
    page: paginada.page,
    pageSize: paginada.pageSize,
    hasMore: paginada.hasMore
  });
}

function parseFechaFiltro(valor) {
  if (!valor) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(valor))) {
    const d = new Date(`${valor}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  return parseFechaFlexible(valor);
}

function cumpleRango(fecha, from, to) {
  if (!from && !to) return true;
  if (!fecha || isNaN(fecha.getTime())) return false;
  if (from && fecha < from) return false;
  if (to && fecha > to) return false;
  return true;
}

function obtenerHojaTareas(ss) {
  return crearHojaSiNoExiste(ss, 'Tareas', [
    'ID', 'FOLIO_TAREA', 'FECHA_CREACION', 'TITULO', 'DESCRIPCION',
    'ESTADO', 'PRIORIDAD', 'RESPONSABLE', 'FECHA_LIMITE', 'TIPO_RELACION',
    'FOLIO_RELACIONADO', 'NOTAS', 'HISTORIAL', 'FECHA_ACTUALIZACION'
  ]);
}

function obtenerHojaClientes(ss) {
  return crearHojaSiNoExiste(ss, 'Clientes', [
    'ID', 'NOMBRE', 'TELEFONO', 'EMAIL', 'FECHA_REGISTRO', 'ETIQUETA', 'NOTAS', 'FECHA_ACTUALIZACION'
  ]);
}

function asegurarLongitudFila(row, length) {
  const out = Array.isArray(row) ? row.slice(0, length) : [];
  while (out.length < length) out.push('');
  return out;
}

function crearMapsClientes(headers, rows) {
  const idxTelefono = headers.indexOf('TELEFONO');
  const idxEmail = headers.indexOf('EMAIL');
  const maps = { telefono: {}, email: {} };
  rows.forEach((row, index) => {
    const telefono = normalizarTelefono(row[idxTelefono] || '');
    const email = String(row[idxEmail] || '').trim().toLowerCase();
    if (telefono) maps.telefono[telefono] = index;
    if (email) maps.email[email] = index;
  });
  return maps;
}

function aplicarUpsertCliente(headers, rows, maps, input, fallbackFecha) {
  const nombre = String(input && input.nombre || '').trim();
  const telefono = normalizarTelefono(input && input.telefono || '');
  const email = String(input && input.email || '').trim();
  const emailKey = email.toLowerCase();
  const fechaRegistro = String(input && input.fechaRegistro || '').trim() || fallbackFecha;
  const fechaActualizacion = String(input && input.fechaActualizacion || '').trim() || fallbackFecha;

  if (!nombre && !telefono && !email) return false;

  const idxId = headers.indexOf('ID');
  const idxNombre = headers.indexOf('NOMBRE');
  const idxTelefono = headers.indexOf('TELEFONO');
  const idxEmail = headers.indexOf('EMAIL');
  const idxFechaRegistro = headers.indexOf('FECHA_REGISTRO');
  const idxEtiqueta = headers.indexOf('ETIQUETA');
  const idxNotas = headers.indexOf('NOTAS');
  const idxFechaActualizacion = headers.indexOf('FECHA_ACTUALIZACION');

  let rowIndex = -1;
  if (telefono && Object.prototype.hasOwnProperty.call(maps.telefono, telefono)) rowIndex = maps.telefono[telefono];
  else if (emailKey && Object.prototype.hasOwnProperty.call(maps.email, emailKey)) rowIndex = maps.email[emailKey];

  if (rowIndex < 0) {
    const row = new Array(headers.length).fill('');
    row[idxId] = Utilities.getUuid();
    row[idxNombre] = nombre;
    row[idxTelefono] = telefono;
    row[idxEmail] = email;
    row[idxFechaRegistro] = fechaRegistro;
    if (idxEtiqueta >= 0) row[idxEtiqueta] = '';
    if (idxNotas >= 0) row[idxNotas] = '';
    row[idxFechaActualizacion] = fechaActualizacion;
    rows.push(row);
    const newIndex = rows.length - 1;
    if (telefono) maps.telefono[telefono] = newIndex;
    if (emailKey) maps.email[emailKey] = newIndex;
    return true;
  }

  const row = asegurarLongitudFila(rows[rowIndex], headers.length);
  let changed = false;

  if (nombre && String(row[idxNombre] || '').trim() !== nombre) {
    row[idxNombre] = nombre;
    changed = true;
  }
  if (telefono && String(row[idxTelefono] || '').trim() !== telefono) {
    row[idxTelefono] = telefono;
    maps.telefono[telefono] = rowIndex;
    changed = true;
  }
  if (email && String(row[idxEmail] || '').trim() !== email) {
    row[idxEmail] = email;
    maps.email[emailKey] = rowIndex;
    changed = true;
  }
  if (!String(row[idxFechaRegistro] || '').trim()) {
    row[idxFechaRegistro] = fechaRegistro;
    changed = true;
  }
  if (changed || !String(row[idxFechaActualizacion] || '').trim()) {
    row[idxFechaActualizacion] = fechaActualizacion;
    changed = true;
  }

  rows[rowIndex] = row;
  return changed;
}

function buscarFilaClientePorCampo(hoja, headers, fieldName, expectedValue) {
  const clean = String(expectedValue || '').trim();
  if (!clean) return 0;
  const idx = headers.indexOf(fieldName);
  if (idx < 0) return 0;
  const lastRow = hoja.getLastRow();
  if (lastRow < 2) return 0;
  const range = hoja.getRange(2, idx + 1, lastRow - 1, 1);
  const hit = withRetry(function() {
    return range.createTextFinder(clean).matchEntireCell(true).findNext();
  }, 'buscarFilaClientePorCampo.' + fieldName);
  return hit ? hit.getRow() : 0;
}

function upsertClienteLigero(ss, input) {
  const hoja = obtenerHojaClientes(ss);
  const headerRow = withRetry(function() {
    return hoja.getRange(1, 1, 1, Math.max(hoja.getLastColumn(), 1)).getValues()[0];
  }, 'upsertClienteLigero.headers');
  const headers = headerRow && headerRow.length ? headerRow : ['ID', 'NOMBRE', 'TELEFONO', 'EMAIL', 'FECHA_REGISTRO', 'ETIQUETA', 'NOTAS', 'FECHA_ACTUALIZACION'];

  const nombre = String(input && input.nombre || '').trim();
  const telefono = normalizarTelefono(input && input.telefono || '');
  const email = String(input && input.email || '').trim();
  const fechaRegistro = String(input && input.fechaRegistro || '').trim() || new Date().toISOString();
  const fechaActualizacion = String(input && input.fechaActualizacion || '').trim() || new Date().toISOString();

  if (!nombre && !telefono && !email) return false;

  const rowByPhone = telefono ? buscarFilaClientePorCampo(hoja, headers, 'TELEFONO', telefono) : 0;
  const rowByEmail = !rowByPhone && email ? buscarFilaClientePorCampo(hoja, headers, 'EMAIL', email) : 0;
  const targetRow = rowByPhone || rowByEmail;

  const idxId = headers.indexOf('ID');
  const idxNombre = headers.indexOf('NOMBRE');
  const idxTelefono = headers.indexOf('TELEFONO');
  const idxEmail = headers.indexOf('EMAIL');
  const idxFechaRegistro = headers.indexOf('FECHA_REGISTRO');
  const idxEtiqueta = headers.indexOf('ETIQUETA');
  const idxNotas = headers.indexOf('NOTAS');
  const idxFechaActualizacion = headers.indexOf('FECHA_ACTUALIZACION');

  if (!targetRow) {
    const row = new Array(headers.length).fill('');
    if (idxId >= 0) row[idxId] = Utilities.getUuid();
    if (idxNombre >= 0) row[idxNombre] = nombre;
    if (idxTelefono >= 0) row[idxTelefono] = telefono;
    if (idxEmail >= 0) row[idxEmail] = email;
    if (idxFechaRegistro >= 0) row[idxFechaRegistro] = fechaRegistro;
    if (idxEtiqueta >= 0) row[idxEtiqueta] = '';
    if (idxNotas >= 0) row[idxNotas] = '';
    if (idxFechaActualizacion >= 0) row[idxFechaActualizacion] = fechaActualizacion;
    withRetry(function() {
      hoja.appendRow(row);
      return true;
    }, 'upsertClienteLigero.append');
    return true;
  }

  const current = withRetry(function() {
    return hoja.getRange(targetRow, 1, 1, headers.length).getValues()[0];
  }, 'upsertClienteLigero.read');
  const row = asegurarLongitudFila(current, headers.length);
  let changed = false;

  if (idxNombre >= 0 && nombre && String(row[idxNombre] || '').trim() !== nombre) {
    row[idxNombre] = nombre;
    changed = true;
  }
  if (idxTelefono >= 0 && telefono && String(row[idxTelefono] || '').trim() !== telefono) {
    row[idxTelefono] = telefono;
    changed = true;
  }
  if (idxEmail >= 0 && email && String(row[idxEmail] || '').trim() !== email) {
    row[idxEmail] = email;
    changed = true;
  }
  if (idxFechaRegistro >= 0 && !String(row[idxFechaRegistro] || '').trim()) {
    row[idxFechaRegistro] = fechaRegistro;
    changed = true;
  }
  if (idxFechaActualizacion >= 0 && (changed || !String(row[idxFechaActualizacion] || '').trim())) {
    row[idxFechaActualizacion] = fechaActualizacion;
    changed = true;
  }

  if (!changed) return false;
  withRetry(function() {
    hoja.getRange(targetRow, 1, 1, headers.length).setValues([row]);
    return true;
  }, 'upsertClienteLigero.update');
  return true;
}

function sincronizarClientesDesdeEquipos(ss) {
  const hojaClientes = obtenerHojaClientes(ss);
  const hojaEquipos = ss.getSheetByName('Equipos');
  if (!hojaEquipos) return;

  const datosClientes = withRetry(() => hojaClientes.getDataRange().getValues(), 'sincronizarClientesDesdeEquipos.getClientes');
  const headersClientes = datosClientes && datosClientes.length
    ? datosClientes[0]
    : ['ID', 'NOMBRE', 'TELEFONO', 'EMAIL', 'FECHA_REGISTRO', 'ETIQUETA', 'NOTAS', 'FECHA_ACTUALIZACION'];
  const rowsClientes = (datosClientes && datosClientes.length > 1 ? datosClientes.slice(1) : [])
    .map(row => asegurarLongitudFila(row, headersClientes.length));
  const maps = crearMapsClientes(headersClientes, rowsClientes);

  const datosEquipos = withRetry(() => hojaEquipos.getDataRange().getValues(), 'sincronizarClientesDesdeEquipos.getEquipos');
  if (!datosEquipos || datosEquipos.length < 2) return;

  const headersEquipos = datosEquipos[0];
  let changed = false;
  datosEquipos.slice(1).forEach(row => {
    const item = mapearFila(headersEquipos, row);
    changed = aplicarUpsertCliente(headersClientes, rowsClientes, maps, {
      nombre: item.CLIENTE_NOMBRE || '',
      telefono: item.CLIENTE_TELEFONO || '',
      email: item.CLIENTE_EMAIL || '',
      fechaRegistro: item.FECHA_INGRESO || '',
      fechaActualizacion: item.FECHA_ULTIMA_ACTUALIZACION || item.FECHA_INGRESO || ''
    }, new Date().toISOString()) || changed;
  });

  if (!changed) return;
  if (rowsClientes.length) {
    withRetry(() => hojaClientes.getRange(2, 1, rowsClientes.length, headersClientes.length).setValues(rowsClientes), 'sincronizarClientesDesdeEquipos.setClientes');
  }
}

function normalizarClienteForApi(obj) {
  const out = { ...obj };
  out.ID = String(out.ID || '').trim();
  out.NOMBRE = String(out.NOMBRE || '').trim();
  out.TELEFONO = normalizarTelefono(out.TELEFONO || '');
  out.EMAIL = String(out.EMAIL || '').trim();
  out.FECHA_REGISTRO = formatearFechaYMDOrEmpty(out.FECHA_REGISTRO || '');
  out.ETIQUETA = String(out.ETIQUETA || '').trim().toLowerCase();
  out.NOTAS = String(out.NOTAS || '').trim();
  out.FECHA_ACTUALIZACION = formatearFechaYMDOrEmpty(out.FECHA_ACTUALIZACION || '');
  return out;
}

function obtenerEtiquetaCliente(cliente, estadisticas) {
  const etiquetaActual = String(cliente.ETIQUETA || '').trim().toLowerCase();
  if (etiquetaActual) return etiquetaActual;
  if (estadisticas && estadisticas.moroso) return 'moroso';
  if (estadisticas && estadisticas.totalEquipos >= 5) return 'vip';
  if (estadisticas && estadisticas.totalEquipos >= 2) return 'frecuente';
  return 'nuevo';
}

function construirEstadisticasCliente(ss, cliente) {
  const telefono = normalizarTelefono(cliente.TELEFONO || '');
  const email = String(cliente.EMAIL || '').trim().toLowerCase();
  const nombre = String(cliente.NOMBRE || '').trim().toLowerCase();
  const sucursalGlobal = 'GLOBAL';

  const equipos = obtenerEquiposParaReportes(ss, new Date('2000-01-01'), new Date('2100-01-01'), sucursalGlobal);
  const todosEquipos = equipos.recibidos.concat(equipos.entregados).filter((item, index, arr) => arr.findIndex(x => String(x.FOLIO || '') === String(item.FOLIO || '')) === index);
  const equiposCliente = todosEquipos.filter(item => {
    const tel = normalizarTelefono(item.CLIENTE_TELEFONO || '');
    const nombreEq = String(item.CLIENTE_NOMBRE || '').trim().toLowerCase();
    return (telefono && tel === telefono) || (email && String(item.CLIENTE_EMAIL || '').trim().toLowerCase() === email) || (!telefono && !email && nombreEq === nombre);
  });

  const solicitudes = obtenerSolicitudesParaReportes(ss, new Date('2000-01-01'), new Date('2100-01-01'), sucursalGlobal).cotizaciones;
  const solicitudesCliente = solicitudes.filter(item => {
    const nombreSol = String(item.cliente || '').trim().toLowerCase();
    return nombreSol === nombre;
  });

  const ticketPromedio = equiposCliente.length
    ? equiposCliente.reduce((acc, item) => acc + Number(item.COSTO_ESTIMADO || 0), 0) / equiposCliente.length
    : 0;

  const ultimaVisitaFechas = equiposCliente.map(item => parseFechaFlexible(item.FECHA_INGRESO || item.FECHA_ENTREGA || '')).filter(Boolean);
  const ultimaVisita = ultimaVisitaFechas.length ? new Date(Math.max.apply(null, ultimaVisitaFechas.map(x => x.getTime()))) : null;
  const moroso = solicitudesCliente.some(item => Number(item.total || 0) > 0) && equiposCliente.some(item => String(item.ESTADO || '').trim() !== 'Entregado');

  return {
    totalEquipos: equiposCliente.length,
    totalReparaciones: equiposCliente.filter(item => String(item.ESTADO || '').trim() === 'Entregado').length,
    totalCotizaciones: solicitudesCliente.length,
    ticketPromedio: Number(ticketPromedio.toFixed(2)),
    ultimaVisita: ultimaVisita ? formatearFechaYMD(ultimaVisita) : '',
    moroso: moroso,
    equipos: equiposCliente.sort((a, b) => String(b.FECHA_INGRESO || '').localeCompare(String(a.FECHA_INGRESO || ''))),
    cotizaciones: solicitudesCliente.sort((a, b) => String(b.folio || '').localeCompare(String(a.folio || '')))
  };
}

function listarClientes(input) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    sincronizarClientesDesdeEquipos(ss);
    const hoja = obtenerHojaClientes(ss);
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'listarClientes.getValues');
    const p = parsePaginacion(input || {});
    if (!datos || datos.length < 2) {
      return jsonResponse({ clientes: [], total: 0, page: p.page, pageSize: p.pageSize, hasMore: false, duplicados: [] });
    }
    const headers = datos[0];
    const texto = String(input && input.texto || '').trim().toLowerCase();
    const clientes = datos.slice(1).map(row => normalizarClienteForApi(mapearFila(headers, row))).map(cliente => {
      const estadisticas = construirEstadisticasCliente(ss, cliente);
      return {
        ...cliente,
        ETIQUETA: obtenerEtiquetaCliente(cliente, estadisticas),
        totalEquipos: estadisticas.totalEquipos,
        totalReparaciones: estadisticas.totalReparaciones,
        totalCotizaciones: estadisticas.totalCotizaciones,
        ticketPromedio: estadisticas.ticketPromedio,
        ultimaVisita: estadisticas.ultimaVisita,
        moroso: estadisticas.moroso
      };
    }).filter(cliente => {
      if (!texto) return true;
      return [cliente.NOMBRE, cliente.TELEFONO, cliente.EMAIL]
        .some(v => String(v || '').toLowerCase().indexOf(texto) >= 0);
    }).sort((a, b) => String(a.NOMBRE || '').localeCompare(String(b.NOMBRE || '')));

    const duplicados = clientes.reduce((acc, cliente) => {
      if (!cliente.TELEFONO) return acc;
      acc[cliente.TELEFONO] = (acc[cliente.TELEFONO] || 0) + 1;
      return acc;
    }, {});

    const paginada = paginarArreglo(clientes, p.page, p.pageSize);
    return jsonResponse({
      clientes: paginada.data,
      total: paginada.total,
      page: paginada.page,
      pageSize: paginada.pageSize,
      hasMore: paginada.hasMore,
      duplicados: Object.keys(duplicados).filter(key => duplicados[key] > 1)
    });
  } catch (error) {
    logError('listarClientes', error, input || {});
    return jsonResponse({ error: error.toString() });
  }
}

function getClienteById(id) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaClientes(ss);
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'getClienteById.getValues');
    if (!datos || datos.length < 2) return jsonResponse({ error: 'No encontrado' });
    const headers = datos[0];
    const row = datos.slice(1).find(item => String(item[0] || '').trim() === String(id || '').trim());
    if (!row) return jsonResponse({ error: 'No encontrado' });
    const cliente = normalizarClienteForApi(mapearFila(headers, row));
    const estadisticas = construirEstadisticasCliente(ss, cliente);
    return jsonResponse({
      cliente: {
        ...cliente,
        ETIQUETA: obtenerEtiquetaCliente(cliente, estadisticas)
      },
      historial: estadisticas
    });
  } catch (error) {
    logError('getClienteById', error, { id: id });
    return jsonResponse({ error: error.toString() });
  }
}

function guardarCliente(data) {
  try {
    return withDocumentLock(function() {
      const id = String(data && data.id || '').trim();
      if (!id) throw new Error('id requerido');
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const hoja = obtenerHojaClientes(ss);
      const datos = withRetry(() => hoja.getDataRange().getValues(), 'guardarCliente.getValues');
      const headers = datos[0];
      const idx = datos.findIndex((row, index) => index > 0 && String(row[0] || '').trim() === id);
      if (idx < 1) throw new Error('Cliente no encontrado');
      const row = datos[idx].slice();
      const nombre = String(data && data.nombre || '').trim();
      const telefono = normalizarTelefono(data && data.telefono || '');
      const email = String(data && data.email || '').trim();
      const etiqueta = String(data && data.etiqueta || '').trim().toLowerCase();
      const notas = String(data && data.notas || '').trim();
      if (!nombre) throw new Error('nombre requerido');
      if (!telefono || telefono.length !== 10) throw new Error('telefono inválido');
      if (!validarEmailSimple(email)) throw new Error('email inválido');
      row[headers.indexOf('NOMBRE')] = nombre;
      row[headers.indexOf('TELEFONO')] = telefono;
      row[headers.indexOf('EMAIL')] = email;
      row[headers.indexOf('ETIQUETA')] = etiqueta;
      row[headers.indexOf('NOTAS')] = notas;
      row[headers.indexOf('FECHA_ACTUALIZACION')] = new Date().toISOString();
      withRetry(() => hoja.getRange(idx + 1, 1, 1, row.length).setValues([row]), 'guardarCliente.update');
      return jsonResponse({ success: true, id: id });
    }, 10000);
  } catch (error) {
    logError('guardarCliente', error, data || {});
    return jsonResponse({ error: error.toString() });
  }
}

function mapearFila(headers, row) {
  const out = {};
  headers.forEach((h, i) => {
    out[String(h || '').trim()] = row[i];
  });
  return out;
}

function normalizarTareaForApi(obj) {
  const tarea = { ...obj };
  tarea.ID = Number(tarea.ID || 0);
  tarea.FOLIO_TAREA = String(tarea.FOLIO_TAREA || '').trim();
  tarea.FECHA_CREACION = formatearFechaYMDOrEmpty(tarea.FECHA_CREACION || '');
  tarea.FECHA_LIMITE = formatearFechaYMDOrEmpty(tarea.FECHA_LIMITE || '');
  tarea.FECHA_ACTUALIZACION = formatearFechaYMDOrEmpty(tarea.FECHA_ACTUALIZACION || '');
  tarea.TITULO = String(tarea.TITULO || '').trim();
  tarea.DESCRIPCION = String(tarea.DESCRIPCION || '').trim();
  tarea.ESTADO = String(tarea.ESTADO || 'pendiente').trim();
  tarea.PRIORIDAD = String(tarea.PRIORIDAD || 'media').trim();
  tarea.RESPONSABLE = String(tarea.RESPONSABLE || '').trim();
  tarea.TIPO_RELACION = String(tarea.TIPO_RELACION || 'general').trim();
  tarea.FOLIO_RELACIONADO = String(tarea.FOLIO_RELACIONADO || '').trim().toUpperCase();
  tarea.NOTAS = String(tarea.NOTAS || '').trim();
  try {
    const historial = JSON.parse(String(tarea.HISTORIAL || '[]'));
    tarea.HISTORIAL = Array.isArray(historial) ? historial : [];
  } catch (error) {
    tarea.HISTORIAL = [];
  }
  return tarea;
}

function validarPayloadTarea(data, parcial) {
  const payload = {
    titulo: String(data.titulo || '').trim(),
    descripcion: String(data.descripcion || '').trim(),
    estado: String(data.estado || '').trim().toLowerCase(),
    prioridad: String(data.prioridad || '').trim().toLowerCase(),
    responsable: String(data.responsable || '').trim(),
    fechaLimite: String(data.fechaLimite || '').trim(),
    tipoRelacion: String(data.tipoRelacion || '').trim().toLowerCase(),
    folioRelacionado: String(data.folioRelacionado || '').trim().toUpperCase(),
    notas: String(data.notas || '').trim()
  };

  const estados = ['pendiente', 'en_proceso', 'completada', 'cancelada'];
  const prioridades = ['baja', 'media', 'alta', 'urgente'];
  const tiposRelacion = ['general', 'equipo', 'solicitud'];

  if (!parcial || data.titulo !== undefined) {
    if (!payload.titulo) throw new Error('titulo requerido');
  }
  if ((payload.estado || data.estado !== undefined) && payload.estado && estados.indexOf(payload.estado) === -1) {
    throw new Error('estado inválido');
  }
  if ((payload.prioridad || data.prioridad !== undefined) && payload.prioridad && prioridades.indexOf(payload.prioridad) === -1) {
    throw new Error('prioridad inválida');
  }
  if ((payload.tipoRelacion || data.tipoRelacion !== undefined) && payload.tipoRelacion && tiposRelacion.indexOf(payload.tipoRelacion) === -1) {
    throw new Error('tipoRelacion inválido');
  }
  if (payload.fechaLimite) {
    const fecha = parseFechaFlexible(payload.fechaLimite);
    if (!fecha) throw new Error('fechaLimite inválida, usa yyyy-mm-dd');
    payload.fechaLimite = formatearFechaYMD(fecha);
  }
  if (payload.tipoRelacion === 'general') {
    payload.folioRelacionado = '';
  }

  if (!payload.estado) payload.estado = 'pendiente';
  if (!payload.prioridad) payload.prioridad = 'media';
  if (!payload.tipoRelacion) payload.tipoRelacion = 'general';
  return payload;
}

function crearTarea(data) {
  try {
    return withDocumentLock(function() {
      const payload = validarPayloadTarea(data || {}, false);
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const hoja = obtenerHojaTareas(ss);
      asegurarColumnaSucursal(hoja);
      const folio = obtenerSiguienteFolio(CONFIG.SCRIPT_PROP_KEYS.FOLIO_TAREA_SEQ, 'TAR-');
      const datos = withRetry(() => hoja.getDataRange().getValues(), 'crearTarea.getValues');
      const id = Math.max(0, datos.length - 1) + 1;
      const now = new Date();
      const nowIso = now.toISOString();
      const historial = JSON.stringify([{
        fecha: nowIso,
        evento: 'creada',
        detalle: 'Tarea creada'
      }]);

      withRetry(() => hoja.appendRow([
        id,
        folio,
        nowIso,
        payload.titulo,
        payload.descripcion,
        payload.estado,
        payload.prioridad,
        payload.responsable,
        payload.fechaLimite || '',
        payload.tipoRelacion,
        payload.folioRelacionado,
        payload.notas,
        historial,
        nowIso,
        normalizarSucursalId(data && data.sucursalId)
      ]), 'crearTarea.appendRow');

      return jsonResponse({ success: true, folio: folio, id: id });
    }, 10000);
  } catch (error) {
    logError('crearTarea', error, data || {});
    return jsonResponse({ error: error.toString() });
  }
}

function getTareaByFolio(folio) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaTareas(ss);
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'getTareaByFolio.getValues');
    if (!datos || datos.length < 2) return jsonResponse({ error: 'No encontrado' });
    const headers = datos[0];
    const fila = datos.slice(1).find(row => String(row[1] || '').trim().toUpperCase() === String(folio || '').trim().toUpperCase());
    if (!fila) return jsonResponse({ error: 'No encontrado' });
    return jsonResponse({ tarea: normalizarTareaForApi(mapearFila(headers, fila)) });
  } catch (error) {
    logError('getTareaByFolio', error, { folio: folio });
    return jsonResponse({ error: error.toString() });
  }
}

function actualizarTarea(data) {
  try {
    const folio = String(data && data.folio || '').trim().toUpperCase();
    if (!folio) throw new Error('folio requerido');
    return withDocumentLock(function() {
      const payload = validarPayloadTarea(data || {}, true);
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const hoja = obtenerHojaTareas(ss);
      const datos = withRetry(() => hoja.getDataRange().getValues(), 'actualizarTarea.getValues');
      if (!datos || datos.length < 2) throw new Error('No encontrado');
      const headers = datos[0];
      const filaIndex = datos.findIndex((row, idx) => idx > 0 && String(row[1] || '').trim().toUpperCase() === folio);
      if (filaIndex < 1) throw new Error('No encontrado');
      const row = datos[filaIndex].slice();
      const tareaActual = normalizarTareaForApi(mapearFila(headers, row));
      let historial = tareaActual.HISTORIAL || [];
      const cambios = [];

      const mapping = {
        titulo: 'TITULO',
        descripcion: 'DESCRIPCION',
        estado: 'ESTADO',
        prioridad: 'PRIORIDAD',
        responsable: 'RESPONSABLE',
        fechaLimite: 'FECHA_LIMITE',
        tipoRelacion: 'TIPO_RELACION',
        folioRelacionado: 'FOLIO_RELACIONADO',
        notas: 'NOTAS'
      };

      if (data.tipoRelacion !== undefined && payload.tipoRelacion === 'general' && data.folioRelacionado === undefined) {
        data.folioRelacionado = '';
      }

      Object.keys(mapping).forEach(key => {
        if (data[key] === undefined) return;
        const field = mapping[key];
        const prev = tareaActual[field] || '';
        const next = payload[key] !== undefined ? payload[key] : '';
        if (String(prev) !== String(next)) {
          cambios.push({
            fecha: new Date().toISOString(),
            campo: field,
            anterior: prev,
            nuevo: next
          });
          const col = headers.indexOf(field);
          if (col >= 0) row[col] = next;
        }
      });

      const colHistorial = headers.indexOf('HISTORIAL');
      const colActualizacion = headers.indexOf('FECHA_ACTUALIZACION');
      if (cambios.length) {
        historial = historial.concat(cambios);
        row[colHistorial] = JSON.stringify(historial);
      }
      row[colActualizacion] = new Date().toISOString();
      withRetry(() => hoja.getRange(filaIndex + 1, 1, 1, row.length).setValues([row]), 'actualizarTarea.setValues');
      return jsonResponse({ success: true, folio: folio });
    }, 10000);
  } catch (error) {
    logError('actualizarTarea', error, data || {});
    return jsonResponse({ error: error.toString() });
  }
}

function listarTareas(input) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaTareas(ss);
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'listarTareas.getValues');
    const p = parsePaginacion(input || {});
    if (!datos || datos.length < 2) {
      return jsonResponse({ tareas: [], total: 0, page: p.page, pageSize: p.pageSize, hasMore: false, metricas: { pendientes: 0, urgentes: 0, completadas: 0 } });
    }

    const headers = datos[0];
    const sucursalId = normalizarSucursalId(input && input.sucursalId || 'GLOBAL');
    const texto = String(input && input.texto || '').trim().toLowerCase();
    const estado = String(input && input.estado || '').trim().toLowerCase();
    const prioridad = String(input && input.prioridad || '').trim().toLowerCase();
    const responsable = String(input && input.responsable || '').trim().toLowerCase();
    const tipoRelacion = String(input && input.tipoRelacion || '').trim().toLowerCase();
    const fechaDesde = parseFechaFiltro(input && input.fechaDesde || '');
    const fechaHasta = parseFechaFiltro(input && input.fechaHasta || '');

    const tareas = datos.slice(1).map(row => normalizarTareaForApi(mapearFila(headers, row))).filter(tarea => {
      if (sucursalId !== 'GLOBAL' && normalizarSucursalId(tarea.SUCURSAL_ID) !== sucursalId) return false;
      if (estado && tarea.ESTADO !== estado) return false;
      if (prioridad && tarea.PRIORIDAD !== prioridad) return false;
      if (responsable && String(tarea.RESPONSABLE || '').toLowerCase() !== responsable) return false;
      if (tipoRelacion && tarea.TIPO_RELACION !== tipoRelacion) return false;
      const fechaLimite = parseFechaFlexible(tarea.FECHA_LIMITE);
      if ((fechaDesde || fechaHasta) && !cumpleRango(fechaLimite, fechaDesde, fechaHasta)) return false;
      if (texto) {
        const hayTexto = [
          tarea.FOLIO_TAREA,
          tarea.TITULO,
          tarea.RESPONSABLE,
          tarea.FOLIO_RELACIONADO,
          tarea.DESCRIPCION
        ].some(v => String(v || '').toLowerCase().indexOf(texto) >= 0);
        if (!hayTexto) return false;
      }
      return true;
    }).sort((a, b) => {
      const pa = parseFechaFlexible(a.FECHA_LIMITE || a.FECHA_CREACION || '');
      const pb = parseFechaFlexible(b.FECHA_LIMITE || b.FECHA_CREACION || '');
      return (pb ? pb.getTime() : 0) - (pa ? pa.getTime() : 0);
    });

    const metricas = {
      pendientes: tareas.filter(t => t.ESTADO === 'pendiente' || t.ESTADO === 'en_proceso').length,
      urgentes: tareas.filter(t => t.PRIORIDAD === 'urgente').length,
      completadas: tareas.filter(t => t.ESTADO === 'completada').length
    };

    const responsables = tareas
      .map(t => String(t.RESPONSABLE || '').trim())
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort();

    const paginada = paginarArreglo(tareas, p.page, p.pageSize);
    return jsonResponse({
      tareas: paginada.data,
      total: paginada.total,
      page: paginada.page,
      pageSize: paginada.pageSize,
      hasMore: paginada.hasMore,
      metricas: metricas,
      responsables: responsables
    });
  } catch (error) {
    logError('listarTareas', error, input || {});
    return jsonResponse({ error: error.toString() });
  }
}

function obtenerHojaProductos(ss) {
  return crearHojaSiNoExiste(ss, 'Productos', [
    'ID', 'SKU', 'NOMBRE', 'CATEGORIA', 'MARCA', 'MODELO_COMPATIBLE',
    'PROVEEDOR', 'COSTO', 'PRECIO', 'STOCK_ACTUAL', 'STOCK_MINIMO',
    'UNIDAD', 'UBICACION', 'NOTAS', 'ESTATUS', 'FECHA_CREACION', 'FECHA_ACTUALIZACION'
  ]);
}

function obtenerHojaMovimientosStock(ss) {
  return crearHojaSiNoExiste(ss, 'MovimientosStock', [
    'ID', 'FECHA', 'SKU', 'PRODUCTO', 'TIPO_MOVIMIENTO', 'CANTIDAD',
    'COSTO_UNITARIO', 'FOLIO_EQUIPO', 'REFERENCIA', 'USUARIO', 'NOTAS'
  ]);
}

function normalizarProductoPayload(data, parcial) {
  const payload = {
    sku: String(data.sku || '').trim().toUpperCase(),
    nombre: String(data.nombre || '').trim(),
    categoria: String(data.categoria || '').trim(),
    marca: String(data.marca || '').trim(),
    modeloCompatible: String(data.modeloCompatible || '').trim(),
    proveedor: String(data.proveedor || '').trim(),
    costo: normalizarNumero(data.costo, 0, 0),
    precio: normalizarNumero(data.precio, 0, 0),
    stockActual: normalizarNumero(data.stockActual, 0, 0),
    stockMinimo: normalizarNumero(data.stockMinimo, 0, 0),
    sucursalId: normalizarSucursalId(data.sucursalId),
    unidad: String(data.unidad || '').trim(),
    ubicacion: String(data.ubicacion || '').trim(),
    notas: String(data.notas || '').trim(),
    estatus: String(data.estatus || '').trim().toLowerCase() || 'activo'
  };
  if (!parcial || data.sku !== undefined) {
    if (!payload.sku) throw new Error('sku requerido');
  }
  if (!parcial || data.nombre !== undefined) {
    if (!payload.nombre) throw new Error('nombre requerido');
  }
  if (payload.estatus && ['activo', 'inactivo'].indexOf(payload.estatus) === -1) {
    throw new Error('estatus inválido');
  }
  return payload;
}

function normalizarProductoForApi(obj) {
  const out = { ...obj };
  out.ID = Number(out.ID || 0);
  out.SKU = String(out.SKU || '').trim().toUpperCase();
  out.NOMBRE = String(out.NOMBRE || '').trim();
  out.CATEGORIA = String(out.CATEGORIA || '').trim();
  out.MARCA = String(out.MARCA || '').trim();
  out.MODELO_COMPATIBLE = String(out.MODELO_COMPATIBLE || '').trim();
  out.PROVEEDOR = String(out.PROVEEDOR || '').trim();
  out.COSTO = Number(out.COSTO || 0);
  out.PRECIO = Number(out.PRECIO || 0);
  out.STOCK_ACTUAL = Number(out.STOCK_ACTUAL || 0);
  out.STOCK_MINIMO = Number(out.STOCK_MINIMO || 0);
  out.SUCURSAL_ID = normalizarSucursalId(out.SUCURSAL_ID || 'GLOBAL');
  out.UNIDAD = String(out.UNIDAD || '').trim();
  out.UBICACION = String(out.UBICACION || '').trim();
  out.NOTAS = String(out.NOTAS || '').trim();
  out.ESTATUS = String(out.ESTATUS || 'activo').trim().toLowerCase();
  out.FECHA_CREACION = formatearFechaYMDOrEmpty(out.FECHA_CREACION || '');
  out.FECHA_ACTUALIZACION = formatearFechaYMDOrEmpty(out.FECHA_ACTUALIZACION || '');
  out.ALERTA_NIVEL = clasificarNivelAlertaStock(out);
  out.ALERTA_STOCK = !!out.ALERTA_NIVEL;
  return out;
}

function clasificarNivelAlertaStock(producto) {
  if (!producto) return '';
  const estatus = String(producto.ESTATUS || 'activo').trim().toLowerCase();
  const stockActual = Number(producto.STOCK_ACTUAL || 0);
  const stockMinimo = Number(producto.STOCK_MINIMO || 0);
  if (estatus !== 'activo' || stockMinimo <= 0 || stockActual > stockMinimo) return '';
  if (stockActual <= 0) return 'agotado';
  if (stockActual <= (stockMinimo * 0.5)) return 'critico';
  return 'bajo';
}

function obtenerIndiceProductoPorSku(datos, sku) {
  return datos.findIndex((row, idx) => idx > 0 && String(row[1] || '').trim().toUpperCase() === String(sku || '').trim().toUpperCase());
}

function guardarProducto(data) {
  try {
    return withDocumentLock(function() {
      const payload = normalizarProductoPayload(data || {}, !!(data && data.skuOriginal));
      const skuOriginal = String(data && data.skuOriginal || payload.sku).trim().toUpperCase();
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      asegurarEstructuraMultisucursal(ss);
      const hoja = obtenerHojaProductos(ss);
      const datos = withRetry(() => hoja.getDataRange().getValues(), 'guardarProducto.getValues');
      const headers = datos[0];
      const now = new Date().toISOString();
      const idx = obtenerIndiceProductoPorSku(datos, skuOriginal);
      const idxSkuDuplicado = payload.sku !== skuOriginal ? obtenerIndiceProductoPorSku(datos, payload.sku) : -1;
      if (idxSkuDuplicado > 0) throw new Error('Ya existe un producto con ese SKU');

      if (idx > 0) {
        const row = datos[idx].slice();
        const mapping = {
          SKU: payload.sku,
          NOMBRE: payload.nombre,
          CATEGORIA: payload.categoria,
          MARCA: payload.marca,
          MODELO_COMPATIBLE: payload.modeloCompatible,
          PROVEEDOR: payload.proveedor,
          COSTO: payload.costo,
          PRECIO: payload.precio,
          STOCK_MINIMO: payload.stockMinimo,
          UNIDAD: payload.unidad,
          UBICACION: payload.ubicacion,
          NOTAS: payload.notas,
          ESTATUS: payload.estatus,
          FECHA_ACTUALIZACION: now
        };
        Object.keys(mapping).forEach(key => {
          const col = headers.indexOf(key);
          if (col >= 0) row[col] = mapping[key];
        });
        actualizarInventarioSucursal(ss, payload.sku, payload.sucursalId, payload.stockActual, payload.stockMinimo);
        row[headers.indexOf('STOCK_ACTUAL')] = recalcularStockGlobalProducto(ss, payload.sku);
        withRetry(() => hoja.getRange(idx + 1, 1, 1, row.length).setValues([row]), 'guardarProducto.update');
        return jsonResponse({ success: true, sku: payload.sku, actualizado: true });
      }

      const id = Math.max(0, datos.length - 1) + 1;
      withRetry(() => hoja.appendRow([
        id,
        payload.sku,
        payload.nombre,
        payload.categoria,
        payload.marca,
        payload.modeloCompatible,
        payload.proveedor,
        payload.costo,
        payload.precio,
        0,
        payload.stockMinimo,
        payload.unidad,
        payload.ubicacion,
        payload.notas,
        payload.estatus,
        now,
        now
      ]), 'guardarProducto.append');
      actualizarInventarioSucursal(ss, payload.sku, payload.sucursalId, payload.stockActual, payload.stockMinimo);
      recalcularStockGlobalProducto(ss, payload.sku);
      return jsonResponse({ success: true, sku: payload.sku, actualizado: false });
    }, 10000);
  } catch (error) {
    logError('guardarProducto', error, data || {});
    return jsonResponse({ error: error.toString() });
  }
}

function eliminarProducto(data) {
  try {
    const sku = String(data && data.sku || '').trim().toUpperCase();
    if (!sku) throw new Error('sku requerido');
    return withDocumentLock(function() {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const hoja = obtenerHojaProductos(ss);
      const datos = withRetry(() => hoja.getDataRange().getValues(), 'eliminarProducto.getValues');
      const headers = datos[0];
      const idx = obtenerIndiceProductoPorSku(datos, sku);
      if (idx < 1) throw new Error('Producto no encontrado');
      const row = datos[idx].slice();
      const colEstatus = headers.indexOf('ESTATUS');
      const colActualizacion = headers.indexOf('FECHA_ACTUALIZACION');
      row[colEstatus] = 'inactivo';
      row[colActualizacion] = new Date().toISOString();
      withRetry(() => hoja.getRange(idx + 1, 1, 1, row.length).setValues([row]), 'eliminarProducto.update');
      return jsonResponse({ success: true, sku: sku });
    }, 10000);
  } catch (error) {
    logError('eliminarProducto', error, data || {});
    return jsonResponse({ error: error.toString() });
  }
}

function listarProductos(input) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    asegurarEstructuraMultisucursal(ss);
    const hoja = obtenerHojaProductos(ss);
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'listarProductos.getValues');
    const p = parsePaginacion(input || {});
    if (!datos || datos.length < 2) {
      return jsonResponse({ productos: [], total: 0, page: p.page, pageSize: p.pageSize, hasMore: false, filtros: { categorias: [], marcas: [] } });
    }
    const headers = datos[0];
    const texto = String(input && input.texto || '').trim().toLowerCase();
    const categoria = String(input && input.categoria || '').trim().toLowerCase();
    const marca = String(input && input.marca || '').trim().toLowerCase();
    const proveedor = String(input && input.proveedor || '').trim().toLowerCase();
    const sucursalId = normalizarSucursalId(input && input.sucursalId || 'GLOBAL');
    const estatus = String(input && input.estatus || '').trim().toLowerCase();
    const soloAlertas = String(input && input.soloAlertas || '').trim().toLowerCase();
    const nivelAlerta = String(input && input.nivelAlerta || '').trim().toLowerCase();
    const productos = datos.slice(1).map(row => {
      const producto = normalizarProductoForApi(mapearFila(headers, row));
      producto.SUCURSAL_ID = sucursalId;
      producto.STOCK_ACTUAL = obtenerStockProductoEnSucursal(ss, producto.SKU, sucursalId);
      producto.STOCK_MINIMO = obtenerStockMinimoProductoEnSucursal(ss, producto.SKU, sucursalId, producto.STOCK_MINIMO);
      producto.ALERTA_NIVEL = clasificarNivelAlertaStock(producto);
      producto.ALERTA_STOCK = !!producto.ALERTA_NIVEL;
      return producto;
    }).filter(pdto => {
      if (categoria && String(pdto.CATEGORIA || '').toLowerCase() !== categoria) return false;
      if (marca && String(pdto.MARCA || '').toLowerCase() !== marca) return false;
      if (proveedor && String(pdto.PROVEEDOR || '').toLowerCase() !== proveedor) return false;
      if (estatus && String(pdto.ESTATUS || '').toLowerCase() !== estatus) return false;
      if (soloAlertas === '1' && !pdto.ALERTA_STOCK) return false;
      if (nivelAlerta && String(pdto.ALERTA_NIVEL || '').toLowerCase() !== nivelAlerta) return false;
      if (texto) {
        const hay = [pdto.SKU, pdto.NOMBRE, pdto.MARCA, pdto.CATEGORIA, pdto.PROVEEDOR, pdto.MODELO_COMPATIBLE]
          .some(v => String(v || '').toLowerCase().indexOf(texto) >= 0);
        if (!hay) return false;
      }
      return true;
    }).sort((a, b) => {
      if (a.ALERTA_STOCK !== b.ALERTA_STOCK) return a.ALERTA_STOCK ? -1 : 1;
      return String(a.NOMBRE || '').localeCompare(String(b.NOMBRE || ''));
    });
    const categorias = productos.map(x => x.CATEGORIA).filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).sort();
    const marcas = productos.map(x => x.MARCA).filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).sort();
    const proveedores = productos.map(x => x.PROVEEDOR).filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).sort();
    const paginada = paginarArreglo(productos, p.page, p.pageSize);
    return jsonResponse({
      productos: paginada.data,
      total: paginada.total,
      page: paginada.page,
      pageSize: paginada.pageSize,
      hasMore: paginada.hasMore,
      filtros: { categorias: categorias, marcas: marcas, proveedores: proveedores }
    });
  } catch (error) {
    logError('listarProductos', error, input || {});
    return jsonResponse({ error: error.toString() });
  }
}

function registrarMovimientoStock(data) {
  try {
    return withDocumentLock(function() {
      const tipo = String(data && data.tipoMovimiento || '').trim().toLowerCase();
      if (['entrada', 'salida', 'ajuste', 'consumo', 'transferencia_salida', 'transferencia_entrada'].indexOf(tipo) === -1) throw new Error('tipoMovimiento inválido');
      const sku = String(data && data.sku || '').trim().toUpperCase();
      if (!sku) throw new Error('sku requerido');
      const cantidad = normalizarNumero(data && data.cantidad, NaN, 0);
      if (!isFinite(cantidad) || cantidad <= 0) throw new Error('cantidad inválida');
      const sucursalId = normalizarSucursalId(data && data.sucursalId || '');
      const costoUnitario = normalizarNumero(data && data.costoUnitario, 0, 0);
      const folioEquipo = String(data && data.folioEquipo || '').trim().toUpperCase();
      const referencia = String(data && data.referencia || '').trim();
      const usuario = String(data && data.usuario || '').trim();
      const notas = String(data && data.notas || '').trim();

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      asegurarEstructuraMultisucursal(ss);
      const hojaProd = obtenerHojaProductos(ss);
      const hojaMov = obtenerHojaMovimientosStock(ss);
      asegurarColumnaSucursal(hojaMov);
      const datosProd = withRetry(() => hojaProd.getDataRange().getValues(), 'registrarMovimientoStock.getProductos');
      const headers = datosProd[0];
      const idx = obtenerIndiceProductoPorSku(datosProd, sku);
      if (idx < 1) throw new Error('Producto no encontrado');
      const row = datosProd[idx].slice();
      const colStock = headers.indexOf('STOCK_ACTUAL');
      const colActualizacion = headers.indexOf('FECHA_ACTUALIZACION');
      const colNombre = headers.indexOf('NOMBRE');
      let stockActual = obtenerStockProductoEnSucursal(ss, sku, sucursalId);
      if (!isFinite(stockActual)) stockActual = 0;

      if (tipo === 'entrada' || tipo === 'transferencia_entrada') stockActual += cantidad;
      else if (tipo === 'salida' || tipo === 'consumo' || tipo === 'transferencia_salida') stockActual -= cantidad;
      else if (tipo === 'ajuste') stockActual = cantidad;
      if (stockActual < 0) throw new Error('La operación dejaría stock negativo');

      actualizarInventarioSucursal(ss, sku, sucursalId, stockActual, Number(row[headers.indexOf('STOCK_MINIMO')] || 0));
      row[colStock] = recalcularStockGlobalProducto(ss, sku);
      row[colActualizacion] = new Date().toISOString();
      withRetry(() => hojaProd.getRange(idx + 1, 1, 1, row.length).setValues([row]), 'registrarMovimientoStock.updateProducto');

      const idMovimiento = obtenerSiguienteFolio(CONFIG.SCRIPT_PROP_KEYS.MOVIMIENTO_STOCK_SEQ, 'MOV-');
      withRetry(() => hojaMov.appendRow([
        idMovimiento,
        new Date().toISOString(),
        sku,
        row[colNombre],
        tipo,
        cantidad,
        costoUnitario,
        folioEquipo,
        referencia,
        usuario,
        notas,
        sucursalId
      ]), 'registrarMovimientoStock.appendMovimiento');

      return jsonResponse({ success: true, movimiento: idMovimiento, stockActual: stockActual, sucursalId: sucursalId });
    }, 10000);
  } catch (error) {
    logError('registrarMovimientoStock', error, data || {});
    return jsonResponse({ error: error.toString() });
  }
}

function listarMovimientosProducto(input) {
  try {
    const sku = String(input && input.sku || '').trim().toUpperCase();
    if (!sku) throw new Error('sku requerido');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaMovimientosStock(ss);
    asegurarColumnaSucursal(hoja);
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'listarMovimientosProducto.getValues');
    const p = parsePaginacion(input || {});
    const sucursalId = normalizarSucursalId(input && input.sucursalId || 'GLOBAL');
    if (!datos || datos.length < 2) {
      return jsonResponse({ movimientos: [], total: 0, page: p.page, pageSize: p.pageSize, hasMore: false });
    }
    const headers = datos[0];
    const movimientos = datos.slice(1)
      .map(row => mapearFila(headers, row))
      .filter(m => String(m.SKU || '').trim().toUpperCase() === sku)
      .filter(m => sucursalId === 'GLOBAL' ? true : normalizarSucursalId(m.SUCURSAL_ID) === sucursalId)
      .sort((a, b) => {
        const fa = parseFechaFlexible(a.FECHA || '');
        const fb = parseFechaFlexible(b.FECHA || '');
        return (fb ? fb.getTime() : 0) - (fa ? fa.getTime() : 0);
      });
    const paginada = paginarArreglo(movimientos, p.page, p.pageSize);
    return jsonResponse({
      movimientos: paginada.data,
      total: paginada.total,
      page: paginada.page,
      pageSize: paginada.pageSize,
      hasMore: paginada.hasMore
    });
  } catch (error) {
    logError('listarMovimientosProducto', error, input || {});
    return jsonResponse({ error: error.toString() });
  }
}

function obtenerAlertasStock(input) {
  try {
    const payload = { ...(input || {}), soloAlertas: '1' };
    return listarProductos(payload);
  } catch (error) {
    logError('obtenerAlertasStock', error, input || {});
    return jsonResponse({ error: error.toString() });
  }
}

function listarFoliosRelacion() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const out = [];
    const hojaEquipos = ss.getSheetByName('Equipos');
    if (hojaEquipos) {
      const datos = withRetry(() => hojaEquipos.getDataRange().getValues(), 'listarFoliosRelacion.equipos');
      datos.slice(1).forEach(row => {
        const folio = String(row[1] || '').trim().toUpperCase();
        if (folio) out.push({ folio: folio, tipo: 'equipo' });
      });
    }
    const hojaSolicitudes = ss.getSheetByName('Solicitudes');
    if (hojaSolicitudes) {
      const datos = withRetry(() => hojaSolicitudes.getDataRange().getValues(), 'listarFoliosRelacion.solicitudes');
      datos.slice(1).forEach(row => {
        const folio = String(row[1] || '').trim().toUpperCase();
        if (folio) out.push({ folio: folio, tipo: 'solicitud' });
      });
    }
    const unicos = out.filter((item, idx, arr) => arr.findIndex(x => x.folio === item.folio) === idx)
      .sort((a, b) => String(a.folio).localeCompare(String(b.folio)));
    return jsonResponse({ folios: unicos });
  } catch (error) {
    logError('listarFoliosRelacion', error);
    return jsonResponse({ error: error.toString() });
  }
}

function obtenerHojaProveedores(ss) {
  return crearHojaSiNoExiste(ss, 'Proveedores', [
    'ID', 'NOMBRE_COMERCIAL', 'RAZON_SOCIAL', 'CONTACTO', 'TELEFONO',
    'WHATSAPP', 'EMAIL', 'DIRECCION', 'CIUDAD_ESTADO', 'CATEGORIAS',
    'TIEMPO_ENTREGA', 'CONDICIONES_PAGO', 'CALIFICACION_PRECIO', 'CALIFICACION_RAPIDEZ',
    'CALIFICACION_CALIDAD', 'CALIFICACION_CONFIABILIDAD', 'NOTAS', 'ESTATUS',
    'FECHA_CREACION', 'FECHA_ACTUALIZACION'
  ]);
}

function normalizarProveedorPayload(data, parcial) {
  const payload = {
    nombreComercial: String(data.nombreComercial || '').trim(),
    razonSocial: String(data.razonSocial || '').trim(),
    contacto: String(data.contacto || '').trim(),
    telefono: normalizarTelefono(data.telefono || ''),
    whatsapp: normalizarTelefono(data.whatsapp || ''),
    email: String(data.email || '').trim(),
    direccion: String(data.direccion || '').trim(),
    ciudadEstado: String(data.ciudadEstado || '').trim(),
    categorias: String(data.categorias || '').trim(),
    tiempoEntrega: String(data.tiempoEntrega || '').trim(),
    condicionesPago: String(data.condicionesPago || '').trim(),
    calificacionPrecio: Math.floor(normalizarNumero(data.calificacionPrecio, 0, 0, 5)),
    calificacionRapidez: Math.floor(normalizarNumero(data.calificacionRapidez, 0, 0, 5)),
    calificacionCalidad: Math.floor(normalizarNumero(data.calificacionCalidad, 0, 0, 5)),
    calificacionConfiabilidad: Math.floor(normalizarNumero(data.calificacionConfiabilidad, 0, 0, 5)),
    notas: String(data.notas || '').trim(),
    estatus: String(data.estatus || '').trim().toLowerCase() || 'activo'
  };
  if (!parcial || data.nombreComercial !== undefined) {
    if (!payload.nombreComercial) throw new Error('nombreComercial requerido');
  }
  if (payload.email && !validarEmailSimple(payload.email)) {
    throw new Error('email inválido');
  }
  if (payload.estatus && ['activo', 'inactivo'].indexOf(payload.estatus) === -1) {
    throw new Error('estatus inválido');
  }
  return payload;
}

function normalizarProveedorForApi(obj) {
  const out = { ...obj };
  out.ID = Number(out.ID || 0);
  out.NOMBRE_COMERCIAL = String(out.NOMBRE_COMERCIAL || '').trim();
  out.RAZON_SOCIAL = String(out.RAZON_SOCIAL || '').trim();
  out.CONTACTO = String(out.CONTACTO || '').trim();
  out.TELEFONO = String(out.TELEFONO || '').trim();
  out.WHATSAPP = String(out.WHATSAPP || '').trim();
  out.EMAIL = String(out.EMAIL || '').trim();
  out.DIRECCION = String(out.DIRECCION || '').trim();
  out.CIUDAD_ESTADO = String(out.CIUDAD_ESTADO || '').trim();
  out.CATEGORIAS = String(out.CATEGORIAS || '').trim();
  out.TIEMPO_ENTREGA = String(out.TIEMPO_ENTREGA || '').trim();
  out.CONDICIONES_PAGO = String(out.CONDICIONES_PAGO || '').trim();
  out.CALIFICACION_PRECIO = Number(out.CALIFICACION_PRECIO || 0);
  out.CALIFICACION_RAPIDEZ = Number(out.CALIFICACION_RAPIDEZ || 0);
  out.CALIFICACION_CALIDAD = Number(out.CALIFICACION_CALIDAD || 0);
  out.CALIFICACION_CONFIABILIDAD = Number(out.CALIFICACION_CONFIABILIDAD || 0);
  out.NOTAS = String(out.NOTAS || '').trim();
  out.ESTATUS = String(out.ESTATUS || 'activo').trim().toLowerCase();
  out.FECHA_CREACION = formatearFechaYMDOrEmpty(out.FECHA_CREACION || '');
  out.FECHA_ACTUALIZACION = formatearFechaYMDOrEmpty(out.FECHA_ACTUALIZACION || '');
  out.CALIFICACION_PROMEDIO = Number(((out.CALIFICACION_PRECIO + out.CALIFICACION_RAPIDEZ + out.CALIFICACION_CALIDAD + out.CALIFICACION_CONFIABILIDAD) / 4).toFixed(2));
  return out;
}

function getProveedorIndexById(datos, id) {
  const idNum = Number(id || 0);
  return datos.findIndex((row, idx) => idx > 0 && Number(row[0] || 0) === idNum);
}

function guardarProveedor(data) {
  try {
    return withDocumentLock(function() {
      const id = Number(data && data.id || 0);
      const payload = normalizarProveedorPayload(data || {}, !!id);
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const hoja = obtenerHojaProveedores(ss);
      const datos = withRetry(() => hoja.getDataRange().getValues(), 'guardarProveedor.getValues');
      const headers = datos[0];
      const now = new Date().toISOString();

      if (id) {
        const idx = getProveedorIndexById(datos, id);
        if (idx < 1) throw new Error('Proveedor no encontrado');
        const row = datos[idx].slice();
        const mapping = {
          NOMBRE_COMERCIAL: payload.nombreComercial,
          RAZON_SOCIAL: payload.razonSocial,
          CONTACTO: payload.contacto,
          TELEFONO: payload.telefono,
          WHATSAPP: payload.whatsapp,
          EMAIL: payload.email,
          DIRECCION: payload.direccion,
          CIUDAD_ESTADO: payload.ciudadEstado,
          CATEGORIAS: payload.categorias,
          TIEMPO_ENTREGA: payload.tiempoEntrega,
          CONDICIONES_PAGO: payload.condicionesPago,
          CALIFICACION_PRECIO: payload.calificacionPrecio,
          CALIFICACION_RAPIDEZ: payload.calificacionRapidez,
          CALIFICACION_CALIDAD: payload.calificacionCalidad,
          CALIFICACION_CONFIABILIDAD: payload.calificacionConfiabilidad,
          NOTAS: payload.notas,
          ESTATUS: payload.estatus,
          FECHA_ACTUALIZACION: now
        };
        Object.keys(mapping).forEach(key => {
          const col = headers.indexOf(key);
          if (col >= 0) row[col] = mapping[key];
        });
        withRetry(() => hoja.getRange(idx + 1, 1, 1, row.length).setValues([row]), 'guardarProveedor.update');
        return jsonResponse({ success: true, id: id, actualizado: true });
      }

      const nextId = Math.max(0, datos.length - 1) + 1;
      withRetry(() => hoja.appendRow([
        nextId,
        payload.nombreComercial,
        payload.razonSocial,
        payload.contacto,
        payload.telefono,
        payload.whatsapp,
        payload.email,
        payload.direccion,
        payload.ciudadEstado,
        payload.categorias,
        payload.tiempoEntrega,
        payload.condicionesPago,
        payload.calificacionPrecio,
        payload.calificacionRapidez,
        payload.calificacionCalidad,
        payload.calificacionConfiabilidad,
        payload.notas,
        payload.estatus,
        now,
        now
      ]), 'guardarProveedor.append');
      return jsonResponse({ success: true, id: nextId, actualizado: false });
    }, 10000);
  } catch (error) {
    logError('guardarProveedor', error, data || {});
    return jsonResponse({ error: error.toString() });
  }
}

function eliminarProveedor(data) {
  try {
    const id = Number(data && data.id || 0);
    if (!id) throw new Error('id requerido');
    return withDocumentLock(function() {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const hoja = obtenerHojaProveedores(ss);
      const datos = withRetry(() => hoja.getDataRange().getValues(), 'eliminarProveedor.getValues');
      const headers = datos[0];
      const idx = getProveedorIndexById(datos, id);
      if (idx < 1) throw new Error('Proveedor no encontrado');
      const row = datos[idx].slice();
      row[headers.indexOf('ESTATUS')] = 'inactivo';
      row[headers.indexOf('FECHA_ACTUALIZACION')] = new Date().toISOString();
      withRetry(() => hoja.getRange(idx + 1, 1, 1, row.length).setValues([row]), 'eliminarProveedor.update');
      return jsonResponse({ success: true, id: id });
    }, 10000);
  } catch (error) {
    logError('eliminarProveedor', error, data || {});
    return jsonResponse({ error: error.toString() });
  }
}

function listarProveedores(input) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaProveedores(ss);
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'listarProveedores.getValues');
    const p = parsePaginacion(input || {});
    if (!datos || datos.length < 2) {
      return jsonResponse({ proveedores: [], total: 0, page: p.page, pageSize: p.pageSize, hasMore: false, filtros: { categorias: [] } });
    }
    const headers = datos[0];
    const texto = String(input && input.texto || '').trim().toLowerCase();
    const estatus = String(input && input.estatus || '').trim().toLowerCase();
    const categoria = String(input && input.categoria || '').trim().toLowerCase();
    const proveedores = datos.slice(1).map(row => normalizarProveedorForApi(mapearFila(headers, row))).filter(prov => {
      if (estatus && prov.ESTATUS !== estatus) return false;
      if (categoria) {
        const cats = String(prov.CATEGORIAS || '').toLowerCase();
        if (cats.indexOf(categoria) === -1) return false;
      }
      if (texto) {
        const hay = [prov.NOMBRE_COMERCIAL, prov.CONTACTO, prov.EMAIL, prov.TELEFONO, prov.WHATSAPP, prov.CIUDAD_ESTADO]
          .some(v => String(v || '').toLowerCase().indexOf(texto) >= 0);
        if (!hay) return false;
      }
      return true;
    }).sort((a, b) => String(a.NOMBRE_COMERCIAL || '').localeCompare(String(b.NOMBRE_COMERCIAL || '')));

    const categorias = proveedores
      .flatMap(prov => String(prov.CATEGORIAS || '').split(',').map(v => String(v || '').trim()).filter(Boolean))
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort();

    const paginada = paginarArreglo(proveedores, p.page, p.pageSize);
    return jsonResponse({
      proveedores: paginada.data,
      total: paginada.total,
      page: paginada.page,
      pageSize: paginada.pageSize,
      hasMore: paginada.hasMore,
      filtros: { categorias: categorias }
    });
  } catch (error) {
    logError('listarProveedores', error, input || {});
    return jsonResponse({ error: error.toString() });
  }
}

function getProveedorById(id) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaProveedores(ss);
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'getProveedorById.getValues');
    if (!datos || datos.length < 2) return jsonResponse({ error: 'No encontrado' });
    const headers = datos[0];
    const idx = getProveedorIndexById(datos, id);
    if (idx < 1) return jsonResponse({ error: 'No encontrado' });
    return jsonResponse({ proveedor: normalizarProveedorForApi(mapearFila(headers, datos[idx])) });
  } catch (error) {
    logError('getProveedorById', error, { id: id });
    return jsonResponse({ error: error.toString() });
  }
}

function listarNombresProveedores() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaProveedores(ss);
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'listarNombresProveedores.getValues');
    if (!datos || datos.length < 2) return jsonResponse({ proveedores: [] });
    const headers = datos[0];
    const proveedores = datos.slice(1)
      .map(row => normalizarProveedorForApi(mapearFila(headers, row)))
      .filter(prov => prov.ESTATUS === 'activo')
      .map(prov => ({
        id: prov.ID,
        nombre: prov.NOMBRE_COMERCIAL,
        categorias: prov.CATEGORIAS,
        telefono: prov.TELEFONO,
        whatsapp: prov.WHATSAPP
      }))
      .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')));
    return jsonResponse({ proveedores: proveedores });
  } catch (error) {
    logError('listarNombresProveedores', error);
    return jsonResponse({ error: error.toString() });
  }
}

function listarSucursales(input) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaSucursales(ss);
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'listarSucursales.getValues');
    const p = parsePaginacion(input || {});
    if (!datos || datos.length < 2) {
      return jsonResponse({ sucursales: [], total: 0, page: p.page, pageSize: p.pageSize, hasMore: false });
    }
    const headers = datos[0];
    const texto = String(input && input.texto || '').trim().toLowerCase();
    const soloActivas = String(input && input.soloActivas || '').trim() === '1';
    const sucursales = datos.slice(1).map(row => mapearFila(headers, row)).map(item => ({
      ID: normalizarSucursalId(item.ID),
      NOMBRE: String(item.NOMBRE || '').trim(),
      DIRECCION: String(item.DIRECCION || '').trim(),
      TELEFONO: String(item.TELEFONO || '').trim(),
      EMAIL: String(item.EMAIL || '').trim(),
      ESTATUS: String(item.ESTATUS || 'activo').trim().toLowerCase(),
      ES_MATRIZ: String(item.ES_MATRIZ || 'no').trim().toLowerCase() === 'si',
      FECHA_CREACION: formatearFechaYMDOrEmpty(item.FECHA_CREACION || ''),
      FECHA_ACTUALIZACION: formatearFechaYMDOrEmpty(item.FECHA_ACTUALIZACION || '')
    })).filter(item => {
      if (soloActivas && item.ESTATUS !== 'activo') return false;
      if (texto) {
        return [item.ID, item.NOMBRE, item.DIRECCION, item.TELEFONO, item.EMAIL]
          .some(v => String(v || '').toLowerCase().indexOf(texto) >= 0);
      }
      return true;
    }).sort((a, b) => {
      if (a.ES_MATRIZ !== b.ES_MATRIZ) return a.ES_MATRIZ ? -1 : 1;
      return String(a.NOMBRE || '').localeCompare(String(b.NOMBRE || ''));
    });

    const paginada = paginarArreglo(sucursales, p.page, p.pageSize);
    return jsonResponse({
      sucursales: paginada.data,
      total: paginada.total,
      page: paginada.page,
      pageSize: paginada.pageSize,
      hasMore: paginada.hasMore
    });
  } catch (error) {
    logError('listarSucursales', error, input || {});
    return jsonResponse({ error: error.toString() });
  }
}

function guardarSucursal(data) {
  try {
    return withDocumentLock(function() {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const hoja = obtenerHojaSucursales(ss);
      const datos = withRetry(() => hoja.getDataRange().getValues(), 'guardarSucursal.getValues');
      const headers = datos[0];
      const id = normalizarSucursalId(data && data.id || '');
      const payload = {
        nombre: String(data && data.nombre || '').trim(),
        direccion: String(data && data.direccion || '').trim(),
        telefono: String(data && data.telefono || '').trim(),
        email: String(data && data.email || '').trim(),
        estatus: String(data && data.estatus || 'activo').trim().toLowerCase() || 'activo'
      };
      if (!payload.nombre) throw new Error('nombre requerido');
      if (['activo', 'inactivo'].indexOf(payload.estatus) === -1) throw new Error('estatus inválido');
      const now = new Date().toISOString();

      if (id && id !== 'MATRIZ') {
        const idx = datos.findIndex((row, index) => index > 0 && normalizarSucursalId(row[0]) === id);
        if (idx < 1) throw new Error('Sucursal no encontrada');
        const row = datos[idx].slice();
        row[headers.indexOf('NOMBRE')] = payload.nombre;
        row[headers.indexOf('DIRECCION')] = payload.direccion;
        row[headers.indexOf('TELEFONO')] = payload.telefono;
        row[headers.indexOf('EMAIL')] = payload.email;
        row[headers.indexOf('ESTATUS')] = payload.estatus;
        row[headers.indexOf('FECHA_ACTUALIZACION')] = now;
        withRetry(() => hoja.getRange(idx + 1, 1, 1, row.length).setValues([row]), 'guardarSucursal.update');
        return jsonResponse({ success: true, id: id, actualizado: true });
      }

      if (id === 'MATRIZ') {
        const idx = datos.findIndex((row, index) => index > 0 && normalizarSucursalId(row[0]) === 'MATRIZ');
        const row = datos[idx].slice();
        row[headers.indexOf('NOMBRE')] = payload.nombre;
        row[headers.indexOf('DIRECCION')] = payload.direccion;
        row[headers.indexOf('TELEFONO')] = payload.telefono;
        row[headers.indexOf('EMAIL')] = payload.email;
        row[headers.indexOf('ESTATUS')] = 'activo';
        row[headers.indexOf('FECHA_ACTUALIZACION')] = now;
        withRetry(() => hoja.getRange(idx + 1, 1, 1, row.length).setValues([row]), 'guardarSucursal.updateMatriz');
        return jsonResponse({ success: true, id: 'MATRIZ', actualizado: true });
      }

      const nextId = obtenerSiguienteFolio(CONFIG.SCRIPT_PROP_KEYS.FOLIO_SUCURSAL_SEQ, 'SUC-');
      withRetry(() => hoja.appendRow([
        nextId,
        payload.nombre,
        payload.direccion,
        payload.telefono,
        payload.email,
        payload.estatus,
        'no',
        now,
        now
      ]), 'guardarSucursal.append');
      return jsonResponse({ success: true, id: nextId, actualizado: false });
    }, 10000);
  } catch (error) {
    logError('guardarSucursal', error, data || {});
    return jsonResponse({ error: error.toString() });
  }
}

function transferirStock(data) {
  try {
    return withDocumentLock(function() {
      const sku = String(data && data.sku || '').trim().toUpperCase();
      const cantidad = normalizarNumero(data && data.cantidad, NaN, 0);
      const sucursalOrigen = normalizarSucursalId(data && data.sucursalOrigen || '');
      const sucursalDestino = normalizarSucursalId(data && data.sucursalDestino || '');
      const motivo = String(data && data.motivo || '').trim();
      const usuario = String(data && data.usuario || '').trim();
      const notas = String(data && data.notas || '').trim();
      if (!sku) throw new Error('sku requerido');
      if (!isFinite(cantidad) || cantidad <= 0) throw new Error('cantidad inválida');
      if (sucursalOrigen === sucursalDestino) throw new Error('La sucursal destino debe ser distinta');

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const hojaProductos = obtenerHojaProductos(ss);
      const datosProductos = withRetry(() => hojaProductos.getDataRange().getValues(), 'transferirStock.productos');
      const idxProducto = obtenerIndiceProductoPorSku(datosProductos, sku);
      if (idxProducto < 1) throw new Error('Producto no encontrado');
      const nombre = String(datosProductos[idxProducto][2] || '').trim();
      const disponible = obtenerStockProductoEnSucursal(ss, sku, sucursalOrigen);
      if (disponible < cantidad) throw new Error('Stock insuficiente en sucursal origen');

      registrarMovimientoStock({
        sku: sku,
        tipoMovimiento: 'transferencia_salida',
        cantidad: cantidad,
        referencia: `Transferencia a ${sucursalDestino}`,
        usuario: usuario,
        notas: motivo || notas,
        sucursalId: sucursalOrigen
      });

      registrarMovimientoStock({
        sku: sku,
        tipoMovimiento: 'transferencia_entrada',
        cantidad: cantidad,
        referencia: `Transferencia desde ${sucursalOrigen}`,
        usuario: usuario,
        notas: motivo || notas,
        sucursalId: sucursalDestino
      });

      const hoja = obtenerHojaTransferenciasStock(ss);
      const folio = obtenerSiguienteFolio(CONFIG.SCRIPT_PROP_KEYS.FOLIO_TRANSFERENCIA_SEQ, 'TRS-');
      withRetry(() => hoja.appendRow([
        folio,
        new Date().toISOString(),
        sku,
        nombre,
        cantidad,
        sucursalOrigen,
        sucursalDestino,
        motivo,
        usuario,
        'completada',
        notas
      ]), 'transferirStock.append');

      return jsonResponse({ success: true, folio: folio });
    }, 12000);
  } catch (error) {
    logError('transferirStock', error, data || {});
    return jsonResponse({ error: error.toString() });
  }
}

function listarTransferenciasStock(input) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaTransferenciasStock(ss);
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'listarTransferenciasStock.getValues');
    const p = parsePaginacion(input || {});
    if (!datos || datos.length < 2) {
      return jsonResponse({ transferencias: [], total: 0, page: p.page, pageSize: p.pageSize, hasMore: false });
    }
    const headers = datos[0];
    const sucursalId = normalizarSucursalId(input && input.sucursalId || 'GLOBAL');
    const texto = String(input && input.texto || '').trim().toLowerCase();
    const transferencias = datos.slice(1).map(row => mapearFila(headers, row)).filter(item => {
      if (sucursalId !== 'GLOBAL' && normalizarSucursalId(item.SUCURSAL_ORIGEN) !== sucursalId && normalizarSucursalId(item.SUCURSAL_DESTINO) !== sucursalId) return false;
      if (texto) {
        return [item.ID, item.SKU, item.PRODUCTO, item.SUCURSAL_ORIGEN, item.SUCURSAL_DESTINO, item.USUARIO, item.MOTIVO]
          .some(v => String(v || '').toLowerCase().indexOf(texto) >= 0);
      }
      return true;
    }).sort((a, b) => String(b.FECHA || '').localeCompare(String(a.FECHA || '')));
    const paginada = paginarArreglo(transferencias, p.page, p.pageSize);
    return jsonResponse({
      transferencias: paginada.data,
      total: paginada.total,
      page: paginada.page,
      pageSize: paginada.pageSize,
      hasMore: paginada.hasMore
    });
  } catch (error) {
    logError('listarTransferenciasStock', error, input || {});
    return jsonResponse({ error: error.toString() });
  }
}

function obtenerHojaOrdenesCompra(ss) {
  return crearHojaSiNoExiste(ss, 'OrdenesCompra', [
    'ID', 'FOLIO_OC', 'FECHA', 'PROVEEDOR', 'REFERENCIA', 'NOTAS',
    'CONDICIONES_PAGO', 'FECHA_ESTIMADA', 'FOLIO_RELACIONADO', 'ESTADO',
    'SUBTOTAL', 'IVA_PORCENTAJE', 'IVA_MONTO', 'TOTAL', 'FECHA_CREACION', 'FECHA_ACTUALIZACION'
  ]);
}

function obtenerHojaOrdenesCompraItems(ss) {
  return crearHojaSiNoExiste(ss, 'OrdenesCompraItems', [
    'FOLIO_OC', 'ITEM_ID', 'SKU', 'PRODUCTO', 'CANTIDAD_PEDIDA',
    'COSTO_UNITARIO', 'SUBTOTAL', 'CANTIDAD_RECIBIDA'
  ]);
}

function normalizarOrdenCompraPayload(data, parcial) {
  const payload = {
    folio: String(data.folio || '').trim().toUpperCase(),
    fecha: String(data.fecha || '').trim(),
    proveedor: String(data.proveedor || '').trim(),
    referencia: String(data.referencia || '').trim(),
    notas: String(data.notas || '').trim(),
    condicionesPago: String(data.condicionesPago || '').trim(),
    fechaEstimada: String(data.fechaEstimada || '').trim(),
    folioRelacionado: String(data.folioRelacionado || '').trim().toUpperCase(),
    sucursalId: normalizarSucursalId(data.sucursalId),
    estado: String(data.estado || '').trim().toLowerCase() || 'borrador',
    subtotal: normalizarNumero(data.subtotal, 0, 0),
    ivaPorcentaje: normalizarNumero(data.ivaPorcentaje, 0, 0),
    ivaMonto: normalizarNumero(data.ivaMonto, 0, 0),
    total: normalizarNumero(data.total, 0, 0),
    items: Array.isArray(data.items) ? data.items : []
  };
  if (!parcial || data.proveedor !== undefined) {
    if (!payload.proveedor) throw new Error('proveedor requerido');
  }
  if (!parcial || data.fecha !== undefined) {
    if (!payload.fecha || !parseFechaFlexible(payload.fecha)) throw new Error('fecha inválida');
    payload.fecha = formatearFechaYMD(parseFechaFlexible(payload.fecha));
  }
  if (payload.fechaEstimada) {
    const f = parseFechaFlexible(payload.fechaEstimada);
    if (!f) throw new Error('fechaEstimada inválida');
    payload.fechaEstimada = formatearFechaYMD(f);
  }
  if (['borrador', 'enviada', 'parcialmente_recibida', 'recibida', 'cancelada'].indexOf(payload.estado) === -1) {
    throw new Error('estado inválido');
  }
  payload.items = payload.items.map((item, idx) => {
    const sku = String(item.sku || '').trim().toUpperCase();
    const producto = String(item.producto || '').trim();
    const cantidadPedida = normalizarNumero(item.cantidadPedida, NaN, 0);
    const costoUnitario = normalizarNumero(item.costoUnitario, NaN, 0);
    const cantidadRecibida = normalizarNumero(item.cantidadRecibida, 0, 0);
    if (!sku) throw new Error(`sku requerido en item ${idx + 1}`);
    if (!producto) throw new Error(`producto requerido en item ${idx + 1}`);
    if (!isFinite(cantidadPedida) || cantidadPedida <= 0) throw new Error(`cantidadPedida inválida en item ${idx + 1}`);
    if (!isFinite(costoUnitario) || costoUnitario < 0) throw new Error(`costoUnitario inválido en item ${idx + 1}`);
    if (cantidadRecibida > cantidadPedida) throw new Error(`cantidadRecibida inválida en item ${idx + 1}`);
    return {
      itemId: idx + 1,
      sku: sku,
      producto: producto,
      cantidadPedida: cantidadPedida,
      costoUnitario: costoUnitario,
      subtotal: Number((cantidadPedida * costoUnitario).toFixed(2)),
      cantidadRecibida: cantidadRecibida
    };
  });
  return payload;
}

function guardarItemsOrdenCompra(hoja, folio, items) {
  const datos = withRetry(() => hoja.getDataRange().getValues(), 'guardarItemsOrdenCompra.getValues');
  for (let i = datos.length - 1; i >= 1; i--) {
    if (String(datos[i][0] || '').trim().toUpperCase() === folio) {
      hoja.deleteRow(i + 1);
    }
  }
  if (!items.length) return;
  const rows = items.map(item => [
    folio,
    item.itemId,
    item.sku,
    item.producto,
    item.cantidadPedida,
    item.costoUnitario,
    item.subtotal,
    item.cantidadRecibida
  ]);
  withRetry(() => hoja.getRange(hoja.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows), 'guardarItemsOrdenCompra.setValues');
}

function obtenerItemsOrdenCompra(ss, folio) {
  const hoja = obtenerHojaOrdenesCompraItems(ss);
  const datos = withRetry(() => hoja.getDataRange().getValues(), 'obtenerItemsOrdenCompra.getValues');
  if (!datos || datos.length < 2) return [];
  const headers = datos[0];
  return datos.slice(1)
    .filter(row => String(row[0] || '').trim().toUpperCase() === String(folio || '').trim().toUpperCase())
    .map(row => mapearFila(headers, row))
    .map(item => ({
      ITEM_ID: Number(item.ITEM_ID || 0),
      SKU: String(item.SKU || '').trim().toUpperCase(),
      PRODUCTO: String(item.PRODUCTO || '').trim(),
      CANTIDAD_PEDIDA: Number(item.CANTIDAD_PEDIDA || 0),
      COSTO_UNITARIO: Number(item.COSTO_UNITARIO || 0),
      SUBTOTAL: Number(item.SUBTOTAL || 0),
      CANTIDAD_RECIBIDA: Number(item.CANTIDAD_RECIBIDA || 0)
    }))
    .sort((a, b) => a.ITEM_ID - b.ITEM_ID);
}

function getOrdenCompraIndexByFolio(datos, folio) {
  return datos.findIndex((row, idx) => idx > 0 && String(row[1] || '').trim().toUpperCase() === String(folio || '').trim().toUpperCase());
}

function aplicarEntradaStockInterna(payload) {
  const sku = String(payload && payload.sku || '').trim().toUpperCase();
  if (!sku) throw new Error('sku requerido');
  const cantidad = normalizarNumero(payload && payload.cantidad, NaN, 0);
  if (!isFinite(cantidad) || cantidad <= 0) throw new Error('cantidad inválida');
  const sucursalId = normalizarSucursalId(payload && payload.sucursalId || '');
  const costoUnitario = normalizarNumero(payload && payload.costoUnitario, 0, 0);
  const folioEquipo = String(payload && payload.folioEquipo || '').trim().toUpperCase();
  const referencia = String(payload && payload.referencia || '').trim();
  const usuario = String(payload && payload.usuario || '').trim();
  const notas = String(payload && payload.notas || '').trim();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  asegurarEstructuraMultisucursal(ss);
  const hojaProd = obtenerHojaProductos(ss);
  const hojaMov = obtenerHojaMovimientosStock(ss);
  asegurarColumnaSucursal(hojaMov);
  const datosProd = withRetry(() => hojaProd.getDataRange().getValues(), 'aplicarEntradaStockInterna.getProductos');
  const headers = datosProd[0];
  const idx = obtenerIndiceProductoPorSku(datosProd, sku);
  if (idx < 1) throw new Error(`Producto no encontrado para SKU ${sku}`);
  const row = datosProd[idx].slice();
  const colStock = headers.indexOf('STOCK_ACTUAL');
  const colActualizacion = headers.indexOf('FECHA_ACTUALIZACION');
  const colNombre = headers.indexOf('NOMBRE');
  let stockActual = obtenerStockProductoEnSucursal(ss, sku, sucursalId);
  if (!isFinite(stockActual)) stockActual = 0;
  stockActual += cantidad;
  actualizarInventarioSucursal(ss, sku, sucursalId, stockActual, Number(row[headers.indexOf('STOCK_MINIMO')] || 0));
  row[colStock] = recalcularStockGlobalProducto(ss, sku);
  row[colActualizacion] = new Date().toISOString();
  withRetry(() => hojaProd.getRange(idx + 1, 1, 1, row.length).setValues([row]), 'aplicarEntradaStockInterna.updateProducto');

  const idMovimiento = obtenerSiguienteFolio(CONFIG.SCRIPT_PROP_KEYS.MOVIMIENTO_STOCK_SEQ, 'MOV-');
  withRetry(() => hojaMov.appendRow([
    idMovimiento,
    new Date().toISOString(),
    sku,
    row[colNombre],
    'entrada',
    cantidad,
    costoUnitario,
    folioEquipo,
    referencia,
    usuario,
    notas,
    sucursalId
  ]), 'aplicarEntradaStockInterna.appendMovimiento');

  return { movimiento: idMovimiento, stockActual: stockActual };
}

function guardarOrdenCompra(data) {
  try {
    return withDocumentLock(function() {
      const payload = normalizarOrdenCompraPayload(data || {}, !!(data && data.folio));
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const hoja = obtenerHojaOrdenesCompra(ss);
      asegurarColumnaSucursal(hoja);
      const hojaItems = obtenerHojaOrdenesCompraItems(ss);
      const datos = withRetry(() => hoja.getDataRange().getValues(), 'guardarOrdenCompra.getValues');
      const headers = datos[0];
      const now = new Date().toISOString();

      if (payload.folio) {
        const idx = getOrdenCompraIndexByFolio(datos, payload.folio);
        if (idx < 1) throw new Error('Orden no encontrada');
        const row = datos[idx].slice();
        const mapping = {
          FECHA: payload.fecha,
          PROVEEDOR: payload.proveedor,
          REFERENCIA: payload.referencia,
          NOTAS: payload.notas,
          CONDICIONES_PAGO: payload.condicionesPago,
          FECHA_ESTIMADA: payload.fechaEstimada,
          FOLIO_RELACIONADO: payload.folioRelacionado,
          ESTADO: payload.estado,
          SUBTOTAL: payload.subtotal,
          IVA_PORCENTAJE: payload.ivaPorcentaje,
          IVA_MONTO: payload.ivaMonto,
          TOTAL: payload.total,
          SUCURSAL_ID: payload.sucursalId,
          FECHA_ACTUALIZACION: now
        };
        Object.keys(mapping).forEach(key => {
          const col = headers.indexOf(key);
          if (col >= 0) row[col] = mapping[key];
        });
        withRetry(() => hoja.getRange(idx + 1, 1, 1, row.length).setValues([row]), 'guardarOrdenCompra.update');
        const itemsActuales = obtenerItemsOrdenCompra(ss, payload.folio);
        payload.items.forEach(item => {
          const previo = itemsActuales.find(x => x.ITEM_ID === item.itemId);
          if (previo) item.cantidadRecibida = previo.CANTIDAD_RECIBIDA;
        });
        guardarItemsOrdenCompra(hojaItems, payload.folio, payload.items);
        return jsonResponse({ success: true, folio: payload.folio, actualizado: true });
      }

      const folio = obtenerSiguienteFolio(CONFIG.SCRIPT_PROP_KEYS.FOLIO_ORDEN_COMPRA_SEQ, 'OC-');
      const id = Math.max(0, datos.length - 1) + 1;
      withRetry(() => hoja.appendRow([
        id,
        folio,
        payload.fecha,
        payload.proveedor,
        payload.referencia,
        payload.notas,
        payload.condicionesPago,
        payload.fechaEstimada,
        payload.folioRelacionado,
        payload.estado || 'borrador',
        payload.subtotal,
        payload.ivaPorcentaje,
        payload.ivaMonto,
        payload.total,
        now,
        now,
        payload.sucursalId
      ]), 'guardarOrdenCompra.append');
      guardarItemsOrdenCompra(hojaItems, folio, payload.items);
      return jsonResponse({ success: true, folio: folio, actualizado: false });
    }, 10000);
  } catch (error) {
    logError('guardarOrdenCompra', error, data || {});
    return jsonResponse({ error: error.toString() });
  }
}

function listarOrdenesCompra(input) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaOrdenesCompra(ss);
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'listarOrdenesCompra.getValues');
    const p = parsePaginacion(input || {});
    if (!datos || datos.length < 2) {
      return jsonResponse({ ordenes: [], total: 0, page: p.page, pageSize: p.pageSize, hasMore: false, proveedores: [] });
    }
    const headers = datos[0];
    const sucursalId = normalizarSucursalId(input && input.sucursalId || 'GLOBAL');
    const texto = String(input && input.texto || '').trim().toLowerCase();
    const estado = String(input && input.estado || '').trim().toLowerCase();
    const proveedor = String(input && input.proveedor || '').trim().toLowerCase();
    const ordenes = datos.slice(1).map(row => mapearFila(headers, row)).map(orden => ({
      ID: Number(orden.ID || 0),
      FOLIO_OC: String(orden.FOLIO_OC || '').trim().toUpperCase(),
      FECHA: formatearFechaYMDOrEmpty(orden.FECHA || ''),
      PROVEEDOR: String(orden.PROVEEDOR || '').trim(),
      REFERENCIA: String(orden.REFERENCIA || '').trim(),
      NOTAS: String(orden.NOTAS || '').trim(),
      CONDICIONES_PAGO: String(orden.CONDICIONES_PAGO || '').trim(),
      FECHA_ESTIMADA: formatearFechaYMDOrEmpty(orden.FECHA_ESTIMADA || ''),
      FOLIO_RELACIONADO: String(orden.FOLIO_RELACIONADO || '').trim().toUpperCase(),
      SUCURSAL_ID: normalizarSucursalId(orden.SUCURSAL_ID),
      ESTADO: String(orden.ESTADO || 'borrador').trim().toLowerCase(),
      SUBTOTAL: Number(orden.SUBTOTAL || 0),
      IVA_PORCENTAJE: Number(orden.IVA_PORCENTAJE || 0),
      IVA_MONTO: Number(orden.IVA_MONTO || 0),
      TOTAL: Number(orden.TOTAL || 0),
      FECHA_CREACION: formatearFechaYMDOrEmpty(orden.FECHA_CREACION || ''),
      FECHA_ACTUALIZACION: formatearFechaYMDOrEmpty(orden.FECHA_ACTUALIZACION || '')
    })).filter(orden => {
      if (sucursalId !== 'GLOBAL' && normalizarSucursalId(orden.SUCURSAL_ID) !== sucursalId) return false;
      if (estado && orden.ESTADO !== estado) return false;
      if (proveedor && String(orden.PROVEEDOR || '').toLowerCase() !== proveedor) return false;
      if (texto) {
        const hay = [orden.FOLIO_OC, orden.PROVEEDOR, orden.REFERENCIA, orden.FOLIO_RELACIONADO]
          .some(v => String(v || '').toLowerCase().indexOf(texto) >= 0);
        if (!hay) return false;
      }
      return true;
    }).sort((a, b) => String(b.FOLIO_OC || '').localeCompare(String(a.FOLIO_OC || '')));
    const proveedores = ordenes.map(x => x.PROVEEDOR).filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).sort();
    const paginada = paginarArreglo(ordenes, p.page, p.pageSize);
    return jsonResponse({
      ordenes: paginada.data,
      total: paginada.total,
      page: paginada.page,
      pageSize: paginada.pageSize,
      hasMore: paginada.hasMore,
      proveedores: proveedores
    });
  } catch (error) {
    logError('listarOrdenesCompra', error, input || {});
    return jsonResponse({ error: error.toString() });
  }
}

function getOrdenCompraByFolio(folio) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaOrdenesCompra(ss);
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'getOrdenCompraByFolio.getValues');
    if (!datos || datos.length < 2) return jsonResponse({ error: 'No encontrado' });
    const headers = datos[0];
    const idx = getOrdenCompraIndexByFolio(datos, folio);
    if (idx < 1) return jsonResponse({ error: 'No encontrado' });
    const orden = mapearFila(headers, datos[idx]);
    const normalizada = {
      ID: Number(orden.ID || 0),
      FOLIO_OC: String(orden.FOLIO_OC || '').trim().toUpperCase(),
      FECHA: formatearFechaYMDOrEmpty(orden.FECHA || ''),
      PROVEEDOR: String(orden.PROVEEDOR || '').trim(),
      REFERENCIA: String(orden.REFERENCIA || '').trim(),
      NOTAS: String(orden.NOTAS || '').trim(),
      CONDICIONES_PAGO: String(orden.CONDICIONES_PAGO || '').trim(),
      FECHA_ESTIMADA: formatearFechaYMDOrEmpty(orden.FECHA_ESTIMADA || ''),
      FOLIO_RELACIONADO: String(orden.FOLIO_RELACIONADO || '').trim().toUpperCase(),
      SUCURSAL_ID: normalizarSucursalId(orden.SUCURSAL_ID),
      ESTADO: String(orden.ESTADO || 'borrador').trim().toLowerCase(),
      SUBTOTAL: Number(orden.SUBTOTAL || 0),
      IVA_PORCENTAJE: Number(orden.IVA_PORCENTAJE || 0),
      IVA_MONTO: Number(orden.IVA_MONTO || 0),
      TOTAL: Number(orden.TOTAL || 0),
      FECHA_CREACION: formatearFechaYMDOrEmpty(orden.FECHA_CREACION || ''),
      FECHA_ACTUALIZACION: formatearFechaYMDOrEmpty(orden.FECHA_ACTUALIZACION || '')
    };
    return jsonResponse({ orden: normalizada, items: obtenerItemsOrdenCompra(ss, folio) });
  } catch (error) {
    logError('getOrdenCompraByFolio', error, { folio: folio });
    return jsonResponse({ error: error.toString() });
  }
}

function cambiarEstadoOrdenCompra(data) {
  try {
    const folio = String(data && data.folio || '').trim().toUpperCase();
    const estado = String(data && data.estado || '').trim().toLowerCase();
    if (!folio) throw new Error('folio requerido');
    if (['borrador', 'enviada', 'parcialmente_recibida', 'recibida', 'cancelada'].indexOf(estado) === -1) {
      throw new Error('estado inválido');
    }
    return withDocumentLock(function() {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const hoja = obtenerHojaOrdenesCompra(ss);
      const datos = withRetry(() => hoja.getDataRange().getValues(), 'cambiarEstadoOrdenCompra.getValues');
      const headers = datos[0];
      const idx = getOrdenCompraIndexByFolio(datos, folio);
      if (idx < 1) throw new Error('Orden no encontrada');
      const row = datos[idx].slice();
      row[headers.indexOf('ESTADO')] = estado;
      row[headers.indexOf('FECHA_ACTUALIZACION')] = new Date().toISOString();
      withRetry(() => hoja.getRange(idx + 1, 1, 1, row.length).setValues([row]), 'cambiarEstadoOrdenCompra.update');
      return jsonResponse({ success: true, folio: folio, estado: estado });
    }, 10000);
  } catch (error) {
    logError('cambiarEstadoOrdenCompra', error, data || {});
    return jsonResponse({ error: error.toString() });
  }
}

function recibirOrdenCompra(data) {
  try {
    const folio = String(data && data.folio || '').trim().toUpperCase();
    const recepciones = Array.isArray(data && data.items) ? data.items : [];
    const usuario = String(data && data.usuario || '').trim();
    if (!folio) throw new Error('folio requerido');
    if (!recepciones.length) throw new Error('items requeridos');
    return withDocumentLock(function() {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const hojaOrden = obtenerHojaOrdenesCompra(ss);
      const hojaItems = obtenerHojaOrdenesCompraItems(ss);
      const datosOrden = withRetry(() => hojaOrden.getDataRange().getValues(), 'recibirOrdenCompra.getOrdenes');
      const headersOrden = datosOrden[0];
      const idxOrden = getOrdenCompraIndexByFolio(datosOrden, folio);
      if (idxOrden < 1) throw new Error('Orden no encontrada');
      const ordenRow = datosOrden[idxOrden].slice();
      const estadoActual = String(ordenRow[headersOrden.indexOf('ESTADO')] || '').trim().toLowerCase();
      if (estadoActual === 'cancelada') throw new Error('No se puede recibir una orden cancelada');

      const datosItems = withRetry(() => hojaItems.getDataRange().getValues(), 'recibirOrdenCompra.getItems');
      const headersItems = datosItems[0];
      const rowsIndexes = [];
      const itemsOrden = datosItems.slice(1).map((row, idx) => ({ idx: idx + 2, row: row }))
        .filter(item => String(item.row[0] || '').trim().toUpperCase() === folio);
      if (!itemsOrden.length) throw new Error('La orden no tiene items');

      recepciones.forEach(rec => {
        const itemId = Number(rec.itemId || 0);
        const cantidadRecibidaAhora = normalizarNumero(rec.cantidadRecibida, NaN, 0);
        if (!itemId || !isFinite(cantidadRecibidaAhora) || cantidadRecibidaAhora < 0) throw new Error('recepción inválida');
        const found = itemsOrden.find(x => Number(x.row[1] || 0) === itemId);
        if (!found) throw new Error(`Item ${itemId} no encontrado`);
        const cantidadPedida = Number(found.row[4] || 0);
        const cantidadYaRecibida = Number(found.row[7] || 0);
        const nuevoTotal = cantidadYaRecibida + cantidadRecibidaAhora;
        if (nuevoTotal > cantidadPedida) throw new Error(`La recepción excede lo pedido en item ${itemId}`);
        found.row[7] = nuevoTotal;
        rowsIndexes.push(found);
        if (cantidadRecibidaAhora > 0) {
          aplicarEntradaStockInterna({
            sku: found.row[2],
            cantidad: cantidadRecibidaAhora,
            costoUnitario: found.row[5],
            folioEquipo: ordenRow[headersOrden.indexOf('FOLIO_RELACIONADO')],
            referencia: `Orden de compra ${folio}`,
            usuario: usuario,
            notas: `Recepción de orden ${folio}`,
            sucursalId: normalizarSucursalId(ordenRow[headersOrden.indexOf('SUCURSAL_ID')])
          });
        }
      });

      rowsIndexes.forEach(item => {
        withRetry(() => hojaItems.getRange(item.idx, 1, 1, item.row.length).setValues([item.row]), 'recibirOrdenCompra.updateItem');
      });

      const itemsActualizados = itemsOrden.map(item => ({
        pedida: Number(item.row[4] || 0),
        recibida: Number(item.row[7] || 0)
      }));
      const totalRecibida = itemsActualizados.reduce((acc, x) => acc + x.recibida, 0);
      const totalPedida = itemsActualizados.reduce((acc, x) => acc + x.pedida, 0);
      let nuevoEstado = 'enviada';
      if (totalRecibida <= 0) nuevoEstado = estadoActual === 'borrador' ? 'borrador' : 'enviada';
      else if (totalRecibida < totalPedida) nuevoEstado = 'parcialmente_recibida';
      else nuevoEstado = 'recibida';

      ordenRow[headersOrden.indexOf('ESTADO')] = nuevoEstado;
      ordenRow[headersOrden.indexOf('FECHA_ACTUALIZACION')] = new Date().toISOString();
      withRetry(() => hojaOrden.getRange(idxOrden + 1, 1, 1, ordenRow.length).setValues([ordenRow]), 'recibirOrdenCompra.updateOrden');

      return jsonResponse({ success: true, folio: folio, estado: nuevoEstado });
    }, 10000);
  } catch (error) {
    logError('recibirOrdenCompra', error, data || {});
    return jsonResponse({ error: error.toString() });
  }
}

function obtenerHojaGastos(ss) {
  return crearHojaSiNoExiste(ss, 'Gastos', [
    'ID', 'FECHA', 'TIPO', 'CATEGORIA', 'CONCEPTO', 'DESCRIPCION',
    'MONTO', 'METODO_PAGO', 'PROVEEDOR', 'FOLIO_RELACIONADO',
    'COMPROBANTE_URL', 'NOTAS', 'FECHA_CREACION', 'FECHA_ACTUALIZACION'
  ]);
}

function normalizarGastoPayload(data, parcial) {
  const payload = {
    id: Number(data.id || 0),
    fecha: String(data.fecha || '').trim(),
    tipo: String(data.tipo || '').trim().toLowerCase(),
    categoria: String(data.categoria || '').trim().toLowerCase(),
    concepto: String(data.concepto || '').trim(),
    descripcion: String(data.descripcion || '').trim(),
    monto: normalizarNumero(data.monto, NaN, 0),
    metodoPago: String(data.metodoPago || '').trim(),
    proveedor: String(data.proveedor || '').trim(),
    folioRelacionado: String(data.folioRelacionado || '').trim().toUpperCase(),
    comprobanteUrl: String(data.comprobanteUrl || '').trim(),
    notas: String(data.notas || '').trim()
  };
  const tipos = ['fijo', 'variable'];
  const categorias = ['renta', 'nómina', 'nomina', 'servicios', 'herramientas', 'insumos', 'refacciones', 'paquetería', 'paqueteria', 'marketing', 'transporte', 'otros'];
  if (!parcial || data.fecha !== undefined) {
    const fecha = parseFechaFlexible(payload.fecha);
    if (!fecha) throw new Error('fecha inválida');
    payload.fecha = formatearFechaYMD(fecha);
  }
  if (!parcial || data.tipo !== undefined) {
    if (tipos.indexOf(payload.tipo) === -1) throw new Error('tipo inválido');
  }
  if (!parcial || data.categoria !== undefined) {
    if (categorias.indexOf(payload.categoria) === -1) throw new Error('categoria inválida');
  }
  if (!parcial || data.concepto !== undefined) {
    if (!payload.concepto) throw new Error('concepto requerido');
  }
  if (!isFinite(payload.monto) || payload.monto < 0) throw new Error('monto inválido');
  return payload;
}

function normalizarGastoForApi(obj) {
  const out = { ...obj };
  out.ID = Number(out.ID || 0);
  out.FECHA = formatearFechaYMDOrEmpty(out.FECHA || '');
  out.TIPO = String(out.TIPO || '').trim().toLowerCase();
  out.CATEGORIA = String(out.CATEGORIA || '').trim().toLowerCase();
  out.CONCEPTO = String(out.CONCEPTO || '').trim();
  out.DESCRIPCION = String(out.DESCRIPCION || '').trim();
  out.MONTO = Number(out.MONTO || 0);
  out.METODO_PAGO = String(out.METODO_PAGO || '').trim();
  out.PROVEEDOR = String(out.PROVEEDOR || '').trim();
  out.FOLIO_RELACIONADO = String(out.FOLIO_RELACIONADO || '').trim().toUpperCase();
  out.COMPROBANTE_URL = String(out.COMPROBANTE_URL || '').trim();
  out.NOTAS = String(out.NOTAS || '').trim();
  out.FECHA_CREACION = formatearFechaYMDOrEmpty(out.FECHA_CREACION || '');
  out.FECHA_ACTUALIZACION = formatearFechaYMDOrEmpty(out.FECHA_ACTUALIZACION || '');
  return out;
}

function getGastoIndexById(datos, id) {
  const idNum = Number(id || 0);
  return datos.findIndex((row, idx) => idx > 0 && Number(row[0] || 0) === idNum);
}

function guardarGasto(data) {
  try {
    return withDocumentLock(function() {
      const payload = normalizarGastoPayload(data || {}, !!(data && data.id));
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const hoja = obtenerHojaGastos(ss);
      asegurarColumnaSucursal(hoja);
      const datos = withRetry(() => hoja.getDataRange().getValues(), 'guardarGasto.getValues');
      const headers = datos[0];
      const now = new Date().toISOString();

      if (payload.id) {
        const idx = getGastoIndexById(datos, payload.id);
        if (idx < 1) throw new Error('Gasto no encontrado');
        const row = datos[idx].slice();
        const mapping = {
          FECHA: payload.fecha,
          TIPO: payload.tipo,
          CATEGORIA: payload.categoria,
          CONCEPTO: payload.concepto,
          DESCRIPCION: payload.descripcion,
          MONTO: payload.monto,
          METODO_PAGO: payload.metodoPago,
          PROVEEDOR: payload.proveedor,
          FOLIO_RELACIONADO: payload.folioRelacionado,
          COMPROBANTE_URL: payload.comprobanteUrl,
          NOTAS: payload.notas,
          SUCURSAL_ID: normalizarSucursalId(data && data.sucursalId),
          FECHA_ACTUALIZACION: now
        };
        Object.keys(mapping).forEach(key => {
          const col = headers.indexOf(key);
          if (col >= 0) row[col] = mapping[key];
        });
        withRetry(() => hoja.getRange(idx + 1, 1, 1, row.length).setValues([row]), 'guardarGasto.update');
        return jsonResponse({ success: true, id: payload.id, actualizado: true });
      }

      const nextId = Math.max(0, datos.length - 1) + 1;
      withRetry(() => hoja.appendRow([
        nextId,
        payload.fecha,
        payload.tipo,
        payload.categoria,
        payload.concepto,
        payload.descripcion,
        payload.monto,
        payload.metodoPago,
        payload.proveedor,
        payload.folioRelacionado,
        payload.comprobanteUrl,
        payload.notas,
        now,
        now,
        normalizarSucursalId(data && data.sucursalId)
      ]), 'guardarGasto.append');
      return jsonResponse({ success: true, id: nextId, actualizado: false });
    }, 10000);
  } catch (error) {
    logError('guardarGasto', error, data || {});
    return jsonResponse({ error: error.toString() });
  }
}

function eliminarGasto(data) {
  try {
    const id = Number(data && data.id || 0);
    if (!id) throw new Error('id requerido');
    return withDocumentLock(function() {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const hoja = obtenerHojaGastos(ss);
      const datos = withRetry(() => hoja.getDataRange().getValues(), 'eliminarGasto.getValues');
      const idx = getGastoIndexById(datos, id);
      if (idx < 1) throw new Error('Gasto no encontrado');
      hoja.deleteRow(idx + 1);
      return jsonResponse({ success: true, id: id });
    }, 10000);
  } catch (error) {
    logError('eliminarGasto', error, data || {});
    return jsonResponse({ error: error.toString() });
  }
}

function listarGastos(input) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaGastos(ss);
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'listarGastos.getValues');
    const p = parsePaginacion(input || {});
    if (!datos || datos.length < 2) {
      return jsonResponse({ gastos: [], total: 0, page: p.page, pageSize: p.pageSize, hasMore: false });
    }
    const headers = datos[0];
    const fechaDesde = parseFechaFiltro(input && input.fechaDesde || '');
    const fechaHasta = parseFechaFiltro(input && input.fechaHasta || '');
    const tipo = String(input && input.tipo || '').trim().toLowerCase();
    const categoria = String(input && input.categoria || '').trim().toLowerCase();
    const texto = String(input && input.texto || '').trim().toLowerCase();
    const sucursalId = normalizarSucursalId(input && input.sucursalId || 'GLOBAL');

    const gastos = datos.slice(1).map(row => normalizarGastoForApi(mapearFila(headers, row))).filter(gasto => {
      if (sucursalId !== 'GLOBAL' && normalizarSucursalId(gasto.SUCURSAL_ID) !== sucursalId) return false;
      if (tipo && gasto.TIPO !== tipo) return false;
      if (categoria && gasto.CATEGORIA !== categoria) return false;
      const fecha = parseFechaFlexible(gasto.FECHA);
      if ((fechaDesde || fechaHasta) && !cumpleRango(fecha, fechaDesde, fechaHasta)) return false;
      if (texto) {
        const hay = [gasto.CONCEPTO, gasto.DESCRIPCION, gasto.PROVEEDOR, gasto.FOLIO_RELACIONADO, gasto.METODO_PAGO]
          .some(v => String(v || '').toLowerCase().indexOf(texto) >= 0);
        if (!hay) return false;
      }
      return true;
    }).sort((a, b) => {
      const fa = parseFechaFlexible(a.FECHA || '');
      const fb = parseFechaFlexible(b.FECHA || '');
      return (fb ? fb.getTime() : 0) - (fa ? fa.getTime() : 0);
    });

    const paginada = paginarArreglo(gastos, p.page, p.pageSize);
    return jsonResponse({
      gastos: paginada.data,
      total: paginada.total,
      page: paginada.page,
      pageSize: paginada.pageSize,
      hasMore: paginada.hasMore
    });
  } catch (error) {
    logError('listarGastos', error, input || {});
    return jsonResponse({ error: error.toString() });
  }
}

function resumenGastos(input) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaGastos(ss);
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'resumenGastos.getValues');
    if (!datos || datos.length < 2) {
      return jsonResponse({ totalPeriodo: 0, resumenMensual: [] });
    }
    const headers = datos[0];
    const fechaDesde = parseFechaFiltro(input && input.fechaDesde || '');
    const fechaHasta = parseFechaFiltro(input && input.fechaHasta || '');
    const sucursalId = normalizarSucursalId(input && input.sucursalId || 'GLOBAL');
    const resumen = {};
    let totalPeriodo = 0;

    datos.slice(1).map(row => normalizarGastoForApi(mapearFila(headers, row))).forEach(gasto => {
      if (sucursalId !== 'GLOBAL' && normalizarSucursalId(gasto.SUCURSAL_ID) !== sucursalId) return;
      const fecha = parseFechaFlexible(gasto.FECHA);
      if ((fechaDesde || fechaHasta) && !cumpleRango(fecha, fechaDesde, fechaHasta)) return;
      const mes = String(gasto.FECHA || '').slice(0, 7);
      if (!mes) return;
      if (!resumen[mes]) resumen[mes] = { mes: mes, total: 0, categorias: {} };
      resumen[mes].total += Number(gasto.MONTO || 0);
      resumen[mes].categorias[gasto.CATEGORIA] = (resumen[mes].categorias[gasto.CATEGORIA] || 0) + Number(gasto.MONTO || 0);
      totalPeriodo += Number(gasto.MONTO || 0);
    });

    const resumenMensual = Object.values(resumen).sort((a, b) => String(b.mes).localeCompare(String(a.mes)));
    return jsonResponse({ totalPeriodo: Number(totalPeriodo.toFixed(2)), resumenMensual: resumenMensual });
  } catch (error) {
    logError('resumenGastos', error, input || {});
    return jsonResponse({ error: error.toString() });
  }
}

function resumenFinanzas(input) {
  try {
    const fechaDesde = parseFechaFiltro(input && input.fechaDesde || '');
    const fechaHasta = parseFechaFiltro(input && input.fechaHasta || '');
    const sucursalId = normalizarSucursalId(input && input.sucursalId || 'GLOBAL');

    let ingresos = 0;
    let ordenesEntregadas = 0;
    let ticketPromedio = 0;
    let cotizacionesConvertidas = 0;
    let cuentasPorCobrar = 0;
    let anticiposPendientes = 0;

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const hojaEquipos = ss.getSheetByName('Equipos');
    if (hojaEquipos) {
      const datos = withRetry(() => hojaEquipos.getDataRange().getValues(), 'resumenFinanzas.equipos');
      if (datos && datos.length > 1) {
        const headers = datos[0];
        const colEstado = headers.indexOf('ESTADO');
        const colCosto = headers.indexOf('COSTO_ESTIMADO');
        const colFechaEntrega = headers.indexOf('FECHA_ENTREGA');
        datos.slice(1).forEach(row => {
          const estado = String(row[colEstado] || '').trim();
          const fecha = parseFechaFlexible(row[colFechaEntrega] || '');
          const sucursalEquipo = normalizarSucursalId(row[headers.indexOf('SUCURSAL_ID')]);
          if (sucursalId !== 'GLOBAL' && sucursalEquipo !== sucursalId) return;
          if (estado === 'Entregado' && cumpleRango(fecha, fechaDesde, fechaHasta)) {
            ingresos += Number(row[colCosto] || 0);
            ordenesEntregadas += 1;
          }
        });
      }
    }

    const hojaSolicitudes = ss.getSheetByName('Solicitudes');
    if (hojaSolicitudes) {
      const datos = withRetry(() => hojaSolicitudes.getDataRange().getValues(), 'resumenFinanzas.solicitudes');
      if (datos && datos.length > 1) {
        const headers = datos[0];
        const colEstado = headers.indexOf('ESTADO');
        const colFecha = headers.indexOf('FECHA_COTIZACION');
        const colTotal = headers.indexOf('COTIZACION_TOTAL');
        const colJson = headers.indexOf('COTIZACION_JSON');
        datos.slice(1).forEach(row => {
          const estado = String(row[colEstado] || '').trim().toLowerCase();
          const fecha = parseFechaFlexible(row[colFecha] || '');
          const sucursalSolicitud = normalizarSucursalId(row[headers.indexOf('SUCURSAL_ID')]);
          if (sucursalId !== 'GLOBAL' && sucursalSolicitud !== sucursalId) return;
          if (estado === 'cotizacion_archivada' && cumpleRango(fecha, fechaDesde, fechaHasta)) {
            let cotizacion = {};
            try {
              cotizacion = JSON.parse(String(row[colJson] || '{}'));
            } catch (e) {
              cotizacion = {};
            }
            const total = Number(cotizacion.total || row[colTotal] || 0);
            const anticipo = Number(cotizacion.anticipo || 0);
            const saldo = Number(cotizacion.saldo || Math.max(total - anticipo, 0));
            cotizacionesConvertidas += 1;
            cuentasPorCobrar += saldo;
            anticiposPendientes += anticipo > 0 && saldo > 0 ? anticipo : 0;
          }
        });
      }
    }

    let egresos = 0;
    const hojaGastos = ss.getSheetByName('Gastos');
    if (hojaGastos) {
      const datos = withRetry(() => hojaGastos.getDataRange().getValues(), 'resumenFinanzas.gastos');
      if (datos && datos.length > 1) {
        const headers = datos[0];
        const colFecha = headers.indexOf('FECHA');
        const colMonto = headers.indexOf('MONTO');
        datos.slice(1).forEach(row => {
          const fecha = parseFechaFlexible(row[colFecha] || '');
          const sucursalGasto = normalizarSucursalId(row[headers.indexOf('SUCURSAL_ID')]);
          if (sucursalId !== 'GLOBAL' && sucursalGasto !== sucursalId) return;
          if (cumpleRango(fecha, fechaDesde, fechaHasta)) {
            egresos += Number(row[colMonto] || 0);
          }
        });
      }
    }

    const hojaCompras = ss.getSheetByName('OrdenesCompra');
    if (hojaCompras) {
      const datos = withRetry(() => hojaCompras.getDataRange().getValues(), 'resumenFinanzas.compras');
      if (datos && datos.length > 1) {
        const headers = datos[0];
        const colEstado = headers.indexOf('ESTADO');
        const colFecha = headers.indexOf('FECHA');
        const colTotal = headers.indexOf('TOTAL');
        datos.slice(1).forEach(row => {
          const estado = String(row[colEstado] || '').trim().toLowerCase();
          const fecha = parseFechaFlexible(row[colFecha] || '');
          const sucursalOrden = normalizarSucursalId(row[headers.indexOf('SUCURSAL_ID')]);
          if (sucursalId !== 'GLOBAL' && sucursalOrden !== sucursalId) return;
          if (estado !== 'cancelada' && cumpleRango(fecha, fechaDesde, fechaHasta)) {
            egresos += Number(row[colTotal] || 0);
          }
        });
      }
    }

    const utilidadBruta = ingresos - egresos;
    ticketPromedio = ordenesEntregadas > 0 ? ingresos / ordenesEntregadas : 0;

    const comparativoMensual = construirComparativoMensualFinanzas(ss, sucursalId);
    const resumenCategorias = construirResumenCategoriasFinanzas(ss, fechaDesde, fechaHasta, sucursalId);

    return jsonResponse({
      kpis: {
        ingresos: Number(ingresos.toFixed(2)),
        egresos: Number(egresos.toFixed(2)),
        utilidadBruta: Number(utilidadBruta.toFixed(2)),
        ticketPromedio: Number(ticketPromedio.toFixed(2)),
        ordenesEntregadas: ordenesEntregadas,
        cotizacionesConvertidas: cotizacionesConvertidas,
        cuentasPorCobrar: Number(cuentasPorCobrar.toFixed(2)),
        anticiposPendientes: Number(anticiposPendientes.toFixed(2))
      },
      comparativoMensual: comparativoMensual,
      resumenCategorias: resumenCategorias
    });
  } catch (error) {
    logError('resumenFinanzas', error, input || {});
    return jsonResponse({ error: error.toString() });
  }
}

function construirComparativoMensualFinanzas(ss, sucursalId) {
  const meses = {};

  const hojaEquipos = ss.getSheetByName('Equipos');
  if (hojaEquipos) {
    const datos = withRetry(() => hojaEquipos.getDataRange().getValues(), 'construirComparativoMensualFinanzas.equipos');
    if (datos && datos.length > 1) {
      const headers = datos[0];
      const colEstado = headers.indexOf('ESTADO');
      const colFechaEntrega = headers.indexOf('FECHA_ENTREGA');
      const colCosto = headers.indexOf('COSTO_ESTIMADO');
      datos.slice(1).forEach(row => {
        const estado = String(row[colEstado] || '').trim();
        const fecha = parseFechaFlexible(row[colFechaEntrega] || '');
        const sucursalEquipo = normalizarSucursalId(row[headers.indexOf('SUCURSAL_ID')]);
        if (sucursalId && sucursalId !== 'GLOBAL' && sucursalEquipo !== sucursalId) return;
        if (estado !== 'Entregado' || !fecha) return;
        const mes = formatearFechaYMD(fecha).slice(0, 7);
        if (!meses[mes]) meses[mes] = { mes: mes, ingresos: 0, egresos: 0 };
        meses[mes].ingresos += Number(row[colCosto] || 0);
      });
    }
  }

  const hojaGastos = ss.getSheetByName('Gastos');
  if (hojaGastos) {
    const datos = withRetry(() => hojaGastos.getDataRange().getValues(), 'construirComparativoMensualFinanzas.gastos');
    if (datos && datos.length > 1) {
      const headers = datos[0];
      const colFecha = headers.indexOf('FECHA');
      const colMonto = headers.indexOf('MONTO');
      datos.slice(1).forEach(row => {
        const fecha = parseFechaFlexible(row[colFecha] || '');
        const sucursalGasto = normalizarSucursalId(row[headers.indexOf('SUCURSAL_ID')]);
        if (sucursalId && sucursalId !== 'GLOBAL' && sucursalGasto !== sucursalId) return;
        if (!fecha) return;
        const mes = formatearFechaYMD(fecha).slice(0, 7);
        if (!meses[mes]) meses[mes] = { mes: mes, ingresos: 0, egresos: 0 };
        meses[mes].egresos += Number(row[colMonto] || 0);
      });
    }
  }

  const hojaCompras = ss.getSheetByName('OrdenesCompra');
  if (hojaCompras) {
    const datos = withRetry(() => hojaCompras.getDataRange().getValues(), 'construirComparativoMensualFinanzas.compras');
    if (datos && datos.length > 1) {
      const headers = datos[0];
      const colFecha = headers.indexOf('FECHA');
      const colTotal = headers.indexOf('TOTAL');
      const colEstado = headers.indexOf('ESTADO');
      datos.slice(1).forEach(row => {
        const fecha = parseFechaFlexible(row[colFecha] || '');
        const estado = String(row[colEstado] || '').trim().toLowerCase();
        const sucursalOrden = normalizarSucursalId(row[headers.indexOf('SUCURSAL_ID')]);
        if (sucursalId && sucursalId !== 'GLOBAL' && sucursalOrden !== sucursalId) return;
        if (!fecha || estado === 'cancelada') return;
        const mes = formatearFechaYMD(fecha).slice(0, 7);
        if (!meses[mes]) meses[mes] = { mes: mes, ingresos: 0, egresos: 0 };
        meses[mes].egresos += Number(row[colTotal] || 0);
      });
    }
  }

  return Object.values(meses)
    .map(item => ({
      mes: item.mes,
      ingresos: Number(item.ingresos.toFixed(2)),
      egresos: Number(item.egresos.toFixed(2)),
      utilidad: Number((item.ingresos - item.egresos).toFixed(2))
    }))
    .sort((a, b) => String(a.mes).localeCompare(String(b.mes)));
}

function construirResumenCategoriasFinanzas(ss, fechaDesde, fechaHasta, sucursalId) {
  const categorias = {};

  const hojaGastos = ss.getSheetByName('Gastos');
  if (hojaGastos) {
    const datos = withRetry(() => hojaGastos.getDataRange().getValues(), 'construirResumenCategoriasFinanzas.gastos');
    if (datos && datos.length > 1) {
      const headers = datos[0];
      const colFecha = headers.indexOf('FECHA');
      const colCategoria = headers.indexOf('CATEGORIA');
      const colMonto = headers.indexOf('MONTO');
      datos.slice(1).forEach(row => {
        const fecha = parseFechaFlexible(row[colFecha] || '');
        const sucursalGasto = normalizarSucursalId(row[headers.indexOf('SUCURSAL_ID')]);
        if (sucursalId && sucursalId !== 'GLOBAL' && sucursalGasto !== sucursalId) return;
        if ((fechaDesde || fechaHasta) && !cumpleRango(fecha, fechaDesde, fechaHasta)) return;
        const categoria = String(row[colCategoria] || 'otros').trim().toLowerCase() || 'otros';
        categorias[categoria] = (categorias[categoria] || 0) + Number(row[colMonto] || 0);
      });
    }
  }

  const hojaCompras = ss.getSheetByName('OrdenesCompra');
  if (hojaCompras) {
    const datos = withRetry(() => hojaCompras.getDataRange().getValues(), 'construirResumenCategoriasFinanzas.compras');
    if (datos && datos.length > 1) {
      const headers = datos[0];
      const colFecha = headers.indexOf('FECHA');
      const colTotal = headers.indexOf('TOTAL');
      const colEstado = headers.indexOf('ESTADO');
      datos.slice(1).forEach(row => {
        const fecha = parseFechaFlexible(row[colFecha] || '');
        const estado = String(row[headers.indexOf('ESTADO')] || '').trim().toLowerCase();
        const sucursalOrden = normalizarSucursalId(row[headers.indexOf('SUCURSAL_ID')]);
        if (sucursalId && sucursalId !== 'GLOBAL' && sucursalOrden !== sucursalId) return;
        if (estado === 'cancelada') return;
        if ((fechaDesde || fechaHasta) && !cumpleRango(fecha, fechaDesde, fechaHasta)) return;
        categorias.compras = (categorias.compras || 0) + Number(row[colTotal] || 0);
      });
    }
  }

  return Object.keys(categorias)
    .map(key => ({ categoria: key, total: Number(categorias[key].toFixed(2)) }))
    .sort((a, b) => b.total - a.total);
}

function reporteOperativo(input) {
  try {
    const tipo = String(input && input.tipo || 'diario').trim().toLowerCase();
    const sucursalId = normalizarSucursalId(input && input.sucursalId || 'GLOBAL');
    const rango = resolverRangoReporteOperativo(tipo, input);
    const fechaDesde = rango.fechaDesde;
    const fechaHasta = rango.fechaHasta;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const equipos = obtenerEquiposParaReportes(ss, fechaDesde, fechaHasta, sucursalId);
    const solicitudes = obtenerSolicitudesParaReportes(ss, fechaDesde, fechaHasta, sucursalId);
    const gastos = obtenerGastosParaReportes(ss, fechaDesde, fechaHasta, sucursalId);
    const compras = obtenerComprasParaReportes(ss, fechaDesde, fechaHasta, sucursalId);
    const productosCriticos = obtenerProductosCriticosParaReportes(ss, sucursalId);

    const resumenBase = construirResumenBaseReporteOperativo(equipos, solicitudes, gastos);

    if (tipo === 'diario') {
      return jsonResponse({
        tipo: 'diario',
        rango: construirRangoJsonReporteOperativo(fechaDesde, fechaHasta),
        resumen: resumenBase,
        detalle: {
          equiposRecibidos: equipos.recibidos,
          equiposEntregados: equipos.entregados,
          cotizaciones: solicitudes.cotizaciones,
          gastos: gastos
        }
      });
    }

    if (tipo === 'semanal') {
      const resumenSemanal = construirResumenSemanalReporteOperativo(equipos, productosCriticos);
      const detalleSemanal = construirDetalleSemanalReporteOperativo(equipos, productosCriticos);

      return jsonResponse({
        tipo: 'semanal',
        rango: construirRangoJsonReporteOperativo(fechaDesde, fechaHasta),
        resumen: {
          ...resumenBase,
          promedioDiasEntrega: resumenSemanal.promedioDiasEntrega,
          stockCritico: resumenSemanal.stockCritico
        },
        detalle: detalleSemanal
      });
    }

    const resumenMensual = construirResumenMensualReporteOperativo(equipos, gastos, compras);
    const detalleMensual = construirDetalleMensualReporteOperativo(equipos, compras, gastos);

    return jsonResponse({
      tipo: 'mensual',
      rango: construirRangoJsonReporteOperativo(fechaDesde, fechaHasta),
      resumen: resumenMensual,
      detalle: detalleMensual
    });
  } catch (error) {
    logError('reporteOperativo', error, input || {});
    return jsonResponse({ error: error.toString() });
  }
}

function resolverRangoReporteOperativo(tipo, input) {
  let fechaDesde = parseFechaFiltro(input && input.fechaDesde || '');
  let fechaHasta = parseFechaFiltro(input && input.fechaHasta || '');
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (!fechaDesde || !fechaHasta) {
    if (tipo === 'semanal') {
      fechaHasta = new Date(hoy);
      fechaHasta.setHours(23, 59, 59, 999);
      fechaDesde = new Date(hoy);
      fechaDesde.setDate(hoy.getDate() - 6);
    } else if (tipo === 'mensual') {
      fechaDesde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      fechaHasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      fechaDesde = new Date(hoy);
      fechaHasta = new Date(hoy);
      fechaHasta.setHours(23, 59, 59, 999);
    }
  } else {
    fechaHasta.setHours(23, 59, 59, 999);
  }
  return { fechaDesde: fechaDesde, fechaHasta: fechaHasta };
}

function construirRangoJsonReporteOperativo(fechaDesde, fechaHasta) {
  return {
    fechaDesde: formatearFechaYMD(fechaDesde),
    fechaHasta: formatearFechaYMD(fechaHasta)
  };
}

function construirResumenBaseReporteOperativo(equipos, solicitudes, gastos) {
  return {
    equiposRecibidos: (equipos && equipos.recibidos ? equipos.recibidos.length : 0),
    equiposEntregados: (equipos && equipos.entregados ? equipos.entregados.length : 0),
    cotizacionesGeneradas: (solicitudes && solicitudes.cotizaciones ? solicitudes.cotizaciones.length : 0),
    ventasEstimadas: Number(((solicitudes && solicitudes.cotizaciones ? solicitudes.cotizaciones : []).reduce(function(acc, item) {
      return acc + Number(item.total || 0);
    }, 0)).toFixed(2)),
    gastos: Number(((gastos || []).reduce(function(acc, item) {
      return acc + Number(item.MONTO || 0);
    }, 0)).toFixed(2))
  };
}

function construirResumenSemanalReporteOperativo(equipos, productosCriticos) {
  let tiempoTotal = 0;
  let tiemposCount = 0;
  (equipos && equipos.entregados ? equipos.entregados : []).forEach(function(item) {
    const ingreso = parseFechaFlexible(item.FECHA_INGRESO || item.FECHA_INGRESO_TS || '');
    const entrega = parseFechaFlexible(item.FECHA_ENTREGA || item.FECHA_ENTREGA_TS || '');
    if (!ingreso || !entrega) return;
    tiempoTotal += Math.max(Math.round((entrega.getTime() - ingreso.getTime()) / 86400000), 0);
    tiemposCount += 1;
  });
  return {
    promedioDiasEntrega: tiemposCount ? Number((tiempoTotal / tiemposCount).toFixed(2)) : 0,
    stockCritico: (productosCriticos || []).length
  };
}

function construirDetalleSemanalReporteOperativo(equipos, productosCriticos) {
  const porTecnico = {};
  const incidencias = {};
  (equipos && equipos.entregados ? equipos.entregados : []).forEach(function(item) {
    const tecnico = String(item.TECNICO_ASIGNADO || 'Sin asignar').trim() || 'Sin asignar';
    porTecnico[tecnico] = (porTecnico[tecnico] || 0) + 1;
  });

  (equipos && equipos.recibidos ? equipos.recibidos : []).concat(equipos && equipos.entregados ? equipos.entregados : []).forEach(function(item) {
    const falla = String(item.FALLA_REPORTADA || 'Sin detalle').trim();
    incidencias[falla] = (incidencias[falla] || 0) + 1;
  });

  return {
    porTecnico: Object.keys(porTecnico).map(function(key) { return { tecnico: key, total: porTecnico[key] }; }).sort(function(a, b) { return b.total - a.total; }),
    incidencias: Object.keys(incidencias).map(function(key) { return { incidencia: key, total: incidencias[key] }; }).sort(function(a, b) { return b.total - a.total; }).slice(0, 10),
    stockCritico: productosCriticos || []
  };
}

function construirResumenMensualReporteOperativo(equipos, gastos, compras) {
  const ingresos = Number(((equipos && equipos.entregados ? equipos.entregados : []).reduce(function(acc, item) {
    return acc + Number(item.COSTO_ESTIMADO || 0);
  }, 0)).toFixed(2));
  const egresos = Number((((gastos || []).reduce(function(acc, item) {
    return acc + Number(item.MONTO || 0);
  }, 0)) + ((compras || []).reduce(function(acc, item) {
    return acc + Number(item.TOTAL || 0);
  }, 0))).toFixed(2));

  const servicios = {};
  const clientes = {};
  (equipos && equipos.recibidos ? equipos.recibidos : []).concat(equipos && equipos.entregados ? equipos.entregados : []).forEach(function(item) {
    const dispositivo = String(item.DISPOSITIVO || 'Sin clasificar').trim();
    servicios[dispositivo] = (servicios[dispositivo] || 0) + 1;
    const cliente = String(item.CLIENTE_NOMBRE || 'Sin nombre').trim();
    clientes[cliente] = (clientes[cliente] || 0) + 1;
  });

  return {
    ingresos: ingresos,
    egresos: egresos,
    utilidad: Number((ingresos - egresos).toFixed(2)),
    serviciosFrecuentes: Object.keys(servicios).length,
    clientesRecurrentes: Object.keys(clientes).filter(function(k) { return Number(clientes[k] || 0) > 1; }).length
  };
}

function construirDetalleMensualReporteOperativo(equipos, compras, gastos) {
  const servicios = {};
  const clientes = {};
  (equipos && equipos.recibidos ? equipos.recibidos : []).concat(equipos && equipos.entregados ? equipos.entregados : []).forEach(function(item) {
    const dispositivo = String(item.DISPOSITIVO || 'Sin clasificar').trim();
    servicios[dispositivo] = (servicios[dispositivo] || 0) + 1;
    const cliente = String(item.CLIENTE_NOMBRE || 'Sin nombre').trim();
    clientes[cliente] = (clientes[cliente] || 0) + 1;
  });
  return {
    serviciosFrecuentes: Object.keys(servicios).map(function(key) { return { servicio: key, total: servicios[key] }; }).sort(function(a, b) { return b.total - a.total; }).slice(0, 10),
    clientesRecurrentes: Object.keys(clientes).map(function(key) { return { cliente: key, total: clientes[key] }; }).filter(function(item) { return item.total > 1; }).sort(function(a, b) { return b.total - a.total; }).slice(0, 10),
    compras: compras || [],
    gastos: gastos || []
  };
}

function obtenerEquiposParaReportes(ss, fechaDesde, fechaHasta, sucursalId) {
  const hoja = ss.getSheetByName('Equipos');
  if (!hoja) return { recibidos: [], entregados: [] };
  asegurarColumnaSucursal(hoja);
  const datos = withRetry(() => hoja.getDataRange().getValues(), 'obtenerEquiposParaReportes.getValues');
  const headers = datos[0] || [];
  const items = datos.slice(1).map(row => mapearFila(headers, row)).filter(item => {
    const sucursalEquipo = normalizarSucursalId(item.SUCURSAL_ID);
    if (sucursalId !== 'GLOBAL' && sucursalEquipo !== sucursalId) return false;
    return true;
  });
  return {
    recibidos: items.filter(item => cumpleRango(parseFechaFlexible(item.FECHA_INGRESO || ''), fechaDesde, fechaHasta)),
    entregados: items.filter(item => String(item.ESTADO || '').trim() === 'Entregado' && cumpleRango(parseFechaFlexible(item.FECHA_ENTREGA || ''), fechaDesde, fechaHasta))
  };
}

function obtenerSolicitudesParaReportes(ss, fechaDesde, fechaHasta, sucursalId) {
  const hoja = ss.getSheetByName('Solicitudes');
  if (!hoja) return { cotizaciones: [] };
  asegurarColumnaSucursal(hoja);
  const datos = withRetry(() => hoja.getDataRange().getValues(), 'obtenerSolicitudesParaReportes.getValues');
  const headers = datos[0] || [];
  const cotizaciones = datos.slice(1).map(row => mapearFila(headers, row)).filter(item => {
    const sucursalSolicitud = normalizarSucursalId(item.SUCURSAL_ID);
    if (sucursalId !== 'GLOBAL' && sucursalSolicitud !== sucursalId) return false;
    if (String(item.ESTADO || '').trim().toLowerCase() !== 'cotizacion_archivada') return false;
    return cumpleRango(parseFechaFlexible(item.FECHA_COTIZACION || item.FECHA_SOLICITUD || ''), fechaDesde, fechaHasta);
  }).map(item => ({
    folio: String(item.FOLIO_COTIZACION_MANUAL || item.FOLIO_COTIZACION || '').trim(),
    cliente: String(item.NOMBRE || '').trim(),
    total: Number(item.COTIZACION_TOTAL || 0)
  }));
  return { cotizaciones: cotizaciones };
}

function obtenerGastosParaReportes(ss, fechaDesde, fechaHasta, sucursalId) {
  const hoja = obtenerHojaGastos(ss);
  const datos = withRetry(() => hoja.getDataRange().getValues(), 'obtenerGastosParaReportes.getValues');
  const headers = datos[0] || [];
  return datos.slice(1).map(row => normalizarGastoForApi(mapearFila(headers, row))).filter(item => {
    if (sucursalId !== 'GLOBAL' && normalizarSucursalId(item.SUCURSAL_ID) !== sucursalId) return false;
    return cumpleRango(parseFechaFlexible(item.FECHA || ''), fechaDesde, fechaHasta);
  });
}

function obtenerComprasParaReportes(ss, fechaDesde, fechaHasta, sucursalId) {
  const hoja = obtenerHojaOrdenesCompra(ss);
  const datos = withRetry(() => hoja.getDataRange().getValues(), 'obtenerComprasParaReportes.getValues');
  const headers = datos[0] || [];
  return datos.slice(1).map(row => mapearFila(headers, row)).map(item => ({
    FOLIO_OC: String(item.FOLIO_OC || '').trim(),
    PROVEEDOR: String(item.PROVEEDOR || '').trim(),
    TOTAL: Number(item.TOTAL || 0),
    FECHA: formatearFechaYMDOrEmpty(item.FECHA || ''),
    ESTADO: String(item.ESTADO || '').trim().toLowerCase(),
    SUCURSAL_ID: normalizarSucursalId(item.SUCURSAL_ID)
  })).filter(item => {
    if (item.ESTADO === 'cancelada') return false;
    if (sucursalId !== 'GLOBAL' && item.SUCURSAL_ID !== sucursalId) return false;
    return cumpleRango(parseFechaFlexible(item.FECHA || ''), fechaDesde, fechaHasta);
  });
}

function obtenerProductosCriticosParaReportes(ss, sucursalId) {
  const hoja = obtenerHojaProductos(ss);
  const datos = withRetry(() => hoja.getDataRange().getValues(), 'obtenerProductosCriticosParaReportes.getValues');
  const headers = datos[0] || [];
  return datos.slice(1).map(row => {
    const item = normalizarProductoForApi(mapearFila(headers, row));
    item.STOCK_ACTUAL = obtenerStockProductoEnSucursal(ss, item.SKU, sucursalId);
    item.STOCK_MINIMO = obtenerStockMinimoProductoEnSucursal(ss, item.SKU, sucursalId, item.STOCK_MINIMO);
    item.ALERTA_NIVEL = clasificarNivelAlertaStock(item);
    return item;
  }).filter(item => !!item.ALERTA_NIVEL)
    .sort((a, b) => Number(a.STOCK_ACTUAL || 0) - Number(b.STOCK_ACTUAL || 0))
    .slice(0, 15);
}

// ==========================================
// FUNCIÓN CORREGIDA (SIN CABECERAS MANUALES)
// ==========================================
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
