const CONFIG = {
    BACKEND_URL: 'https://script.google.com/macros/s/AKfycbxH1zD8_14TvCajstFhtEpLNODwG9GZXkLoCXOb1IBNm0JIRmpCwS6SRsuGhZETK88z/exec'
};

let accionesCache = [];

function escapeHtml(v) {
    return String(v || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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
    else el.classList.add('text-[#8A8F95]');
    el.textContent = msg || '';
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

function actualizarKpis(config) {
    document.getElementById('kpi-acciones').textContent = String(accionesCache.filter(x => x.requiereAdmin).length);
    document.getElementById('kpi-admin').textContent = config.adminPasswordConfigured ? 'Sí' : 'No';
    document.getElementById('kpi-bitacora').textContent = config.bitacoraActiva ? 'Sí' : 'No';
}

async function cargarConfiguracion() {
    setStatus('Cargando configuración...');
    const data = await fetchJson({ action: 'obtener_config_seguridad' });
    accionesCache = Array.isArray(data.acciones) ? data.acciones : [];
    renderAcciones();
    document.getElementById('mensaje-autorizacion').value = data.config?.mensajeAutorizacion || '';
    document.getElementById('bitacora-activa').checked = !!data.config?.bitacoraActiva;
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-password-confirm').value = '';
    actualizarKpis(data.config || {});
    setStatus('Configuración cargada.');
}

async function guardarConfiguracion(ev) {
    ev.preventDefault();
    const pass = document.getElementById('admin-password').value;
    const confirmPass = document.getElementById('admin-password-confirm').value;
    if (pass || confirmPass) {
        if (pass.length < 4) {
            setStatus('La clave admin debe tener al menos 4 caracteres.', 'error');
            return;
        }
        if (pass !== confirmPass) {
            setStatus('La confirmación de la clave admin no coincide.', 'error');
            return;
        }
    }

    const acciones = Array.from(document.querySelectorAll('#acciones-list [data-clave]')).map(input => ({
        clave: input.getAttribute('data-clave'),
        requiereAdmin: input.checked
    }));

    setStatus('Guardando configuración...');
    const data = await fetchJson({
        action: 'guardar_config_seguridad',
        adminPassword: pass,
        mensajeAutorizacion: document.getElementById('mensaje-autorizacion').value.trim(),
        bitacoraActiva: document.getElementById('bitacora-activa').checked,
        acciones: acciones
    });

    accionesCache = Array.isArray(data.acciones) ? data.acciones : [];
    renderAcciones();
    actualizarKpis(data.config || {});
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-password-confirm').value = '';
    setStatus('Configuración guardada correctamente.', 'ok');
}

document.getElementById('btn-refresh').addEventListener('click', () => {
    cargarConfiguracion().catch(e => setStatus(e.message, 'error'));
});
document.getElementById('btn-reload').addEventListener('click', () => {
    cargarConfiguracion().catch(e => setStatus(e.message, 'error'));
});
document.getElementById('form-seguridad').addEventListener('submit', (ev) => {
    guardarConfiguracion(ev).catch(e => setStatus(e.message, 'error'));
});

cargarConfiguracion().catch(e => setStatus(e.message, 'error'));
