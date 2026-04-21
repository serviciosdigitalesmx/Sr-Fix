"use strict";
;
(function () {
    const BACKEND_URL = String(CONFIG.API_URL || '').trim();
    const PAGE_SIZE = 80;
    const elRows = requireElement('rows');
    const elLoading = requireElement('loading');
    const elEmpty = requireElement('empty');
    const elBtnMore = requireElement('btn-more');
    const elAlertBox = requireElement('alert-box');
    const elAlertasList = requireElement('alertas-list');
    const elAlertasLoading = requireElement('alertas-loading');
    const elAlertasEmpty = requireElement('alertas-empty');
    const elFiltroTexto = requireElement('filtro-texto');
    const elFiltroCategoria = requireElement('filtro-categoria');
    const elFiltroMarca = requireElement('filtro-marca');
    const elFiltroProveedor = requireElement('filtro-proveedor');
    const elFiltroEstatus = requireElement('filtro-estatus');
    const elFiltroAlertas = requireElement('filtro-alertas');
    let currentPage = 1;
    let hasMore = false;
    let isLoading = false;
    let productosCache = [];
    let foliosRelacionCache = [];
    let alertasCache = [];
    let nivelAlertaActivo = '';
    function requireElement(id) {
        const el = document.getElementById(id);
        if (!el) {
            throw new Error(`Elemento no encontrado: ${id}`);
        }
        return el;
    }
    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    function money(value) {
        const n = Number(value ?? 0);
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
    function badgeNivelAlerta(nivel) {
        if (nivel === 'agotado')
            return '<span class="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-300">Agotado</span>';
        if (nivel === 'critico')
            return '<span class="px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-300">Crítico</span>';
        return '<span class="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-300">Bajo</span>';
    }
    function getFiltros() {
        return {
            texto: elFiltroTexto.value.trim(),
            categoria: elFiltroCategoria.value,
            marca: elFiltroMarca.value,
            proveedor: elFiltroProveedor.value,
            estatus: elFiltroEstatus.value,
            soloAlertas: elFiltroAlertas.checked ? '1' : ''
        };
    }
    function setKpis(productos) {
        requireElement('kpi-total').textContent = String(productos.length);
        requireElement('kpi-alertas').textContent = String(productos.filter((p) => !!p.ALERTA_STOCK).length);
        requireElement('kpi-agotados').textContent = String(productos.filter((p) => Number(p.STOCK_ACTUAL || 0) <= 0).length);
    }
    function fillFilterOptions(filtros = {}) {
        const currentCategoria = elFiltroCategoria.value;
        const currentMarca = elFiltroMarca.value;
        const currentProveedor = elFiltroProveedor.value;
        elFiltroCategoria.innerHTML = '<option value="">Todas las categorías</option>';
        elFiltroMarca.innerHTML = '<option value="">Todas las marcas</option>';
        elFiltroProveedor.innerHTML = '<option value="">Todos los proveedores</option>';
        (filtros.categorias || []).forEach((value) => {
            elFiltroCategoria.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`);
        });
        (filtros.marcas || []).forEach((value) => {
            elFiltroMarca.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`);
        });
        (filtros.proveedores || []).forEach((value) => {
            elFiltroProveedor.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`);
        });
        elFiltroCategoria.value = currentCategoria;
        elFiltroMarca.value = currentMarca;
        elFiltroProveedor.value = currentProveedor;
    }
    function renderRows(items, append = false) {
        if (!append)
            elRows.innerHTML = '';
        const frag = document.createDocumentFragment();
        items.forEach((producto) => {
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
    function renderAlertas(items = []) {
        elAlertasList.innerHTML = '';
        elAlertasEmpty.classList.toggle('hidden', items.length > 0);
        if (!items.length)
            return;
        const frag = document.createDocumentFragment();
        items.forEach((producto) => {
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
    function getBackendUrl() {
        return BACKEND_URL;
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
        return `${getBackendUrl()}?${q.toString()}`;
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
        const response = method === 'GET'
            ? await fetch(buildGetUrl(action, payload), { method: 'GET' })
            : await fetch(getBackendUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...payload })
            });
        const data = await readJson(response);
        const errorText = typeof data.error === 'string' ? data.error.trim() : '';
        if (errorText)
            throw new Error(errorText);
        if (Object.prototype.hasOwnProperty.call(data, 'success') && data.success === false) {
            throw new Error(errorText || `La operación ${action} fue rechazada`);
        }
        return data;
    }
    async function cargarFoliosRelacion() {
        try {
            const data = await requestBackend('listar_folios_relacion', {}, 'POST');
            foliosRelacionCache = Array.isArray(data.folios) ? data.folios : [];
            const dl = requireElement('folios-relacion-lista');
            dl.innerHTML = '';
            foliosRelacionCache.forEach((item) => {
                const opt = document.createElement('option');
                opt.value = item.folio;
                dl.appendChild(opt);
            });
        }
        catch {
            // Non-blocking.
        }
    }
    async function cargarAlertas() {
        elAlertasLoading.classList.remove('hidden');
        elAlertasEmpty.classList.add('hidden');
        try {
            const filtros = getFiltros();
            const data = await requestBackend('obtener_alertas_stock', {
                sucursalId: getSucursalActiva(),
                texto: filtros.texto,
                categoria: filtros.categoria,
                marca: filtros.marca,
                proveedor: filtros.proveedor,
                estatus: filtros.estatus,
                nivelAlerta: nivelAlertaActivo,
                page: 1,
                pageSize: 12
            }, 'POST');
            alertasCache = Array.isArray(data.productos) ? data.productos : [];
            renderAlertas(alertasCache);
        }
        catch (error) {
            elAlertasList.innerHTML = `<div class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">${escapeHtml(error instanceof Error ? error.message : String(error))}</div>`;
        }
        finally {
            elAlertasLoading.classList.add('hidden');
        }
    }
    async function cargarProductos({ append = false } = {}) {
        if (isLoading)
            return;
        isLoading = true;
        if (!append)
            currentPage = 1;
        elLoading.classList.remove('hidden');
        if (!append) {
            elEmpty.classList.add('hidden');
            elRows.innerHTML = '';
        }
        const payload = { page: currentPage, pageSize: PAGE_SIZE, sucursalId: getSucursalActiva(), ...getFiltros() };
        try {
            const data = await requestBackend('listar_productos', payload, 'POST');
            const productos = Array.isArray(data.productos) ? data.productos : [];
            if (!append)
                productosCache = productos.slice();
            else
                productosCache = productosCache.concat(productos);
            hasMore = !!data.hasMore;
            fillFilterOptions(data.filtros || {});
            setKpis(productosCache);
            renderRows(productos, append);
            elLoading.classList.add('hidden');
            const alertas = productosCache.filter((p) => !!p.ALERTA_STOCK);
            if (alertas.length) {
                elAlertBox.classList.remove('hidden');
                elAlertBox.textContent = `Hay ${alertas.length} producto(s) con stock bajo o agotado.`;
            }
            else {
                elAlertBox.classList.add('hidden');
                elAlertBox.textContent = '';
            }
            if (!productosCache.length) {
                elEmpty.classList.remove('hidden');
            }
            elBtnMore.classList.toggle('hidden', !hasMore);
            if (hasMore)
                currentPage += 1;
            if (!append) {
                await cargarAlertas();
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            elLoading.classList.add('hidden');
            elEmpty.classList.remove('hidden');
            elEmpty.textContent = `No se pudieron cargar los productos: ${message}`;
            elBtnMore.classList.add('hidden');
        }
        finally {
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
        }
        catch {
            // No-op.
        }
        window.location.href = './panel-compras.html';
    }
    function abrirModalProducto(producto = null) {
        requireElement('form-producto').reset();
        requireElement('producto-sku-original').value = producto?.SKU || '';
        requireElement('producto-title').textContent = producto ? `Editar ${producto.SKU}` : 'Nuevo producto';
        requireElement('producto-sku').value = producto?.SKU || '';
        requireElement('producto-nombre').value = producto?.NOMBRE || '';
        requireElement('producto-categoria').value = producto?.CATEGORIA || '';
        requireElement('producto-marca').value = producto?.MARCA || '';
        requireElement('producto-modelo').value = producto?.MODELO_COMPATIBLE || '';
        requireElement('producto-proveedor').value = producto?.PROVEEDOR || '';
        requireElement('producto-costo').value = String(Number(producto?.COSTO || 0));
        requireElement('producto-precio').value = String(Number(producto?.PRECIO || 0));
        requireElement('producto-stock').value = String(Number(producto?.STOCK_ACTUAL || 0));
        requireElement('producto-stock-minimo').value = String(Number(producto?.STOCK_MINIMO || 0));
        requireElement('producto-unidad').value = producto?.UNIDAD || '';
        requireElement('producto-ubicacion').value = producto?.UBICACION || '';
        requireElement('producto-notas').value = producto?.NOTAS || '';
        requireElement('producto-estatus').value = producto?.ESTATUS || 'activo';
        requireElement('modal-producto').classList.remove('hidden');
    }
    function cerrarModalProducto() {
        requireElement('modal-producto').classList.add('hidden');
    }
    async function guardarProducto(ev) {
        ev.preventDefault();
        const costo = Number(requireElement('producto-costo').value || 0);
        const precio = Number(requireElement('producto-precio').value || 0);
        const skuOriginal = requireElement('producto-sku-original').value.trim().toUpperCase();
        const productoOriginal = skuOriginal ? productosCache.find((item) => String(item.SKU || '').trim().toUpperCase() === skuOriginal) : null;
        const requiereAuth = productoOriginal
            ? (Number(productoOriginal.COSTO || 0) !== costo || Number(productoOriginal.PRECIO || 0) !== precio)
            : (costo > 0 || precio > 0);
        const guard = window.SRFXSecurityGuard;
        let adminPasswordActual = '';
        if (requiereAuth) {
            if (!guard || typeof guard.ensureAdminPassword !== 'function') {
                alert('No se pudo validar la clave admin');
                return;
            }
            const auth = await guard.ensureAdminPassword('guardar un producto con costo o precio');
            if (!auth.ok)
                return;
            adminPasswordActual = auth.password || '';
        }
        const payload = {
            skuOriginal,
            sucursalId: getSucursalActiva(),
            sku: requireElement('producto-sku').value.trim().toUpperCase(),
            nombre: requireElement('producto-nombre').value.trim(),
            categoria: requireElement('producto-categoria').value.trim(),
            marca: requireElement('producto-marca').value.trim(),
            modeloCompatible: requireElement('producto-modelo').value.trim(),
            proveedor: requireElement('producto-proveedor').value.trim(),
            costo,
            precio,
            stockActual: requireElement('producto-stock').value,
            stockMinimo: requireElement('producto-stock-minimo').value,
            unidad: requireElement('producto-unidad').value.trim(),
            ubicacion: requireElement('producto-ubicacion').value.trim(),
            notas: requireElement('producto-notas').value.trim(),
            estatus: requireElement('producto-estatus').value,
            adminPasswordActual
        };
        try {
            await requestBackend('guardar_producto', payload, 'POST');
            cerrarModalProducto();
            await cargarProductos({ append: false });
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'No se pudo guardar el producto');
        }
    }
    function abrirModalMovimiento(producto) {
        requireElement('form-movimiento').reset();
        requireElement('movimiento-title').textContent = `Movimiento · ${producto.SKU}`;
        requireElement('movimiento-sku').value = producto.SKU;
        requireElement('movimiento-producto').textContent = `${producto.NOMBRE} (${producto.SKU})`;
        requireElement('modal-movimiento').classList.remove('hidden');
    }
    function cerrarModalMovimiento() {
        requireElement('modal-movimiento').classList.add('hidden');
    }
    async function guardarMovimiento(ev) {
        ev.preventDefault();
        const costoUnitario = Number(requireElement('movimiento-costo').value || 0);
        let adminPasswordActual = '';
        if (costoUnitario > 0) {
            const guard = window.SRFXSecurityGuard;
            if (!guard || typeof guard.ensureAdminPassword !== 'function') {
                alert('No se pudo validar la clave admin');
                return;
            }
            const auth = await guard.ensureAdminPassword('registrar un movimiento con costo unitario');
            if (!auth.ok)
                return;
            adminPasswordActual = auth.password || '';
        }
        const payload = {
            sucursalId: getSucursalActiva(),
            sku: requireElement('movimiento-sku').value.trim().toUpperCase(),
            tipoMovimiento: requireElement('movimiento-tipo').value,
            cantidad: requireElement('movimiento-cantidad').value,
            costoUnitario,
            folioEquipo: requireElement('movimiento-folio').value.trim().toUpperCase(),
            referencia: requireElement('movimiento-referencia').value.trim(),
            usuario: requireElement('movimiento-usuario').value.trim(),
            notas: requireElement('movimiento-notas').value.trim(),
            adminPasswordActual
        };
        try {
            await requestBackend('registrar_movimiento_stock', payload, 'POST');
            cerrarModalMovimiento();
            await cargarProductos({ append: false });
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'No se pudo registrar el movimiento');
        }
    }
    async function abrirHistorial(producto) {
        requireElement('historial-title').textContent = `Historial · ${producto.SKU}`;
        requireElement('historial-rows').innerHTML = '';
        requireElement('modal-historial').classList.remove('hidden');
        requireElement('historial-loading').classList.remove('hidden');
        try {
            const data = await requestBackend('listar_movimientos_producto', {
                sucursalId: getSucursalActiva(),
                sku: producto.SKU,
                page: 1,
                pageSize: 200
            }, 'POST');
            const rows = Array.isArray(data.movimientos) ? data.movimientos : [];
            const tbody = requireElement('historial-rows');
            if (!rows.length) {
                tbody.innerHTML = '<tr><td colspan="7" class="px-3 py-6 text-center text-[#8A8F95]">Sin movimientos</td></tr>';
            }
            else {
                tbody.innerHTML = rows.map((item) => `
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
        }
        catch (error) {
            requireElement('historial-rows').innerHTML = `<tr><td colspan="7" class="px-3 py-6 text-center text-red-300">${escapeHtml(error instanceof Error ? error.message : String(error))}</td></tr>`;
        }
        finally {
            requireElement('historial-loading').classList.add('hidden');
        }
    }
    function cerrarHistorial() {
        requireElement('modal-historial').classList.add('hidden');
    }
    async function eliminarProductoSku(sku) {
        if (!confirm(`¿Marcar ${sku} como inactivo?`))
            return;
        try {
            await requestBackend('eliminar_producto', { sku }, 'POST');
            await cargarProductos({ append: false });
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'No se pudo eliminar el producto');
        }
    }
    function bindEvents() {
        requireElement('btn-refresh').addEventListener('click', () => void cargarProductos({ append: false }));
        requireElement('btn-nuevo-producto').addEventListener('click', () => abrirModalProducto());
        requireElement('form-producto').addEventListener('submit', (ev) => void guardarProducto(ev));
        requireElement('form-movimiento').addEventListener('submit', (ev) => void guardarMovimiento(ev));
        document.querySelectorAll('[data-close-producto]').forEach((btn) => btn.addEventListener('click', cerrarModalProducto));
        document.querySelectorAll('[data-close-mov]').forEach((btn) => btn.addEventListener('click', cerrarModalMovimiento));
        document.querySelectorAll('[data-close-hist]').forEach((btn) => btn.addEventListener('click', cerrarHistorial));
        elBtnMore.addEventListener('click', () => { if (hasMore)
            void cargarProductos({ append: true }); });
        ['filtro-texto', 'filtro-categoria', 'filtro-marca', 'filtro-estatus', 'filtro-alertas'].forEach((id) => {
            const el = document.getElementById(id);
            if (!el)
                return;
            el.addEventListener(id === 'filtro-texto' ? 'input' : 'change', () => void cargarProductos({ append: false }));
        });
        elFiltroProveedor.addEventListener('change', () => void cargarProductos({ append: false }));
        requireElement('btn-refresh-alertas').addEventListener('click', () => void cargarAlertas());
        document.querySelectorAll('[data-alerta-nivel]').forEach((btn) => {
            btn.addEventListener('click', () => {
                nivelAlertaActivo = btn.getAttribute('data-alerta-nivel') || '';
                document.querySelectorAll('[data-alerta-nivel]').forEach((x) => x.classList.remove('ring-2', 'ring-[#FF6A2A]'));
                btn.classList.add('ring-2', 'ring-[#FF6A2A]');
                void cargarAlertas();
            });
        });
        elRows.addEventListener('click', (event) => {
            const target = event.target;
            const edit = target?.closest('[data-edit]');
            const mov = target?.closest('[data-mov]');
            const hist = target?.closest('[data-hist]');
            const order = target?.closest('[data-order]');
            const del = target?.closest('[data-del]');
            if (edit) {
                const producto = productosCache.find((p) => p.SKU === edit.getAttribute('data-edit'));
                if (producto)
                    abrirModalProducto(producto);
            }
            if (mov) {
                const producto = productosCache.find((p) => p.SKU === mov.getAttribute('data-mov'));
                if (producto)
                    abrirModalMovimiento(producto);
            }
            if (hist) {
                const producto = productosCache.find((p) => p.SKU === hist.getAttribute('data-hist'));
                if (producto)
                    void abrirHistorial(producto);
            }
            if (order) {
                const producto = productosCache.find((p) => p.SKU === order.getAttribute('data-order'));
                if (producto)
                    prepararDraftCompra(producto);
            }
            if (del)
                void eliminarProductoSku(String(del.getAttribute('data-del') || ''));
        });
        elAlertasList.addEventListener('click', (event) => {
            const target = event.target;
            const edit = target?.closest('[data-edit]');
            const hist = target?.closest('[data-hist]');
            const order = target?.closest('[data-order]');
            if (edit) {
                const producto = productosCache.find((p) => p.SKU === edit.getAttribute('data-edit')) || alertasCache.find((p) => p.SKU === edit.getAttribute('data-edit'));
                if (producto)
                    abrirModalProducto(producto);
            }
            if (hist) {
                const producto = productosCache.find((p) => p.SKU === hist.getAttribute('data-hist')) || alertasCache.find((p) => p.SKU === hist.getAttribute('data-hist'));
                if (producto)
                    void abrirHistorial(producto);
            }
            if (order) {
                const producto = productosCache.find((p) => p.SKU === order.getAttribute('data-order')) || alertasCache.find((p) => p.SKU === order.getAttribute('data-order'));
                if (producto)
                    prepararDraftCompra(producto);
            }
        });
        requireElement('modal-producto').addEventListener('click', (event) => {
            if (event.target?.id === 'modal-producto')
                cerrarModalProducto();
        });
        requireElement('modal-movimiento').addEventListener('click', (event) => {
            if (event.target?.id === 'modal-movimiento')
                cerrarModalMovimiento();
        });
        requireElement('modal-historial').addEventListener('click', (event) => {
            if (event.target?.id === 'modal-historial')
                cerrarHistorial();
        });
    }
    bindEvents();
    void cargarFoliosRelacion();
    void cargarProductos({ append: false });
})();
