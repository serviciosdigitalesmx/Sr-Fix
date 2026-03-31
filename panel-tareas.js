const CONFIG = {
    BACKEND_URL: 'https://script.google.com/macros/s/AKfycbxH1zD8_14TvCajstFhtEpLNODwG9GZXkLoCXOb1IBNm0JIRmpCwS6SRsuGhZETK88z/exec'
};

const elGrid = document.getElementById('grid');
const elLoading = document.getElementById('loading');
const elEmpty = document.getElementById('empty');
const elBtnMore = document.getElementById('btn-more');
const elModal = document.getElementById('modal');
const elForm = document.getElementById('form-tarea');
const elResponsables = document.getElementById('responsables-lista');

const PAGE_SIZE = 24;
let currentPage = 1;
let hasMore = false;
let isLoading = false;

function getSucursalActiva() {
    return localStorage.getItem('srfix_sucursal_activa') || 'GLOBAL';
}

function escapeHtml(v) {
    return String(v || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function prioridadBadge(v) {
    const p = String(v || '').toLowerCase();
    if (p === 'urgente') return 'bg-red-500/20 text-red-300 border-red-500/30';
    if (p === 'alta') return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    if (p === 'media') return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
}

function estadoBadge(v) {
    const e = String(v || '').toLowerCase();
    if (e === 'completada') return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (e === 'cancelada') return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    if (e === 'en_proceso') return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
}

function prettyEstado(v) {
    return ({
        pendiente: 'Pendiente',
        en_proceso: 'En proceso',
        completada: 'Completada',
        cancelada: 'Cancelada'
    })[String(v || '').toLowerCase()] || 'Pendiente';
}

function prettyPrioridad(v) {
    return ({
        baja: 'Baja',
        media: 'Media',
        alta: 'Alta',
        urgente: 'Urgente'
    })[String(v || '').toLowerCase()] || 'Media';
}

function prettyTipo(v) {
    return ({
        general: 'General',
        equipo: 'Equipo',
        solicitud: 'Solicitud'
    })[String(v || '').toLowerCase()] || 'General';
}

function getFiltros() {
    return {
        texto: document.getElementById('filtro-texto').value.trim(),
        estado: document.getElementById('filtro-estado').value,
        prioridad: document.getElementById('filtro-prioridad').value,
        tipoRelacion: document.getElementById('filtro-tipo-relacion').value,
        responsable: document.getElementById('filtro-responsable').value.trim(),
        fechaDesde: document.getElementById('filtro-desde').value,
        fechaHasta: document.getElementById('filtro-hasta').value
    };
}

function setMetricas(metricas = {}) {
    document.getElementById('kpi-pendientes').textContent = String(metricas.pendientes || 0);
    document.getElementById('kpi-urgentes').textContent = String(metricas.urgentes || 0);
    document.getElementById('kpi-completadas').textContent = String(metricas.completadas || 0);
}

function renderResponsables(lista = []) {
    elResponsables.innerHTML = '';
    lista.forEach(nombre => {
        const option = document.createElement('option');
        option.value = nombre;
        elResponsables.appendChild(option);
    });
}

function renderCards(tareas, append = false) {
    if (!append) elGrid.innerHTML = '';
    const frag = document.createDocumentFragment();
    tareas.forEach(tarea => {
        const card = document.createElement('article');
        card.className = 'bg-[#2B2B2B] border border-[#1F7EDC]/25 rounded-2xl p-4 shadow-lg';
        card.innerHTML = `
            <div class="flex items-start justify-between gap-3">
                <div>
                    <div class="text-xs text-[#8A8F95]">${escapeHtml(tarea.FOLIO_TAREA || '---')}</div>
                    <h3 class="text-lg font-semibold text-white mt-1">${escapeHtml(tarea.TITULO || 'Sin título')}</h3>
                </div>
                <button data-edit="${escapeHtml(tarea.FOLIO_TAREA || '')}" class="shrink-0 px-2 py-1 rounded-lg border border-[#1F7EDC]/30 hover:bg-[#1F7EDC]/20 text-xs">
                    <i class="fa-solid fa-pen"></i>
                </button>
            </div>
            <div class="flex flex-wrap gap-2 mt-3">
                <span class="px-2 py-1 rounded-full border text-xs ${estadoBadge(tarea.ESTADO)}">${prettyEstado(tarea.ESTADO)}</span>
                <span class="px-2 py-1 rounded-full border text-xs ${prioridadBadge(tarea.PRIORIDAD)}">${prettyPrioridad(tarea.PRIORIDAD)}</span>
                <span class="px-2 py-1 rounded-full border border-[#1F7EDC]/30 bg-[#1F7EDC]/10 text-[#9dcfff] text-xs">${prettyTipo(tarea.TIPO_RELACION)}</span>
            </div>
            <p class="text-sm text-[#d2d8df] mt-3 whitespace-pre-line min-h-[44px]">${escapeHtml(tarea.DESCRIPCION || 'Sin descripción')}</p>
            <div class="mt-4 space-y-2 text-sm">
                <div class="flex justify-between gap-3">
                    <span class="text-[#8A8F95]">Responsable</span>
                    <span class="text-right">${escapeHtml(tarea.RESPONSABLE || '---')}</span>
                </div>
                <div class="flex justify-between gap-3">
                    <span class="text-[#8A8F95]">Fecha límite</span>
                    <span class="text-right">${escapeHtml(tarea.FECHA_LIMITE || '---')}</span>
                </div>
                <div class="flex justify-between gap-3">
                    <span class="text-[#8A8F95]">Folio relacionado</span>
                    <span class="text-right">${escapeHtml(tarea.FOLIO_RELACIONADO || '---')}</span>
                </div>
            </div>
        `;
        frag.appendChild(card);
    });
    elGrid.appendChild(frag);
}

async function cargarTareas({ append = false } = {}) {
    if (isLoading) return;
    isLoading = true;
    if (!append) currentPage = 1;
    elLoading.classList.remove('hidden');
    if (!append) {
        elEmpty.classList.add('hidden');
        elGrid.innerHTML = '';
    }

    const payload = {
        action: 'listar_tareas',
        sucursalId: getSucursalActiva(),
        page: currentPage,
        pageSize: PAGE_SIZE,
        ...getFiltros()
    };

    try {
        let res = await fetch(CONFIG.BACKEND_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        let data = null;
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

        const tareas = Array.isArray(data.tareas) ? data.tareas : [];
        hasMore = !!data.hasMore;
        setMetricas(data.metricas || {});
        renderResponsables(Array.isArray(data.responsables) ? data.responsables : []);
        elLoading.classList.add('hidden');

        if (!append && !tareas.length) {
            elEmpty.classList.remove('hidden');
            elBtnMore.classList.add('hidden');
            return;
        }

        renderCards(tareas, append);
        elBtnMore.classList.toggle('hidden', !hasMore);
        if (hasMore) currentPage += 1;
    } catch (e) {
        elLoading.classList.add('hidden');
        elEmpty.classList.remove('hidden');
        elEmpty.textContent = `No se pudieron cargar las tareas: ${e.message}`;
        elBtnMore.classList.add('hidden');
    } finally {
        isLoading = false;
    }
}

function abrirModalNueva() {
    document.getElementById('modal-title').textContent = 'Nueva tarea';
    elForm.reset();
    document.getElementById('tarea-folio').value = '';
    document.getElementById('tarea-estado').value = 'pendiente';
    document.getElementById('tarea-prioridad').value = 'media';
    document.getElementById('tarea-tipo-relacion').value = 'general';
    elModal.classList.remove('hidden');
}

function cerrarModal() {
    elModal.classList.add('hidden');
}

async function abrirEdicion(folio) {
    try {
        const q = new URLSearchParams({ action: 'tarea', folio, sucursalId: getSucursalActiva(), t: String(Date.now()) });
        const res = await fetch(`${CONFIG.BACKEND_URL}?${q.toString()}`);
        const data = await res.json();
        if (data.error || !data.tarea) throw new Error(data.error || 'No se encontró la tarea');
        const tarea = data.tarea;
        document.getElementById('modal-title').textContent = `Editar ${tarea.FOLIO_TAREA}`;
        document.getElementById('tarea-folio').value = tarea.FOLIO_TAREA || '';
        document.getElementById('tarea-titulo').value = tarea.TITULO || '';
        document.getElementById('tarea-descripcion').value = tarea.DESCRIPCION || '';
        document.getElementById('tarea-estado').value = tarea.ESTADO || 'pendiente';
        document.getElementById('tarea-prioridad').value = tarea.PRIORIDAD || 'media';
        document.getElementById('tarea-responsable').value = tarea.RESPONSABLE || '';
        document.getElementById('tarea-fecha-limite').value = tarea.FECHA_LIMITE || '';
        document.getElementById('tarea-tipo-relacion').value = tarea.TIPO_RELACION || 'general';
        document.getElementById('tarea-folio-relacionado').value = tarea.FOLIO_RELACIONADO || '';
        document.getElementById('tarea-notas').value = tarea.NOTAS || '';
        elModal.classList.remove('hidden');
    } catch (e) {
        alert(e.message || 'No se pudo abrir la tarea');
    }
}

async function guardarTarea(ev) {
    ev.preventDefault();
    const folio = document.getElementById('tarea-folio').value.trim();
    const payload = {
        action: folio ? 'actualizar_tarea' : 'crear_tarea',
        sucursalId: getSucursalActiva(),
        folio,
        titulo: document.getElementById('tarea-titulo').value.trim(),
        descripcion: document.getElementById('tarea-descripcion').value.trim(),
        estado: document.getElementById('tarea-estado').value,
        prioridad: document.getElementById('tarea-prioridad').value,
        responsable: document.getElementById('tarea-responsable').value.trim(),
        fechaLimite: document.getElementById('tarea-fecha-limite').value,
        tipoRelacion: document.getElementById('tarea-tipo-relacion').value,
        folioRelacionado: document.getElementById('tarea-folio-relacionado').value.trim().toUpperCase(),
        notas: document.getElementById('tarea-notas').value.trim()
    };

    try {
        const res = await fetch(CONFIG.BACKEND_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        cerrarModal();
        cargarTareas({ append: false });
    } catch (e) {
        alert(e.message || 'No se pudo guardar la tarea');
    }
}

document.getElementById('btn-refresh').addEventListener('click', () => cargarTareas({ append: false }));
document.getElementById('btn-nueva').addEventListener('click', abrirModalNueva);
document.getElementById('btn-cerrar-modal').addEventListener('click', cerrarModal);
document.getElementById('btn-cancelar').addEventListener('click', cerrarModal);
document.getElementById('btn-limpiar').addEventListener('click', () => {
    document.getElementById('filtro-texto').value = '';
    document.getElementById('filtro-estado').value = '';
    document.getElementById('filtro-prioridad').value = '';
    document.getElementById('filtro-tipo-relacion').value = '';
    document.getElementById('filtro-responsable').value = '';
    document.getElementById('filtro-desde').value = '';
    document.getElementById('filtro-hasta').value = '';
    cargarTareas({ append: false });
});

['filtro-texto', 'filtro-estado', 'filtro-prioridad', 'filtro-tipo-relacion', 'filtro-responsable', 'filtro-desde', 'filtro-hasta']
    .forEach(id => {
        document.getElementById(id).addEventListener(id === 'filtro-texto' || id === 'filtro-responsable' ? 'input' : 'change', () => {
            cargarTareas({ append: false });
        });
    });

elBtnMore.addEventListener('click', () => {
    if (hasMore) cargarTareas({ append: true });
});

elGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-edit]');
    if (!btn) return;
    abrirEdicion(btn.getAttribute('data-edit'));
});

elForm.addEventListener('submit', guardarTarea);
elModal.addEventListener('click', (e) => {
    if (e.target === elModal) cerrarModal();
});

cargarTareas({ append: false });
