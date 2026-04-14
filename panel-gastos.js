const CONFIG = {
    BACKEND_URL: 'https://script.google.com/macros/s/AKfycbyKv77a5864czQIJYEmFbAIYl4dAufoxP3ynPZhSoyZSiGYpFRrOBxr-B_2-rdcfRO0/exec'
};

const PAGE_SIZE = 100;
let currentPage = 1;
let hasMore = false;
let isLoading = false;
let gastosCache = [];
let proveedoresCache = [];
let foliosRelacionCache = [];

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

function badgeTipo(v) {
    return String(v || '').toLowerCase() === 'fijo'
        ? '<span class="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300">Fijo</span>'
        : '<span class="px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-300">Variable</span>';
}

function getSucursalActiva() {
    return localStorage.getItem('srfix_sucursal_activa') || 'GLOBAL';
}

function getFiltros() {
    return {
        fechaDesde: document.getElementById('filtro-desde').value,
        fechaHasta: document.getElementById('filtro-hasta').value,
        tipo: document.getElementById('filtro-tipo').value,
        categoria: document.getElementById('filtro-categoria').value,
        texto: document.getElementById('filtro-texto').value.trim()
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

async function cargarAuxiliares() {
    try {
        const [proveedoresData, foliosData] = await Promise.all([
            fetchJson({ action: 'listar_nombres_proveedores' }),
            fetchJson({ action: 'listar_folios_relacion' })
        ]);
        proveedoresCache = Array.isArray(proveedoresData.proveedores) ? proveedoresData.proveedores : [];
        foliosRelacionCache = Array.isArray(foliosData.folios) ? foliosData.folios : [];
        const provList = document.getElementById('proveedores-lista');
        provList.innerHTML = '';
        proveedoresCache.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.nombre;
            provList.appendChild(opt);
        });
        const folioList = document.getElementById('folios-relacion-lista');
        folioList.innerHTML = '';
        foliosRelacionCache.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.folio;
            folioList.appendChild(opt);
        });
    } catch (e) {}
}

function setKpis(items) {
    const total = items.reduce((acc, x) => acc + Number(x.MONTO || 0), 0);
    const fijos = items.filter(x => x.TIPO === 'fijo').reduce((acc, x) => acc + Number(x.MONTO || 0), 0);
    const variables = items.filter(x => x.TIPO === 'variable').reduce((acc, x) => acc + Number(x.MONTO || 0), 0);
    document.getElementById('kpi-total').textContent = money(total);
    document.getElementById('kpi-fijos').textContent = money(fijos);
    document.getElementById('kpi-variables').textContent = money(variables);
}

function renderRows(items, append = false) {
    if (!append) elRows.innerHTML = '';
    const frag = document.createDocumentFragment();
    items.forEach(gasto => {
        const tr = document.createElement('tr');
        tr.className = 'border-t border-[#1F7EDC]/20 hover:bg-[#1F7EDC]/10';
        tr.innerHTML = `
            <td class="px-3 py-3">${escapeHtml(gasto.FECHA)}</td>
            <td class="px-3 py-3">${badgeTipo(gasto.TIPO)}</td>
            <td class="px-3 py-3">${escapeHtml(gasto.CATEGORIA)}</td>
            <td class="px-3 py-3">
                <div class="font-semibold">${escapeHtml(gasto.CONCEPTO)}</div>
                <div class="text-xs text-[#8A8F95]">${escapeHtml(gasto.DESCRIPCION || '---')}</div>
            </td>
            <td class="px-3 py-3">${escapeHtml(gasto.PROVEEDOR || '---')}</td>
            <td class="px-3 py-3">${escapeHtml(gasto.FOLIO_RELACIONADO || '---')}</td>
            <td class="px-3 py-3">${escapeHtml(gasto.METODO_PAGO || '---')}</td>
            <td class="px-3 py-3 text-right font-semibold text-[#FF6A2A]">${money(gasto.MONTO)}</td>
            <td class="px-3 py-3">
                <div class="flex gap-2">
                    <button data-edit="${gasto.ID}" class="px-2 py-1 rounded border border-[#1F7EDC]/30 text-xs hover:bg-[#1F7EDC]/20"><i class="fa-solid fa-pen"></i></button>
                    <button data-del="${gasto.ID}" class="px-2 py-1 rounded border border-red-500/40 text-xs hover:bg-red-500/20"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        frag.appendChild(tr);
    });
    elRows.appendChild(frag);
}

function renderResumen(data) {
    const wrap = document.getElementById('resumen-mensual');
    const rows = Array.isArray(data.resumenMensual) ? data.resumenMensual : [];
    if (!rows.length) {
        wrap.innerHTML = '<div class="text-[#8A8F95]">Sin datos para el periodo seleccionado.</div>';
        return;
    }
    wrap.innerHTML = rows.map(item => {
        const categorias = Object.entries(item.categorias || {})
            .sort((a, b) => b[1] - a[1])
            .map(([cat, total]) => `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#161616] border border-[#1F7EDC]/20 text-xs">${escapeHtml(cat)}: ${money(total)}</span>`)
            .join(' ');
        return `
            <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div class="font-semibold text-[#1F7EDC]">${escapeHtml(item.mes)}</div>
                    <div class="font-semibold text-[#FF6A2A]">${money(item.total)}</div>
                </div>
                <div class="mt-2 flex flex-wrap gap-2">${categorias}</div>
            </div>
        `;
    }).join('');
}

async function cargarResumen() {
    try {
        const data = await fetchJson({ action: 'resumen_gastos', sucursalId: getSucursalActiva(), ...getFiltros() });
        renderResumen(data);
    } catch (e) {
        document.getElementById('resumen-mensual').innerHTML = `<div class="text-red-300">${escapeHtml(e.message)}</div>`;
    }
}

async function cargarGastos({ append = false } = {}) {
    if (isLoading) return;
    isLoading = true;
    if (!append) currentPage = 1;
    elLoading.classList.remove('hidden');
    if (!append) {
        elRows.innerHTML = '';
        elEmpty.classList.add('hidden');
    }
    try {
        const data = await fetchJson({ action: 'listar_gastos', sucursalId: getSucursalActiva(), page: currentPage, pageSize: PAGE_SIZE, ...getFiltros() });
        const items = Array.isArray(data.gastos) ? data.gastos : [];
        if (!append) gastosCache = items.slice();
        else gastosCache = gastosCache.concat(items);
        hasMore = !!data.hasMore;
        setKpis(gastosCache);
        renderRows(items, append);
        if (!gastosCache.length) elEmpty.classList.remove('hidden');
        elBtnMore.classList.toggle('hidden', !hasMore);
        if (hasMore) currentPage += 1;
        elLoading.classList.add('hidden');
        cargarResumen();
    } catch (e) {
        elLoading.classList.add('hidden');
        elEmpty.classList.remove('hidden');
        elEmpty.textContent = `No se pudieron cargar los gastos: ${e.message}`;
    } finally {
        isLoading = false;
    }
}

function abrirModal(gasto = null) {
    document.getElementById('form-gasto').reset();
    document.getElementById('gasto-id').value = gasto?.ID || '';
    document.getElementById('gasto-title').textContent = gasto ? `Editar gasto #${gasto.ID}` : 'Nuevo gasto';
    document.getElementById('gasto-fecha').value = gasto?.FECHA || new Date().toISOString().slice(0, 10);
    document.getElementById('gasto-tipo').value = gasto?.TIPO || 'fijo';
    document.getElementById('gasto-categoria').value = gasto?.CATEGORIA || 'renta';
    document.getElementById('gasto-concepto').value = gasto?.CONCEPTO || '';
    document.getElementById('gasto-descripcion').value = gasto?.DESCRIPCION || '';
    document.getElementById('gasto-monto').value = Number(gasto?.MONTO || 0);
    document.getElementById('gasto-metodo').value = gasto?.METODO_PAGO || '';
    document.getElementById('gasto-proveedor').value = gasto?.PROVEEDOR || '';
    document.getElementById('gasto-folio').value = gasto?.FOLIO_RELACIONADO || '';
    document.getElementById('gasto-comprobante').value = gasto?.COMPROBANTE_URL || '';
    document.getElementById('gasto-notas').value = gasto?.NOTAS || '';
    document.getElementById('modal-gasto').classList.remove('hidden');
}

function cerrarModal() {
    document.getElementById('modal-gasto').classList.add('hidden');
}

async function guardarGasto(ev) {
    ev.preventDefault();
    const payload = {
        action: 'guardar_gasto',
        sucursalId: getSucursalActiva(),
        id: document.getElementById('gasto-id').value,
        fecha: document.getElementById('gasto-fecha').value,
        tipo: document.getElementById('gasto-tipo').value,
        categoria: document.getElementById('gasto-categoria').value,
        concepto: document.getElementById('gasto-concepto').value.trim(),
        descripcion: document.getElementById('gasto-descripcion').value.trim(),
        monto: document.getElementById('gasto-monto').value,
        metodoPago: document.getElementById('gasto-metodo').value.trim(),
        proveedor: document.getElementById('gasto-proveedor').value.trim(),
        folioRelacionado: document.getElementById('gasto-folio').value.trim().toUpperCase(),
        comprobanteUrl: document.getElementById('gasto-comprobante').value.trim(),
        notas: document.getElementById('gasto-notas').value.trim()
    };
    try {
        await fetchJson(payload);
        cerrarModal();
        cargarGastos({ append: false });
    } catch (e) {
        alert(e.message || 'No se pudo guardar el gasto');
    }
}

async function eliminarGasto(id) {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
        await fetchJson({ action: 'eliminar_gasto', id });
        cargarGastos({ append: false });
    } catch (e) {
        alert(e.message || 'No se pudo eliminar el gasto');
    }
}

document.getElementById('btn-refresh').addEventListener('click', () => cargarGastos({ append: false }));
document.getElementById('btn-nuevo').addEventListener('click', () => abrirModal());
document.getElementById('form-gasto').addEventListener('submit', guardarGasto);
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', cerrarModal));
elBtnMore.addEventListener('click', () => { if (hasMore) cargarGastos({ append: true }); });

['filtro-desde', 'filtro-hasta', 'filtro-tipo', 'filtro-categoria', 'filtro-texto'].forEach(id => {
    document.getElementById(id).addEventListener(id === 'filtro-texto' ? 'input' : 'change', () => cargarGastos({ append: false }));
});

elRows.addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (edit) {
        const gasto = gastosCache.find(x => Number(x.ID) === Number(edit.getAttribute('data-edit')));
        if (gasto) abrirModal(gasto);
    }
    if (del) eliminarGasto(Number(del.getAttribute('data-del')));
});

document.getElementById('modal-gasto').addEventListener('click', (e) => { if (e.target.id === 'modal-gasto') cerrarModal(); });

cargarAuxiliares();
cargarGastos({ append: false });
