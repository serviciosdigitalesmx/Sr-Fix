"use strict";
;
(function () {
    const BACKEND_URL = String(CONFIG.API_URL || '').trim();
    const elBtnRefresh = requireElement('btn-refresh');
    const elBtnReload = requireElement('btn-reload');
    const elBtnSaveConfig = requireElement('btn-save-config');
    const elBtnNuevoUsuario = requireElement('btn-nuevo-usuario');
    const elFormSeguridad = requireElement('form-seguridad');
    const elFormUsuario = requireElement('form-usuario');
    const elAccessDenied = requireElement('access-denied');
    const elUsuariosWrap = requireElement('usuarios-wrap');
    const elAccionesList = requireElement('acciones-list');
    const elUsuariosList = requireElement('usuarios-list');
    const elMensajeAutorizacion = requireElement('mensaje-autorizacion');
    const elBitacoraActiva = requireElement('bitacora-activa');
    const elAdminPasswordActual = requireElement('admin-password-actual');
    const elAdminPassword = requireElement('admin-password');
    const elAdminPasswordConfirm = requireElement('admin-password-confirm');
    const elKpiAcciones = requireElement('kpi-acciones');
    const elKpiAdmin = requireElement('kpi-admin');
    const elKpiBitacora = requireElement('kpi-bitacora');
    const elSaveStatus = requireElement('save-status');
    const elUsuarioStatus = requireElement('usuario-status');
    const elModalUsuario = requireElement('modal-usuario');
    const elModalUsuarioBusy = requireElement('modal-usuario-busy');
    const elFormUsuarioBusy = requireElement('form-usuario');
    const elUsuarioTitle = requireElement('usuario-title');
    const elUsuarioUser = requireElement('usuario-user');
    const elUsuarioNombre = requireElement('usuario-nombre');
    const elUsuarioRol = requireElement('usuario-rol');
    const elUsuarioActivo = requireElement('usuario-activo');
    const elUsuarioPassword = requireElement('usuario-password');
    const elUsuarioAdminPasswordActual = requireElement('usuario-admin-password-actual');
    const elUsuarioNotas = requireElement('usuario-notas');
    const elBtnSaveUser = requireElement('btn-save-user');
    let accionesCache = [];
    let usuariosCache = [];
    let currentUser = null;
    function requireElement(id) {
        const el = document.getElementById(id);
        if (!el) {
            throw new Error(`Elemento no encontrado: ${id}`);
        }
        return el;
    }
    function escapeHtml(v) {
        return String(v ?? '')
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
        }
        catch {
            return null;
        }
    }
    function setButtonBusy(button, isBusy, idleLabel, busyLabel) {
        button.disabled = isBusy;
        button.classList.toggle('opacity-80', isBusy);
        button.classList.toggle('cursor-wait', isBusy);
        button.innerHTML = isBusy
            ? `<span class="btn-busy"><span class="spinner-ui"></span><span>${busyLabel}</span></span>`
            : idleLabel;
    }
    function setUserModalBusy(isBusy) {
        elModalUsuarioBusy.classList.toggle('hidden', !isBusy);
        Array.from(elFormUsuarioBusy.elements || []).forEach((el) => {
            el.disabled = isBusy;
        });
    }
    function buildGetUrl(action, payload) {
        const q = new URLSearchParams();
        q.set('action', action);
        q.set('t', String(Date.now()));
        Object.entries(payload).forEach(([key, raw]) => {
            if (raw === undefined || raw === null || raw === '')
                return;
            if (typeof raw === 'object') {
                q.set(key, JSON.stringify(raw));
                return;
            }
            q.set(key, String(raw));
        });
        return `${BACKEND_URL}?${q.toString()}`;
    }
    async function readJson(response) {
        const text = await response.text();
        if (!text.trim())
            throw new Error(`Respuesta vacía (${response.status})`);
        try {
            return JSON.parse(text);
        }
        catch {
            throw new Error(`Respuesta inválida (${response.status}): ${text.slice(0, 180)}`);
        }
    }
    async function requestBackend(action, payload = {}, method = 'POST') {
        const canRetryAsGet = !/^(guardar_|registrar_|eliminar_|archivar_|transferir_|recibir_|cambiar_|login_|validar_|crear_|reabrir_)/.test(String(action || '').trim().toLowerCase());
        const requestGet = () => fetch(buildGetUrl(action, payload), { method: 'GET' });
        const requestPost = () => fetch(BACKEND_URL, {
            method: 'POST',
            body: JSON.stringify({ action, ...payload })
        });
        try {
            const response = method === 'GET' ? await requestGet() : await requestPost();
            const data = await readJson(response);
            const errorText = typeof data.error === 'string' ? data.error.trim() : '';
            if (errorText)
                throw new Error(errorText);
            if (Object.prototype.hasOwnProperty.call(data, 'success') && data.success === false) {
                throw new Error(errorText || `La operación ${action} fue rechazada`);
            }
            return data;
        }
        catch (error) {
            if (method !== 'POST' || !canRetryAsGet)
                throw error;
            const response = await requestGet();
            const data = await readJson(response);
            const errorText = typeof data.error === 'string' ? data.error.trim() : '';
            if (errorText)
                throw new Error(errorText);
            if (Object.prototype.hasOwnProperty.call(data, 'success') && data.success === false) {
                throw new Error(errorText || `La operación ${action} fue rechazada`);
            }
            return data;
        }
    }
    function setStatus(msg, type = 'muted') {
        elSaveStatus.className = 'text-sm min-h-[20px]';
        if (type === 'ok')
            elSaveStatus.classList.add('text-green-300');
        else if (type === 'error')
            elSaveStatus.classList.add('text-red-300');
        else if (type === 'working')
            elSaveStatus.classList.add('status-working');
        else
            elSaveStatus.classList.add('text-[#8A8F95]');
        elSaveStatus.textContent = msg || '';
    }
    function setUserStatus(msg, type = 'muted') {
        elUsuarioStatus.className = 'text-sm min-h-[20px]';
        if (type === 'ok')
            elUsuarioStatus.classList.add('text-green-300');
        else if (type === 'error')
            elUsuarioStatus.classList.add('text-red-300');
        else if (type === 'working')
            elUsuarioStatus.classList.add('status-working');
        else
            elUsuarioStatus.classList.add('text-[#8A8F95]');
        elUsuarioStatus.textContent = msg || '';
    }
    function ensureAdminAccess() {
        currentUser = readCurrentUser();
        const isAdmin = !!currentUser && String(currentUser.ROL || '').toLowerCase() === 'admin';
        elAccessDenied.classList.toggle('hidden', !!isAdmin);
        elFormSeguridad.classList.toggle('hidden', !isAdmin);
        elUsuariosWrap.classList.toggle('hidden', !isAdmin);
        return isAdmin;
    }
    function renderAcciones() {
        elAccionesList.innerHTML = accionesCache.map((item) => `
      <label class="flex items-start gap-3 rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-4 security-action-card">
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
        elUsuariosList.innerHTML = usuariosCache.map((item) => `
      <button type="button" data-edit-user="${escapeHtml(item.USUARIO)}" class="w-full text-left rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-4 hover:bg-[#1F7EDC]/10 security-user-card">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="font-semibold text-white">${escapeHtml(item.NOMBRE || item.USUARIO)}</div>
            <div class="text-sm text-[#8A8F95] mt-1">${escapeHtml(item.USUARIO)} · ${escapeHtml(String(item.ROL || ''))}</div>
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
        elKpiAcciones.textContent = String(accionesCache.filter((x) => x.requiereAdmin).length);
        elKpiAdmin.textContent = config.adminPasswordConfigured ? 'Sí' : 'No';
        elKpiBitacora.textContent = config.bitacoraActiva ? 'Sí' : 'No';
    }
    async function cargarConfiguracion() {
        setButtonBusy(elBtnRefresh, true, '<i class="fa-solid fa-rotate-right"></i> Actualizar', 'Actualizando...');
        setButtonBusy(elBtnReload, true, 'Recargar', 'Recargando...');
        elFormSeguridad.classList.add('section-busy');
        setStatus('Cargando configuración...', 'working');
        const [seguridad, usuarios] = await Promise.all([
            requestBackend('obtener_config_seguridad', {}, 'GET'),
            requestBackend('listar_usuarios_internos', {}, 'GET')
        ]);
        accionesCache = Array.isArray(seguridad.acciones) ? seguridad.acciones : [];
        usuariosCache = Array.isArray(usuarios.usuarios) ? usuarios.usuarios : [];
        renderAcciones();
        renderUsuarios();
        elMensajeAutorizacion.value = String(seguridad.config?.mensajeAutorizacion || '');
        elBitacoraActiva.checked = !!seguridad.config?.bitacoraActiva;
        elAdminPassword.value = '';
        elAdminPasswordConfirm.value = '';
        elAdminPasswordActual.value = '';
        actualizarKpis(seguridad.config || {});
        setStatus('Configuración cargada.');
        setButtonBusy(elBtnRefresh, false, '<i class="fa-solid fa-rotate-right"></i> Actualizar', 'Actualizando...');
        setButtonBusy(elBtnReload, false, 'Recargar', 'Recargando...');
        elFormSeguridad.classList.remove('section-busy');
    }
    function abrirModalUsuario(item = null) {
        elUsuarioTitle.textContent = item ? `Editar ${item.NOMBRE || item.USUARIO}` : 'Nuevo usuario';
        elUsuarioUser.value = item?.USUARIO || '';
        elUsuarioUser.readOnly = !!item;
        elUsuarioUser.classList.toggle('opacity-70', !!item);
        elUsuarioNombre.value = item?.NOMBRE || '';
        elUsuarioRol.value = String(item?.ROL || 'operativo');
        elUsuarioActivo.value = item?.ACTIVO ? 'SI' : 'NO';
        elUsuarioPassword.value = '';
        elUsuarioAdminPasswordActual.value = '';
        elUsuarioNotas.value = item?.NOTAS || '';
        setUserStatus('');
        setUserModalBusy(false);
        elModalUsuario.classList.remove('hidden');
    }
    function cerrarModalUsuario() {
        setUserModalBusy(false);
        elModalUsuario.classList.add('hidden');
    }
    async function guardarConfiguracion(ev) {
        ev.preventDefault();
        const passActual = elAdminPasswordActual.value;
        const pass = elAdminPassword.value;
        const confirmPass = elAdminPasswordConfirm.value;
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
        const acciones = Array.from(document.querySelectorAll('#acciones-list [data-clave]')).map((input) => {
            const checkbox = input;
            return {
                clave: checkbox.getAttribute('data-clave') || '',
                requiereAdmin: checkbox.checked
            };
        });
        setButtonBusy(elBtnSaveConfig, true, 'Guardar configuración', 'Guardando...');
        elFormSeguridad.classList.add('section-busy');
        setStatus('Guardando configuración...', 'working');
        try {
            const data = await requestBackend('guardar_config_seguridad', {
                adminPasswordActual: passActual,
                adminPassword: pass,
                mensajeAutorizacion: elMensajeAutorizacion.value.trim(),
                bitacoraActiva: elBitacoraActiva.checked,
                acciones,
                actor: {
                    usuario: currentUser?.USUARIO || '',
                    nombre: currentUser?.NOMBRE || '',
                    rol: currentUser?.ROL || ''
                }
            }, 'POST');
            accionesCache = Array.isArray(data.acciones) ? data.acciones : [];
            renderAcciones();
            actualizarKpis(data.config || {});
            elAdminPassword.value = '';
            elAdminPasswordConfirm.value = '';
            elAdminPasswordActual.value = '';
            setStatus('Configuración guardada correctamente.', 'ok');
        }
        finally {
            setButtonBusy(elBtnSaveConfig, false, 'Guardar configuración', 'Guardando...');
            elFormSeguridad.classList.remove('section-busy');
        }
    }
    async function guardarUsuario(ev) {
        ev.preventDefault();
        const adminPasswordActual = elUsuarioAdminPasswordActual.value;
        if (!adminPasswordActual) {
            setUserStatus('Necesitas la clave admin actual para guardar usuarios.', 'error');
            return;
        }
        const payload = {
            action: 'guardar_usuario_interno',
            adminPasswordActual,
            usuario: elUsuarioUser.value.trim(),
            nombre: elUsuarioNombre.value.trim(),
            rol: elUsuarioRol.value,
            activo: elUsuarioActivo.value === 'SI',
            password: elUsuarioPassword.value,
            notas: elUsuarioNotas.value.trim(),
            actor: {
                usuario: currentUser?.USUARIO || '',
                nombre: currentUser?.NOMBRE || '',
                rol: currentUser?.ROL || ''
            }
        };
        setButtonBusy(elBtnSaveUser, true, 'Guardar usuario', 'Guardando...');
        setUserModalBusy(true);
        setUserStatus('Guardando usuario...', 'working');
        setStatus('Guardando usuario...', 'working');
        try {
            const data = await requestBackend('guardar_usuario_interno', payload, 'POST');
            usuariosCache = Array.isArray(data.usuarios) ? data.usuarios : [];
            renderUsuarios();
            cerrarModalUsuario();
            setStatus('Usuario guardado correctamente.', 'ok');
        }
        finally {
            setButtonBusy(elBtnSaveUser, false, 'Guardar usuario', 'Guardando...');
            setUserModalBusy(false);
        }
    }
    function bindEvents() {
        elBtnRefresh.addEventListener('click', () => { void cargarConfiguracion().catch((e) => setStatus(e instanceof Error ? e.message : String(e), 'error')); });
        elBtnReload.addEventListener('click', () => { void cargarConfiguracion().catch((e) => setStatus(e instanceof Error ? e.message : String(e), 'error')); });
        elFormSeguridad.addEventListener('submit', (ev) => { void guardarConfiguracion(ev).catch((e) => setStatus(e instanceof Error ? e.message : String(e), 'error')); });
        elBtnNuevoUsuario.addEventListener('click', () => abrirModalUsuario());
        elUsuariosList.addEventListener('click', (e) => {
            const target = e.target;
            const btn = target?.closest('[data-edit-user]');
            if (!btn)
                return;
            const item = usuariosCache.find((x) => x.USUARIO === btn.getAttribute('data-edit-user'));
            if (item)
                abrirModalUsuario(item);
        });
        document.querySelectorAll('[data-close-usuario]').forEach((btn) => btn.addEventListener('click', cerrarModalUsuario));
        elModalUsuario.addEventListener('click', (e) => {
            if (e.target === elModalUsuario)
                cerrarModalUsuario();
        });
        elFormUsuario.addEventListener('submit', (ev) => { void guardarUsuario(ev).catch((e) => setStatus(e instanceof Error ? e.message : String(e), 'error')); });
    }
    bindEvents();
    if (ensureAdminAccess()) {
        void cargarConfiguracion().catch((e) => setStatus(e instanceof Error ? e.message : String(e), 'error'));
    }
    else {
        setStatus('Acceso restringido.', 'error');
    }
})();
