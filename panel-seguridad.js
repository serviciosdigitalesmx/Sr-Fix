const CONFIG = {
    BACKEND_URL: 'https://script.google.com/macros/s/AKfycbxH1zD8_14TvCajstFhtEpLNODwG9GZXkLoCXOb1IBNm0JIRmpCwS6SRsuGhZETK88z/exec'
};

let accionesCache = [];
let usuariosCache = [];
let currentUser = null;

function setButtonBusy(buttonId, isBusy, idleLabel, busyLabel) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    btn.disabled = isBusy;
    btn.classList.toggle('opacity-80', isBusy);
    btn.classList.toggle('cursor-wait', isBusy);
    btn.innerHTML = isBusy
        ? `<span class="btn-busy"><span class="spinner-ui"></span><span>${busyLabel}</span></span>`
        : idleLabel;
}

function escapeHtml(v) {
    return String(v || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function readCurrentUser() {
    try {
        const raw = sessionStorage.getItem('srfix_auth_user') || localStorage.getItem('srfix_auth_user');
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

async function fetchJson(payload) {
    let data = null;
    let res = await fetch(CONFIG.BACKEND_URL, { method: 'POST', body: JSON.stringify(payload) });
    if (res.ok) {
        try { data = await res.json(); } catch (e) {}
    }
    if (!data || data.error) {
        const q = new URLSearchParams(payload);
        q.set('t', String(Date.now()));
        res = await fetch(`${CONFIG.BACKEND_URL}?${q.toString()}`);
        data = await res.json();
    }
    if (data.error) throw new Error(data.error);
    return data;
}

function setStatus(msg, type = 'muted') {
    const el = document.getElementById('save-status');
    el.className = 'text-sm min-h-[20px]';
    if (type === 'ok') el.classList.add('text-green-300');
    else if (type === 'error') el.classList.add('text-red-300');
    else if (type === 'working') el.classList.add('status-working');
    else el.classList.add('text-[#8A8F95]');
    el.textContent = msg || '';
}

function ensureAdminAccess() {
    currentUser = readCurrentUser();
    const isAdmin = currentUser && String(currentUser.ROL || '').toLowerCase() === 'admin';
    document.getElementById('access-denied').classList.toggle('hidden', !!isAdmin);
    document.getElementById('form-seguridad').classList.toggle('hidden', !isAdmin);
    document.getElementById('usuarios-wrap').classList.toggle('hidden', !isAdmin);
    return !!isAdmin;
}

function renderAcciones() {
    const wrap = document.getElementById('acciones-list');
    wrap.innerHTML = accionesCache.map(item => `
        <label class="flex items-start gap-3 rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-4">
            <input type="checkbox" class="mt-1 accent-[#FF6A2A]" data-clave="${escapeHtml(item.clave)}" ${item.requiereAdmin ? 'checked' : ''}>
            <div>
                <div class="font-semibold text-white">${escapeHtml(item.titulo)}</div>
                <div class="text-sm text-[#8A8F95] mt-1">${escapeHtml(item.descripcion || '')}</div>
                <div class="text-[11px] text-[#5ea8ff] mt-2 font-mono">${escapeHtml(item.accion || item.clave)}</div>
            </div>
        </label>
    `).join('');
}

function renderUsuarios() {
    const wrap = document.getElementById('usuarios-list');
    wrap.innerHTML = usuariosCache.map(item => `
        <button type="button" data-edit-user="${escapeHtml(item.USUARIO)}" class="w-full text-left rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-4 hover:bg-[#1F7EDC]/10">
            <div class="flex items-center justify-between gap-3">
                <div>
                    <div class="font-semibold text-white">${escapeHtml(item.NOMBRE || item.USUARIO)}</div>
                    <div class="text-sm text-[#8A8F95] mt-1">${escapeHtml(item.USUARIO)} · ${escapeHtml(item.ROL)}</div>
                </div>
                <div class="text-xs ${item.ACTIVO ? 'text-green-300' : 'text-red-300'}">
                    ${item.ACTIVO ? 'Activo' : 'Inactivo'}
                </div>
            </div>
            ${item.NOTAS ? `<div class="text-xs text-[#8A8F95] mt-2">${escapeHtml(item.NOTAS)}</div>` : ''}
        </button>
    `).join('') || '<div class="text-sm text-[#8A8F95]">Sin usuarios cargados.</div>';
}

function actualizarKpis(config) {
    document.getElementById('kpi-acciones').textContent = String(accionesCache.filter(x => x.requiereAdmin).length);
    document.getElementById('kpi-admin').textContent = config.adminPasswordConfigured ? 'Sí' : 'No';
    document.getElementById('kpi-bitacora').textContent = config.bitacoraActiva ? 'Sí' : 'No';
}

async function cargarConfiguracion() {
    setButtonBusy('btn-refresh', true, '<i class="fa-solid fa-rotate-right"></i> Actualizar', 'Actualizando...');
    setButtonBusy('btn-reload', true, 'Recargar', 'Recargando...');
    document.getElementById('form-seguridad').classList.add('section-busy');
    setStatus('Cargando configuración...', 'working');
    const [seguridad, usuarios] = await Promise.all([
        fetchJson({ action: 'obtener_config_seguridad' }),
        fetchJson({ action: 'listar_usuarios_internos' })
    ]);
    accionesCache = Array.isArray(seguridad.acciones) ? seguridad.acciones : [];
    usuariosCache = Array.isArray(usuarios.usuarios) ? usuarios.usuarios : [];
    renderAcciones();
    renderUsuarios();
    document.getElementById('mensaje-autorizacion').value = seguridad.config?.mensajeAutorizacion || '';
    document.getElementById('bitacora-activa').checked = !!seguridad.config?.bitacoraActiva;
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-password-confirm').value = '';
    document.getElementById('admin-password-actual').value = '';
    actualizarKpis(seguridad.config || {});
    setStatus('Configuración cargada.');
    setButtonBusy('btn-refresh', false, '<i class="fa-solid fa-rotate-right"></i> Actualizar', 'Actualizando...');
    setButtonBusy('btn-reload', false, 'Recargar', 'Recargando...');
    document.getElementById('form-seguridad').classList.remove('section-busy');
}

function abrirModalUsuario(item = null) {
    document.getElementById('usuario-title').textContent = item ? `Editar ${item.NOMBRE || item.USUARIO}` : 'Nuevo usuario';
    document.getElementById('usuario-user').value = item?.USUARIO || '';
    document.getElementById('usuario-user').readOnly = !!item;
    document.getElementById('usuario-user').classList.toggle('opacity-70', !!item);
    document.getElementById('usuario-nombre').value = item?.NOMBRE || '';
    document.getElementById('usuario-rol').value = item?.ROL || 'operativo';
    document.getElementById('usuario-activo').value = item?.ACTIVO ? 'SI' : 'NO';
    document.getElementById('usuario-password').value = '';
    document.getElementById('usuario-notas').value = item?.NOTAS || '';
    document.getElementById('modal-usuario').classList.remove('hidden');
}

function cerrarModalUsuario() {
    document.getElementById('modal-usuario').classList.add('hidden');
}

async function guardarConfiguracion(ev) {
    ev.preventDefault();
    const passActual = document.getElementById('admin-password-actual').value;
    const pass = document.getElementById('admin-password').value;
    const confirmPass = document.getElementById('admin-password-confirm').value;
    if (!passActual) {
        setStatus('Necesitas ingresar la clave admin actual para guardar.', 'error');
        return;
    }
    if (pass || confirmPass) {
        if (pass.length < 4) {
            setStatus('La nueva clave admin debe tener al menos 4 caracteres.', 'error');
            return;
        }
        if (pass !== confirmPass) {
            setStatus('La confirmación de la nueva clave admin no coincide.', 'error');
            return;
        }
    }

    const acciones = Array.from(document.querySelectorAll('#acciones-list [data-clave]')).map(input => ({
        clave: input.getAttribute('data-clave'),
        requiereAdmin: input.checked
    }));

    setButtonBusy('btn-save-config', true, 'Guardar configuración', 'Guardando...');
    document.getElementById('form-seguridad').classList.add('section-busy');
    setStatus('Guardando configuración...', 'working');
    try {
        const data = await fetchJson({
            action: 'guardar_config_seguridad',
            adminPasswordActual: passActual,
            adminPassword: pass,
            mensajeAutorizacion: document.getElementById('mensaje-autorizacion').value.trim(),
            bitacoraActiva: document.getElementById('bitacora-activa').checked,
            acciones: acciones,
            actor: {
                usuario: currentUser?.USUARIO || '',
                nombre: currentUser?.NOMBRE || '',
                rol: currentUser?.ROL || ''
            }
        });

        accionesCache = Array.isArray(data.acciones) ? data.acciones : [];
        renderAcciones();
        actualizarKpis(data.config || {});
        document.getElementById('admin-password').value = '';
        document.getElementById('admin-password-confirm').value = '';
        document.getElementById('admin-password-actual').value = '';
        setStatus('Configuración guardada correctamente.', 'ok');
    } finally {
        setButtonBusy('btn-save-config', false, 'Guardar configuración', 'Guardando...');
        document.getElementById('form-seguridad').classList.remove('section-busy');
    }
}

async function guardarUsuario(ev) {
    ev.preventDefault();
    const adminPasswordActual = document.getElementById('admin-password-actual').value;
    if (!adminPasswordActual) {
        setStatus('Necesitas la clave admin actual para guardar usuarios.', 'error');
        return;
    }
    const payload = {
        action: 'guardar_usuario_interno',
        adminPasswordActual: adminPasswordActual,
        usuario: document.getElementById('usuario-user').value.trim(),
        nombre: document.getElementById('usuario-nombre').value.trim(),
        rol: document.getElementById('usuario-rol').value,
        activo: document.getElementById('usuario-activo').value === 'SI',
        password: document.getElementById('usuario-password').value,
        notas: document.getElementById('usuario-notas').value.trim(),
        actor: {
            usuario: currentUser?.USUARIO || '',
            nombre: currentUser?.NOMBRE || '',
            rol: currentUser?.ROL || ''
        }
    };

    setButtonBusy('btn-save-user', true, 'Guardar usuario', 'Guardando...');
    setStatus('Guardando usuario...', 'working');
    try {
        const data = await fetchJson(payload);
        usuariosCache = Array.isArray(data.usuarios) ? data.usuarios : [];
        renderUsuarios();
        cerrarModalUsuario();
        setStatus('Usuario guardado correctamente.', 'ok');
    } finally {
        setButtonBusy('btn-save-user', false, 'Guardar usuario', 'Guardando...');
    }
}

function bindEvents() {
    document.getElementById('btn-refresh').addEventListener('click', () => {
        cargarConfiguracion().catch(e => setStatus(e.message, 'error'));
    });
    document.getElementById('btn-reload').addEventListener('click', () => {
        cargarConfiguracion().catch(e => setStatus(e.message, 'error'));
    });
    document.getElementById('form-seguridad').addEventListener('submit', (ev) => {
        guardarConfiguracion(ev).catch(e => setStatus(e.message, 'error'));
    });
    document.getElementById('btn-nuevo-usuario').addEventListener('click', () => abrirModalUsuario());
    document.getElementById('usuarios-list').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-edit-user]');
        if (!btn) return;
        const item = usuariosCache.find(x => x.USUARIO === btn.getAttribute('data-edit-user'));
        if (item) abrirModalUsuario(item);
    });
    document.querySelectorAll('[data-close-usuario]').forEach(btn => btn.addEventListener('click', cerrarModalUsuario));
    document.getElementById('modal-usuario').addEventListener('click', (e) => {
        if (e.target.id === 'modal-usuario') cerrarModalUsuario();
    });
    document.getElementById('form-usuario').addEventListener('submit', (ev) => {
        guardarUsuario(ev).catch(e => setStatus(e.message, 'error'));
    });
}

bindEvents();

if (ensureAdminAccess()) {
    cargarConfiguracion().catch(e => setStatus(e.message, 'error'));
} else {
    setStatus('Acceso restringido.', 'error');
}
