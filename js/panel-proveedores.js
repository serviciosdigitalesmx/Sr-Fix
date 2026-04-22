"use strict";
;
(function () {
    const backend = window.SRFIXBackend;
    const PAGE_SIZE = 80;
    const elRows = requireElement('rows');
    const elLoading = requireElement('loading');
    const elEmpty = requireElement('empty');
    const elBtnMore = requireElement('btn-more');
    let currentPage = 1;
    let hasMore = false;
    let isLoading = false;
    let proveedoresCache = [];
    const filtroTexto = requireElement('filtro-texto');
    const filtroEstatus = requireElement('filtro-estatus');
    const filtroCategoria = requireElement('filtro-categoria');
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
    function stars(n) {
        const val = Math.max(0, Math.min(5, Number(n ?? 0)));
        return '★'.repeat(Math.round(val)) + '☆'.repeat(5 - Math.round(val));
    }
    function statusBadge(v) {
        return String(v ?? '').toLowerCase() === 'activo'
            ? '<span class="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300">Activo</span>'
            : '<span class="px-2 py-1 rounded-full text-xs bg-slate-500/20 text-slate-300">Inactivo</span>';
    }
    function getFiltros() {
        return {
            texto: filtroTexto.value.trim(),
            estatus: filtroEstatus.value,
            categoria: filtroCategoria.value
        };
    }
    function setKpis(items, categorias = []) {
        requireElement('kpi-total').textContent = String(items.length);
        requireElement('kpi-activos').textContent = String(items.filter((x) => String(x.ESTATUS || '').toLowerCase() === 'activo').length);
        requireElement('kpi-categorias').textContent = String(categorias.length);
    }
    function fillCategorias(categorias = []) {
        const current = filtroCategoria.value;
        filtroCategoria.innerHTML = '<option value="">Todas las categorías</option>';
        categorias.forEach((cat) => {
            filtroCategoria.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`);
        });
        filtroCategoria.value = current;
    }
    function renderRows(items, append = false) {
        if (!append)
            elRows.innerHTML = '';
        const frag = document.createDocumentFragment();
        items.forEach((prov) => {
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
            <button data-view="${escapeHtml(prov.ID || '')}" class="px-2 py-1 rounded border border-[#1F7EDC]/30 text-xs hover:bg-[#1F7EDC]/20"><i class="fa-solid fa-eye"></i></button>
            <button data-edit="${escapeHtml(prov.ID || '')}" class="px-2 py-1 rounded border border-[#1F7EDC]/30 text-xs hover:bg-[#1F7EDC]/20"><i class="fa-solid fa-pen"></i></button>
            <button data-del="${escapeHtml(prov.ID || '')}" class="px-2 py-1 rounded border border-red-500/40 text-xs hover:bg-red-500/20"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      `;
            frag.appendChild(tr);
        });
        elRows.appendChild(frag);
    }
    async function cargarProveedores({ append = false } = {}) {
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
        const payload = { page: currentPage, pageSize: PAGE_SIZE, ...getFiltros() };
        try {
            const data = await backend.request('listar_proveedores', payload, { method: 'POST' });
            const items = Array.isArray(data.proveedores) ? data.proveedores : [];
            if (!append)
                proveedoresCache = items.slice();
            else
                proveedoresCache = proveedoresCache.concat(items);
            hasMore = !!data.hasMore;
            fillCategorias((data.filtros && data.filtros.categorias) || []);
            setKpis(proveedoresCache, (data.filtros && data.filtros.categorias) || []);
            renderRows(items, append);
            if (!proveedoresCache.length)
                elEmpty.classList.remove('hidden');
            elBtnMore.classList.toggle('hidden', !hasMore);
            if (hasMore)
                currentPage += 1;
            elLoading.classList.add('hidden');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            elLoading.classList.add('hidden');
            elEmpty.classList.remove('hidden');
            elEmpty.textContent = `No se pudieron cargar los proveedores: ${message}`;
        }
        finally {
            isLoading = false;
        }
    }
    function abrirModal(prov = null) {
        requireElement('form-proveedor').reset();
        requireElement('proveedor-id').value = prov?.ID || '';
        requireElement('proveedor-title').textContent = prov ? `Editar ${prov.NOMBRE_COMERCIAL}` : 'Nuevo proveedor';
        requireElement('prov-nombre').value = prov?.NOMBRE_COMERCIAL || '';
        requireElement('prov-razon').value = prov?.RAZON_SOCIAL || '';
        requireElement('prov-contacto').value = prov?.CONTACTO || '';
        requireElement('prov-telefono').value = prov?.TELEFONO || '';
        requireElement('prov-whatsapp').value = prov?.WHATSAPP || '';
        requireElement('prov-email').value = prov?.EMAIL || '';
        requireElement('prov-direccion').value = prov?.DIRECCION || '';
        requireElement('prov-ciudad').value = prov?.CIUDAD_ESTADO || '';
        requireElement('prov-categorias').value = prov?.CATEGORIAS || '';
        requireElement('prov-entrega').value = prov?.TIEMPO_ENTREGA || '';
        requireElement('prov-pago').value = prov?.CONDICIONES_PAGO || '';
        requireElement('prov-cal-precio').value = String(prov?.CALIFICACION_PRECIO || 0);
        requireElement('prov-cal-rapidez').value = String(prov?.CALIFICACION_RAPIDEZ || 0);
        requireElement('prov-cal-calidad').value = String(prov?.CALIFICACION_CALIDAD || 0);
        requireElement('prov-cal-conf').value = String(prov?.CALIFICACION_CONFIABILIDAD || 0);
        requireElement('prov-estatus').value = prov?.ESTATUS || 'activo';
        requireElement('prov-notas').value = prov?.NOTAS || '';
        requireElement('modal-proveedor').classList.remove('hidden');
    }
    function cerrarModal() {
        requireElement('modal-proveedor').classList.add('hidden');
    }
    async function guardarProveedor(ev) {
        ev.preventDefault();
        const payload = {
            id: requireElement('proveedor-id').value,
            nombreComercial: requireElement('prov-nombre').value.trim(),
            razonSocial: requireElement('prov-razon').value.trim(),
            contacto: requireElement('prov-contacto').value.trim(),
            telefono: requireElement('prov-telefono').value.trim(),
            whatsapp: requireElement('prov-whatsapp').value.trim(),
            email: requireElement('prov-email').value.trim(),
            direccion: requireElement('prov-direccion').value.trim(),
            ciudadEstado: requireElement('prov-ciudad').value.trim(),
            categorias: requireElement('prov-categorias').value.trim(),
            tiempoEntrega: requireElement('prov-entrega').value.trim(),
            condicionesPago: requireElement('prov-pago').value.trim(),
            calificacionPrecio: requireElement('prov-cal-precio').value,
            calificacionRapidez: requireElement('prov-cal-rapidez').value,
            calificacionCalidad: requireElement('prov-cal-calidad').value,
            calificacionConfiabilidad: requireElement('prov-cal-conf').value,
            notas: requireElement('prov-notas').value.trim(),
            estatus: requireElement('prov-estatus').value
        };
        try {
            await backend.request('guardar_proveedor', payload, { method: 'POST' });
            cerrarModal();
            await cargarProveedores({ append: false });
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'No se pudo guardar el proveedor');
        }
    }
    async function verDetalle(id) {
        try {
            const data = await backend.request('proveedor', { id }, { method: 'POST' });
            const prov = data.proveedor;
            if (!prov)
                throw new Error(data.error || 'No se pudo cargar el detalle');
            requireElement('detalle-title').textContent = prov.NOMBRE_COMERCIAL || 'Proveedor';
            requireElement('detalle-body').innerHTML = `
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
        <div><span class="text-[#8A8F95]">Calificación:</span> ${stars(prov.CALIFICACION_PROMEDIO)} (${prov.CALIFICACION_PROMEDIO || 0})</div>
        <div><span class="text-[#8A8F95]">Notas:</span><div class="mt-1 whitespace-pre-line">${escapeHtml(prov.NOTAS || '---')}</div></div>
      `;
            requireElement('modal-detalle').classList.remove('hidden');
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'No se pudo cargar el detalle');
        }
    }
    function cerrarDetalle() {
        requireElement('modal-detalle').classList.add('hidden');
    }
    async function eliminarProveedor(id) {
        if (!confirm('¿Marcar proveedor como inactivo?'))
            return;
        try {
            await backend.request('eliminar_proveedor', { id }, { method: 'POST' });
            await cargarProveedores({ append: false });
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'No se pudo eliminar');
        }
    }
    function bindEvents() {
        requireElement('btn-refresh').addEventListener('click', () => void cargarProveedores({ append: false }));
        requireElement('btn-nuevo').addEventListener('click', () => abrirModal());
        requireElement('form-proveedor').addEventListener('submit', (ev) => void guardarProveedor(ev));
        document.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', cerrarModal));
        document.querySelectorAll('[data-close-detalle]').forEach((btn) => btn.addEventListener('click', cerrarDetalle));
        elBtnMore.addEventListener('click', () => { if (hasMore)
            void cargarProveedores({ append: true }); });
        ['filtro-texto', 'filtro-estatus', 'filtro-categoria'].forEach((id) => {
            const el = document.getElementById(id);
            if (!el)
                return;
            el.addEventListener(id === 'filtro-texto' ? 'input' : 'change', () => void cargarProveedores({ append: false }));
        });
        elRows.addEventListener('click', (event) => {
            const target = event.target;
            const view = target?.closest('[data-view]');
            const edit = target?.closest('[data-edit]');
            const del = target?.closest('[data-del]');
            if (view)
                void verDetalle(String(view.getAttribute('data-view') || ''));
            if (edit) {
                const prov = proveedoresCache.find((item) => String(item.ID) === String(edit.getAttribute('data-edit')));
                if (prov)
                    abrirModal(prov);
            }
            if (del)
                void eliminarProveedor(String(del.getAttribute('data-del') || ''));
        });
        requireElement('modal-detalle').addEventListener('click', (event) => {
            if (event.target?.id === 'modal-detalle')
                cerrarDetalle();
        });
        requireElement('modal-proveedor').addEventListener('click', (event) => {
            if (event.target?.id === 'modal-proveedor')
                cerrarModal();
        });
    }
    bindEvents();
    void cargarProveedores({ append: false });
})();
