const CONFIG = {
    BACKEND_URL: 'https://script.google.com/macros/s/AKfycbz8kwnncjT8hEy2o-KOoUSQBHBzFpTLjqqZ-EwANJ8mx_XzeB-4FIsD_DWvJQVOuTjM/exec'
};

const elRows = document.getElementById('rows');
const elLoading = document.getElementById('loading');
const elEmpty = document.getElementById('empty');
const elCount = document.getElementById('count');

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
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return escapeHtml(v);
    return d.toLocaleString('es-MX');
}

function badgeTipo(tipo) {
    const t = String(tipo || '').toLowerCase();
    if (t === 'solicitud') return '<span class="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-300">Solicitud</span>';
    if (t === 'cotizacion') return '<span class="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300">Cotización</span>';
    return '<span class="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300">Equipo entregado</span>';
}

async function cargarArchivo() {
    elLoading.classList.remove('hidden');
    elEmpty.classList.add('hidden');
    elRows.innerHTML = '';

    const tipo = document.getElementById('filtro-tipo').value;
    const from = document.getElementById('filtro-from').value;
    const to = document.getElementById('filtro-to').value;

    const q = new URLSearchParams({ action: 'listar_archivo', tipo });
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    q.set('t', String(Date.now()));

    try {
        let data = null;
        let res = await fetch(CONFIG.BACKEND_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'listar_archivo', tipo, from, to })
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
        elCount.textContent = archivo.length;
        elLoading.classList.add('hidden');

        if (!archivo.length) {
            elEmpty.classList.remove('hidden');
            return;
        }

        elRows.innerHTML = archivo.map(item => `
            <tr class="border-t border-[#1F7EDC]/20 hover:bg-[#1F7EDC]/10">
                <td class="px-3 py-3">${badgeTipo(item.TIPO_ARCHIVO)}</td>
                <td class="px-3 py-3 text-[#8A8F95]">${formatDate(item.FECHA_ARCHIVO)}</td>
                <td class="px-3 py-3 font-semibold text-[#1F7EDC]">${escapeHtml(item.FOLIO)}</td>
                <td class="px-3 py-3">${escapeHtml(item.CLIENTE)}</td>
                <td class="px-3 py-3">${escapeHtml(item.TELEFONO)}</td>
                <td class="px-3 py-3 text-[#8A8F95]">${escapeHtml(item.DETALLE)}</td>
                <td class="px-3 py-3 text-right">${formatMoney(item.TOTAL)}</td>
            </tr>
        `).join('');
    } catch (e) {
        elLoading.classList.add('hidden');
        elEmpty.classList.remove('hidden');
        elEmpty.textContent = `No se pudo cargar el archivo: ${e.message}`;
    }
}

document.getElementById('btn-refresh').addEventListener('click', cargarArchivo);
document.getElementById('filtro-tipo').addEventListener('change', cargarArchivo);
document.getElementById('filtro-from').addEventListener('change', cargarArchivo);
document.getElementById('filtro-to').addEventListener('change', cargarArchivo);

cargarArchivo();
