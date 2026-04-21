"use strict";
const BACKEND_URL = CONFIG.API_URL;
const IVA_RATE = 0.16;
const elList = requireElement('list');
const elLoading = requireElement('loading');
const elEmpty = requireElement('empty');
const elCount = requireElement('count');
const elModal = requireElement('cotizacion-modal');
const elCotItems = requireElement('cot-items');
const elCotFolio = requireElement('cot-folio');
const elCotCliente = requireElement('cot-cliente');
const elCotTelefono = requireElement('cot-telefono');
const elCotEquipo = requireElement('cot-equipo');
const elCotProblema = requireElement('cot-problema');
const elCotUrgencia = requireElement('cot-urgencia');
const elCotNotas = requireElement('cot-notas');
const elCotAnticipo = requireElement('cot-anticipo');
const elCotAplicaIva = requireElement('cot-aplica-iva');
const elCotSubtotal = requireElement('cot-subtotal');
const elCotIvaLabel = requireElement('cot-iva-label');
const elCotIva = requireElement('cot-iva');
const elCotTotal = requireElement('cot-total');
const elCotSaldo = requireElement('cot-saldo');
const btnRefresh = requireElement('btn-refresh');
const btnCotizacionCerrar = requireElement('btn-cotizacion-cerrar');
const btnCotizacionPdf = requireElement('btn-cotizacion-pdf');
const btnCotizacionWa = requireElement('btn-cotizacion-wa');
const btnCotizacionArchivar = requireElement('btn-cotizacion-archivar');
const btnCotItemAdd = requireElement('btn-cot-item-add');
let solicitudesCache = [];
let solicitudActual = null;
let cotizacionItems = [];
let audioCtx = null;
let intervaloSolicitudes = null;
let conteoSolicitudesPrevio = 0;
let primeraCargaSolicitudes = true;
let cotizacionEditando = false;
let cotizacionDirty = false;
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
function formatoFecha(iso) {
    if (!iso)
        return '---';
    const raw = String(iso).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw))
        return raw;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime()))
        return raw;
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
}
function normalizarTelefono(telefono) {
    const digits = String(telefono ?? '').replace(/\D/g, '');
    return digits.length === 10 ? digits : '';
}
function getAudioCtx() {
    if (audioCtx)
        return audioCtx;
    const mediaWindow = window;
    const Ctx = window.AudioContext || mediaWindow.webkitAudioContext;
    if (!Ctx)
        return null;
    audioCtx = new Ctx();
    return audioCtx;
}
function beep(freq = 880, duration = 0.08, delay = 0) {
    const ctx = getAudioCtx();
    if (!ctx)
        return;
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
function formatMoney(value) {
    const val = Number(value ?? 0);
    return `$${val.toFixed(2)}`;
}
function getSolicitudesBackendUrl() {
    return String(BACKEND_URL || '').trim();
}
function buildGetUrl(action, payload = {}) {
    const params = new URLSearchParams();
    params.set('action', action);
    params.set('t', String(Date.now()));
    Object.entries(payload).forEach(([key, raw]) => {
        if (raw === undefined || raw === null)
            return;
        if (typeof raw === 'object') {
            params.set(key, JSON.stringify(raw));
            return;
        }
        params.set(key, String(raw));
    });
    return `${getSolicitudesBackendUrl()}?${params.toString()}`;
}
async function readJson(response) {
    const text = await response.text();
    if (!text.trim()) {
        throw new Error(`Respuesta vacía (${response.status})`);
    }
    try {
        return JSON.parse(text);
    }
    catch (error) {
        throw new Error(`Respuesta inválida (${response.status}): ${text.slice(0, 180)}`);
    }
}
async function requestBackend(action, payload = {}, method = 'POST') {
    const response = method === 'GET'
        ? await fetch(buildGetUrl(action, payload), { method: 'GET' })
        : await fetch(getSolicitudesBackendUrl(), {
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
function makeCotizacionItem() {
    return { concepto: '', cantidad: 1, precio: 0 };
}
function prepararDatosCotizacion() {
    const subtotal = cotizacionItems.reduce((acc, item) => acc + (Number(item.cantidad || 0) * Number(item.precio || 0)), 0);
    const aplicaIva = !!elCotAplicaIva.checked;
    const iva = aplicaIva ? subtotal * IVA_RATE : 0;
    const total = subtotal + iva;
    const anticipo = Number(elCotAnticipo.value || 0);
    const saldo = Math.max(0, total - anticipo);
    const notas = elCotNotas.value.trim();
    return {
        resumen: {
            subtotal,
            iva,
            total,
            anticipo,
            saldo,
            aplicaIva,
            ivaRate: IVA_RATE
        },
        items: cotizacionItems
            .filter(item => String(item.concepto || '').trim())
            .map(item => {
            const cantidad = Number(item.cantidad || 0);
            const precio = Number(item.precio || 0);
            return {
                concepto: String(item.concepto || '').trim(),
                cantidad,
                precio,
                total: cantidad * precio
            };
        }),
        notas
    };
}
function validarItemsCotizacion(items) {
    if (!Array.isArray(items) || !items.length) {
        return { ok: false, error: 'Agrega al menos un concepto para cotizar.' };
    }
    for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        if (!item) {
            return { ok: false, error: `El concepto #${i + 1} está incompleto.` };
        }
        const concepto = String(item.concepto || '').trim();
        const cantidad = Number(item.cantidad || 0);
        const precio = Number(item.precio || 0);
        if (!concepto)
            return { ok: false, error: `El concepto #${i + 1} está vacío.` };
        if (!Number.isFinite(cantidad) || cantidad <= 0)
            return { ok: false, error: `Cantidad inválida en concepto #${i + 1}.` };
        if (!Number.isFinite(precio) || precio <= 0)
            return { ok: false, error: `Precio inválido en concepto #${i + 1}.` };
    }
    return { ok: true };
}
function construirCotizacionPayload(resumen, items, notas) {
    return {
        version: '1.0',
        moneda: 'MXN',
        items: items.map(item => ({
            concepto: String(item.concepto || '').trim(),
            cantidad: Number(item.cantidad || 0),
            precio: Number(item.precio || 0),
            total: Number((Number(item.cantidad || 0) * Number(item.precio || 0)).toFixed(2))
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
    cotizacionItems.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'grid grid-cols-12 gap-2 items-center';
        row.innerHTML = `
      <input data-field="concepto" data-idx="${idx}" class="col-span-6 rounded bg-[#0f0f0f] border border-[#1F7EDC]/30 px-2 py-2 text-sm" placeholder="Concepto" value="${escapeHtml(item.concepto || '')}">
      <input data-field="cantidad" data-idx="${idx}" type="number" min="1" step="1" class="col-span-2 rounded bg-[#0f0f0f] border border-[#1F7EDC]/30 px-2 py-2 text-sm text-right" value="${Number(item.cantidad || 1)}">
      <input data-field="precio" data-idx="${idx}" type="number" min="0" step="0.01" class="col-span-3 rounded bg-[#0f0f0f] border border-[#1F7EDC]/30 px-2 py-2 text-sm text-right" value="${Number(item.precio || 0)}">
      <button data-del="${idx}" class="col-span-1 rounded bg-red-600 hover:bg-red-500 py-2 text-xs"><i class="fa-solid fa-trash"></i></button>
    `;
        elCotItems.appendChild(row);
    });
    const { resumen } = prepararDatosCotizacion();
    elCotIvaLabel.textContent = resumen.aplicaIva ? 'IVA (16%)' : 'IVA (No aplicado)';
    elCotSubtotal.textContent = formatMoney(resumen.subtotal);
    elCotIva.textContent = formatMoney(resumen.iva);
    elCotTotal.textContent = formatMoney(resumen.total);
    elCotSaldo.textContent = formatMoney(resumen.saldo);
}
function abrirCotizacion(folio) {
    const solicitud = solicitudesCache.find(item => String(item.FOLIO_COTIZACION) === String(folio));
    if (!solicitud) {
        alert('No se encontró la solicitud');
        return;
    }
    solicitudActual = solicitud;
    elCotFolio.textContent = solicitud.FOLIO_COTIZACION || '---';
    elCotCliente.textContent = solicitud.NOMBRE || '---';
    elCotTelefono.textContent = solicitud.TELEFONO || '---';
    elCotEquipo.textContent = `${solicitud.DISPOSITIVO || ''} ${solicitud.MODELO || ''}`.trim() || '---';
    elCotProblema.textContent = solicitud.DESCRIPCION || solicitud.PROBLEMAS || '---';
    elCotUrgencia.textContent = solicitud.URGENCIA || '---';
    elCotNotas.value = '';
    elCotAnticipo.value = '0';
    elCotAplicaIva.checked = false;
    cotizacionItems = [{
            concepto: solicitud.PROBLEMAS || solicitud.DESCRIPCION || 'Diagnóstico y reparación',
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
function crearItemCotizacion() {
    cotizacionItems.push(makeCotizacionItem());
    cotizacionDirty = true;
    renderCotizacionItems();
}
function eliminarItemCotizacion(idx) {
    cotizacionItems.splice(idx, 1);
    if (!cotizacionItems.length)
        cotizacionItems.push(makeCotizacionItem());
    cotizacionDirty = true;
    renderCotizacionItems();
}
function descargarCotizacionPDF() {
    if (!solicitudActual)
        return;
    const solicitud = solicitudActual;
    const { resumen, items: filas, notas } = prepararDatosCotizacion();
    const validacion = validarItemsCotizacion(cotizacionItems);
    if (!validacion.ok) {
        alert(validacion.error);
        return;
    }
    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Cotización ${escapeHtml(solicitud.FOLIO_COTIZACION)}</title>
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
          <div class="folio">${escapeHtml(solicitud.FOLIO_COTIZACION || '---')}</div>
        </div>
        <div class="content">
          <div class="pillbar">
            <span><strong>Fecha:</strong> ${escapeHtml(formatoFecha(solicitud.FECHA_SOLICITUD))}</span>
            <span><strong>Urgencia:</strong> ${escapeHtml(solicitud.URGENCIA || '---')}</span>
          </div>
          <div class="grid">
            <div class="card">
              <h3>Cliente</h3>
              <div class="row"><div class="k">Nombre</div><div class="v">${escapeHtml(solicitud.NOMBRE)}</div></div>
              <div class="row"><div class="k">Teléfono</div><div class="v">${escapeHtml(solicitud.TELEFONO)}</div></div>
              <div class="row"><div class="k">Email</div><div class="v">${escapeHtml(solicitud.EMAIL)}</div></div>
            </div>
            <div class="card">
              <h3>Equipo</h3>
              <div class="row"><div class="k">Dispositivo</div><div class="v">${escapeHtml(solicitud.DISPOSITIVO)}</div></div>
              <div class="row"><div class="k">Modelo</div><div class="v">${escapeHtml(solicitud.MODELO)}</div></div>
              <div class="row"><div class="k">Problemas</div><div class="v">${escapeHtml(solicitud.PROBLEMAS)}</div></div>
            </div>
          </div>
          <div class="desc">
            <strong>Descripción:</strong>
            <div style="margin-top:6px; line-height:1.5;">${escapeHtml(solicitud.DESCRIPCION || '---')}</div>
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
              ${filas.map(item => `<tr><td>${escapeHtml(item.concepto)}</td><td class="num">${item.cantidad}</td><td class="num">${formatMoney(item.precio)}</td><td class="num">${formatMoney(item.total)}</td></tr>`).join('')}
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
    const popup = window.open('', '_blank');
    if (!popup) {
        alert('Permite ventanas emergentes para generar PDF.');
        return;
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
}
function enviarCotizacionWhatsApp() {
    if (!solicitudActual)
        return;
    const telefono = normalizarTelefono(solicitudActual.TELEFONO);
    if (!telefono) {
        alert('La solicitud no tiene teléfono válido.');
        return;
    }
    const { resumen, items, notas } = prepararDatosCotizacion();
    const validacion = validarItemsCotizacion(cotizacionItems);
    if (!validacion.ok) {
        alert(validacion.error);
        return;
    }
    const conceptos = items
        .map(item => `- ${item.concepto} (${Number(item.cantidad || 0)} x ${formatMoney(item.precio || 0)})`)
        .join('\n');
    if (!conceptos) {
        alert('Agrega al menos un concepto antes de enviar por WhatsApp.');
        return;
    }
    let mensaje = `Hola ${solicitudActual.NOMBRE || ''}, te compartimos tu cotización ${solicitudActual.FOLIO_COTIZACION}:\n\n`;
    mensaje += `${conceptos}\n\n`;
    const ivaTexto = resumen.aplicaIva ? `IVA (16%): ${formatMoney(resumen.iva)}` : `IVA (No aplicado): ${formatMoney(resumen.iva)}`;
    mensaje += `Subtotal: ${formatMoney(resumen.subtotal)}\n${ivaTexto}\nTotal: ${formatMoney(resumen.total)}\nAnticipo: ${formatMoney(resumen.anticipo)}\nSaldo: ${formatMoney(resumen.saldo)}\n`;
    if (notas)
        mensaje += `\nNotas: ${notas}\n`;
    window.open(`https://wa.me/52${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
}
function enviarWhatsApp(telefono, folio) {
    const tel = normalizarTelefono(telefono);
    if (!tel) {
        alert('El teléfono no es válido.');
        return;
    }
    const mensaje = `Hola, te contactamos de SrFix respecto a tu solicitud de cotización ${folio}.`;
    window.open(`https://wa.me/52${tel}?text=${encodeURIComponent(mensaje)}`, '_blank');
}
async function archivarCotizacionActual() {
    if (!solicitudActual)
        return;
    const { resumen, items, notas } = prepararDatosCotizacion();
    const validacion = validarItemsCotizacion(cotizacionItems);
    if (!validacion.ok) {
        alert(validacion.error);
        return;
    }
    const cotizacionPayload = construirCotizacionPayload(resumen, items, notas);
    try {
        const response = await requestBackend('archivar_cotizacion', {
            folio: solicitudActual.FOLIO_COTIZACION,
            cotizacion: cotizacionPayload
        }, 'POST');
        if (response.success === false) {
            throw new Error(response.error || 'No se pudo archivar la cotización');
        }
        const folioManual = String(response.folioCotizacionManual || '').trim();
        cerrarCotizacion();
        await cargarSolicitudes(true);
        alert(folioManual
            ? `Cotización archivada correctamente.\nFolio de cotización: ${folioManual}`
            : 'Cotización archivada correctamente.');
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo archivar la cotización';
        alert(`Error al archivar cotización: ${message}`);
    }
}
function render(solicitudes) {
    elCount.textContent = String(solicitudes.length);
    elList.innerHTML = '';
    elLoading.classList.add('hidden');
    if (!solicitudes.length) {
        elEmpty.classList.remove('hidden');
        return;
    }
    elEmpty.classList.add('hidden');
    solicitudes.forEach(solicitud => {
        const card = document.createElement('article');
        card.className = 'bg-[#2B2B2B] border border-[#1F7EDC]/40 rounded-xl p-4';
        card.innerHTML = `
      <div class="flex justify-between items-start gap-2">
        <div>
          <h3 class="font-bold text-[#1F7EDC]">${escapeHtml(solicitud.FOLIO_COTIZACION || 'Sin folio')}</h3>
          <p class="text-xs text-[#8A8F95]">${escapeHtml(formatoFecha(solicitud.FECHA_SOLICITUD))}</p>
        </div>
        <span class="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">Pendiente</span>
      </div>
      <div class="mt-3 text-sm space-y-1">
        <p><span class="text-[#8A8F95]">Nombre:</span> ${escapeHtml(solicitud.NOMBRE)}</p>
        <p><span class="text-[#8A8F95]">Teléfono:</span> ${escapeHtml(solicitud.TELEFONO)}</p>
        <p><span class="text-[#8A8F95]">Equipo:</span> ${escapeHtml(solicitud.DISPOSITIVO)} ${escapeHtml(solicitud.MODELO)}</p>
        <p><span class="text-[#8A8F95]">Problemas:</span> ${escapeHtml(solicitud.PROBLEMAS)}</p>
        <p><span class="text-[#8A8F95]">Descripción:</span> ${escapeHtml(solicitud.DESCRIPCION)}</p>
        <p><span class="text-[#8A8F95]">Urgencia:</span> ${escapeHtml(solicitud.URGENCIA)}</p>
      </div>
      <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button class="btn-wa bg-green-600 hover:bg-green-500 text-white rounded-lg py-2 text-sm font-semibold" data-telefono="${escapeHtml(solicitud.TELEFONO)}" data-folio="${escapeHtml(solicitud.FOLIO_COTIZACION)}">
          <i class="fa-brands fa-whatsapp"></i> WhatsApp
        </button>
        <button class="btn-cotizar bg-[#1F7EDC] hover:bg-blue-500 text-white rounded-lg py-2 text-sm font-semibold" data-folio="${escapeHtml(solicitud.FOLIO_COTIZACION)}">
          <i class="fa-solid fa-file-invoice"></i> Cotizar
        </button>
        <button class="btn-archivar bg-[#8A8F95] hover:bg-[#747980] text-white rounded-lg py-2 text-sm font-semibold" data-folio="${escapeHtml(solicitud.FOLIO_COTIZACION)}">
          <i class="fa-solid fa-box-archive"></i> Archivar
        </button>
      </div>
    `;
        elList.appendChild(card);
    });
}
async function cargarSolicitudes(force = false) {
    if (!force && cotizacionEditando)
        return;
    elLoading.classList.remove('hidden');
    elEmpty.classList.add('hidden');
    try {
        const response = await requestBackend('listar_solicitudes', {}, 'GET');
        solicitudesCache = response.solicitudes || [];
        const conteoActual = solicitudesCache.length;
        if (!primeraCargaSolicitudes && conteoActual > conteoSolicitudesPrevio) {
            sonidoNuevaSolicitud();
        }
        conteoSolicitudesPrevio = conteoActual;
        primeraCargaSolicitudes = false;
        render(solicitudesCache);
    }
    catch (error) {
        elLoading.classList.add('hidden');
        const message = error instanceof Error ? error.message : 'No se pudieron cargar solicitudes';
        alert(`No se pudieron cargar solicitudes: ${message}`);
    }
}
async function archivarSolicitud(folio) {
    try {
        const response = await requestBackend('archivar_solicitud', { folio }, 'POST');
        if (response.success === false)
            throw new Error(response.error || 'No se pudo archivar');
        await cargarSolicitudes(true);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo archivar';
        alert(`Error al archivar: ${message}`);
    }
}
btnRefresh.addEventListener('click', () => { void cargarSolicitudes(true); });
btnCotizacionCerrar.addEventListener('click', cerrarCotizacion);
btnCotizacionPdf.addEventListener('click', descargarCotizacionPDF);
btnCotizacionWa.addEventListener('click', enviarCotizacionWhatsApp);
btnCotizacionArchivar.addEventListener('click', () => {
    if (confirm('¿Archivar esta cotización en el módulo Archivo?')) {
        void archivarCotizacionActual();
    }
});
btnCotItemAdd.addEventListener('click', crearItemCotizacion);
elCotAnticipo.addEventListener('input', () => {
    cotizacionDirty = true;
    renderCotizacionItems();
});
elCotAplicaIva.addEventListener('change', () => {
    cotizacionDirty = true;
    renderCotizacionItems();
});
elCotNotas.addEventListener('input', () => {
    cotizacionDirty = true;
});
elCotItems.addEventListener('input', (event) => {
    const target = event.target;
    if (!target)
        return;
    const idx = Number(target.getAttribute('data-idx'));
    const field = target.getAttribute('data-field');
    if (Number.isNaN(idx) || !field || !cotizacionItems[idx])
        return;
    const rawValue = target.value;
    if (field === 'concepto') {
        cotizacionItems[idx].concepto = rawValue;
    }
    else if (field === 'cantidad') {
        cotizacionItems[idx].cantidad = Math.max(1, Number(rawValue || 1));
    }
    else if (field === 'precio') {
        cotizacionItems[idx].precio = Math.max(0, Number(rawValue || 0));
    }
    cotizacionDirty = true;
    renderCotizacionItems();
});
elCotItems.addEventListener('click', (event) => {
    const target = event.target;
    if (!target)
        return;
    const button = target.closest('[data-del]');
    if (!button)
        return;
    eliminarItemCotizacion(Number(button.getAttribute('data-del')));
});
elModal.addEventListener('click', (event) => {
    const target = event.target;
    if (!target || target.id !== 'cotizacion-modal')
        return;
    if (cotizacionDirty && !confirm('Hay cambios sin guardar en la cotización. ¿Cerrar de todos modos?'))
        return;
    cerrarCotizacion();
});
elList.addEventListener('click', (event) => {
    const target = event.target;
    if (!target)
        return;
    const waButton = target.closest('.btn-wa');
    if (waButton) {
        enviarWhatsApp(waButton.getAttribute('data-telefono') || '', waButton.getAttribute('data-folio') || '');
        return;
    }
    const cotizarButton = target.closest('.btn-cotizar');
    if (cotizarButton) {
        abrirCotizacion(cotizarButton.getAttribute('data-folio') || '');
        return;
    }
    const archivarButton = target.closest('.btn-archivar');
    if (!archivarButton)
        return;
    const folio = archivarButton.getAttribute('data-folio');
    if (!folio)
        return;
    if (confirm(`¿Archivar solicitud ${folio}?`)) {
        void archivarSolicitud(folio);
    }
});
void cargarSolicitudes(true);
if (intervaloSolicitudes)
    clearInterval(intervaloSolicitudes);
intervaloSolicitudes = window.setInterval(() => {
    if (document.hidden)
        return;
    void cargarSolicitudes(false);
}, 30000);
document.addEventListener('click', () => {
    const ctx = getAudioCtx();
    if (ctx && ctx.state === 'suspended') {
        void ctx.resume();
    }
}, { once: true });
