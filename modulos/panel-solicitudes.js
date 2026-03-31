const CONFIG = {
    BACKEND_URL: 'https://script.google.com/macros/s/AKfycbxH1zD8_14TvCajstFhtEpLNODwG9GZXkLoCXOb1IBNm0JIRmpCwS6SRsuGhZETK88z/exec'
};

const elList = document.getElementById('list');
const elLoading = document.getElementById('loading');
const elEmpty = document.getElementById('empty');
const elCount = document.getElementById('count');
const elModal = document.getElementById('cotizacion-modal');
const elCotItems = document.getElementById('cot-items');
let solicitudesCache = [];
let solicitudActual = null;
let cotizacionItems = [];
let audioCtx = null;
let intervaloSolicitudes = null;
let conteoSolicitudesPrevio = 0;
let primeraCargaSolicitudes = true;
let cotizacionEditando = false;
let cotizacionDirty = false;
const IVA_RATE = 0.16;

function escapeHtml(v) {
    return String(v || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatoFecha(iso) {
    if (!iso) return '---';
    const raw = String(iso).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizarTelefono(telefono) {
    const digits = String(telefono || '').replace(/\D/g, '');
    return digits.length === 10 ? digits : '';
}

function getAudioCtx() {
    if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioCtx = new Ctx();
    }
    return audioCtx;
}

function beep(freq = 880, duration = 0.08, delay = 0) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.01);
}

function sonidoNuevaSolicitud() {
    beep(950, 0.07, 0);
    beep(1250, 0.09, 0.12);
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
    document.getElementById('cot-notas').value = '';
    document.getElementById('cot-anticipo').value = '0';
    document.getElementById('cot-aplica-iva').checked = false;
    cotizacionItems = [{
        concepto: s.PROBLEMAS || s.DESCRIPCION || 'Diagnóstico y reparación',
        cantidad: 1,
        precio: 0
    }];
    cotizacionEditando = true;
    cotizacionDirty = false;
    renderCotizacionItems();
    elModal.classList.remove('hidden');
}

function cerrarCotizacion() {
    cotizacionEditando = false;
    cotizacionDirty = false;
    elModal.classList.add('hidden');
}

function formatMoney(n) {
    const val = Number(n || 0);
    return `$${val.toFixed(2)}`;
}

function crearItemCotizacion() {
    cotizacionItems.push({ concepto: '', cantidad: 1, precio: 0 });
    cotizacionDirty = true;
    renderCotizacionItems();
}

function eliminarItemCotizacion(idx) {
    cotizacionItems.splice(idx, 1);
    if (!cotizacionItems.length) cotizacionItems.push({ concepto: '', cantidad: 1, precio: 0 });
    renderCotizacionItems();
}

function recalcularTotalesCotizacion() {
    const subtotal = cotizacionItems.reduce((acc, it) => acc + (Number(it.cantidad || 0) * Number(it.precio || 0)), 0);
    const aplicaIva = !!document.getElementById('cot-aplica-iva').checked;
    const iva = aplicaIva ? subtotal * IVA_RATE : 0;
    const total = subtotal + iva;
    const anticipo = Number(document.getElementById('cot-anticipo').value || 0);
    const saldo = Math.max(0, total - anticipo);
    document.getElementById('cot-iva-label').textContent = aplicaIva ? 'IVA (16%)' : 'IVA (No aplicado)';
    document.getElementById('cot-subtotal').textContent = formatMoney(subtotal);
    document.getElementById('cot-iva').textContent = formatMoney(iva);
    document.getElementById('cot-total').textContent = formatMoney(total);
    document.getElementById('cot-saldo').textContent = formatMoney(saldo);
    return { subtotal, iva, total, anticipo, saldo, aplicaIva, ivaRate: IVA_RATE };
}

function prepararDatosCotizacion() {
    const resumen = recalcularTotalesCotizacion();
    const items = cotizacionItems
        .filter(it => (it.concepto || '').trim())
        .map(it => {
            const cantidad = Number(it.cantidad || 0);
            const precio = Number(it.precio || 0);
            return {
                concepto: String(it.concepto || '').trim(),
                cantidad: cantidad,
                precio: precio,
                total: cantidad * precio
            };
        });
    const notas = document.getElementById('cot-notas').value.trim();
    return { resumen, items, notas };
}

function validarItemsCotizacion(items) {
    if (!Array.isArray(items) || !items.length) {
        return { ok: false, error: 'Agrega al menos un concepto para cotizar.' };
    }
    for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const concepto = String(it.concepto || '').trim();
        const cantidad = Number(it.cantidad || 0);
        const precio = Number(it.precio || 0);
        if (!concepto) return { ok: false, error: `El concepto #${i + 1} está vacío.` };
        if (!Number.isFinite(cantidad) || cantidad <= 0) return { ok: false, error: `Cantidad inválida en concepto #${i + 1}.` };
        if (!Number.isFinite(precio) || precio <= 0) return { ok: false, error: `Precio inválido en concepto #${i + 1}.` };
    }
    return { ok: true };
}

function construirCotizacionPayload(resumen, items, notas) {
    return {
        version: '1.0',
        moneda: 'MXN',
        items: items.map(it => ({
            concepto: String(it.concepto || '').trim(),
            cantidad: Number(it.cantidad || 0),
            precio: Number(it.precio || 0),
            total: Number((Number(it.cantidad || 0) * Number(it.precio || 0)).toFixed(2))
        })),
        notas: String(notas || '').trim(),
        aplicaIva: !!resumen.aplicaIva,
        ivaRate: Number(resumen.ivaRate || IVA_RATE),
        subtotal: Number(Number(resumen.subtotal || 0).toFixed(2)),
        iva: Number(Number(resumen.iva || 0).toFixed(2)),
        total: Number(Number(resumen.total || 0).toFixed(2)),
        anticipo: Number(Number(resumen.anticipo || 0).toFixed(2)),
        saldo: Number(Number(resumen.saldo || 0).toFixed(2))
    };
}

function renderCotizacionItems() {
    elCotItems.innerHTML = '';
    cotizacionItems.forEach((it, idx) => {
        const row = document.createElement('div');
        row.className = 'grid grid-cols-12 gap-2 items-center';
        row.innerHTML = `
            <input data-field="concepto" data-idx="${idx}" class="col-span-6 rounded bg-[#0f0f0f] border border-[#1F7EDC]/30 px-2 py-2 text-sm" placeholder="Concepto" value="${escapeHtml(it.concepto || '')}">
            <input data-field="cantidad" data-idx="${idx}" type="number" min="1" step="1" class="col-span-2 rounded bg-[#0f0f0f] border border-[#1F7EDC]/30 px-2 py-2 text-sm text-right" value="${Number(it.cantidad || 1)}">
            <input data-field="precio" data-idx="${idx}" type="number" min="0" step="0.01" class="col-span-3 rounded bg-[#0f0f0f] border border-[#1F7EDC]/30 px-2 py-2 text-sm text-right" value="${Number(it.precio || 0)}">
            <button data-del="${idx}" class="col-span-1 rounded bg-red-600 hover:bg-red-500 py-2 text-xs"><i class="fa-solid fa-trash"></i></button>
        `;
        elCotItems.appendChild(row);
    });
    recalcularTotalesCotizacion();
}

function descargarCotizacionPDF() {
    if (!solicitudActual) return;
    const s = solicitudActual;
    const { resumen, items: filas, notas } = prepararDatosCotizacion();
    const validacion = validarItemsCotizacion(filas);
    if (!validacion.ok) return alert(validacion.error);
    const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="utf-8">
            <title>Cotización ${s.FOLIO_COTIZACION}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Inter', sans-serif; background: #f4f7fc; padding: 30px; color: #1e293b; }
                .container { max-width: 960px; margin: 0 auto; background: #fff; border-radius: 24px; box-shadow: 0 20px 40px -10px rgba(0,20,50,.15); overflow: hidden; border: 1px solid #e2e8f0; }
                .header { background: linear-gradient(135deg, #0F4C81 0%, #1F7EDC 100%); color: #fff; padding: 28px 34px; display: flex; justify-content: space-between; align-items: center; }
                .header h1 { font-size: 30px; font-weight: 800; letter-spacing: 1px; }
                .header h1 span { color: #FF6A2A; }
                .folio { background: rgba(255,255,255,.15); padding: 9px 20px; border-radius: 999px; border: 1px solid rgba(255,255,255,.28); font-weight: 700; }
                .content { padding: 32px; }
                .pillbar { display: flex; justify-content: space-between; gap: 12px; background: #f1f5f9; padding: 12px 16px; border-radius: 999px; margin-bottom: 22px; font-size: 14px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
                .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; }
                .card h3 { font-size: 15px; color: #1F7EDC; margin-bottom: 10px; border-bottom: 2px solid #FF6A2A; padding-bottom: 6px; }
                .row { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px dashed #cbd5e1; }
                .row:last-child { border-bottom: 0; }
                .k { color: #475569; font-weight: 600; }
                .v { color: #0f172a; font-weight: 500; text-align: right; max-width: 62%; }
                .desc { margin-top: 18px; background: #fff7ed; border-left: 6px solid #FF6A2A; padding: 16px; border-radius: 12px; }
                table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 13px; }
                th, td { border: 1px solid #d8dee8; padding: 8px; }
                th { background: #eef4ff; text-align: left; }
                td.num { text-align: right; }
                .footer { background: #f1f5f9; padding: 14px 24px; text-align: center; color: #64748b; font-size: 13px; border-top: 1px solid #cbd5e1; }
                @media print { body { background: #fff; padding: 0; } .container { box-shadow: none; } }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>SR<span>FIX</span> - Cotización</h1>
                    <div class="folio">${escapeHtml(s.FOLIO_COTIZACION || '---')}</div>
                </div>
                <div class="content">
                    <div class="pillbar">
                        <span><strong>Fecha:</strong> ${escapeHtml(formatoFecha(s.FECHA_SOLICITUD))}</span>
                        <span><strong>Urgencia:</strong> ${escapeHtml(s.URGENCIA || '---')}</span>
                    </div>
                    <div class="grid">
                        <div class="card">
                            <h3>Cliente</h3>
                            <div class="row"><div class="k">Nombre</div><div class="v">${escapeHtml(s.NOMBRE)}</div></div>
                            <div class="row"><div class="k">Teléfono</div><div class="v">${escapeHtml(s.TELEFONO)}</div></div>
                            <div class="row"><div class="k">Email</div><div class="v">${escapeHtml(s.EMAIL)}</div></div>
                        </div>
                        <div class="card">
                            <h3>Equipo</h3>
                            <div class="row"><div class="k">Dispositivo</div><div class="v">${escapeHtml(s.DISPOSITIVO)}</div></div>
                            <div class="row"><div class="k">Modelo</div><div class="v">${escapeHtml(s.MODELO)}</div></div>
                            <div class="row"><div class="k">Problemas</div><div class="v">${escapeHtml(s.PROBLEMAS)}</div></div>
                        </div>
                    </div>
                    <div class="desc">
                        <strong>Descripción:</strong>
                        <div style="margin-top:6px; line-height:1.5;">${escapeHtml(s.DESCRIPCION || '---')}</div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Concepto</th>
                                <th style="width:80px">Cant.</th>
                                <th style="width:120px">Precio</th>
                                <th style="width:120px">Importe</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filas.map(f => `<tr><td>${escapeHtml(f.concepto)}</td><td class="num">${f.cantidad}</td><td class="num">${formatMoney(f.precio)}</td><td class="num">${formatMoney(f.total)}</td></tr>`).join('')}
                        </tbody>
                    </table>
                    <div style="margin-top:12px; text-align:right; font-size:13px; line-height:1.8;">
                        <div><strong>Subtotal:</strong> ${formatMoney(resumen.subtotal)}</div>
                        <div><strong>${resumen.aplicaIva ? 'IVA (16%)' : 'IVA (No aplicado)'}:</strong> ${formatMoney(resumen.iva)}</div>
                        <div style="font-size:16px;"><strong>Total:</strong> ${formatMoney(resumen.total)}</div>
                        <div><strong>Anticipo:</strong> ${formatMoney(resumen.anticipo)}</div>
                        <div><strong>Saldo:</strong> ${formatMoney(resumen.saldo)}</div>
                    </div>
                    <div class="desc" style="margin-top:12px;">
                        <strong>Notas de cotización:</strong>
                        <div style="margin-top:6px; line-height:1.5;">${escapeHtml(notas || 'Sin notas adicionales')}</div>
                    </div>
                </div>
                <div class="footer">SrFix Oficial · Plaza Chapultepec · 81 1700 6536</div>
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

function enviarCotizacionWhatsApp() {
    if (!solicitudActual) return;
    const tel = normalizarTelefono(solicitudActual.TELEFONO);
    if (!tel) return alert('La solicitud no tiene teléfono válido.');
    const { resumen, items, notas } = prepararDatosCotizacion();
    const validacion = validarItemsCotizacion(items);
    if (!validacion.ok) return alert(validacion.error);
    const conceptos = items
        .map(it => `- ${it.concepto} (${Number(it.cantidad || 0)} x ${formatMoney(it.precio || 0)})`)
        .join('\n');
    if (!conceptos) return alert('Agrega al menos un concepto antes de enviar por WhatsApp.');
    let msg = `Hola ${solicitudActual.NOMBRE || ''}, te compartimos tu cotización ${solicitudActual.FOLIO_COTIZACION}:\n\n`;
    msg += `${conceptos}\n\n`;
    const ivaTexto = resumen.aplicaIva ? `IVA (16%): ${formatMoney(resumen.iva)}` : `IVA (No aplicado): ${formatMoney(resumen.iva)}`;
    msg += `Subtotal: ${formatMoney(resumen.subtotal)}\n${ivaTexto}\nTotal: ${formatMoney(resumen.total)}\nAnticipo: ${formatMoney(resumen.anticipo)}\nSaldo: ${formatMoney(resumen.saldo)}\n`;
    if (notas) msg += `\nNotas: ${notas}\n`;
    window.open(`https://wa.me/52${tel}?text=${encodeURIComponent(msg)}`, '_blank');
}

async function archivarCotizacionActual() {
    if (!solicitudActual) return;
    const { resumen, items, notas } = prepararDatosCotizacion();
    const validacion = validarItemsCotizacion(items);
    if (!validacion.ok) return alert(validacion.error);
    const cotizacionPayload = construirCotizacionPayload(resumen, items, notas);

    const payload = {
        action: 'archivar_cotizacion',
        folio: solicitudActual.FOLIO_COTIZACION,
        cotizacion: cotizacionPayload
    };

    try {
        let data = null;
        let res = await fetch(CONFIG.BACKEND_URL, { method: 'POST', body: JSON.stringify(payload) });
        if (res.ok) {
            try { data = await res.json(); } catch (e) {}
        }
        if (!data || data.error) {
            const q = new URLSearchParams({
                action: 'archivar_cotizacion',
                folio: String(solicitudActual.FOLIO_COTIZACION || ''),
                t: String(Date.now())
            });
            res = await fetch(`${CONFIG.BACKEND_URL}?${q.toString()}`);
            data = await res.json();
        }
        if (data.error || !data.success) throw new Error(data.error || 'No se pudo archivar la cotización');
        const folioManual = String(data.folioCotizacionManual || '').trim();
        cerrarCotizacion();
        await cargarSolicitudes(true);
        if (folioManual) {
            alert(`Cotización archivada correctamente.\nFolio de cotización: ${folioManual}`);
        } else {
            alert('Cotización archivada correctamente.');
        }
    } catch (e) {
        alert('Error al archivar cotización: ' + e.message);
    }
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

async function cargarSolicitudes(force = false) {
    if (!force && cotizacionEditando) return;
    elLoading.classList.remove('hidden');
    elEmpty.classList.add('hidden');
    try {
        let res = await fetch(CONFIG.BACKEND_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'listar_solicitudes' })
        });
        let data = null;
        try { data = await res.json(); } catch (e) {}
        if (!data || data.error) {
            res = await fetch(`${CONFIG.BACKEND_URL}?action=listar_solicitudes&t=${Date.now()}`);
            data = await res.json();
        }
        if (data.error) throw new Error(data.error);
        solicitudesCache = data.solicitudes || [];
        const conteoActual = solicitudesCache.length;
        if (!primeraCargaSolicitudes && conteoActual > conteoSolicitudesPrevio) {
            sonidoNuevaSolicitud();
        }
        conteoSolicitudesPrevio = conteoActual;
        primeraCargaSolicitudes = false;
        render(solicitudesCache);
    } catch (e) {
        elLoading.classList.add('hidden');
        alert('No se pudieron cargar solicitudes: ' + e.message);
    }
}

async function archivarSolicitud(folio) {
    try {
        let res = await fetch(CONFIG.BACKEND_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'archivar_solicitud', folio: folio })
        });
        let data = null;
        try { data = await res.json(); } catch (e) {}
        if (!data || data.error) {
            res = await fetch(`${CONFIG.BACKEND_URL}?action=archivar_solicitud&folio=${encodeURIComponent(folio)}&t=${Date.now()}`);
            data = await res.json();
        }
        if (data.error || !data.success) throw new Error(data.error || 'No se pudo archivar');
        await cargarSolicitudes(true);
    } catch (e) {
        alert('Error al archivar: ' + e.message);
    }
}

document.getElementById('btn-refresh').addEventListener('click', () => cargarSolicitudes(true));
document.getElementById('btn-cotizacion-cerrar').addEventListener('click', cerrarCotizacion);
document.getElementById('btn-cotizacion-pdf').addEventListener('click', descargarCotizacionPDF);
document.getElementById('btn-cotizacion-wa').addEventListener('click', enviarCotizacionWhatsApp);
document.getElementById('btn-cotizacion-archivar').addEventListener('click', () => {
    if (confirm('¿Archivar esta cotización en el módulo Archivo?')) archivarCotizacionActual();
});
document.getElementById('btn-cot-item-add').addEventListener('click', crearItemCotizacion);
document.getElementById('cot-anticipo').addEventListener('input', recalcularTotalesCotizacion);
document.getElementById('cot-anticipo').addEventListener('input', () => { cotizacionDirty = true; });
document.getElementById('cot-aplica-iva').addEventListener('change', () => {
    cotizacionDirty = true;
    recalcularTotalesCotizacion();
});
document.getElementById('cot-notas').addEventListener('input', () => { cotizacionDirty = true; });
elCotItems.addEventListener('input', (e) => {
    const idx = Number(e.target.getAttribute('data-idx'));
    const field = e.target.getAttribute('data-field');
    if (Number.isNaN(idx) || !field || !cotizacionItems[idx]) return;
    let val = e.target.value;
    if (field === 'cantidad') val = Math.max(1, Number(val || 1));
    if (field === 'precio') val = Math.max(0, Number(val || 0));
    cotizacionItems[idx][field] = val;
    cotizacionDirty = true;
    recalcularTotalesCotizacion();
});
elCotItems.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    eliminarItemCotizacion(Number(btn.getAttribute('data-del')));
    cotizacionDirty = true;
});
elModal.addEventListener('click', (e) => {
    if (e.target.id !== 'cotizacion-modal') return;
    if (cotizacionDirty && !confirm('Hay cambios sin guardar en la cotización. ¿Cerrar de todos modos?')) return;
    cerrarCotizacion();
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

cargarSolicitudes(true);
if (intervaloSolicitudes) clearInterval(intervaloSolicitudes);
intervaloSolicitudes = setInterval(() => {
    if (document.hidden) return;
    cargarSolicitudes(false);
}, 30000);
document.addEventListener('click', () => {
    const ctx = getAudioCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();
}, { once: true });
