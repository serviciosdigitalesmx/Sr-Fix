const CONFIG = {
    BACKEND_URL: (window.SRFIX_BACKEND_URL || localStorage.getItem('srfix_backend_url') || 'https://script.google.com/macros/s/AKfycby7ImB8qOFGJbB9OYASi_pysQi9KvWHgzeRm_JPdEMR69RPHNREgB-T_K_Km_HojrAw/exec')
};

const PAGE_SIZE = 80;
let currentPage = 1;
let hasMore = false;
let isLoading = false;
let proveedoresCache = [];

const elRows = document.getElementById('rows');
const elLoading = document.getElementById('loading');
const elEmpty = document.getElementById('empty');
const elBtnMore = document.getElementById('btn-more');

function escapeHtml(v) {
    return String(v || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function stars(n) {
    const val = Math.max(0, Math.min(5, Number(n || 0)));
    return '★'.repeat(Math.round(val)) + '☆'.repeat(5 - Math.round(val));
}

function statusBadge(v) {
    return String(v || '').toLowerCase() === 'activo'
        ? '<span class="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300">Activo</span>'
        : '<span class="px-2 py-1 rounded-full text-xs bg-slate-500/20 text-slate-300">Inactivo</span>';
}

function getFiltros() {
    return {
        texto: document.getElementById('filtro-texto').value.trim(),
        estatus: document.getElementById('filtro-estatus').value,
        categoria: document.getElementById('filtro-categoria').value
    };
}

function setKpis(items, categorias = []) {
    document.getElementById('kpi-total').textContent = String(items.length);
    document.getElementById('kpi-activos').textContent = String(items.filter(x => x.ESTATUS === 'activo').length);
    document.getElementById('kpi-categorias').textContent = String(categorias.length);
}

function fillCategorias(categorias = []) {
    const select = document.getElementById('filtro-categoria');
    const current = select.value;
    select.innerHTML = '<option value="">Todas las categorías</option>';
    categorias.forEach(cat => {
        select.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`);
    });
    select.value = current;
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

function renderRows(items, append = false) {
    if (!append) elRows.innerHTML = '';
    const frag = document.createDocumentFragment();
    items.forEach(prov => {
        const tr = document.createElement('tr');
        tr.className = 'border-t border-[#1F7EDC]/20 hover:bg-[#1F7EDC]/10';
        tr.innerHTML = `
            <td class="px-3 py-3">
                <div class="font-semibold text-[#1F7EDC]">${escapeHtml(prov.NOMBRE_COMERCIAL)}</div>
                <div class="text-xs text-[#8A8F95]">${escapeHtml(prov.RAZON_SOCIAL || '---')}</div>
            </td>
            <td class="px-3 py-3">
                <div>${escapeHtml(prov.CONTACTO || '---')}</div>
                <div class="text-xs text-[#8A8F95]">${escapeHtml(prov.EMAIL || prov.TELEFONO || '---')}</div>
            </td>
            <td class="px-3 py-3">${escapeHtml(prov.CATEGORIAS || '---')}</td>
            <td class="px-3 py-3">${escapeHtml(prov.TIEMPO_ENTREGA || '---')}</td>
            <td class="px-3 py-3">${escapeHtml(prov.CONDICIONES_PAGO || '---')}</td>
            <td class="px-3 py-3">${statusBadge(prov.ESTATUS)}</td>
            <td class="px-3 py-3 text-yellow-300">${stars(prov.CALIFICACION_PROMEDIO)}</td>
            <td class="px-3 py-3">
                <div class="flex flex-wrap gap-2">
                    <button data-view="${prov.ID}" class="px-2 py-1 rounded border border-[#1F7EDC]/30 text-xs hover:bg-[#1F7EDC]/20"><i class="fa-solid fa-eye"></i></button>
                    <button data-edit="${prov.ID}" class="px-2 py-1 rounded border border-[#1F7EDC]/30 text-xs hover:bg-[#1F7EDC]/20"><i class="fa-solid fa-pen"></i></button>
                    <button data-del="${prov.ID}" class="px-2 py-1 rounded border border-red-500/40 text-xs hover:bg-red-500/20"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        frag.appendChild(tr);
    });
    elRows.appendChild(frag);
}

async function cargarProveedores({ append = false } = {}) {
    if (isLoading) return;
    isLoading = true;
    if (!append) currentPage = 1;
    elLoading.classList.remove('hidden');
    if (!append) {
        elRows.innerHTML = '';
        elEmpty.classList.add('hidden');
    }
    const payload = { action: 'listar_proveedores', page: currentPage, pageSize: PAGE_SIZE, ...getFiltros() };
    try {
        const data = await fetchJson(payload);
        const items = Array.isArray(data.proveedores) ? data.proveedores : [];
        if (!append) proveedoresCache = items.slice();
        else proveedoresCache = proveedoresCache.concat(items);
        hasMore = !!data.hasMore;
        fillCategorias((data.filtros && data.filtros.categorias) || []);
        setKpis(proveedoresCache, (data.filtros && data.filtros.categorias) || []);
        renderRows(items, append);
        if (!proveedoresCache.length) elEmpty.classList.remove('hidden');
        elBtnMore.classList.toggle('hidden', !hasMore);
        if (hasMore) currentPage += 1;
        elLoading.classList.add('hidden');
    } catch (e) {
        elLoading.classList.add('hidden');
        elEmpty.classList.remove('hidden');
        elEmpty.textContent = `No se pudieron cargar los proveedores: ${e.message}`;
    } finally {
        isLoading = false;
    }
}

function abrirModal(prov = null) {
    document.getElementById('form-proveedor').reset();
    document.getElementById('proveedor-id').value = prov?.ID || '';
    document.getElementById('proveedor-title').textContent = prov ? `Editar ${prov.NOMBRE_COMERCIAL}` : 'Nuevo proveedor';
    document.getElementById('prov-nombre').value = prov?.NOMBRE_COMERCIAL || '';
    document.getElementById('prov-razon').value = prov?.RAZON_SOCIAL || '';
    document.getElementById('prov-contacto').value = prov?.CONTACTO || '';
    document.getElementById('prov-telefono').value = prov?.TELEFONO || '';
    document.getElementById('prov-whatsapp').value = prov?.WHATSAPP || '';
    document.getElementById('prov-email').value = prov?.EMAIL || '';
    document.getElementById('prov-direccion').value = prov?.DIRECCION || '';
    document.getElementById('prov-ciudad').value = prov?.CIUDAD_ESTADO || '';
    document.getElementById('prov-categorias').value = prov?.CATEGORIAS || '';
    document.getElementById('prov-entrega').value = prov?.TIEMPO_ENTREGA || '';
    document.getElementById('prov-pago').value = prov?.CONDICIONES_PAGO || '';
    document.getElementById('prov-cal-precio').value = String(prov?.CALIFICACION_PRECIO || 0);
    document.getElementById('prov-cal-rapidez').value = String(prov?.CALIFICACION_RAPIDEZ || 0);
    document.getElementById('prov-cal-calidad').value = String(prov?.CALIFICACION_CALIDAD || 0);
    document.getElementById('prov-cal-conf').value = String(prov?.CALIFICACION_CONFIABILIDAD || 0);
    document.getElementById('prov-estatus').value = prov?.ESTATUS || 'activo';
    document.getElementById('prov-notas').value = prov?.NOTAS || '';
    document.getElementById('modal-proveedor').classList.remove('hidden');
}

function cerrarModal() {
    document.getElementById('modal-proveedor').classList.add('hidden');
}

async function guardarProveedor(ev) {
    ev.preventDefault();
    const payload = {
        action: 'guardar_proveedor',
        id: document.getElementById('proveedor-id').value,
        nombreComercial: document.getElementById('prov-nombre').value.trim(),
        razonSocial: document.getElementById('prov-razon').value.trim(),
        contacto: document.getElementById('prov-contacto').value.trim(),
        telefono: document.getElementById('prov-telefono').value.trim(),
        whatsapp: document.getElementById('prov-whatsapp').value.trim(),
        email: document.getElementById('prov-email').value.trim(),
        direccion: document.getElementById('prov-direccion').value.trim(),
        ciudadEstado: document.getElementById('prov-ciudad').value.trim(),
        categorias: document.getElementById('prov-categorias').value.trim(),
        tiempoEntrega: document.getElementById('prov-entrega').value.trim(),
        condicionesPago: document.getElementById('prov-pago').value.trim(),
        calificacionPrecio: document.getElementById('prov-cal-precio').value,
        calificacionRapidez: document.getElementById('prov-cal-rapidez').value,
        calificacionCalidad: document.getElementById('prov-cal-calidad').value,
        calificacionConfiabilidad: document.getElementById('prov-cal-conf').value,
        notas: document.getElementById('prov-notas').value.trim(),
        estatus: document.getElementById('prov-estatus').value
    };
    try {
        await fetchJson(payload);
        cerrarModal();
        cargarProveedores({ append: false });
    } catch (e) {
        alert(e.message || 'No se pudo guardar el proveedor');
    }
}

async function verDetalle(id) {
    try {
        const data = await fetchJson({ action: 'proveedor', id });
        const prov = data.proveedor;
        document.getElementById('detalle-title').textContent = prov.NOMBRE_COMERCIAL || 'Proveedor';
        document.getElementById('detalle-body').innerHTML = `
            <div><span class="text-[#8A8F95]">Razón social:</span> ${escapeHtml(prov.RAZON_SOCIAL || '---')}</div>
            <div><span class="text-[#8A8F95]">Contacto:</span> ${escapeHtml(prov.CONTACTO || '---')}</div>
            <div><span class="text-[#8A8F95]">Teléfono:</span> ${escapeHtml(prov.TELEFONO || '---')}</div>
            <div><span class="text-[#8A8F95]">WhatsApp:</span> ${escapeHtml(prov.WHATSAPP || '---')}</div>
            <div><span class="text-[#8A8F95]">Email:</span> ${escapeHtml(prov.EMAIL || '---')}</div>
            <div><span class="text-[#8A8F95]">Dirección:</span> ${escapeHtml(prov.DIRECCION || '---')}</div>
            <div><span class="text-[#8A8F95]">Ciudad/Estado:</span> ${escapeHtml(prov.CIUDAD_ESTADO || '---')}</div>
            <div><span class="text-[#8A8F95]">Categorías:</span> ${escapeHtml(prov.CATEGORIAS || '---')}</div>
            <div><span class="text-[#8A8F95]">Entrega:</span> ${escapeHtml(prov.TIEMPO_ENTREGA || '---')}</div>
            <div><span class="text-[#8A8F95]">Pago:</span> ${escapeHtml(prov.CONDICIONES_PAGO || '---')}</div>
            <div><span class="text-[#8A8F95]">Calificación:</span> ${stars(prov.CALIFICACION_PROMEDIO)} (${prov.CALIFICACION_PROMEDIO})</div>
            <div><span class="text-[#8A8F95]">Notas:</span><div class="mt-1 whitespace-pre-line">${escapeHtml(prov.NOTAS || '---')}</div></div>
        `;
        document.getElementById('modal-detalle').classList.remove('hidden');
    } catch (e) {
        alert(e.message || 'No se pudo cargar el detalle');
    }
}

function cerrarDetalle() {
    document.getElementById('modal-detalle').classList.add('hidden');
}

async function eliminarProveedor(id) {
    if (!confirm('¿Marcar proveedor como inactivo?')) return;
    try {
        await fetchJson({ action: 'eliminar_proveedor', id });
        cargarProveedores({ append: false });
    } catch (e) {
        alert(e.message || 'No se pudo eliminar');
    }
}

document.getElementById('btn-refresh').addEventListener('click', () => cargarProveedores({ append: false }));
document.getElementById('btn-nuevo').addEventListener('click', () => abrirModal());
document.getElementById('form-proveedor').addEventListener('submit', guardarProveedor);
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', cerrarModal));
document.querySelectorAll('[data-close-detalle]').forEach(btn => btn.addEventListener('click', cerrarDetalle));
elBtnMore.addEventListener('click', () => { if (hasMore) cargarProveedores({ append: true }); });

['filtro-texto', 'filtro-estatus', 'filtro-categoria'].forEach(id => {
    document.getElementById(id).addEventListener(id === 'filtro-texto' ? 'input' : 'change', () => cargarProveedores({ append: false }));
});

elRows.addEventListener('click', (e) => {
    const view = e.target.closest('[data-view]');
    const edit = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (view) verDetalle(Number(view.getAttribute('data-view')));
    if (edit) {
        const prov = proveedoresCache.find(x => Number(x.ID) === Number(edit.getAttribute('data-edit')));
        if (prov) abrirModal(prov);
    }
    if (del) eliminarProveedor(Number(del.getAttribute('data-del')));
});

document.getElementById('modal-proveedor').addEventListener('click', (e) => { if (e.target.id === 'modal-proveedor') cerrarModal(); });
document.getElementById('modal-detalle').addEventListener('click', (e) => { if (e.target.id === 'modal-detalle') cerrarDetalle(); });

cargarProveedores({ append: false });
