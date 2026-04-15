const CONFIG = {
    BACKEND_URL: (window.SRFIX_BACKEND_URL || localStorage.getItem('srfix_backend_url') || 'https://script.google.com/macros/s/AKfycbw49B0GeqyZ2Yr0a-IZNqUhrhUBH0yldSO274EDHBU9gT5SPrXSs2ixIhwD5BRmg-6W/exec')
};

let sucursalesCache = [];
let productosCache = [];
let transferenciasCache = [];

function escapeHtml(v) {
    return String(v || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getSucursalActiva() {
    return localStorage.getItem('srfix_sucursal_activa') || 'GLOBAL';
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

function badgeEstado(v, esMatriz) {
    if (esMatriz) return '<span class="px-2 py-1 rounded-full text-xs bg-[#1F7EDC]/20 text-[#9dcfff]">Matriz</span>';
    if (String(v || '').toLowerCase() === 'activo') return '<span class="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300">Activa</span>';
    return '<span class="px-2 py-1 rounded-full text-xs bg-slate-500/20 text-slate-300">Inactiva</span>';
}

function fillSelects() {
    const origen = document.getElementById('transfer-origen');
    const destino = document.getElementById('transfer-destino');
    const producto = document.getElementById('transfer-sku');
    [origen, destino].forEach(select => {
        select.innerHTML = '';
        sucursalesCache.filter(item => item.ESTATUS === 'activo').forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.ID;
            opt.textContent = item.NOMBRE;
            select.appendChild(opt);
        });
    });
    producto.innerHTML = '';
    productosCache.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.SKU;
        opt.textContent = `${item.SKU} · ${item.NOMBRE}`;
        producto.appendChild(opt);
    });
}

function renderSucursales() {
    const filtro = document.getElementById('filtro-sucursal').value.trim().toLowerCase();
    const rows = sucursalesCache.filter(item => {
        if (!filtro) return true;
        return [item.ID, item.NOMBRE, item.DIRECCION, item.TELEFONO, item.EMAIL]
            .some(v => String(v || '').toLowerCase().indexOf(filtro) >= 0);
    });
    document.getElementById('kpi-sucursales').textContent = String(sucursalesCache.filter(x => x.ESTATUS === 'activo').length);
    document.getElementById('kpi-activa').textContent = getSucursalActiva();
    document.getElementById('rows-sucursales').innerHTML = rows.map(item => `
        <tr class="border-t border-[#1F7EDC]/20">
            <td class="px-3 py-3 font-semibold text-[#1F7EDC]">${escapeHtml(item.ID)}</td>
            <td class="px-3 py-3">${escapeHtml(item.NOMBRE)}</td>
            <td class="px-3 py-3">${escapeHtml(item.DIRECCION || '---')}</td>
            <td class="px-3 py-3">
                <div>${escapeHtml(item.TELEFONO || '---')}</div>
                <div class="text-xs text-[#8A8F95]">${escapeHtml(item.EMAIL || '---')}</div>
            </td>
            <td class="px-3 py-3">${badgeEstado(item.ESTATUS, item.ES_MATRIZ)}</td>
            <td class="px-3 py-3">
                <div class="flex gap-2">
                    <button data-edit="${escapeHtml(item.ID)}" class="px-2 py-1 rounded border border-[#1F7EDC]/30 text-xs hover:bg-[#1F7EDC]/20"><i class="fa-solid fa-pen"></i></button>
                    <button data-use="${escapeHtml(item.ID)}" class="px-2 py-1 rounded border border-[#FF6A2A]/40 text-xs hover:bg-[#FF6A2A]/20"><i class="fa-solid fa-location-dot"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderTransferencias() {
    const filtro = document.getElementById('filtro-transferencias').value.trim().toLowerCase();
    const rows = transferenciasCache.filter(item => {
        if (!filtro) return true;
        return [item.ID, item.SKU, item.PRODUCTO, item.SUCURSAL_ORIGEN, item.SUCURSAL_DESTINO, item.USUARIO, item.MOTIVO]
            .some(v => String(v || '').toLowerCase().indexOf(filtro) >= 0);
    });
    document.getElementById('kpi-transferencias').textContent = String(rows.length);
    document.getElementById('rows-transferencias').innerHTML = rows.map(item => `
        <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3">
            <div class="flex items-center justify-between gap-3">
                <div class="font-semibold text-[#1F7EDC]">${escapeHtml(item.ID)}</div>
                <div class="text-xs text-[#8A8F95]">${escapeHtml(item.FECHA || '---')}</div>
            </div>
            <div class="mt-2 text-sm text-white">${escapeHtml(item.SKU)} · ${escapeHtml(item.PRODUCTO || '')}</div>
            <div class="mt-1 text-sm text-[#d2d8df]">${escapeHtml(item.SUCURSAL_ORIGEN)} -> ${escapeHtml(item.SUCURSAL_DESTINO)} · Cantidad ${Number(item.CANTIDAD || 0)}</div>
            <div class="mt-1 text-xs text-[#8A8F95]">${escapeHtml(item.MOTIVO || 'Sin motivo')} · ${escapeHtml(item.USUARIO || 'Sin usuario')}</div>
        </div>
    `).join('') || '<div class="text-sm text-[#8A8F95]">Sin transferencias registradas.</div>';
}

function abrirModalSucursal(item = null) {
    document.getElementById('form-sucursal').reset();
    document.getElementById('sucursal-id').value = item?.ID || '';
    document.getElementById('sucursal-title').textContent = item ? `Editar ${item.NOMBRE}` : 'Nueva sucursal';
    document.getElementById('sucursal-nombre').value = item?.NOMBRE || '';
    document.getElementById('sucursal-direccion').value = item?.DIRECCION || '';
    document.getElementById('sucursal-telefono').value = item?.TELEFONO || '';
    document.getElementById('sucursal-email').value = item?.EMAIL || '';
    document.getElementById('sucursal-estatus').value = item?.ESTATUS || 'activo';
    document.getElementById('modal-sucursal').classList.remove('hidden');
}

function cerrarModalSucursal() {
    document.getElementById('modal-sucursal').classList.add('hidden');
}

async function cargarTodo() {
    const [sucursales, productos, transferencias] = await Promise.all([
        fetchJson({ action: 'listar_sucursales', soloActivas: '', page: 1, pageSize: 100 }),
        fetchJson({ action: 'listar_productos', sucursalId: 'GLOBAL', page: 1, pageSize: 500 }),
        fetchJson({ action: 'listar_transferencias_stock', sucursalId: getSucursalActiva(), page: 1, pageSize: 100 })
    ]);
    sucursalesCache = Array.isArray(sucursales.sucursales) ? sucursales.sucursales : [];
    productosCache = Array.isArray(productos.productos) ? productos.productos : [];
    transferenciasCache = Array.isArray(transferencias.transferencias) ? transferencias.transferencias : [];
    fillSelects();
    renderSucursales();
    renderTransferencias();
}

async function guardarSucursal(ev) {
    ev.preventDefault();
    await fetchJson({
        action: 'guardar_sucursal',
        id: document.getElementById('sucursal-id').value,
        nombre: document.getElementById('sucursal-nombre').value.trim(),
        direccion: document.getElementById('sucursal-direccion').value.trim(),
        telefono: document.getElementById('sucursal-telefono').value.trim(),
        email: document.getElementById('sucursal-email').value.trim(),
        estatus: document.getElementById('sucursal-estatus').value
    });
    cerrarModalSucursal();
    await cargarTodo();
}

async function guardarTransferencia(ev) {
    ev.preventDefault();
    await fetchJson({
        action: 'transferir_stock',
        sku: document.getElementById('transfer-sku').value,
        sucursalOrigen: document.getElementById('transfer-origen').value,
        sucursalDestino: document.getElementById('transfer-destino').value,
        cantidad: document.getElementById('transfer-cantidad').value,
        usuario: document.getElementById('transfer-usuario').value.trim(),
        motivo: document.getElementById('transfer-motivo').value.trim(),
        notas: document.getElementById('transfer-notas').value.trim()
    });
    document.getElementById('form-transferencia').reset();
    await cargarTodo();
}

document.getElementById('btn-refresh').addEventListener('click', cargarTodo);
document.getElementById('btn-nueva-sucursal').addEventListener('click', () => abrirModalSucursal());
document.getElementById('form-sucursal').addEventListener('submit', guardarSucursal);
document.getElementById('form-transferencia').addEventListener('submit', guardarTransferencia);
document.querySelectorAll('[data-close-sucursal]').forEach(btn => btn.addEventListener('click', cerrarModalSucursal));
document.getElementById('filtro-sucursal').addEventListener('input', renderSucursales);
document.getElementById('filtro-transferencias').addEventListener('input', renderTransferencias);
document.getElementById('rows-sucursales').addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit]');
    const use = e.target.closest('[data-use]');
    if (edit) {
        const item = sucursalesCache.find(x => x.ID === edit.getAttribute('data-edit'));
        if (item) abrirModalSucursal(item);
    }
    if (use) {
        localStorage.setItem('srfix_sucursal_activa', use.getAttribute('data-use'));
        renderSucursales();
    }
});

document.getElementById('modal-sucursal').addEventListener('click', (e) => {
    if (e.target.id === 'modal-sucursal') cerrarModalSucursal();
});

cargarTodo().catch((e) => {
    document.getElementById('rows-transferencias').innerHTML = `<div class="text-sm text-red-300">${escapeHtml(e.message)}</div>`;
});
