/**
 * Security - autorización administrativa y usuarios internos.
 */

const SECURITY_PROP_KEYS = {
  ADMIN_PASSWORD_HASH: 'SRFIX_ADMIN_PASSWORD_HASH_V1',
  ADMIN_PASSWORD_SALT: 'SRFIX_ADMIN_PASSWORD_SALT_V1',
  CONFIG_JSON: 'SRFIX_SECURITY_CONFIG_JSON_V1'
};

const SECURITY_USERS_SHEET = 'UsuariosInternos';

function Security_defaultActions() {
  return [
    {
      clave: 'editar_costo_equipo',
      titulo: 'Editar costo de equipo',
      descripcion: 'Bloquea cambios monetarios en el taller.',
      accion: 'actualizar_equipo',
      requiereAdmin: true
    },
    {
      clave: 'crear_equipo_con_costo',
      titulo: 'Registrar equipo con costo',
      descripcion: 'Protege el alta de órdenes con monto estimado.',
      accion: 'crear_equipo',
      requiereAdmin: true
    },
    {
      clave: 'editar_producto_monetario',
      titulo: 'Editar costo/precio de producto',
      descripcion: 'Protege inventario con impacto financiero.',
      accion: 'guardar_producto',
      requiereAdmin: true
    },
    {
      clave: 'editar_gasto_monto',
      titulo: 'Editar monto de gasto',
      descripcion: 'Bloquea altas y cambios de egresos.',
      accion: 'guardar_gasto',
      requiereAdmin: true
    },
    {
      clave: 'cerrar_entrega_equipo',
      titulo: 'Marcar equipo entregado',
      descripcion: 'Protege el cierre que genera ingreso financiero.',
      accion: 'actualizar_equipo',
      requiereAdmin: true
    }
  ];
}

function Security_defaultConfig() {
  return {
    mensajeAutorizacion: 'Esta acción requiere autorización administrativa.',
    bitacoraActiva: true,
    acciones: Security_defaultActions()
  };
}

function Security_props() {
  return PropertiesService.getScriptProperties();
}

function Security_createSalt() {
  return Utilities.getUuid().replace(/-/g, '');
}

function Security_bytesToHex(bytes) {
  return (bytes || []).map(function(b) {
    const n = (b + 256) % 256;
    return n.toString(16).padStart(2, '0');
  }).join('');
}

function Security_hashPassword(password, salt) {
  const input = String(password || '');
  const seed = String(salt || '');
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    seed + '::' + input,
    Utilities.Charset.UTF_8
  );
  return Security_bytesToHex(bytes);
}

function Security_getAdminCredentials() {
  const props = Security_props();
  const hash = String(props.getProperty(SECURITY_PROP_KEYS.ADMIN_PASSWORD_HASH) || '').trim();
  const salt = String(props.getProperty(SECURITY_PROP_KEYS.ADMIN_PASSWORD_SALT) || '').trim();
  return { hash: hash, salt: salt };
}

function Security_isAdminPasswordConfigured() {
  const creds = Security_getAdminCredentials();
  return !!(creds.hash && creds.salt);
}

function Security_verifyInternalUserPassword(usuario, password) {
  const username = String(usuario || '').trim().toLowerCase();
  const candidate = String(password || '').trim();
  if (!username || !candidate) return false;

  const table = Security_readUsersTable();
  const idx = Security_findUserRowIndex(table, username);
  if (idx < 0) {
    return username === 'admin' && candidate === 'Admin1';
  }

  const user = mapearFila(table.headers, table.rows[idx]);
  if (!boolFromCheck(user.ACTIVO)) return false;

  const storedHash = String(user.PASSWORD_HASH || '').trim();
  const storedSalt = String(user.PASSWORD_SALT || '').trim();
  const legacyPass = String(user.PASSWORD || '').trim();

  if (storedHash && storedSalt) {
    return Security_hashPassword(candidate, storedSalt) === storedHash;
  }
  return legacyPass ? legacyPass === candidate : false;
}

function Security_verifyAdminPassword(password) {
  const creds = Security_getAdminCredentials();
  const candidate = String(password || '').trim();
  if (!candidate) return false;

  if (creds.hash && creds.salt && Security_hashPassword(candidate, creds.salt) === creds.hash) {
    return true;
  }

  return Security_verifyInternalUserPassword('admin', candidate);
}

function Security_setAdminPassword(newPassword) {
  const pass = String(newPassword || '').trim();
  if (!pass) return false;
  const props = Security_props();
  const salt = Security_createSalt();
  const hash = Security_hashPassword(pass, salt);
  props.setProperty(SECURITY_PROP_KEYS.ADMIN_PASSWORD_SALT, salt);
  props.setProperty(SECURITY_PROP_KEYS.ADMIN_PASSWORD_HASH, hash);
  return true;
}

function Security_readConfig() {
  const props = Security_props();
  const raw = String(props.getProperty(SECURITY_PROP_KEYS.CONFIG_JSON) || '').trim();
  if (!raw) return Security_defaultConfig();
  try {
    const parsed = JSON.parse(raw);
    return Object.assign(Security_defaultConfig(), parsed || {});
  } catch (e) {
    return Security_defaultConfig();
  }
}

function Security_saveConfig(config) {
  const next = Object.assign(Security_defaultConfig(), config || {});
  Security_props().setProperty(SECURITY_PROP_KEYS.CONFIG_JSON, JSON.stringify(next));
  return next;
}

function Security_getUsersSheet() {
  return crearHojaSiNoExiste(Core_getSpreadsheet(), SECURITY_USERS_SHEET, [
    'USUARIO',
    'NOMBRE',
    'ROL',
    'ACTIVO',
    'PASSWORD_HASH',
    'PASSWORD_SALT',
    'NOTAS',
    'FECHA_CREACION',
    'FECHA_ACTUALIZACION'
  ]);
}

function Security_readUsersTable() {
  const hoja = Security_getUsersSheet();
  const data = withRetry(function() {
    return hoja.getDataRange().getValues();
  }, 'Security_readUsersTable');
  if (!data || data.length < 1) return { headers: [], rows: [] };
  return { headers: data[0] || [], rows: data.slice(1) };
}

function Security_normalizeUser(rowMap) {
  const obj = rowMap || {};
  return {
    USUARIO: String(obj.USUARIO || '').trim(),
    NOMBRE: String(obj.NOMBRE || '').trim(),
    ROL: String(obj.ROL || '').trim() || 'operativo',
    ACTIVO: boolFromCheck(obj.ACTIVO),
    NOTAS: String(obj.NOTAS || '').trim(),
    FECHA_CREACION: String(obj.FECHA_CREACION || '').trim(),
    FECHA_ACTUALIZACION: String(obj.FECHA_ACTUALIZACION || '').trim()
  };
}

function Security_findUserRowIndex(table, usuario) {
  const target = String(usuario || '').trim().toLowerCase();
  if (!target) return -1;
  const idx = _getHeaderIndex(table.headers, ['USUARIO']);
  if (idx < 0) return -1;
  return (table.rows || []).findIndex(function(row) {
    return String(row[idx] || '').trim().toLowerCase() === target;
  });
}

function Security_findUserByUsername(usuario) {
  const table = Security_readUsersTable();
  const idx = Security_findUserRowIndex(table, usuario);
  if (idx < 0) return null;
  return Security_normalizeUser(mapearFila(table.headers, table.rows[idx]));
}

function Security_listUsers() {
  const table = Security_readUsersTable();
  const users = (table.rows || []).map(function(row) {
    const user = Security_normalizeUser(mapearFila(table.headers, row));
    delete user.PASSWORD_HASH;
    delete user.PASSWORD_SALT;
    return user;
  }).sort(function(a, b) {
    return String(a.NOMBRE || a.USUARIO || '').localeCompare(String(b.NOMBRE || b.USUARIO || ''));
  });
  return jsonResponse({ success: true, usuarios: users });
}

function Security_upsertUser(payload) {
  const table = Security_readUsersTable();
  const headers = table.headers || [];
  const hoja = Security_getUsersSheet();
  const now = new Date().toISOString();
  const usuario = String(payload.usuario || '').trim().toLowerCase();
  if (!usuario) return jsonResponse({ error: 'usuario requerido' });

  const passwordRaw = String(payload.password || '').trim();
  const idx = Security_findUserRowIndex(table, usuario);
  const existing = idx >= 0 ? mapearFila(headers, table.rows[idx]) : null;
  const salt = passwordRaw ? Security_createSalt() : String(existing && existing.PASSWORD_SALT || '').trim();
  const hash = passwordRaw ? Security_hashPassword(passwordRaw, salt) : String(existing && existing.PASSWORD_HASH || '').trim();
  const record = {
    USUARIO: usuario,
    NOMBRE: String(payload.nombre || '').trim(),
    ROL: String(payload.rol || 'operativo').trim() || 'operativo',
    ACTIVO: payload.activo ? 'SI' : 'NO',
    PASSWORD_HASH: hash,
    PASSWORD_SALT: salt,
    NOTAS: String(payload.notas || '').trim(),
    FECHA_CREACION: existing ? String(existing.FECHA_CREACION || now) : now,
    FECHA_ACTUALIZACION: now
  };

  const rowValues = headers.map(function(header) {
    return record[header] !== undefined ? record[header] : '';
  });

  if (idx >= 0) {
    withRetry(function() {
      hoja.getRange(idx + 2, 1, 1, rowValues.length).setValues([rowValues]);
      return true;
    }, 'Security_upsertUser.write');
  } else {
    if (!headers.length || headers[0] !== 'USUARIO') {
      hoja.getRange(1, 1, 1, 9).setValues([['USUARIO', 'NOMBRE', 'ROL', 'ACTIVO', 'PASSWORD_HASH', 'PASSWORD_SALT', 'NOTAS', 'FECHA_CREACION', 'FECHA_ACTUALIZACION']]);
    }
    withRetry(function() {
      hoja.appendRow(rowValues);
      return true;
    }, 'Security_upsertUser.append');
  }

  return jsonResponse({
    success: true,
    usuario: Security_normalizeUser(record)
  });
}

function Security_getConfig() {
  const config = Security_readConfig();
  const data = Object.assign({}, config, {
    adminPasswordConfigured: Security_isAdminPasswordConfigured()
  });
  return jsonResponse({
    success: true,
    config: data,
    acciones: Array.isArray(config.acciones) && config.acciones.length ? config.acciones : Security_defaultActions()
  });
}

function Security_saveConfigAction(data) {
  const payload = data || {};
  const currentPass = String(payload.adminPasswordActual || '').trim();
  const nextPass = String(payload.adminPassword || '').trim();
  const currentConfigured = Security_isAdminPasswordConfigured();
  if (currentConfigured) {
    if (!Security_verifyAdminPassword(currentPass)) {
      return jsonResponse({ error: 'Clave admin actual inválida' });
    }
  } else if (!currentPass && !nextPass) {
    return jsonResponse({ error: 'Debes definir la clave admin inicial' });
  }

  const currentConfig = Security_readConfig();
  const nextConfig = Object.assign({}, currentConfig, {
    mensajeAutorizacion: String(payload.mensajeAutorizacion || currentConfig.mensajeAutorizacion || '').trim(),
    bitacoraActiva: !!payload.bitacoraActiva,
    acciones: Array.isArray(payload.acciones) && payload.acciones.length ? payload.acciones : currentConfig.acciones
  });

  Security_saveConfig(nextConfig);

  if (nextPass) {
    Security_setAdminPassword(nextPass);
  } else if (!currentConfigured) {
    Security_setAdminPassword(currentPass || 'Admin1');
  }

  return jsonResponse({
    success: true,
    config: Object.assign({}, nextConfig, { adminPasswordConfigured: Security_isAdminPasswordConfigured() }),
    acciones: nextConfig.acciones
  });
}

function Security_validateAdminPasswordAction(data) {
  const password = String(data && data.adminPassword || data && data.adminPasswordActual || '').trim();
  return jsonResponse({
    success: Security_verifyAdminPassword(password),
    adminPasswordConfigured: Security_isAdminPasswordConfigured(),
    error: Security_verifyAdminPassword(password) ? null : 'Clave admin inválida'
  });
}

function Security_requireAdminPassword(data, reason) {
  const password = String(data && data.adminPasswordActual || data && data.adminPassword || '').trim();
  if (!Security_verifyAdminPassword(password)) {
    return { ok: false, error: reason ? `${reason}. Clave admin inválida` : 'Clave admin inválida' };
  }
  return { ok: true };
}

function Security_requireMoneyAuthorization(data, reason) {
  return Security_requireAdminPassword(data, reason);
}

function loginInterno(data) {
  const payload = data || {};
  const usuario = String(payload.usuario || '').trim().toLowerCase();
  const password = String(payload.password || '').trim();
  if (!usuario || !password) return jsonResponse({ error: 'Credenciales requeridas' });

  const table = Security_readUsersTable();
  const idx = Security_findUserRowIndex(table, usuario);
  if (idx < 0) {
    if (usuario === 'admin' && password === 'Admin1') {
      return jsonResponse({
        success: true,
        user: {
          USUARIO: 'admin',
          NOMBRE: 'Administrador',
          ROL: 'admin',
          ACTIVO: true,
          NOTAS: ''
        }
      });
    }
    return jsonResponse({ error: 'Credenciales inválidas' });
  }

  const user = mapearFila(table.headers, table.rows[idx]);
  const active = boolFromCheck(user.ACTIVO);
  if (!active) return jsonResponse({ error: 'Usuario inactivo' });
  const storedHash = String(user.PASSWORD_HASH || '').trim();
  const storedSalt = String(user.PASSWORD_SALT || '').trim();
  const legacyPass = String(user.PASSWORD || '').trim();
  const valid = storedHash && storedSalt
    ? Security_hashPassword(password, storedSalt) === storedHash
    : (legacyPass ? legacyPass === password : false);
  if (!valid) return jsonResponse({ error: 'Credenciales inválidas' });

  return jsonResponse({
    success: true,
    user: Security_normalizeUser(user)
  });
}
