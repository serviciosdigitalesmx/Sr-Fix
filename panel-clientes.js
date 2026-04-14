const CONFIG = {
    BACKEND_URL: 'https://script.google.com/macros/s/AKfycbyKv77a5864czQIJYEmFbAIYl4dAufoxP3ynPZhSoyZSiGYpFRrOBxr-B_2-rdcfRO0/exec'
};

const PAGE_SIZE = 80;
let currentPage = 1;
let hasMore = false;
let isLoading = false;
let clientesCache = [];
let duplicadosCache = [];

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

function formatPhone(v) {
    const digits = String(v || '').replace(/\D+/g, '');
    if (digits.length !== 10) return String(v || '---');
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function badgeEtiqueta(v) {
    const key = String(v || '').trim().toLowerCase();
    if (key === 'vip') return '<span class="px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-300">VIP</span>';
    if (key === 'frecuente') return '<span class="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300">Frecuente</span>';
    if (key === 'moroso') return '<span class="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-300">Moroso</span>';
    return '<span class="px-2 py-1 rounded-full text-xs bg-slate-500/20 text-slate-300">Nuevo</span>';
}

function badgeRiesgo(cliente) {
    return cliente.moroso || String(cliente.ETIQUETA || '').toLowerCase() === 'moroso'
        ? '<span class="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-300">Revisar</span>'
        : '<span class="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300">Estable</span>';
}

function getFiltros() {
    return {
        texto: document.getElementById('filtro-texto').value.trim(),
        etiqueta: document.getElementById('filtro-etiqueta').value,
        duplicados: document.getElementById('filtro-duplicados').value,
        riesgo: document.getElementById('filtro-riesgo').value
    };
}

function setKpis(items, duplicados) {
    document.getElementById('kpi-total').textContent = String(items.length);
    document.getElementById('kpi-frecuentes').textContent = String(items.filter(item => ['frecuente', 'vip'].includes(String(item.ETIQUETA || '').toLowerCase())).length);
    document.getElementById('kpi-duplicados').textContent = String((duplicados || []).length);
    document.getElementById('kpi-morosos').textContent = String(items.filter(item => item.moroso || String(item.ETIQUETA || '').toLowerCase() === 'moroso').length);
}

function renderDuplicados(duplicados = []) {
    const box = document.getElementById('duplicados-box');
    if (!duplicados.length) {
        box.classList.add('hidden');
        box.innerHTML = '';
        return;
    }
    box.classList.remove('hidden');
    box.innerHTML = `<div class="font-semibold mb-1">Atención con clientes duplicados</div><div>Teléfonos repetidos detectados: ${duplicados.map(item => `<span class="inline-flex mr-2 mb-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-100">${escapeHtml(formatPhone(item))}</span>`).join('')}</div>`;
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

function pasaFiltrosLocales(cliente) {
    const filtros = getFiltros();
    const etiqueta = String(cliente.ETIQUETA || '').toLowerCase();
    const esDuplicado = duplicadosCache.includes(String(cliente.TELEFONO || ''));
    const tieneRiesgo = !!cliente.moroso || etiqueta === 'moroso';
    if (filtros.etiqueta && etiqueta !== filtros.etiqueta) return false;
    if (filtros.duplicados === 'si' && !esDuplicado) return false;
    if (filtros.duplicados === 'no' && esDuplicado) return false;
    if (filtros.riesgo === 'si' && !tieneRiesgo) return false;
    if (filtros.riesgo === 'no' && tieneRiesgo) return false;
    return true;
}

function renderRows(items, append = false) {
    if (!append) elRows.innerHTML = '';
    const frag = document.createDocumentFragment();
    items.filter(pasaFiltrosLocales).forEach(cliente => {
        const duplicado = duplicadosCache.includes(String(cliente.TELEFONO || ''));
        const tr = document.createElement('tr');
        tr.className = 'border-t border-[#1F7EDC]/20 hover:bg-[#1F7EDC]/10';
        tr.innerHTML = `
            <td class="px-3 py-3">
                <div class="font-semibold text-[#1F7EDC]">${escapeHtml(cliente.NOMBRE)}</div>
                <div class="text-xs text-[#8A8F95]">${duplicado ? 'Posible cliente duplicado' : 'Cliente único'}</div>
            </td>
            <td class="px-3 py-3">
                <div>${escapeHtml(formatPhone(cliente.TELEFONO || '---'))}</div>
                <div class="text-xs text-[#8A8F95]">${escapeHtml(cliente.EMAIL || '---')}</div>
            </td>
            <td class="px-3 py-3">${badgeEtiqueta(cliente.ETIQUETA)}</td>
            <td class="px-3 py-3">
                <div>${Number(cliente.totalEquipos || 0)} equipos</div>
                <div class="text-xs text-[#8A8F95]">${Number(cliente.totalCotizaciones || 0)} cotizaciones / ${Number(cliente.totalReparaciones || 0)} entregados</div>
            </td>
            <td class="px-3 py-3">${money(cliente.ticketPromedio)}</td>
            <td class="px-3 py-3">${escapeHtml(cliente.ultimaVisita || '---')}</td>
            <td class="px-3 py-3">${badgeRiesgo(cliente)}</td>
            <td class="px-3 py-3">
                <div class="flex flex-wrap gap-2">
                    <button data-view="${cliente.ID}" class="px-2 py-1 rounded border border-[#1F7EDC]/30 text-xs hover:bg-[#1F7EDC]/20"><i class="fa-solid fa-clock-rotate-left"></i></button>
                    <button data-edit="${cliente.ID}" class="px-2 py-1 rounded border border-[#1F7EDC]/30 text-xs hover:bg-[#1F7EDC]/20"><i class="fa-solid fa-pen"></i></button>
                    <button data-wa="${escapeHtml(cliente.TELEFONO || '')}" class="px-2 py-1 rounded border border-green-500/40 text-xs hover:bg-green-500/20"><i class="fa-brands fa-whatsapp"></i></button>
                    <button data-order="${cliente.ID}" class="px-2 py-1 rounded border border-[#FF6A2A]/40 text-xs hover:bg-[#FF6A2A]/20"><i class="fa-solid fa-screwdriver-wrench"></i></button>
                </div>
            </td>
        `;
        frag.appendChild(tr);
    });
    elRows.appendChild(frag);
}

async function cargarClientes({ append = false } = {}) {
    if (isLoading) return;
    isLoading = true;
    if (!append) currentPage = 1;
    elLoading.classList.remove('hidden');
    if (!append) {
        elRows.innerHTML = '';
        elEmpty.classList.add('hidden');
    }
    try {
        const data = await fetchJson({ action: 'listar_clientes', page: currentPage, pageSize: PAGE_SIZE, texto: getFiltros().texto });
        const items = Array.isArray(data.clientes) ? data.clientes : [];
        duplicadosCache = Array.isArray(data.duplicados) ? data.duplicados : [];
        if (!append) clientesCache = items.slice();
        else clientesCache = clientesCache.concat(items);
        hasMore = !!data.hasMore;
        setKpis(clientesCache, duplicadosCache);
        renderDuplicados(duplicadosCache);
        renderRows(items, append);
        const visibles = clientesCache.filter(pasaFiltrosLocales).length;
        if (!visibles) elEmpty.classList.remove('hidden');
        elBtnMore.classList.toggle('hidden', !hasMore);
        if (hasMore) currentPage += 1;
        elLoading.classList.add('hidden');
    } catch (e) {
        elLoading.classList.add('hidden');
        elEmpty.classList.remove('hidden');
        elEmpty.textContent = `No se pudieron cargar los clientes: ${e.message}`;
    } finally {
        isLoading = false;
    }
}

function refrescarVistaLocal() {
    elRows.innerHTML = '';
    renderRows(clientesCache, false);
    setKpis(clientesCache.filter(pasaFiltrosLocales), duplicadosCache);
    renderDuplicados(duplicadosCache);
    elEmpty.classList.toggle('hidden', clientesCache.filter(pasaFiltrosLocales).length > 0);
}

function abrirModal(cliente) {
    document.getElementById('cliente-id').value = cliente.ID || '';
    document.getElementById('cliente-title').textContent = `Editar ${cliente.NOMBRE || 'cliente'}`;
    document.getElementById('cliente-nombre').value = cliente.NOMBRE || '';
    document.getElementById('cliente-telefono').value = String(cliente.TELEFONO || '');
    document.getElementById('cliente-email').value = cliente.EMAIL || '';
    document.getElementById('cliente-etiqueta').value = String(cliente.ETIQUETA || '').toLowerCase();
    document.getElementById('cliente-notas').value = cliente.NOTAS || '';
    document.getElementById('modal-cliente').classList.remove('hidden');
}

function cerrarModal() {
    document.getElementById('modal-cliente').classList.add('hidden');
}

async function guardarCliente(ev) {
    ev.preventDefault();
    const payload = {
        action: 'guardar_cliente',
        id: document.getElementById('cliente-id').value,
        nombre: document.getElementById('cliente-nombre').value.trim(),
        telefono: document.getElementById('cliente-telefono').value.trim(),
        email: document.getElementById('cliente-email').value.trim(),
        etiqueta: document.getElementById('cliente-etiqueta').value,
        notas: document.getElementById('cliente-notas').value.trim()
    };
    try {
        await fetchJson(payload);
        cerrarModal();
        cargarClientes({ append: false });
    } catch (e) {
        alert(e.message || 'No se pudo guardar el cliente');
    }
}

function renderHistorialEquipos(items = []) {
    if (!items.length) {
        return '<div class="text-[#8A8F95]">No hay equipos registrados para este cliente.</div>';
    }
    return `
        <div class="overflow-x-auto rounded-xl border border-[#1F7EDC]/20">
            <table class="w-full text-sm min-w-[820px]">
                <thead class="bg-[#161616] text-[#8A8F95] uppercase text-xs">
                    <tr>
                        <th class="text-left px-3 py-2">Folio</th>
                        <th class="text-left px-3 py-2">Equipo</th>
                        <th class="text-left px-3 py-2">Falla</th>
                        <th class="text-left px-3 py-2">Estado</th>
                        <th class="text-left px-3 py-2">Ingreso</th>
                        <th class="text-left px-3 py-2">Costo</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr class="border-t border-[#1F7EDC]/10">
                            <td class="px-3 py-2 text-[#1F7EDC] font-semibold">${escapeHtml(item.FOLIO || '---')}</td>
                            <td class="px-3 py-2">${escapeHtml([item.TIPO, item.MODELO].filter(Boolean).join(' ') || '---')}</td>
                            <td class="px-3 py-2">${escapeHtml(item.FALLA || item.DIAGNOSTICO || '---')}</td>
                            <td class="px-3 py-2">${escapeHtml(item.ESTADO || '---')}</td>
                            <td class="px-3 py-2">${escapeHtml(item.FECHA_INGRESO || item.FECHA_ENTREGA || '---')}</td>
                            <td class="px-3 py-2">${money(item.COSTO_ESTIMADO)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderHistorialCotizaciones(items = []) {
    if (!items.length) {
        return '<div class="text-[#8A8F95]">No hay cotizaciones registradas para este cliente.</div>';
    }
    return `
        <div class="overflow-x-auto rounded-xl border border-[#1F7EDC]/20">
            <table class="w-full text-sm min-w-[760px]">
                <thead class="bg-[#161616] text-[#8A8F95] uppercase text-xs">
                    <tr>
                        <th class="text-left px-3 py-2">Folio</th>
                        <th class="text-left px-3 py-2">Dispositivo</th>
                        <th class="text-left px-3 py-2">Descripción</th>
                        <th class="text-left px-3 py-2">Total</th>
                        <th class="text-left px-3 py-2">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr class="border-t border-[#1F7EDC]/10">
                            <td class="px-3 py-2 text-[#1F7EDC] font-semibold">${escapeHtml(item.folio || '---')}</td>
                            <td class="px-3 py-2">${escapeHtml(`${item.dispositivo || ''} ${item.modelo || ''}`.trim() || '---')}</td>
                            <td class="px-3 py-2">${escapeHtml(item.descripcion || item.problemas || '---')}</td>
                            <td class="px-3 py-2">${money(item.total)}</td>
                            <td class="px-3 py-2">${escapeHtml(item.estado || '---')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function verDetalle(id) {
    try {
        const data = await fetchJson({ action: 'cliente', id });
        const cliente = data.cliente || {};
        const historial = data.historial || {};
        document.getElementById('detalle-title').textContent = cliente.NOMBRE || 'Historial del cliente';
        document.getElementById('detalle-body').innerHTML = `
            <section class="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div class="rounded-xl border border-[#1F7EDC]/30 bg-[#161616] p-3">
                    <div class="text-xs uppercase text-[#8A8F95]">Equipos</div>
                    <div class="text-2xl font-bold text-[#8cc4ff]">${Number(historial.totalEquipos || 0)}</div>
                </div>
                <div class="rounded-xl border border-green-500/30 bg-green-500/10 p-3">
                    <div class="text-xs uppercase text-green-300">Reparaciones</div>
                    <div class="text-2xl font-bold text-green-400">${Number(historial.totalReparaciones || 0)}</div>
                </div>
                <div class="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
                    <div class="text-xs uppercase text-yellow-300">Cotizaciones</div>
                    <div class="text-2xl font-bold text-yellow-400">${Number(historial.totalCotizaciones || 0)}</div>
                </div>
                <div class="rounded-xl border border-[#FF6A2A]/30 bg-[#FF6A2A]/10 p-3">
                    <div class="text-xs uppercase text-[#ffb38e]">Ticket promedio</div>
                    <div class="text-2xl font-bold text-[#FF6A2A]">${money(historial.ticketPromedio)}</div>
                </div>
            </section>

            <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-4 space-y-2">
                    <div><span class="text-[#8A8F95]">Teléfono:</span> ${escapeHtml(formatPhone(cliente.TELEFONO || '---'))}</div>
                    <div><span class="text-[#8A8F95]">Email:</span> ${escapeHtml(cliente.EMAIL || '---')}</div>
                    <div><span class="text-[#8A8F95]">Etiqueta:</span> ${badgeEtiqueta(cliente.ETIQUETA)}</div>
                    <div><span class="text-[#8A8F95]">Última visita:</span> ${escapeHtml(historial.ultimaVisita || '---')}</div>
                    <div><span class="text-[#8A8F95]">Notas:</span><div class="mt-1 whitespace-pre-line">${escapeHtml(cliente.NOTAS || '---')}</div></div>
                </div>
                <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-4 space-y-3">
                    <div class="font-semibold text-[#1F7EDC]">Acciones rápidas</div>
                    <div class="flex flex-wrap gap-2">
                        <button type="button" id="detalle-wa" class="px-3 py-2 rounded-lg border border-green-500/40 hover:bg-green-500/20 text-sm">
                            <i class="fa-brands fa-whatsapp"></i> Abrir WhatsApp
                        </button>
                        <button type="button" id="detalle-orden" class="px-3 py-2 rounded-lg border border-[#FF6A2A]/40 hover:bg-[#FF6A2A]/20 text-sm">
                            <i class="fa-solid fa-screwdriver-wrench"></i> Nueva orden
                        </button>
                    </div>
                    <div class="text-xs text-[#8A8F95]">Si detectas un duplicado, revisa teléfono y notas antes de abrir una orden nueva.</div>
                </div>
            </section>

            <section class="space-y-3">
                <div class="font-semibold text-[#1F7EDC]">Equipos y reparaciones</div>
                ${renderHistorialEquipos(historial.equipos || [])}
            </section>

            <section class="space-y-3">
                <div class="font-semibold text-[#1F7EDC]">Cotizaciones e intención de compra</div>
                ${renderHistorialCotizaciones(historial.cotizaciones || [])}
            </section>
        `;
        document.getElementById('modal-detalle').classList.remove('hidden');

        const btnWa = document.getElementById('detalle-wa');
        const btnOrden = document.getElementById('detalle-orden');
        if (btnWa) btnWa.addEventListener('click', () => abrirWhatsApp(cliente.TELEFONO));
        if (btnOrden) btnOrden.addEventListener('click', () => crearNuevaOrden(cliente));
    } catch (e) {
        alert(e.message || 'No se pudo cargar el cliente');
    }
}

function cerrarDetalle() {
    document.getElementById('modal-detalle').classList.add('hidden');
}

function abrirWhatsApp(telefono) {
    const digits = String(telefono || '').replace(/\D+/g, '');
    if (!digits) {
        alert('Este cliente no tiene teléfono válido');
        return;
    }
    window.open(`https://wa.me/52${digits}`, '_blank', 'noopener');
}

function crearNuevaOrden(cliente) {
    const draft = {
        clienteNombre: cliente.NOMBRE || '',
        clienteTelefono: String(cliente.TELEFONO || ''),
        clienteEmail: cliente.EMAIL || '',
        equipoTipo: '',
        equipoModelo: '',
        equipoFalla: '',
        fechaPromesa: '',
        costo: '',
        notasExtra: cliente.NOTAS || '',
        checks: {
            cargador: false,
            pantalla: false,
            prende: false,
            respaldo: false
        },
        fotoAdjunta: false
    };
    localStorage.setItem('srfix_borrador_orden', JSON.stringify(draft));
    try {
        if (window.parent && window.parent !== window) {
            const btn = window.parent.document.getElementById('tab-operativo');
            if (btn) {
                btn.click();
                return;
            }
        }
    } catch (e) {}
    alert('Se preparó el cliente para una nueva orden. Abre el módulo Operativo para continuar.');
}

document.getElementById('btn-refresh').addEventListener('click', () => cargarClientes({ append: false }));
document.getElementById('form-cliente').addEventListener('submit', guardarCliente);
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', cerrarModal));
document.querySelectorAll('[data-close-detalle]').forEach(btn => btn.addEventListener('click', cerrarDetalle));
elBtnMore.addEventListener('click', () => { if (hasMore) cargarClientes({ append: true }); });

['filtro-texto', 'filtro-etiqueta', 'filtro-duplicados', 'filtro-riesgo'].forEach(id => {
    document.getElementById(id).addEventListener(id === 'filtro-texto' ? 'input' : 'change', () => {
        if (id === 'filtro-texto') cargarClientes({ append: false });
        else refrescarVistaLocal();
    });
});

elRows.addEventListener('click', (e) => {
    const view = e.target.closest('[data-view]');
    const edit = e.target.closest('[data-edit]');
    const wa = e.target.closest('[data-wa]');
    const order = e.target.closest('[data-order]');
    if (view) verDetalle(view.getAttribute('data-view'));
    if (edit) {
        const cliente = clientesCache.find(item => String(item.ID) === String(edit.getAttribute('data-edit')));
        if (cliente) abrirModal(cliente);
    }
    if (wa) abrirWhatsApp(wa.getAttribute('data-wa'));
    if (order) {
        const cliente = clientesCache.find(item => String(item.ID) === String(order.getAttribute('data-order')));
        if (cliente) crearNuevaOrden(cliente);
    }
});

document.getElementById('modal-cliente').addEventListener('click', (e) => { if (e.target.id === 'modal-cliente') cerrarModal(); });
document.getElementById('modal-detalle').addEventListener('click', (e) => { if (e.target.id === 'modal-detalle') cerrarDetalle(); });

cargarClientes({ append: false });
