const CONFIG = {
    BACKEND_URL: 'https://script.google.com/macros/s/AKfycbzQVtN84j6wikyyRsuRyC_mLQIjrU8tbCHEydBweDxI1nCo2Sbvol3El8CkKlpx3jzq/exec'
};

const elList = document.getElementById('list');
const elLoading = document.getElementById('loading');
const elEmpty = document.getElementById('empty');
const elCount = document.getElementById('count');
const elModal = document.getElementById('cotizacion-modal');
let solicitudesCache = [];
let solicitudActual = null;

function escapeHtml(v) {
    return String(v || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatoFecha(iso) {
    try { return new Date(iso).toLocaleString('es-MX'); }
    catch (e) { return iso || '---'; }
}

function normalizarTelefono(telefono) {
    return String(telefono || '').replace(/\D/g, '');
}

function enviarWhatsApp(telefono, folio) {
    const tel = normalizarTelefono(telefono);
    const mensaje = `Hola, te contactamos de SrFix respecto a tu solicitud de cotización ${folio}.`;
    const url = `https://wa.me/52${tel}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

function abrirCotizacion(folio) {
    const s = solicitudesCache.find(x => String(x.FOLIO_COTIZACION) === String(folio));
    if (!s) {
        alert('No se encontró la solicitud');
        return;
    }
    solicitudActual = s;
    document.getElementById('cot-folio').textContent = s.FOLIO_COTIZACION || '---';
    document.getElementById('cot-cliente').textContent = s.NOMBRE || '---';
    document.getElementById('cot-telefono').textContent = s.TELEFONO || '---';
    document.getElementById('cot-equipo').textContent = `${s.DISPOSITIVO || ''} ${s.MODELO || ''}`.trim() || '---';
    document.getElementById('cot-problema').textContent = s.DESCRIPCION || s.PROBLEMAS || '---';
    document.getElementById('cot-urgencia').textContent = s.URGENCIA || '---';
    elModal.classList.remove('hidden');
}

function cerrarCotizacion() {
    elModal.classList.add('hidden');
}

function descargarCotizacionPDF() {
    if (!solicitudActual) return;
    const s = solicitudActual;
    const html = `
        <!doctype html>
        <html lang="es">
        <head>
            <meta charset="utf-8">
            <title>Cotización ${s.FOLIO_COTIZACION}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
                h1 { margin: 0 0 8px 0; color: #1f7edc; }
                .muted { color: #555; margin-bottom: 16px; }
                .card { border: 1px solid #ddd; border-radius: 8px; padding: 14px; }
                .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
                .row:last-child { border-bottom: 0; }
                .k { color: #666; font-weight: bold; }
                .v { color: #111; text-align: right; max-width: 60%; }
            </style>
        </head>
        <body>
            <h1>SRFIX - Solicitud de Cotización</h1>
            <div class="muted">Folio: ${s.FOLIO_COTIZACION || '---'} | Fecha: ${formatoFecha(s.FECHA_SOLICITUD)}</div>
            <div class="card">
                <div class="row"><div class="k">Cliente</div><div class="v">${escapeHtml(s.NOMBRE)}</div></div>
                <div class="row"><div class="k">Teléfono</div><div class="v">${escapeHtml(s.TELEFONO)}</div></div>
                <div class="row"><div class="k">Email</div><div class="v">${escapeHtml(s.EMAIL)}</div></div>
                <div class="row"><div class="k">Equipo</div><div class="v">${escapeHtml(s.DISPOSITIVO)} ${escapeHtml(s.MODELO)}</div></div>
                <div class="row"><div class="k">Problemas</div><div class="v">${escapeHtml(s.PROBLEMAS)}</div></div>
                <div class="row"><div class="k">Descripción</div><div class="v">${escapeHtml(s.DESCRIPCION)}</div></div>
                <div class="row"><div class="k">Urgencia</div><div class="v">${escapeHtml(s.URGENCIA)}</div></div>
            </div>
            <script>window.onload = () => window.print();<\/script>
        </body>
        </html>
    `;
    const w = window.open('', '_blank');
    if (!w) {
        alert('Permite ventanas emergentes para generar PDF.');
        return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
}

function render(solicitudes) {
    elCount.textContent = solicitudes.length;
    elList.innerHTML = '';
    elLoading.classList.add('hidden');

    if (!solicitudes.length) {
        elEmpty.classList.remove('hidden');
        return;
    }
    elEmpty.classList.add('hidden');

    solicitudes.forEach(s => {
        const card = document.createElement('article');
        card.className = 'bg-[#2B2B2B] border border-[#1F7EDC]/40 rounded-xl p-4';
        card.innerHTML = `
            <div class="flex justify-between items-start gap-2">
                <div>
                    <h3 class="font-bold text-[#1F7EDC]">${escapeHtml(s.FOLIO_COTIZACION || 'Sin folio')}</h3>
                    <p class="text-xs text-[#8A8F95]">${escapeHtml(formatoFecha(s.FECHA_SOLICITUD))}</p>
                </div>
                <span class="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">Pendiente</span>
            </div>
            <div class="mt-3 text-sm space-y-1">
                <p><span class="text-[#8A8F95]">Nombre:</span> ${escapeHtml(s.NOMBRE)}</p>
                <p><span class="text-[#8A8F95]">Teléfono:</span> ${escapeHtml(s.TELEFONO)}</p>
                <p><span class="text-[#8A8F95]">Equipo:</span> ${escapeHtml(s.DISPOSITIVO)} ${escapeHtml(s.MODELO)}</p>
                <p><span class="text-[#8A8F95]">Problemas:</span> ${escapeHtml(s.PROBLEMAS)}</p>
                <p><span class="text-[#8A8F95]">Descripción:</span> ${escapeHtml(s.DESCRIPCION)}</p>
                <p><span class="text-[#8A8F95]">Urgencia:</span> ${escapeHtml(s.URGENCIA)}</p>
            </div>
            <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button class="btn-wa bg-green-600 hover:bg-green-500 text-white rounded-lg py-2 text-sm font-semibold" data-telefono="${escapeHtml(s.TELEFONO)}" data-folio="${escapeHtml(s.FOLIO_COTIZACION)}">
                    <i class="fa-brands fa-whatsapp"></i> WhatsApp
                </button>
                <button class="btn-cotizar bg-[#1F7EDC] hover:bg-blue-500 text-white rounded-lg py-2 text-sm font-semibold" data-folio="${escapeHtml(s.FOLIO_COTIZACION)}">
                    <i class="fa-solid fa-file-invoice"></i> Cotizar
                </button>
                <button class="btn-archivar bg-[#8A8F95] hover:bg-[#747980] text-white rounded-lg py-2 text-sm font-semibold" data-folio="${escapeHtml(s.FOLIO_COTIZACION)}">
                    <i class="fa-solid fa-box-archive"></i> Archivar
                </button>
            </div>
        `;
        elList.appendChild(card);
    });
}

async function cargarSolicitudes() {
    elLoading.classList.remove('hidden');
    elEmpty.classList.add('hidden');
    try {
        const res = await fetch(CONFIG.BACKEND_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'listar_solicitudes' })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        solicitudesCache = data.solicitudes || [];
        render(solicitudesCache);
    } catch (e) {
        elLoading.classList.add('hidden');
        alert('No se pudieron cargar solicitudes: ' + e.message);
    }
}

async function archivarSolicitud(folio) {
    try {
        const res = await fetch(CONFIG.BACKEND_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'archivar_solicitud', folio: folio })
        });
        const data = await res.json();
        if (data.error || !data.success) throw new Error(data.error || 'No se pudo archivar');
        await cargarSolicitudes();
    } catch (e) {
        alert('Error al archivar: ' + e.message);
    }
}

document.getElementById('btn-refresh').addEventListener('click', cargarSolicitudes);
document.getElementById('btn-cotizacion-cerrar').addEventListener('click', cerrarCotizacion);
document.getElementById('btn-cotizacion-pdf').addEventListener('click', descargarCotizacionPDF);
document.getElementById('btn-cotizacion-wa').addEventListener('click', () => {
    if (!solicitudActual) return;
    enviarWhatsApp(solicitudActual.TELEFONO, solicitudActual.FOLIO_COTIZACION);
});
elModal.addEventListener('click', (e) => {
    if (e.target.id === 'cotizacion-modal') cerrarCotizacion();
});
elList.addEventListener('click', (e) => {
    const btnWa = e.target.closest('.btn-wa');
    if (btnWa) {
        enviarWhatsApp(btnWa.getAttribute('data-telefono'), btnWa.getAttribute('data-folio'));
        return;
    }

    const btnCotizar = e.target.closest('.btn-cotizar');
    if (btnCotizar) {
        abrirCotizacion(btnCotizar.getAttribute('data-folio'));
        return;
    }

    const btnArchivar = e.target.closest('.btn-archivar');
    if (!btnArchivar) return;
    const folio = btnArchivar.getAttribute('data-folio');
    if (!folio) return;
    if (confirm(`¿Archivar solicitud ${folio}?`)) archivarSolicitud(folio);
});

cargarSolicitudes();
