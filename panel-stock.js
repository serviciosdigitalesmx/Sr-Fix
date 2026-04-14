const CONFIG = {
    BACKEND_URL: (window.SRFIX_BACKEND_URL || localStorage.getItem('srfix_backend_url') || 'https://script.google.com/macros/s/AKfycby7ImB8qOFGJbB9OYASi_pysQi9KvWHgzeRm_JPdEMR69RPHNREgB-T_K_Km_HojrAw/exec')
};

const PAGE_SIZE = 80;
let currentPage = 1;
let hasMore = false;
let isLoading = false;
let productosCache = [];
let foliosRelacionCache = [];
let alertasCache = [];
let nivelAlertaActivo = '';

const elRows = document.getElementById('rows');
const elLoading = document.getElementById('loading');
const elEmpty = document.getElementById('empty');
const elBtnMore = document.getElementById('btn-more');
const elAlertBox = document.getElementById('alert-box');
const elAlertasList = document.getElementById('alertas-list');
const elAlertasLoading = document.getElementById('alertas-loading');
const elAlertasEmpty = document.getElementById('alertas-empty');

function escapeHtml(v) {
    return String(v || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function money(v) {
    const n = Number(v || 0);
    return `$${n.toFixed(2)}`;
}

function getSucursalActiva() {
    return localStorage.getItem('srfix_sucursal_activa') || 'GLOBAL';
}

function statusBadge(producto) {
    if (String(producto.ESTATUS || '').toLowerCase() === 'inactivo') {
        return '<span class="px-2 py-1 rounded-full text-xs bg-slate-500/20 text-slate-300">Inactivo</span>';
    }
    if (String(producto.ALERTA_NIVEL || '') === 'agotado') {
        return '<span class="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-300">Agotado</span>';
    }
    if (String(producto.ALERTA_NIVEL || '') === 'critico') {
        return '<span class="px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-300">Crítico</span>';
    }
    if (String(producto.ALERTA_NIVEL || '') === 'bajo') {
        return '<span class="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-300">Stock bajo</span>';
    }
    return '<span class="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300">Activo</span>';
}

function getFiltros() {
    return {
        texto: document.getElementById('filtro-texto').value.trim(),
        categoria: document.getElementById('filtro-categoria').value,
        marca: document.getElementById('filtro-marca').value,
        proveedor: document.getElementById('filtro-proveedor').value,
        estatus: document.getElementById('filtro-estatus').value,
        soloAlertas: document.getElementById('filtro-alertas').checked ? '1' : ''
    };
}

function setKpis(productos) {
    document.getElementById('kpi-total').textContent = String(productos.length);
    document.getElementById('kpi-alertas').textContent = String(productos.filter(p => p.ALERTA_STOCK).length);
    document.getElementById('kpi-agotados').textContent = String(productos.filter(p => Number(p.STOCK_ACTUAL || 0) <= 0).length);
}

function fillFilterOptions(filtros = {}) {
    const categoria = document.getElementById('filtro-categoria');
    const marca = document.getElementById('filtro-marca');
    const proveedor = document.getElementById('filtro-proveedor');
    const currentCategoria = categoria.value;
    const currentMarca = marca.value;
    const currentProveedor = proveedor.value;
    categoria.innerHTML = '<option value="">Todas las categorías</option>';
    marca.innerHTML = '<option value="">Todas las marcas</option>';
    proveedor.innerHTML = '<option value="">Todos los proveedores</option>';
    (filtros.categorias || []).forEach(v => {
        categoria.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`);
    });
    (filtros.marcas || []).forEach(v => {
        marca.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`);
    });
    (filtros.proveedores || []).forEach(v => {
        proveedor.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`);
    });
    categoria.value = currentCategoria;
    marca.value = currentMarca;
    proveedor.value = currentProveedor;
}

function renderRows(items, append = false) {
    if (!append) elRows.innerHTML = '';
    const frag = document.createDocumentFragment();
    items.forEach(producto => {
        const tr = document.createElement('tr');
        tr.className = 'border-t border-[#1F7EDC]/20 hover:bg-[#1F7EDC]/10';
        tr.innerHTML = `
            <td class="px-3 py-3 font-semibold text-[#1F7EDC]">${escapeHtml(producto.SKU)}</td>
            <td class="px-3 py-3">
                <div class="font-semibold">${escapeHtml(producto.NOMBRE)}</div>
                <div class="text-xs text-[#8A8F95]">${escapeHtml(producto.PROVEEDOR || 'Sin proveedor')}</div>
            </td>
            <td class="px-3 py-3">${escapeHtml(producto.CATEGORIA || '---')}</td>
            <td class="px-3 py-3">${escapeHtml(producto.MARCA || '---')}</td>
            <td class="px-3 py-3 text-right font-semibold ${producto.ALERTA_STOCK ? 'text-yellow-300' : ''}">${Number(producto.STOCK_ACTUAL || 0)}</td>
            <td class="px-3 py-3 text-right text-[#8A8F95]">${Number(producto.STOCK_MINIMO || 0)}</td>
            <td class="px-3 py-3 text-right">${money(producto.COSTO)}</td>
            <td class="px-3 py-3 text-right">${money(producto.PRECIO)}</td>
            <td class="px-3 py-3">${statusBadge(producto)}</td>
            <td class="px-3 py-3">
                <div class="flex flex-wrap gap-2">
                    <button data-edit="${escapeHtml(producto.SKU)}" class="px-2 py-1 rounded border border-[#1F7EDC]/30 text-xs hover:bg-[#1F7EDC]/20"><i class="fa-solid fa-pen"></i></button>
                    <button data-mov="${escapeHtml(producto.SKU)}" class="px-2 py-1 rounded border border-[#FF6A2A]/40 text-xs hover:bg-[#FF6A2A]/20"><i class="fa-solid fa-arrow-right-arrow-left"></i></button>
                    <button data-hist="${escapeHtml(producto.SKU)}" class="px-2 py-1 rounded border border-[#1F7EDC]/30 text-xs hover:bg-[#1F7EDC]/20"><i class="fa-solid fa-clock-rotate-left"></i></button>
                    ${producto.ALERTA_STOCK ? `<button data-order="${escapeHtml(producto.SKU)}" class="px-2 py-1 rounded border border-yellow-500/40 text-xs hover:bg-yellow-500/20"><i class="fa-solid fa-cart-plus"></i></button>` : ''}
                    <button data-del="${escapeHtml(producto.SKU)}" class="px-2 py-1 rounded border border-red-500/40 text-xs hover:bg-red-500/20"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        frag.appendChild(tr);
    });
    elRows.appendChild(frag);
}

function badgeNivelAlerta(nivel) {
    if (nivel === 'agotado') return '<span class="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-300">Agotado</span>';
    if (nivel === 'critico') return '<span class="px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-300">Crítico</span>';
    return '<span class="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-300">Bajo</span>';
}

function renderAlertas(items = []) {
    elAlertasList.innerHTML = '';
    elAlertasEmpty.classList.toggle('hidden', items.length > 0);
    if (!items.length) return;
    const frag = document.createDocumentFragment();
    items.forEach(producto => {
        const card = document.createElement('div');
        card.className = 'rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-4';
        card.innerHTML = `
            <div class="flex items-start justify-between gap-3">
                <div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <div class="font-semibold text-white">${escapeHtml(producto.NOMBRE)}</div>
                        ${badgeNivelAlerta(String(producto.ALERTA_NIVEL || 'bajo'))}
                    </div>
                    <div class="mt-1 text-xs text-[#8A8F95]">${escapeHtml(producto.SKU)} · ${escapeHtml(producto.CATEGORIA || 'Sin categoría')} · ${escapeHtml(producto.PROVEEDOR || 'Sin proveedor')}</div>
                </div>
                <div class="text-right">
                    <div class="text-xs text-[#8A8F95]">Stock actual</div>
                    <div class="text-lg font-bold ${producto.ALERTA_NIVEL === 'agotado' ? 'text-red-300' : producto.ALERTA_NIVEL === 'critico' ? 'text-orange-300' : 'text-yellow-300'}">${Number(producto.STOCK_ACTUAL || 0)}</div>
                    <div class="text-xs text-[#8A8F95]">Mínimo ${Number(producto.STOCK_MINIMO || 0)}</div>
                </div>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
                <button data-edit="${escapeHtml(producto.SKU)}" class="px-3 py-2 rounded-lg border border-[#1F7EDC]/30 text-xs hover:bg-[#1F7EDC]/20">Ver producto</button>
                <button data-hist="${escapeHtml(producto.SKU)}" class="px-3 py-2 rounded-lg border border-[#1F7EDC]/30 text-xs hover:bg-[#1F7EDC]/20">Ver historial</button>
                <button data-order="${escapeHtml(producto.SKU)}" class="px-3 py-2 rounded-lg border border-[#FF6A2A]/40 text-xs hover:bg-[#FF6A2A]/20">Crear orden de compra</button>
            </div>
        `;
        frag.appendChild(card);
    });
    elAlertasList.appendChild(frag);
}

async function fetchJson(payload, fallbackQuery = null) {
    let data = null;
    let res = await fetch(CONFIG.BACKEND_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    if (res.ok) {
        try { data = await res.json(); } catch (e) {}
    }
    if (!data || data.error) {
        const q = new URLSearchParams(fallbackQuery || payload);
        q.set('t', String(Date.now()));
        res = await fetch(`${CONFIG.BACKEND_URL}?${q.toString()}`);
        data = await res.json();
    }
    if (data.error) throw new Error(data.error);
    return data;
}

async function cargarFoliosRelacion() {
    try {
        const data = await fetchJson({ action: 'listar_folios_relacion' });
        foliosRelacionCache = Array.isArray(data.folios) ? data.folios : [];
        const dl = document.getElementById('folios-relacion-lista');
        dl.innerHTML = '';
        foliosRelacionCache.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.folio;
            dl.appendChild(opt);
        });
    } catch (e) {}
}

async function cargarAlertas() {
    elAlertasLoading.classList.remove('hidden');
    elAlertasEmpty.classList.add('hidden');
    try {
        const filtros = getFiltros();
        const data = await fetchJson({
            action: 'obtener_alertas_stock',
            sucursalId: getSucursalActiva(),
            texto: filtros.texto,
            categoria: filtros.categoria,
            marca: filtros.marca,
            proveedor: filtros.proveedor,
            estatus: filtros.estatus,
            nivelAlerta: nivelAlertaActivo,
            page: 1,
            pageSize: 12
        });
        alertasCache = Array.isArray(data.productos) ? data.productos : [];
        renderAlertas(alertasCache);
    } catch (e) {
        elAlertasList.innerHTML = `<div class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">${escapeHtml(e.message)}</div>`;
    } finally {
        elAlertasLoading.classList.add('hidden');
    }
}

async function cargarProductos({ append = false } = {}) {
    if (isLoading) return;
    isLoading = true;
    if (!append) currentPage = 1;
    elLoading.classList.remove('hidden');
    if (!append) {
        elEmpty.classList.add('hidden');
        elRows.innerHTML = '';
    }

    const payload = { action: 'listar_productos', page: currentPage, pageSize: PAGE_SIZE, sucursalId: getSucursalActiva(), ...getFiltros() };
    try {
        const data = await fetchJson(payload);
        const productos = Array.isArray(data.productos) ? data.productos : [];
        if (!append) productosCache = productos.slice();
        else productosCache = productosCache.concat(productos);
        hasMore = !!data.hasMore;
        fillFilterOptions(data.filtros || {});
        setKpis(productosCache);
        renderRows(productos, append);
        elLoading.classList.add('hidden');

        const alertas = productosCache.filter(p => p.ALERTA_STOCK);
        if (alertas.length) {
            elAlertBox.classList.remove('hidden');
            elAlertBox.textContent = `Hay ${alertas.length} producto(s) con stock bajo o agotado.`;
        } else {
            elAlertBox.classList.add('hidden');
            elAlertBox.textContent = '';
        }

        if (!productosCache.length) {
            elEmpty.classList.remove('hidden');
        }
        elBtnMore.classList.toggle('hidden', !hasMore);
        if (hasMore) currentPage += 1;
        if (!append) {
            cargarAlertas();
        }
    } catch (e) {
        elLoading.classList.add('hidden');
        elEmpty.classList.remove('hidden');
        elEmpty.textContent = `No se pudieron cargar los productos: ${e.message}`;
        elBtnMore.classList.add('hidden');
    } finally {
        isLoading = false;
    }
}

function prepararDraftCompra(producto) {
    const draft = {
        proveedor: producto.PROVEEDOR || '',
        referencia: `Reposición por alerta de stock ${producto.SKU}`,
        notas: `Orden generada desde alerta de stock para ${producto.NOMBRE}.`,
        sucursalId: getSucursalActiva(),
        items: [{
            sku: producto.SKU,
            producto: producto.NOMBRE,
            cantidadPedida: Math.max(Number(producto.STOCK_MINIMO || 0) - Number(producto.STOCK_ACTUAL || 0), 1),
            costoUnitario: Number(producto.COSTO || 0),
            cantidadRecibida: 0
        }]
    };
    localStorage.setItem('srfix_compra_draft', JSON.stringify(draft));
    try {
        if (window.parent && window.parent !== window) {
            const btn = window.parent.document.getElementById('tab-compras');
            if (btn) {
                btn.click();
                return;
            }
        }
    } catch (e) {}
    window.location.href = './panel-compras.html';
}

function abrirModalProducto(producto = null) {
    document.getElementById('form-producto').reset();
    document.getElementById('producto-sku-original').value = producto?.SKU || '';
    document.getElementById('producto-title').textContent = producto ? `Editar ${producto.SKU}` : 'Nuevo producto';
    document.getElementById('producto-sku').value = producto?.SKU || '';
    document.getElementById('producto-nombre').value = producto?.NOMBRE || '';
    document.getElementById('producto-categoria').value = producto?.CATEGORIA || '';
    document.getElementById('producto-marca').value = producto?.MARCA || '';
    document.getElementById('producto-modelo').value = producto?.MODELO_COMPATIBLE || '';
    document.getElementById('producto-proveedor').value = producto?.PROVEEDOR || '';
    document.getElementById('producto-costo').value = Number(producto?.COSTO || 0);
    document.getElementById('producto-precio').value = Number(producto?.PRECIO || 0);
    document.getElementById('producto-stock').value = Number(producto?.STOCK_ACTUAL || 0);
    document.getElementById('producto-stock-minimo').value = Number(producto?.STOCK_MINIMO || 0);
    document.getElementById('producto-unidad').value = producto?.UNIDAD || '';
    document.getElementById('producto-ubicacion').value = producto?.UBICACION || '';
    document.getElementById('producto-notas').value = producto?.NOTAS || '';
    document.getElementById('producto-estatus').value = producto?.ESTATUS || 'activo';
    document.getElementById('modal-producto').classList.remove('hidden');
}

function cerrarModalProducto() {
    document.getElementById('modal-producto').classList.add('hidden');
}

async function guardarProducto(ev) {
    ev.preventDefault();
    const payload = {
        action: 'guardar_producto',
        skuOriginal: document.getElementById('producto-sku-original').value.trim(),
        sucursalId: getSucursalActiva(),
        sku: document.getElementById('producto-sku').value.trim().toUpperCase(),
        nombre: document.getElementById('producto-nombre').value.trim(),
        categoria: document.getElementById('producto-categoria').value.trim(),
        marca: document.getElementById('producto-marca').value.trim(),
        modeloCompatible: document.getElementById('producto-modelo').value.trim(),
        proveedor: document.getElementById('producto-proveedor').value.trim(),
        costo: document.getElementById('producto-costo').value,
        precio: document.getElementById('producto-precio').value,
        stockActual: document.getElementById('producto-stock').value,
        stockMinimo: document.getElementById('producto-stock-minimo').value,
        unidad: document.getElementById('producto-unidad').value.trim(),
        ubicacion: document.getElementById('producto-ubicacion').value.trim(),
        notas: document.getElementById('producto-notas').value.trim(),
        estatus: document.getElementById('producto-estatus').value
    };
    try {
        await fetchJson(payload);
        cerrarModalProducto();
        cargarProductos({ append: false });
    } catch (e) {
        alert(e.message || 'No se pudo guardar el producto');
    }
}

function abrirModalMovimiento(producto) {
    document.getElementById('form-movimiento').reset();
    document.getElementById('movimiento-title').textContent = `Movimiento · ${producto.SKU}`;
    document.getElementById('movimiento-sku').value = producto.SKU;
    document.getElementById('movimiento-producto').textContent = `${producto.NOMBRE} (${producto.SKU})`;
    document.getElementById('modal-movimiento').classList.remove('hidden');
}

function cerrarModalMovimiento() {
    document.getElementById('modal-movimiento').classList.add('hidden');
}

async function guardarMovimiento(ev) {
    ev.preventDefault();
    const payload = {
        action: 'registrar_movimiento_stock',
        sucursalId: getSucursalActiva(),
        sku: document.getElementById('movimiento-sku').value.trim().toUpperCase(),
        tipoMovimiento: document.getElementById('movimiento-tipo').value,
        cantidad: document.getElementById('movimiento-cantidad').value,
        costoUnitario: document.getElementById('movimiento-costo').value,
        folioEquipo: document.getElementById('movimiento-folio').value.trim().toUpperCase(),
        referencia: document.getElementById('movimiento-referencia').value.trim(),
        usuario: document.getElementById('movimiento-usuario').value.trim(),
        notas: document.getElementById('movimiento-notas').value.trim()
    };
    try {
        await fetchJson(payload);
        cerrarModalMovimiento();
        cargarProductos({ append: false });
    } catch (e) {
        alert(e.message || 'No se pudo registrar el movimiento');
    }
}

async function abrirHistorial(producto) {
    document.getElementById('historial-title').textContent = `Historial · ${producto.SKU}`;
    document.getElementById('historial-rows').innerHTML = '';
    document.getElementById('modal-historial').classList.remove('hidden');
    document.getElementById('historial-loading').classList.remove('hidden');
    try {
        const data = await fetchJson({ action: 'listar_movimientos_producto', sucursalId: getSucursalActiva(), sku: producto.SKU, page: 1, pageSize: 200 });
        const rows = Array.isArray(data.movimientos) ? data.movimientos : [];
        const tbody = document.getElementById('historial-rows');
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="px-3 py-6 text-center text-[#8A8F95]">Sin movimientos</td></tr>';
        } else {
            tbody.innerHTML = rows.map(item => `
                <tr class="border-t border-[#1F7EDC]/20">
                    <td class="px-3 py-3">${escapeHtml(item.FECHA || '---')}</td>
                    <td class="px-3 py-3">${escapeHtml(item.TIPO_MOVIMIENTO || '---')}</td>
                    <td class="px-3 py-3 text-right">${Number(item.CANTIDAD || 0)}</td>
                    <td class="px-3 py-3 text-right">${money(item.COSTO_UNITARIO || 0)}</td>
                    <td class="px-3 py-3">${escapeHtml(item.FOLIO_EQUIPO || '---')}</td>
                    <td class="px-3 py-3">${escapeHtml(item.REFERENCIA || '---')}</td>
                    <td class="px-3 py-3">${escapeHtml(item.USUARIO || '---')}</td>
                </tr>
            `).join('');
        }
    } catch (e) {
        document.getElementById('historial-rows').innerHTML = `<tr><td colspan="7" class="px-3 py-6 text-center text-red-300">${escapeHtml(e.message)}</td></tr>`;
    } finally {
        document.getElementById('historial-loading').classList.add('hidden');
    }
}

function cerrarHistorial() {
    document.getElementById('modal-historial').classList.add('hidden');
}

async function eliminarProductoSku(sku) {
    if (!confirm(`¿Marcar ${sku} como inactivo?`)) return;
    try {
        await fetchJson({ action: 'eliminar_producto', sku });
        cargarProductos({ append: false });
    } catch (e) {
        alert(e.message || 'No se pudo eliminar el producto');
    }
}

document.getElementById('btn-refresh').addEventListener('click', () => cargarProductos({ append: false }));
document.getElementById('btn-nuevo-producto').addEventListener('click', () => abrirModalProducto());
document.getElementById('form-producto').addEventListener('submit', guardarProducto);
document.getElementById('form-movimiento').addEventListener('submit', guardarMovimiento);
document.querySelectorAll('[data-close-producto]').forEach(btn => btn.addEventListener('click', cerrarModalProducto));
document.querySelectorAll('[data-close-mov]').forEach(btn => btn.addEventListener('click', cerrarModalMovimiento));
document.querySelectorAll('[data-close-hist]').forEach(btn => btn.addEventListener('click', cerrarHistorial));
elBtnMore.addEventListener('click', () => { if (hasMore) cargarProductos({ append: true }); });

['filtro-texto', 'filtro-categoria', 'filtro-marca', 'filtro-estatus', 'filtro-alertas'].forEach(id => {
    document.getElementById(id).addEventListener(id === 'filtro-texto' ? 'input' : 'change', () => cargarProductos({ append: false }));
});

document.getElementById('filtro-proveedor').addEventListener('change', () => cargarProductos({ append: false }));
document.getElementById('btn-refresh-alertas').addEventListener('click', cargarAlertas);

document.querySelectorAll('[data-alerta-nivel]').forEach(btn => {
    btn.addEventListener('click', () => {
        nivelAlertaActivo = btn.getAttribute('data-alerta-nivel') || '';
        document.querySelectorAll('[data-alerta-nivel]').forEach(x => x.classList.remove('ring-2', 'ring-[#FF6A2A]'));
        btn.classList.add('ring-2', 'ring-[#FF6A2A]');
        cargarAlertas();
    });
});

elRows.addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit]');
    const mov = e.target.closest('[data-mov]');
    const hist = e.target.closest('[data-hist]');
    const order = e.target.closest('[data-order]');
    const del = e.target.closest('[data-del]');
    if (edit) {
        const producto = productosCache.find(p => p.SKU === edit.getAttribute('data-edit'));
        if (producto) abrirModalProducto(producto);
    }
    if (mov) {
        const producto = productosCache.find(p => p.SKU === mov.getAttribute('data-mov'));
        if (producto) abrirModalMovimiento(producto);
    }
    if (hist) {
        const producto = productosCache.find(p => p.SKU === hist.getAttribute('data-hist'));
        if (producto) abrirHistorial(producto);
    }
    if (order) {
        const producto = productosCache.find(p => p.SKU === order.getAttribute('data-order'));
        if (producto) prepararDraftCompra(producto);
    }
    if (del) eliminarProductoSku(del.getAttribute('data-del'));
});

elAlertasList.addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit]');
    const hist = e.target.closest('[data-hist]');
    const order = e.target.closest('[data-order]');
    if (edit) {
        const producto = productosCache.find(p => p.SKU === edit.getAttribute('data-edit')) || alertasCache.find(p => p.SKU === edit.getAttribute('data-edit'));
        if (producto) abrirModalProducto(producto);
    }
    if (hist) {
        const producto = productosCache.find(p => p.SKU === hist.getAttribute('data-hist')) || alertasCache.find(p => p.SKU === hist.getAttribute('data-hist'));
        if (producto) abrirHistorial(producto);
    }
    if (order) {
        const producto = productosCache.find(p => p.SKU === order.getAttribute('data-order')) || alertasCache.find(p => p.SKU === order.getAttribute('data-order'));
        if (producto) prepararDraftCompra(producto);
    }
});

document.getElementById('modal-producto').addEventListener('click', (e) => { if (e.target.id === 'modal-producto') cerrarModalProducto(); });
document.getElementById('modal-movimiento').addEventListener('click', (e) => { if (e.target.id === 'modal-movimiento') cerrarModalMovimiento(); });
document.getElementById('modal-historial').addEventListener('click', (e) => { if (e.target.id === 'modal-historial') cerrarHistorial(); });

cargarFoliosRelacion();
cargarProductos({ append: false });
