"use strict";
;
(function () {
    const backend = window.SRFIXBackend;
    const PAGE_SIZE = 80;
    const elRows = requireElement('rows');
    const elLoading = requireElement('loading');
    const elEmpty = requireElement('empty');
    const elBtnMore = requireElement('btn-more');
    const elBtnRefresh = requireElement('btn-refresh');
    const elBtnNueva = requireElement('btn-nueva');
    const elBtnAgregarItem = requireElement('btn-agregar-item');
    const elFormOrden = requireElement('form-orden');
    const elFormRecepcion = requireElement('form-recepcion');
    const elItemsRows = requireElement('items-rows');
    const elOrdenIva = requireElement('orden-iva-porcentaje');
    const elModalOrden = requireElement('modal-orden');
    const elModalRecepcion = requireElement('modal-recepcion');
    const elFiltroTexto = requireElement('filtro-texto');
    const elFiltroEstado = requireElement('filtro-estado');
    const elFiltroProveedor = requireElement('filtro-proveedor');
    let currentPage = 1;
    let hasMore = false;
    let isLoading = false;
    let ordenesCache = [];
    let proveedoresCache = [];
    let foliosRelacionCache = [];
    let itemsDraft = [];
    function requireElement(id) {
        const el = document.getElementById(id);
        if (!el)
            throw new Error(`Elemento no encontrado: ${id}`);
        return el;
    }
    function getInputValue(id) {
        const el = document.getElementById(id);
        return String(el?.value || '');
    }
    function setInputValue(id, value) {
        const el = document.getElementById(id);
        if (el)
            el.value = value;
    }
    function escapeHtml(v) {
        return String(v ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    function money(v) {
        return `$${Number(v ?? 0).toFixed(2)}`;
    }
    function badgeEstado(v) {
        const estado = String(v ?? '').toLowerCase();
        if (estado === 'recibida')
            return '<span class="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300">Recibida</span>';
        if (estado === 'parcialmente_recibida')
            return '<span class="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-300">Parcial</span>';
        if (estado === 'cancelada')
            return '<span class="px-2 py-1 rounded-full text-xs bg-slate-500/20 text-slate-300">Cancelada</span>';
        if (estado === 'enviada')
            return '<span class="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300">Enviada</span>';
        return '<span class="px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-300">Borrador</span>';
    }
    function getSucursalActiva() {
        return localStorage.getItem('srfix_sucursal_activa') || 'GLOBAL';
    }
    function getFiltros() {
        return {
            texto: elFiltroTexto.value.trim(),
            estado: elFiltroEstado.value,
            proveedor: elFiltroProveedor.value
        };
    }
    function setKpis(items) {
        requireElement('kpi-total').textContent = String(items.length);
        requireElement('kpi-abiertas').textContent = String(items.filter((x) => ['borrador', 'enviada', 'parcialmente_recibida'].includes(String(x.ESTADO || '').toLowerCase())).length);
        requireElement('kpi-recibidas').textContent = String(items.filter((x) => String(x.ESTADO || '').toLowerCase() === 'recibida').length);
    }
    function fillProveedorFilter(list = []) {
        const current = elFiltroProveedor.value;
        elFiltroProveedor.innerHTML = '<option value="">Todos los proveedores</option>';
        list.forEach((item) => {
            const nombre = typeof item === 'string' ? item : item.nombre;
            if (!nombre)
                return;
            elFiltroProveedor.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(nombre)}">${escapeHtml(nombre)}</option>`);
        });
        elFiltroProveedor.value = current;
    }
    function fillDatalists() {
        const provList = requireElement('proveedores-lista');
        provList.innerHTML = '';
        proveedoresCache.forEach((item) => {
            const nombre = item.nombre;
            if (!nombre)
                return;
            const opt = document.createElement('option');
            opt.value = nombre;
            provList.appendChild(opt);
        });
        const foliosList = requireElement('folios-relacion-lista');
        foliosList.innerHTML = '';
        foliosRelacionCache.forEach((item) => {
            if (!item.folio)
                return;
            const opt = document.createElement('option');
            opt.value = item.folio;
            foliosList.appendChild(opt);
        });
    }
    function renderRows(items, append = false) {
        if (!append)
            elRows.innerHTML = '';
        const frag = document.createDocumentFragment();
        items.forEach((orden) => {
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
    function addDraftItem(item = {}) {
        itemsDraft.push({
            sku: String(item.sku || ''),
            producto: String(item.producto || ''),
            cantidadPedida: Number(item.cantidadPedida || 1),
            costoUnitario: Number(item.costoUnitario || 0),
            cantidadRecibida: Number(item.cantidadRecibida || 0)
        });
        renderItemsDraft();
    }
    function recalcularTotales() {
        const subtotal = itemsDraft.reduce((acc, item) => acc + (Number(item.cantidadPedida || 0) * Number(item.costoUnitario || 0)), 0);
        const ivaPct = Number(elOrdenIva.value || 0);
        const ivaMonto = subtotal * (ivaPct / 100);
        const total = subtotal + ivaMonto;
        setInputValue('orden-subtotal', subtotal.toFixed(2));
        setInputValue('orden-iva-monto', ivaMonto.toFixed(2));
        setInputValue('orden-total', total.toFixed(2));
    }
    function renderItemsDraft() {
        elItemsRows.innerHTML = itemsDraft.map((item, idx) => `
      <tr class="border-t border-[#1F7EDC]/10">
        <td class="px-2 py-2"><input data-item="${idx}" data-field="sku" value="${escapeHtml(item.sku || '')}" class="w-full rounded bg-[#10161f] border border-[#1F7EDC]/20 px-2 py-1 text-sm uppercase"></td>
        <td class="px-2 py-2"><input data-item="${idx}" data-field="producto" value="${escapeHtml(item.producto || '')}" class="w-full rounded bg-[#10161f] border border-[#1F7EDC]/20 px-2 py-1 text-sm"></td>
        <td class="px-2 py-2"><input data-item="${idx}" data-field="cantidadPedida" type="number" min="0.01" step="0.01" value="${Number(item.cantidadPedida || 0)}" class="w-full rounded bg-[#10161f] border border-[#1F7EDC]/20 px-2 py-1 text-sm text-right"></td>
        <td class="px-2 py-2"><input data-item="${idx}" data-field="costoUnitario" type="number" min="0" step="0.01" value="${Number(item.costoUnitario || 0)}" class="w-full rounded bg-[#10161f] border border-[#1F7EDC]/20 px-2 py-1 text-sm text-right"></td>
        <td class="px-2 py-2 text-right">${money(Number(item.cantidadPedida || 0) * Number(item.costoUnitario || 0))}</td>
        <td class="px-2 py-2 text-center">${Number(item.cantidadRecibida || 0)}</td>
        <td class="px-2 py-2"><button type="button" data-del-item="${idx}" class="px-2 py-1 rounded border border-red-500/40 text-xs hover:bg-red-500/20"><i class="fa-solid fa-trash"></i></button></td>
      </tr>
    `).join('');
        recalcularTotales();
    }
    function abrirModalOrden(orden = null, items = []) {
        elFormOrden.reset();
        setInputValue('orden-folio', String(orden?.FOLIO_OC || ''));
        requireElement('orden-title').textContent = orden ? `Editar ${orden.FOLIO_OC}` : 'Nueva orden de compra';
        setInputValue('orden-fecha', String(orden?.FECHA || new Date().toISOString().slice(0, 10)));
        setInputValue('orden-proveedor', String(orden?.PROVEEDOR || ''));
        setInputValue('orden-estado', String(orden?.ESTADO || 'borrador'));
        setInputValue('orden-referencia', String(orden?.REFERENCIA || ''));
        setInputValue('orden-pago', String(orden?.CONDICIONES_PAGO || ''));
        setInputValue('orden-fecha-estimada', String(orden?.FECHA_ESTIMADA || ''));
        setInputValue('orden-folio-relacionado', String(orden?.FOLIO_RELACIONADO || ''));
        setInputValue('orden-notas', String(orden?.NOTAS || ''));
        setInputValue('orden-iva-porcentaje', String(Number(orden?.IVA_PORCENTAJE || 0)));
        itemsDraft = (items || []).map((item) => ({
            sku: String(item.SKU || ''),
            producto: String(item.PRODUCTO || ''),
            cantidadPedida: Number(item.CANTIDAD_PEDIDA || 0),
            costoUnitario: Number(item.COSTO_UNITARIO || 0),
            cantidadRecibida: Number(item.CANTIDAD_RECIBIDA || 0)
        }));
        if (!itemsDraft.length)
            addDraftItem();
        else
            renderItemsDraft();
        elModalOrden.classList.remove('hidden');
        recalcularTotales();
    }
    function cerrarModalOrden() {
        elModalOrden.classList.add('hidden');
    }
    function abrirRecepcion(folio) {
        void (async () => {
            try {
                const data = await backend.request('orden_compra', { folio, sucursalId: getSucursalActiva() }, { method: 'POST' });
                const orden = data.orden;
                if (!orden)
                    throw new Error(data.error || 'No se pudo cargar la orden');
                requireElement('recepcion-title').textContent = `Recibir ${folio}`;
                setInputValue('recepcion-folio', folio);
                setInputValue('recepcion-usuario', String(localStorage.getItem('srfix_usuario') || ''));
                requireElement('recepcion-rows').innerHTML = (data.items || []).map((item) => `
          <tr class="border-t border-[#1F7EDC]/20">
            <td class="px-3 py-3">${escapeHtml(item.SKU)}</td>
            <td class="px-3 py-3">${escapeHtml(item.PRODUCTO)}</td>
            <td class="px-3 py-3 text-right">${Number(item.CANTIDAD_PEDIDA || 0)}</td>
            <td class="px-3 py-3 text-right">${Number(item.CANTIDAD_RECIBIDA || 0)}</td>
            <td class="px-3 py-3 text-right">
              <input data-recepcion-item="${Number(item.ITEM_ID || 0)}" data-pedida="${Number(item.CANTIDAD_PEDIDA || 0)}" data-recibida="${Number(item.CANTIDAD_RECIBIDA || 0)}" type="number" min="0" step="0.01" value="0" class="w-28 rounded bg-[#161616] border border-[#1F7EDC]/30 px-2 py-1 text-sm text-right">
            </td>
          </tr>
        `).join('');
                elModalRecepcion.classList.remove('hidden');
            }
            catch (error) {
                alert(error instanceof Error ? error.message : 'No se pudo cargar la recepción');
            }
        })();
    }
    function cerrarRecepcion() {
        elModalRecepcion.classList.add('hidden');
    }
    async function cargarAuxiliares() {
        try {
            const [proveedoresData, foliosData] = await Promise.all([
                backend.request('listar_nombres_proveedores', {}, { method: 'POST' }),
                backend.request('listar_folios_relacion', {}, { method: 'POST' })
            ]);
            proveedoresCache = Array.isArray(proveedoresData.proveedores) ? proveedoresData.proveedores : [];
            foliosRelacionCache = Array.isArray(foliosData.folios) ? foliosData.folios : [];
            fillDatalists();
            fillProveedorFilter(proveedoresCache);
        }
        catch {
            // La UI sigue siendo utilizable aunque falle el catálogo auxiliar.
        }
    }
    async function cargarOrdenes({ append = false } = {}) {
        if (isLoading)
            return;
        isLoading = true;
        if (!append)
            currentPage = 1;
        elLoading.classList.remove('hidden');
        if (!append) {
            elRows.innerHTML = '';
            elEmpty.classList.add('hidden');
        }
        try {
            const data = await backend.request('listar_ordenes_compra', { sucursalId: getSucursalActiva(), page: currentPage, pageSize: PAGE_SIZE, ...getFiltros() }, { method: 'POST' });
            const items = Array.isArray(data.ordenes) ? data.ordenes : [];
            if (!append)
                ordenesCache = items.slice();
            else
                ordenesCache = ordenesCache.concat(items);
            hasMore = !!data.hasMore;
            if (Array.isArray(data.proveedores))
                fillProveedorFilter(data.proveedores);
            setKpis(ordenesCache);
            renderRows(items, append);
            if (!ordenesCache.length)
                elEmpty.classList.remove('hidden');
            elBtnMore.classList.toggle('hidden', !hasMore);
            if (hasMore)
                currentPage += 1;
        }
        catch (error) {
            elEmpty.classList.remove('hidden');
            elEmpty.textContent = `No se pudieron cargar las órdenes: ${error instanceof Error ? error.message : String(error)}`;
        }
        finally {
            elLoading.classList.add('hidden');
            isLoading = false;
        }
    }
    async function guardarOrden(ev) {
        ev.preventDefault();
        const payload = {
            sucursalId: getSucursalActiva(),
            folio: getInputValue('orden-folio').trim().toUpperCase(),
            fecha: getInputValue('orden-fecha'),
            proveedor: getInputValue('orden-proveedor').trim(),
            estado: getInputValue('orden-estado'),
            referencia: getInputValue('orden-referencia').trim(),
            condicionesPago: getInputValue('orden-pago').trim(),
            fechaEstimada: getInputValue('orden-fecha-estimada'),
            folioRelacionado: getInputValue('orden-folio-relacionado').trim().toUpperCase(),
            notas: getInputValue('orden-notas').trim(),
            subtotal: getInputValue('orden-subtotal'),
            ivaPorcentaje: getInputValue('orden-iva-porcentaje'),
            ivaMonto: getInputValue('orden-iva-monto'),
            total: getInputValue('orden-total'),
            items: itemsDraft.map((item) => ({
                sku: String(item.sku || '').trim().toUpperCase(),
                producto: String(item.producto || '').trim(),
                cantidadPedida: Number(item.cantidadPedida || 0),
                costoUnitario: Number(item.costoUnitario || 0),
                cantidadRecibida: Number(item.cantidadRecibida || 0)
            }))
        };
        try {
            await backend.request('guardar_orden_compra', payload, { method: 'POST' });
            cerrarModalOrden();
            await cargarOrdenes({ append: false });
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'No se pudo guardar la orden');
        }
    }
    async function abrirOrden(folio) {
        try {
            const data = await backend.request('orden_compra', { folio, sucursalId: getSucursalActiva() }, { method: 'POST' });
            if (!data.orden)
                throw new Error(data.error || 'No se pudo cargar la orden');
            abrirModalOrden(data.orden, data.items || []);
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'No se pudo cargar la orden');
        }
    }
    async function cambiarEstado(folio, estado) {
        try {
            await backend.request('cambiar_estado_orden_compra', { folio, estado, sucursalId: getSucursalActiva() }, { method: 'POST' });
            await cargarOrdenes({ append: false });
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'No se pudo cambiar el estado');
        }
    }
    async function guardarRecepcion(ev) {
        ev.preventDefault();
        const folio = getInputValue('recepcion-folio').trim().toUpperCase();
        const usuario = getInputValue('recepcion-usuario').trim();
        const items = Array.from(document.querySelectorAll('[data-recepcion-item]'))
            .map((input) => ({
            itemId: Number(input.getAttribute('data-recepcion-item') || 0),
            cantidadRecibida: Number(input.value || 0)
        }))
            .filter((item) => item.cantidadRecibida > 0);
        if (!items.length) {
            alert('Ingresa al menos una cantidad a recibir.');
            return;
        }
        try {
            await backend.request('recibir_orden_compra', { folio, usuario, items, sucursalId: getSucursalActiva() }, { method: 'POST' });
            cerrarRecepcion();
            await cargarOrdenes({ append: false });
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'No se pudo registrar la recepción');
        }
    }
    function consumirDraftDesdeStock() {
        try {
            const raw = localStorage.getItem('srfix_compra_draft');
            if (!raw)
                return;
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
            }, Array.isArray(draft.items) ? draft.items.map((item) => ({
                SKU: item.sku || '',
                PRODUCTO: item.producto || '',
                CANTIDAD_PEDIDA: Number(item.cantidadPedida || 1),
                COSTO_UNITARIO: Number(item.costoUnitario || 0),
                CANTIDAD_RECIBIDA: Number(item.cantidadRecibida || 0)
            })) : []);
        }
        catch {
            localStorage.removeItem('srfix_compra_draft');
        }
    }
    elBtnRefresh.addEventListener('click', () => { void cargarOrdenes({ append: false }); });
    elBtnNueva.addEventListener('click', () => { itemsDraft = []; addDraftItem(); abrirModalOrden(); });
    elBtnAgregarItem.addEventListener('click', () => addDraftItem());
    elFormOrden.addEventListener('submit', (ev) => { void guardarOrden(ev); });
    elFormRecepcion.addEventListener('submit', (ev) => { void guardarRecepcion(ev); });
    document.querySelectorAll('[data-close-orden]').forEach((btn) => btn.addEventListener('click', cerrarModalOrden));
    document.querySelectorAll('[data-close-recepcion]').forEach((btn) => btn.addEventListener('click', cerrarRecepcion));
    elBtnMore.addEventListener('click', () => { if (hasMore)
        void cargarOrdenes({ append: true }); });
    ['filtro-texto', 'filtro-estado', 'filtro-proveedor'].forEach((id) => {
        const input = document.getElementById(id);
        if (!input)
            return;
        input.addEventListener(id === 'filtro-texto' ? 'input' : 'change', () => { void cargarOrdenes({ append: false }); });
    });
    elOrdenIva.addEventListener('input', recalcularTotales);
    elItemsRows.addEventListener('input', (ev) => {
        const target = ev.target;
        if (!target)
            return;
        const idx = Number(target.getAttribute('data-item'));
        const field = target.getAttribute('data-field');
        if (!Number.isInteger(idx) || !field || !itemsDraft[idx])
            return;
        const value = field === 'cantidadPedida' || field === 'costoUnitario' ? Number(target.value || 0) : target.value;
        if (field === 'sku')
            itemsDraft[idx].sku = String(value);
        else if (field === 'producto')
            itemsDraft[idx].producto = String(value);
        else if (field === 'cantidadPedida')
            itemsDraft[idx].cantidadPedida = Number(value);
        else if (field === 'costoUnitario')
            itemsDraft[idx].costoUnitario = Number(value);
        renderItemsDraft();
    });
    elItemsRows.addEventListener('click', (ev) => {
        const target = ev.target;
        const btn = target?.closest('[data-del-item]');
        if (!btn)
            return;
        const idx = Number(btn.getAttribute('data-del-item'));
        itemsDraft.splice(idx, 1);
        if (!itemsDraft.length)
            addDraftItem();
        else
            renderItemsDraft();
    });
    elRows.addEventListener('click', (ev) => {
        const target = ev.target;
        const edit = target?.closest('[data-edit]');
        const recv = target?.closest('[data-recv]');
        const send = target?.closest('[data-send]');
        const cancel = target?.closest('[data-cancel]');
        if (edit)
            void abrirOrden(edit.getAttribute('data-edit') || '');
        if (recv)
            abrirRecepcion(recv.getAttribute('data-recv') || '');
        if (send)
            void cambiarEstado(send.getAttribute('data-send') || '', 'enviada');
        if (cancel)
            void cambiarEstado(cancel.getAttribute('data-cancel') || '', 'cancelada');
    });
    elModalOrden.addEventListener('click', (ev) => {
        if (ev.target?.id === 'modal-orden')
            cerrarModalOrden();
    });
    elModalRecepcion.addEventListener('click', (ev) => {
        if (ev.target?.id === 'modal-recepcion')
            cerrarRecepcion();
    });
    void cargarAuxiliares();
    void cargarOrdenes({ append: false });
    consumirDraftDesdeStock();
})();
