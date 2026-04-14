const CONFIG = {
    BACKEND_URL: 'https://script.google.com/macros/s/AKfycbyKv77a5864czQIJYEmFbAIYl4dAufoxP3ynPZhSoyZSiGYpFRrOBxr-B_2-rdcfRO0/exec'
};

const PAGE_SIZE = 80;
let currentPage = 1;
let hasMore = false;
let isLoading = false;
let ordenesCache = [];
let proveedoresCache = [];
let foliosRelacionCache = [];
let itemsDraft = [];

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

function money(v) {
    return `$${Number(v || 0).toFixed(2)}`;
}

function badgeEstado(v) {
    const estado = String(v || '').toLowerCase();
    if (estado === 'recibida') return '<span class="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300">Recibida</span>';
    if (estado === 'parcialmente_recibida') return '<span class="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-300">Parcial</span>';
    if (estado === 'cancelada') return '<span class="px-2 py-1 rounded-full text-xs bg-slate-500/20 text-slate-300">Cancelada</span>';
    if (estado === 'enviada') return '<span class="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300">Enviada</span>';
    return '<span class="px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-300">Borrador</span>';
}

function getSucursalActiva() {
    return localStorage.getItem('srfix_sucursal_activa') || 'GLOBAL';
}

function getFiltros() {
    return {
        texto: document.getElementById('filtro-texto').value.trim(),
        estado: document.getElementById('filtro-estado').value,
        proveedor: document.getElementById('filtro-proveedor').value
    };
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

function setKpis(items) {
    document.getElementById('kpi-total').textContent = String(items.length);
    document.getElementById('kpi-abiertas').textContent = String(items.filter(x => ['borrador', 'enviada', 'parcialmente_recibida'].includes(x.ESTADO)).length);
    document.getElementById('kpi-recibidas').textContent = String(items.filter(x => x.ESTADO === 'recibida').length);
}

function fillProveedorFilter(list = []) {
    const select = document.getElementById('filtro-proveedor');
    const current = select.value;
    select.innerHTML = '<option value="">Todos los proveedores</option>';
    list.forEach(name => {
        select.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`);
    });
    select.value = current;
}

function fillDatalists() {
    const provList = document.getElementById('proveedores-lista');
    provList.innerHTML = '';
    proveedoresCache.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.nombre;
        provList.appendChild(opt);
    });
    const foliosList = document.getElementById('folios-relacion-lista');
    foliosList.innerHTML = '';
    foliosRelacionCache.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.folio;
        foliosList.appendChild(opt);
    });
}

async function cargarAuxiliares() {
    try {
        const [proveedoresData, foliosData] = await Promise.all([
            fetchJson({ action: 'listar_nombres_proveedores' }),
            fetchJson({ action: 'listar_folios_relacion' })
        ]);
        proveedoresCache = Array.isArray(proveedoresData.proveedores) ? proveedoresData.proveedores : [];
        foliosRelacionCache = Array.isArray(foliosData.folios) ? foliosData.folios : [];
        fillDatalists();
    } catch (e) {}
}

function renderRows(items, append = false) {
    if (!append) elRows.innerHTML = '';
    const frag = document.createDocumentFragment();
    items.forEach(orden => {
        const tr = document.createElement('tr');
        tr.className = 'border-t border-[#1F7EDC]/20 hover:bg-[#1F7EDC]/10';
        tr.innerHTML = `
            <td class="px-3 py-3 font-semibold text-[#1F7EDC]">${escapeHtml(orden.FOLIO_OC)}</td>
            <td class="px-3 py-3">${escapeHtml(orden.FECHA || '---')}</td>
            <td class="px-3 py-3">${escapeHtml(orden.PROVEEDOR || '---')}</td>
            <td class="px-3 py-3">${escapeHtml(orden.REFERENCIA || '---')}</td>
            <td class="px-3 py-3">${badgeEstado(orden.ESTADO)}</td>
            <td class="px-3 py-3 text-right">${money(orden.TOTAL)}</td>
            <td class="px-3 py-3">
                <div class="flex flex-wrap gap-2">
                    <button data-edit="${escapeHtml(orden.FOLIO_OC)}" class="px-2 py-1 rounded border border-[#1F7EDC]/30 text-xs hover:bg-[#1F7EDC]/20"><i class="fa-solid fa-pen"></i></button>
                    <button data-recv="${escapeHtml(orden.FOLIO_OC)}" class="px-2 py-1 rounded border border-[#FF6A2A]/40 text-xs hover:bg-[#FF6A2A]/20"><i class="fa-solid fa-box-open"></i></button>
                    <button data-send="${escapeHtml(orden.FOLIO_OC)}" class="px-2 py-1 rounded border border-[#1F7EDC]/30 text-xs hover:bg-[#1F7EDC]/20"><i class="fa-solid fa-paper-plane"></i></button>
                    <button data-cancel="${escapeHtml(orden.FOLIO_OC)}" class="px-2 py-1 rounded border border-red-500/40 text-xs hover:bg-red-500/20"><i class="fa-solid fa-ban"></i></button>
                </div>
            </td>
        `;
        frag.appendChild(tr);
    });
    elRows.appendChild(frag);
}

async function cargarOrdenes({ append = false } = {}) {
    if (isLoading) return;
    isLoading = true;
    if (!append) currentPage = 1;
    elLoading.classList.remove('hidden');
    if (!append) {
        elRows.innerHTML = '';
        elEmpty.classList.add('hidden');
    }
    try {
        const data = await fetchJson({ action: 'listar_ordenes_compra', sucursalId: getSucursalActiva(), page: currentPage, pageSize: PAGE_SIZE, ...getFiltros() });
        const items = Array.isArray(data.ordenes) ? data.ordenes : [];
        if (!append) ordenesCache = items.slice();
        else ordenesCache = ordenesCache.concat(items);
        hasMore = !!data.hasMore;
        fillProveedorFilter(Array.isArray(data.proveedores) ? data.proveedores : []);
        setKpis(ordenesCache);
        renderRows(items, append);
        if (!ordenesCache.length) elEmpty.classList.remove('hidden');
        elBtnMore.classList.toggle('hidden', !hasMore);
        if (hasMore) currentPage += 1;
        elLoading.classList.add('hidden');
    } catch (e) {
        elLoading.classList.add('hidden');
        elEmpty.classList.remove('hidden');
        elEmpty.textContent = `No se pudieron cargar las órdenes: ${e.message}`;
    } finally {
        isLoading = false;
    }
}

function addDraftItem(item = null) {
    itemsDraft.push(item || {
        sku: '',
        producto: '',
        cantidadPedida: 1,
        costoUnitario: 0,
        cantidadRecibida: 0
    });
    renderItemsDraft();
}

function renderItemsDraft() {
    const tbody = document.getElementById('items-rows');
    tbody.innerHTML = itemsDraft.map((item, idx) => `
        <tr class="border-t border-[#1F7EDC]/10">
            <td class="px-2 py-2"><input data-item="${idx}" data-field="sku" value="${escapeHtml(item.sku || '')}" class="w-full rounded bg-[#10161f] border border-[#1F7EDC]/20 px-2 py-1 text-sm uppercase"></td>
            <td class="px-2 py-2"><input data-item="${idx}" data-field="producto" value="${escapeHtml(item.producto || '')}" class="w-full rounded bg-[#10161f] border border-[#1F7EDC]/20 px-2 py-1 text-sm"></td>
            <td class="px-2 py-2"><input data-item="${idx}" data-field="cantidadPedida" type="number" min="0.01" step="0.01" value="${Number(item.cantidadPedida || 0)}" class="w-full rounded bg-[#10161f] border border-[#1F7EDC]/20 px-2 py-1 text-sm text-right"></td>
            <td class="px-2 py-2"><input data-item="${idx}" data-field="costoUnitario" type="number" min="0" step="0.01" value="${Number(item.costoUnitario || 0)}" class="w-full rounded bg-[#10161f] border border-[#1F7EDC]/20 px-2 py-1 text-sm text-right"></td>
            <td class="px-2 py-2 text-right">${money((Number(item.cantidadPedida || 0) * Number(item.costoUnitario || 0)))}</td>
            <td class="px-2 py-2 text-center">${Number(item.cantidadRecibida || 0)}</td>
            <td class="px-2 py-2"><button type="button" data-del-item="${idx}" class="px-2 py-1 rounded border border-red-500/40 text-xs hover:bg-red-500/20"><i class="fa-solid fa-trash"></i></button></td>
        </tr>
    `).join('');
    recalcularTotales();
}

function recalcularTotales() {
    const subtotal = itemsDraft.reduce((acc, item) => acc + (Number(item.cantidadPedida || 0) * Number(item.costoUnitario || 0)), 0);
    const ivaPct = Number(document.getElementById('orden-iva-porcentaje').value || 0);
    const ivaMonto = subtotal * (ivaPct / 100);
    const total = subtotal + ivaMonto;
    document.getElementById('orden-subtotal').value = subtotal.toFixed(2);
    document.getElementById('orden-iva-monto').value = ivaMonto.toFixed(2);
    document.getElementById('orden-total').value = total.toFixed(2);
}

function abrirModalOrden(orden = null, items = []) {
    document.getElementById('form-orden').reset();
    document.getElementById('orden-folio').value = orden?.FOLIO_OC || '';
    document.getElementById('orden-title').textContent = orden ? `Editar ${orden.FOLIO_OC}` : 'Nueva orden de compra';
    document.getElementById('orden-fecha').value = orden?.FECHA || new Date().toISOString().slice(0, 10);
    document.getElementById('orden-proveedor').value = orden?.PROVEEDOR || '';
    document.getElementById('orden-estado').value = orden?.ESTADO || 'borrador';
    document.getElementById('orden-referencia').value = orden?.REFERENCIA || '';
    document.getElementById('orden-pago').value = orden?.CONDICIONES_PAGO || '';
    document.getElementById('orden-fecha-estimada').value = orden?.FECHA_ESTIMADA || '';
    document.getElementById('orden-folio-relacionado').value = orden?.FOLIO_RELACIONADO || '';
    document.getElementById('orden-notas').value = orden?.NOTAS || '';
    document.getElementById('orden-iva-porcentaje').value = Number(orden?.IVA_PORCENTAJE || 0);
    itemsDraft = (items || []).map(item => ({
        sku: item.SKU,
        producto: item.PRODUCTO,
        cantidadPedida: item.CANTIDAD_PEDIDA,
        costoUnitario: item.COSTO_UNITARIO,
        cantidadRecibida: item.CANTIDAD_RECIBIDA
    }));
    if (!itemsDraft.length) addDraftItem();
    else renderItemsDraft();
    document.getElementById('modal-orden').classList.remove('hidden');
    recalcularTotales();
}

function cerrarModalOrden() {
    document.getElementById('modal-orden').classList.add('hidden');
}

async function guardarOrden(ev) {
    ev.preventDefault();
    const payload = {
        action: 'guardar_orden_compra',
        sucursalId: getSucursalActiva(),
        folio: document.getElementById('orden-folio').value.trim().toUpperCase(),
        fecha: document.getElementById('orden-fecha').value,
        proveedor: document.getElementById('orden-proveedor').value.trim(),
        estado: document.getElementById('orden-estado').value,
        referencia: document.getElementById('orden-referencia').value.trim(),
        condicionesPago: document.getElementById('orden-pago').value.trim(),
        fechaEstimada: document.getElementById('orden-fecha-estimada').value,
        folioRelacionado: document.getElementById('orden-folio-relacionado').value.trim().toUpperCase(),
        notas: document.getElementById('orden-notas').value.trim(),
        subtotal: document.getElementById('orden-subtotal').value,
        ivaPorcentaje: document.getElementById('orden-iva-porcentaje').value,
        ivaMonto: document.getElementById('orden-iva-monto').value,
        total: document.getElementById('orden-total').value,
        items: itemsDraft.map(item => ({
            sku: String(item.sku || '').trim().toUpperCase(),
            producto: String(item.producto || '').trim(),
            cantidadPedida: Number(item.cantidadPedida || 0),
            costoUnitario: Number(item.costoUnitario || 0),
            cantidadRecibida: Number(item.cantidadRecibida || 0)
        }))
    };
    try {
        await fetchJson(payload);
        cerrarModalOrden();
        cargarOrdenes({ append: false });
    } catch (e) {
        alert(e.message || 'No se pudo guardar la orden');
    }
}

async function abrirOrden(folio) {
    try {
        const data = await fetchJson({ action: 'orden_compra', folio, sucursalId: getSucursalActiva() });
        abrirModalOrden(data.orden, data.items || []);
    } catch (e) {
        alert(e.message || 'No se pudo cargar la orden');
    }
}

async function cambiarEstado(folio, estado) {
    try {
        await fetchJson({ action: 'cambiar_estado_orden_compra', folio, estado, sucursalId: getSucursalActiva() });
        cargarOrdenes({ append: false });
    } catch (e) {
        alert(e.message || 'No se pudo cambiar el estado');
    }
}

async function abrirRecepcion(folio) {
    try {
        const data = await fetchJson({ action: 'orden_compra', folio, sucursalId: getSucursalActiva() });
        document.getElementById('recepcion-title').textContent = `Recibir ${folio}`;
        document.getElementById('recepcion-folio').value = folio;
        document.getElementById('recepcion-rows').innerHTML = (data.items || []).map(item => `
            <tr class="border-t border-[#1F7EDC]/20">
                <td class="px-3 py-3">${escapeHtml(item.SKU)}</td>
                <td class="px-3 py-3">${escapeHtml(item.PRODUCTO)}</td>
                <td class="px-3 py-3 text-right">${Number(item.CANTIDAD_PEDIDA || 0)}</td>
                <td class="px-3 py-3 text-right">${Number(item.CANTIDAD_RECIBIDA || 0)}</td>
                <td class="px-3 py-3 text-right">
                    <input data-recepcion-item="${item.ITEM_ID}" data-pedida="${item.CANTIDAD_PEDIDA}" data-recibida="${item.CANTIDAD_RECIBIDA}" type="number" min="0" step="0.01" value="0" class="w-28 rounded bg-[#161616] border border-[#1F7EDC]/30 px-2 py-1 text-sm text-right">
                </td>
            </tr>
        `).join('');
        document.getElementById('modal-recepcion').classList.remove('hidden');
    } catch (e) {
        alert(e.message || 'No se pudo cargar la recepción');
    }
}

function cerrarRecepcion() {
    document.getElementById('modal-recepcion').classList.add('hidden');
}

async function guardarRecepcion(ev) {
    ev.preventDefault();
    const folio = document.getElementById('recepcion-folio').value.trim().toUpperCase();
    const usuario = document.getElementById('recepcion-usuario').value.trim();
    const items = Array.from(document.querySelectorAll('[data-recepcion-item]')).map(input => ({
        itemId: Number(input.getAttribute('data-recepcion-item')),
        cantidadRecibida: Number(input.value || 0)
    })).filter(item => item.cantidadRecibida > 0);
    if (!items.length) return alert('Ingresa al menos una cantidad a recibir.');
    try {
        await fetchJson({ action: 'recibir_orden_compra', folio, usuario, items, sucursalId: getSucursalActiva() });
        cerrarRecepcion();
        cargarOrdenes({ append: false });
    } catch (e) {
        alert(e.message || 'No se pudo registrar la recepción');
    }
}

function consumirDraftDesdeStock() {
    try {
        const raw = localStorage.getItem('srfix_compra_draft');
        if (!raw) return;
        localStorage.removeItem('srfix_compra_draft');
        const draft = JSON.parse(raw);
        const hoy = new Date().toISOString().slice(0, 10);
        abrirModalOrden({
            FECHA: hoy,
            PROVEEDOR: draft.proveedor || '',
            REFERENCIA: draft.referencia || '',
            NOTAS: draft.notas || '',
            ESTADO: 'borrador',
            IVA_PORCENTAJE: 0
        }, Array.isArray(draft.items) ? draft.items.map(item => ({
            SKU: item.sku || '',
            PRODUCTO: item.producto || '',
            CANTIDAD_PEDIDA: Number(item.cantidadPedida || 1),
            COSTO_UNITARIO: Number(item.costoUnitario || 0),
            CANTIDAD_RECIBIDA: Number(item.cantidadRecibida || 0)
        })) : []);
    } catch (e) {
        localStorage.removeItem('srfix_compra_draft');
    }
}

document.getElementById('btn-refresh').addEventListener('click', () => cargarOrdenes({ append: false }));
document.getElementById('btn-nueva').addEventListener('click', () => { itemsDraft = []; addDraftItem(); abrirModalOrden(); });
document.getElementById('btn-agregar-item').addEventListener('click', () => addDraftItem());
document.getElementById('form-orden').addEventListener('submit', guardarOrden);
document.getElementById('form-recepcion').addEventListener('submit', guardarRecepcion);
document.querySelectorAll('[data-close-orden]').forEach(btn => btn.addEventListener('click', cerrarModalOrden));
document.querySelectorAll('[data-close-recepcion]').forEach(btn => btn.addEventListener('click', cerrarRecepcion));
elBtnMore.addEventListener('click', () => { if (hasMore) cargarOrdenes({ append: true }); });

['filtro-texto', 'filtro-estado', 'filtro-proveedor'].forEach(id => {
    document.getElementById(id).addEventListener(id === 'filtro-texto' ? 'input' : 'change', () => cargarOrdenes({ append: false }));
});

document.getElementById('orden-iva-porcentaje').addEventListener('input', recalcularTotales);

document.getElementById('items-rows').addEventListener('input', (e) => {
    const idx = Number(e.target.getAttribute('data-item'));
    const field = e.target.getAttribute('data-field');
    if (!Number.isInteger(idx) || !field || !itemsDraft[idx]) return;
    itemsDraft[idx][field] = field === 'cantidadPedida' || field === 'costoUnitario' ? Number(e.target.value || 0) : e.target.value;
    renderItemsDraft();
});

document.getElementById('items-rows').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-del-item]');
    if (!btn) return;
    const idx = Number(btn.getAttribute('data-del-item'));
    itemsDraft.splice(idx, 1);
    if (!itemsDraft.length) addDraftItem();
    else renderItemsDraft();
});

elRows.addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit]');
    const recv = e.target.closest('[data-recv]');
    const send = e.target.closest('[data-send]');
    const cancel = e.target.closest('[data-cancel]');
    if (edit) abrirOrden(edit.getAttribute('data-edit'));
    if (recv) abrirRecepcion(recv.getAttribute('data-recv'));
    if (send) cambiarEstado(send.getAttribute('data-send'), 'enviada');
    if (cancel) cambiarEstado(cancel.getAttribute('data-cancel'), 'cancelada');
});

document.getElementById('modal-orden').addEventListener('click', (e) => { if (e.target.id === 'modal-orden') cerrarModalOrden(); });
document.getElementById('modal-recepcion').addEventListener('click', (e) => { if (e.target.id === 'modal-recepcion') cerrarRecepcion(); });

cargarAuxiliares();
cargarOrdenes({ append: false });
consumirDraftDesdeStock();
