const CONFIG = {
    BACKEND_URL: 'https://script.google.com/macros/s/AKfycbyKv77a5864czQIJYEmFbAIYl4dAufoxP3ynPZhSoyZSiGYpFRrOBxr-B_2-rdcfRO0/exec'
};

const elRows = document.getElementById('rows');
const elLoading = document.getElementById('loading');
const elEmpty = document.getElementById('empty');
const elCount = document.getElementById('count');
const elPageInfo = document.getElementById('page-info');
const elBtnMore = document.getElementById('btn-more');

const PAGE_SIZE = 150;
const RENDER_CHUNK = 60;
let currentPage = 1;
let hasMore = false;
let isLoading = false;

function escapeHtml(v) {
    return String(v || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatMoney(v) {
    const n = Number(v || 0);
    if (!Number.isFinite(n) || n <= 0) return '---';
    return `$${n.toFixed(2)}`;
}

function formatDate(v) {
    if (!v) return '---';
    const raw = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return escapeHtml(v);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function badgeTipo(tipo) {
    const t = String(tipo || '').toLowerCase();
    if (t === 'solicitud') return '<span class="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-300">Solicitud</span>';
    if (t === 'cotizacion') return '<span class="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300">Cotización</span>';
    return '<span class="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300">Equipo entregado</span>';
}

function getFiltros() {
    return {
        tipo: document.getElementById('filtro-tipo').value,
        from: document.getElementById('filtro-from').value,
        to: document.getElementById('filtro-to').value
    };
}

function renderRowsChunked(archivo, append = false) {
    return new Promise((resolve) => {
        if (!append) elRows.innerHTML = '';
        let idx = 0;
        function renderChunk() {
            const frag = document.createDocumentFragment();
            const end = Math.min(idx + RENDER_CHUNK, archivo.length);
            for (; idx < end; idx++) {
                const item = archivo[idx];
                const tr = document.createElement('tr');
                tr.className = 'border-t border-[#1F7EDC]/20 hover:bg-[#1F7EDC]/10';
                tr.innerHTML = `
                    <td class="px-3 py-3">${badgeTipo(item.TIPO_ARCHIVO)}</td>
                    <td class="px-3 py-3 text-[#8A8F95]">${formatDate(item.FECHA_ARCHIVO)}</td>
                    <td class="px-3 py-3 font-semibold text-[#1F7EDC]">${escapeHtml(item.FOLIO)}</td>
                    <td class="px-3 py-3">${escapeHtml(item.CLIENTE)}</td>
                    <td class="px-3 py-3">${escapeHtml(item.TELEFONO)}</td>
                    <td class="px-3 py-3 text-[#8A8F95]">${escapeHtml(item.DETALLE)}</td>
                    <td class="px-3 py-3 text-right">${formatMoney(item.TOTAL)}</td>
                `;
                frag.appendChild(tr);
            }
            elRows.appendChild(frag);
            if (idx < archivo.length) {
                requestAnimationFrame(renderChunk);
            } else {
                resolve();
            }
        }
        renderChunk();
    });
}

async function cargarArchivo({ append = false } = {}) {
    if (isLoading) return;
    isLoading = true;
    const { tipo, from, to } = getFiltros();
    if (!append) currentPage = 1;
    elLoading.classList.remove('hidden');
    if (!append) {
        elEmpty.classList.add('hidden');
        elRows.innerHTML = '';
    }

    const q = new URLSearchParams({
        action: 'listar_archivo',
        tipo,
        page: String(currentPage),
        pageSize: String(PAGE_SIZE)
    });
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    q.set('t', String(Date.now()));

    try {
        let data = null;
        let res = await fetch(CONFIG.BACKEND_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'listar_archivo', tipo, from, to, page: currentPage, pageSize: PAGE_SIZE })
        });
        if (res.ok) {
            try { data = await res.json(); } catch (e) {}
        }
        if (!data || data.error) {
            res = await fetch(`${CONFIG.BACKEND_URL}?${q.toString()}`);
            data = await res.json();
        }
        if (data.error) throw new Error(data.error);

        const archivo = Array.isArray(data.archivo) ? data.archivo : [];
        const total = Number(data.total || 0);
        hasMore = !!data.hasMore;
        elCount.textContent = String(total);
        elPageInfo.textContent = `Página ${Number(data.page || currentPage)} · ${archivo.length} por carga`;
        elLoading.classList.add('hidden');

        if (!append && !archivo.length) {
            elEmpty.classList.remove('hidden');
            elBtnMore.classList.add('hidden');
            return;
        }

        await renderRowsChunked(archivo, append);
        elBtnMore.classList.toggle('hidden', !hasMore);
        if (hasMore) currentPage += 1;
    } catch (e) {
        elLoading.classList.add('hidden');
        elEmpty.classList.remove('hidden');
        elEmpty.textContent = `No se pudo cargar el archivo: ${e.message}`;
        elBtnMore.classList.add('hidden');
    } finally {
        isLoading = false;
    }
}

document.getElementById('btn-refresh').addEventListener('click', () => cargarArchivo({ append: false }));
document.getElementById('filtro-tipo').addEventListener('change', () => cargarArchivo({ append: false }));
document.getElementById('filtro-from').addEventListener('change', () => cargarArchivo({ append: false }));
document.getElementById('filtro-to').addEventListener('change', () => cargarArchivo({ append: false }));
elBtnMore.addEventListener('click', () => {
    if (hasMore) cargarArchivo({ append: true });
});

cargarArchivo({ append: false });
