"use strict";
;
(function () {
    const backend = window.SRFIXBackend;
    const elKpiSucursales = requireElement('kpi-sucursales');
    const elKpiTransferencias = requireElement('kpi-transferencias');
    const elKpiActiva = requireElement('kpi-activa');
    const elFiltroSucursal = requireElement('filtro-sucursal');
    const elFiltroTransferencias = requireElement('filtro-transferencias');
    const elRowsSucursales = requireElement('rows-sucursales');
    const elRowsTransferencias = requireElement('rows-transferencias');
    const elBtnRefresh = requireElement('btn-refresh');
    const elBtnNuevaSucursal = requireElement('btn-nueva-sucursal');
    const elModalSucursal = requireElement('modal-sucursal');
    const elFormSucursal = requireElement('form-sucursal');
    const elSucursalId = requireElement('sucursal-id');
    const elSucursalTitle = requireElement('sucursal-title');
    const elSucursalNombre = requireElement('sucursal-nombre');
    const elSucursalDireccion = requireElement('sucursal-direccion');
    const elSucursalTelefono = requireElement('sucursal-telefono');
    const elSucursalEmail = requireElement('sucursal-email');
    const elSucursalEstatus = requireElement('sucursal-estatus');
    const elTransferForm = requireElement('form-transferencia');
    const elTransferOrigen = requireElement('transfer-origen');
    const elTransferDestino = requireElement('transfer-destino');
    const elTransferSku = requireElement('transfer-sku');
    const elTransferCantidad = requireElement('transfer-cantidad');
    const elTransferUsuario = requireElement('transfer-usuario');
    const elTransferMotivo = requireElement('transfer-motivo');
    const elTransferNotas = requireElement('transfer-notas');
    let sucursalesCache = [];
    let productosCache = [];
    let transferenciasCache = [];
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
    function getSucursalActiva() {
        return localStorage.getItem('srfix_sucursal_activa') || 'GLOBAL';
    }
    function badgeEstado(v, esMatriz) {
        if (esMatriz)
            return '<span class="px-2 py-1 rounded-full text-xs bg-[#1F7EDC]/20 text-[#9dcfff]">Matriz</span>';
        if (String(v || '').toLowerCase() === 'activo')
            return '<span class="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300">Activa</span>';
        return '<span class="px-2 py-1 rounded-full text-xs bg-slate-500/20 text-slate-300">Inactiva</span>';
    }
    function fillSelects() {
        const sucursalesActivas = sucursalesCache.filter((item) => String(item.ESTATUS || '').toLowerCase() === 'activo');
        [elTransferOrigen, elTransferDestino].forEach((select) => {
            select.innerHTML = '';
            sucursalesActivas.forEach((item) => {
                const opt = document.createElement('option');
                opt.value = String(item.ID || '');
                opt.textContent = String(item.NOMBRE || '');
                select.appendChild(opt);
            });
        });
        elTransferSku.innerHTML = '';
        productosCache.forEach((item) => {
            const opt = document.createElement('option');
            opt.value = String(item.SKU || '');
            opt.textContent = `${String(item.SKU || '')} · ${String(item.NOMBRE || '')}`;
            elTransferSku.appendChild(opt);
        });
    }
    function renderSucursales() {
        const filtro = elFiltroSucursal.value.trim().toLowerCase();
        const rows = sucursalesCache.filter((item) => {
            if (!filtro)
                return true;
            return [item.ID, item.NOMBRE, item.DIRECCION, item.TELEFONO, item.EMAIL]
                .some((v) => String(v || '').toLowerCase().includes(filtro));
        });
        elKpiSucursales.textContent = String(sucursalesCache.filter((x) => String(x.ESTATUS || '').toLowerCase() === 'activo').length);
        elKpiActiva.textContent = getSucursalActiva();
        elRowsSucursales.innerHTML = rows.map((item) => `
      <tr class="border-t border-[#1F7EDC]/20">
        <td class="px-3 py-3 font-semibold text-[#1F7EDC]">${escapeHtml(item.ID || '')}</td>
        <td class="px-3 py-3">${escapeHtml(item.NOMBRE)}</td>
        <td class="px-3 py-3">${escapeHtml(item.DIRECCION || '---')}</td>
        <td class="px-3 py-3">
          <div>${escapeHtml(item.TELEFONO || '---')}</div>
          <div class="text-xs text-[#8A8F95]">${escapeHtml(item.EMAIL || '---')}</div>
        </td>
        <td class="px-3 py-3">${badgeEstado(item.ESTATUS, item.ES_MATRIZ)}</td>
        <td class="px-3 py-3">
          <div class="flex gap-2">
            <button data-edit="${escapeHtml(item.ID || '')}" class="px-2 py-1 rounded border border-[#1F7EDC]/30 text-xs hover:bg-[#1F7EDC]/20"><i class="fa-solid fa-pen"></i></button>
            <button data-use="${escapeHtml(item.ID || '')}" class="px-2 py-1 rounded border border-[#FF6A2A]/40 text-xs hover:bg-[#FF6A2A]/20"><i class="fa-solid fa-location-dot"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
    }
    function renderTransferencias() {
        const filtro = elFiltroTransferencias.value.trim().toLowerCase();
        const rows = transferenciasCache.filter((item) => {
            if (!filtro)
                return true;
            return [item.ID, item.SKU, item.PRODUCTO, item.SUCURSAL_ORIGEN, item.SUCURSAL_DESTINO, item.USUARIO, item.MOTIVO]
                .some((v) => String(v || '').toLowerCase().includes(filtro));
        });
        elKpiTransferencias.textContent = String(rows.length);
        elRowsTransferencias.innerHTML = rows.length
            ? rows.map((item) => `
        <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3">
          <div class="flex items-center justify-between gap-3">
            <div class="font-semibold text-[#1F7EDC]">${escapeHtml(item.ID || '')}</div>
            <div class="text-xs text-[#8A8F95]">${escapeHtml(item.FECHA || '---')}</div>
          </div>
          <div class="mt-2 text-sm text-white">${escapeHtml(item.SKU || '---')} · ${escapeHtml(item.PRODUCTO || '')}</div>
          <div class="mt-1 text-sm text-[#d2d8df]">${escapeHtml(item.SUCURSAL_ORIGEN || '---')} -> ${escapeHtml(item.SUCURSAL_DESTINO || '---')} · Cantidad ${Number(item.CANTIDAD || 0)}</div>
          <div class="mt-1 text-xs text-[#8A8F95]">${escapeHtml(item.MOTIVO || 'Sin motivo')} · ${escapeHtml(item.USUARIO || 'Sin usuario')}</div>
        </div>
      `).join('')
            : '<div class="text-sm text-[#8A8F95]">Sin transferencias registradas.</div>';
    }
    function abrirModalSucursal(item = null) {
        elFormSucursal.reset();
        elSucursalId.value = item?.ID || '';
        elSucursalTitle.textContent = item ? `Editar ${item.NOMBRE}` : 'Nueva sucursal';
        elSucursalNombre.value = item?.NOMBRE || '';
        elSucursalDireccion.value = item?.DIRECCION || '';
        elSucursalTelefono.value = item?.TELEFONO || '';
        elSucursalEmail.value = item?.EMAIL || '';
        elSucursalEstatus.value = item?.ESTATUS || 'activo';
        elModalSucursal.classList.remove('hidden');
    }
    function cerrarModalSucursal() {
        elModalSucursal.classList.add('hidden');
    }
    async function cargarTodo() {
        const [sucursales, productos, transferencias] = await Promise.all([
            backend.request('listar_sucursales', { soloActivas: '', page: 1, pageSize: 100 }, { method: 'GET' }),
            backend.request('listar_productos', { sucursalId: 'GLOBAL', page: 1, pageSize: 500 }, { method: 'POST' }),
            backend.request('listar_transferencias_stock', { sucursalId: getSucursalActiva(), page: 1, pageSize: 100 }, { method: 'GET' })
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
        await backend.request('guardar_sucursal', {
            id: elSucursalId.value,
            nombre: elSucursalNombre.value.trim(),
            direccion: elSucursalDireccion.value.trim(),
            telefono: elSucursalTelefono.value.trim(),
            email: elSucursalEmail.value.trim(),
            estatus: elSucursalEstatus.value
        }, { method: 'POST' });
        cerrarModalSucursal();
        await cargarTodo();
    }
    async function guardarTransferencia(ev) {
        ev.preventDefault();
        await backend.request('transferir_stock', {
            sku: elTransferSku.value,
            sucursalOrigen: elTransferOrigen.value,
            sucursalDestino: elTransferDestino.value,
            cantidad: elTransferCantidad.value,
            usuario: elTransferUsuario.value.trim(),
            motivo: elTransferMotivo.value.trim(),
            notas: elTransferNotas.value.trim()
        }, { method: 'POST' });
        elTransferForm.reset();
        await cargarTodo();
    }
    elBtnRefresh.addEventListener('click', () => { void cargarTodo(); });
    elBtnNuevaSucursal.addEventListener('click', () => abrirModalSucursal());
    elFormSucursal.addEventListener('submit', (ev) => { void guardarSucursal(ev); });
    elTransferForm.addEventListener('submit', (ev) => { void guardarTransferencia(ev); });
    document.querySelectorAll('[data-close-sucursal]').forEach((btn) => {
        btn.addEventListener('click', cerrarModalSucursal);
    });
    elFiltroSucursal.addEventListener('input', renderSucursales);
    elFiltroTransferencias.addEventListener('input', renderTransferencias);
    elRowsSucursales.addEventListener('click', (e) => {
        const target = e.target;
        const edit = target?.closest('[data-edit]');
        const use = target?.closest('[data-use]');
        if (edit) {
            const item = sucursalesCache.find((x) => x.ID === edit.getAttribute('data-edit'));
            if (item)
                abrirModalSucursal(item);
        }
        if (use) {
            localStorage.setItem('srfix_sucursal_activa', use.getAttribute('data-use') || 'GLOBAL');
            renderSucursales();
        }
    });
    elModalSucursal.addEventListener('click', (e) => {
        if (e.target === elModalSucursal)
            cerrarModalSucursal();
    });
    void cargarTodo().catch((e) => {
        elRowsTransferencias.innerHTML = `<div class="text-sm text-red-300">${escapeHtml(e instanceof Error ? e.message : String(e))}</div>`;
    });
})();
