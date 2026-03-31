const CONFIG = {
    BACKEND_URL: 'https://script.google.com/macros/s/AKfycbxH1zD8_14TvCajstFhtEpLNODwG9GZXkLoCXOb1IBNm0JIRmpCwS6SRsuGhZETK88z/exec'
};

function money(v) {
    return `$${Number(v || 0).toFixed(2)}`;
}

function escapeHtml(v) {
    return String(v || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getSucursalActiva() {
    return localStorage.getItem('srfix_sucursal_activa') || 'GLOBAL';
}

function getFiltros() {
    return {
        tipo: document.getElementById('filtro-tipo').value,
        fechaDesde: document.getElementById('filtro-desde').value,
        fechaHasta: document.getElementById('filtro-hasta').value,
        sucursalId: getSucursalActiva()
    };
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

function setDefaultDates() {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    document.getElementById('filtro-desde').value = inicioMes.toISOString().slice(0, 10);
    document.getElementById('filtro-hasta').value = hoy.toISOString().slice(0, 10);
}

function fillKpis(tipo, resumen = {}) {
    const labels = {
        diario: ['Equipos recibidos', 'Equipos entregados', 'Cotizaciones', 'Ventas estimadas', 'Gastos'],
        semanal: ['Equipos recibidos', 'Equipos entregados', 'Cotizaciones', 'Promedio dias entrega', 'Stock critico'],
        mensual: ['Ingresos', 'Egresos', 'Utilidad', 'Servicios frecuentes', 'Clientes recurrentes']
    };
    const values = tipo === 'mensual'
        ? [money(resumen.ingresos), money(resumen.egresos), money(resumen.utilidad), resumen.serviciosFrecuentes || 0, resumen.clientesRecurrentes || 0]
        : tipo === 'semanal'
            ? [resumen.equiposRecibidos || 0, resumen.equiposEntregados || 0, resumen.cotizacionesGeneradas || 0, resumen.promedioDiasEntrega || 0, resumen.stockCritico || 0]
            : [resumen.equiposRecibidos || 0, resumen.equiposEntregados || 0, resumen.cotizacionesGeneradas || 0, money(resumen.ventasEstimadas), money(resumen.gastos)];

    for (let i = 1; i <= 5; i += 1) {
        document.getElementById(`kpi-${i}`).textContent = String(values[i - 1] ?? 0);
        document.getElementById(`kpi-${i}-label`).textContent = labels[tipo][i - 1];
    }
}

function renderList(targetId, rows = [], mapper) {
    const wrap = document.getElementById(targetId);
    if (!rows.length) {
        wrap.innerHTML = '<div class="text-[#8A8F95]">Sin datos para este rango.</div>';
        return;
    }
    wrap.innerHTML = rows.map(mapper).join('');
}

async function cargarReporte() {
    const filtros = getFiltros();
    const data = await fetchJson({ action: 'reporte_operativo', ...filtros });
    fillKpis(filtros.tipo, data.resumen || {});

    if (filtros.tipo === 'diario') {
        renderList('tabla-principal', data.detalle?.equiposRecibidos || [], (item) => `
            <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3">
                <div class="font-semibold text-white">${escapeHtml(item.FOLIO || '---')} · ${escapeHtml(item.CLIENTE_NOMBRE || 'Sin cliente')}</div>
                <div class="text-xs text-[#8A8F95] mt-1">${escapeHtml(item.DISPOSITIVO || '---')} · ${escapeHtml(item.MODELO || '---')}</div>
            </div>
        `);
        renderList('tabla-secundaria', data.detalle?.cotizaciones || [], (item) => `
            <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3 flex items-center justify-between gap-3">
                <div>
                    <div class="font-semibold text-white">${escapeHtml(item.folio || '---')}</div>
                    <div class="text-xs text-[#8A8F95]">${escapeHtml(item.cliente || 'Sin cliente')}</div>
                </div>
                <div class="text-[#FF6A2A] font-semibold">${money(item.total)}</div>
            </div>
        `);
        return;
    }

    if (filtros.tipo === 'semanal') {
        renderList('tabla-principal', data.detalle?.porTecnico || [], (item) => `
            <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3 flex items-center justify-between gap-3">
                <div class="font-semibold text-white">${escapeHtml(item.tecnico)}</div>
                <div class="text-[#1F7EDC] font-semibold">${item.total}</div>
            </div>
        `);
        renderList('tabla-secundaria', data.detalle?.stockCritico || [], (item) => `
            <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3">
                <div class="font-semibold text-white">${escapeHtml(item.SKU)} · ${escapeHtml(item.NOMBRE)}</div>
                <div class="text-xs text-[#8A8F95] mt-1">Actual ${Number(item.STOCK_ACTUAL || 0)} · Minimo ${Number(item.STOCK_MINIMO || 0)}</div>
            </div>
        `);
        return;
    }

    renderList('tabla-principal', data.detalle?.serviciosFrecuentes || [], (item) => `
        <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3 flex items-center justify-between gap-3">
            <div class="font-semibold text-white">${escapeHtml(item.servicio)}</div>
            <div class="text-[#1F7EDC] font-semibold">${item.total}</div>
        </div>
    `);
    renderList('tabla-secundaria', data.detalle?.clientesRecurrentes || [], (item) => `
        <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3 flex items-center justify-between gap-3">
            <div class="font-semibold text-white">${escapeHtml(item.cliente)}</div>
            <div class="text-[#FF6A2A] font-semibold">${item.total}</div>
        </div>
    `);
}

document.getElementById('btn-refresh').addEventListener('click', () => {
    cargarReporte().catch((e) => {
        document.getElementById('tabla-principal').innerHTML = `<div class="text-red-300">${escapeHtml(e.message)}</div>`;
        document.getElementById('tabla-secundaria').innerHTML = `<div class="text-red-300">${escapeHtml(e.message)}</div>`;
    });
});

['filtro-tipo', 'filtro-desde', 'filtro-hasta'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
        cargarReporte().catch((e) => {
            document.getElementById('tabla-principal').innerHTML = `<div class="text-red-300">${escapeHtml(e.message)}</div>`;
            document.getElementById('tabla-secundaria').innerHTML = `<div class="text-red-300">${escapeHtml(e.message)}</div>`;
        });
    });
});

setDefaultDates();
cargarReporte().catch((e) => {
    document.getElementById('tabla-principal').innerHTML = `<div class="text-red-300">${escapeHtml(e.message)}</div>`;
    document.getElementById('tabla-secundaria').innerHTML = `<div class="text-red-300">${escapeHtml(e.message)}</div>`;
});
