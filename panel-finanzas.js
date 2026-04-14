const CONFIG = {
    BACKEND_URL: 'https://script.google.com/macros/s/AKfycbyKv77a5864czQIJYEmFbAIYl4dAufoxP3ynPZhSoyZSiGYpFRrOBxr-B_2-rdcfRO0/exec'
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

function setDefaults() {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    document.getElementById('filtro-desde').value = inicio.toISOString().slice(0, 10);
    document.getElementById('filtro-hasta').value = hoy.toISOString().slice(0, 10);
}

function renderComparativo(rows = []) {
    const wrap = document.getElementById('comparativo-mensual');
    if (!rows.length) {
        wrap.innerHTML = '<div class="text-[#8A8F95]">Sin datos suficientes.</div>';
        return;
    }
    wrap.innerHTML = rows.map(item => `
        <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3">
            <div class="flex items-center justify-between gap-3">
                <div class="font-semibold text-[#1F7EDC]">${escapeHtml(item.mes)}</div>
                <div class="text-sm text-[#8A8F95]">Utilidad ${money(item.utilidad)}</div>
            </div>
            <div class="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div class="rounded-lg bg-green-500/10 border border-green-500/20 p-2 text-green-300">Ingresos ${money(item.ingresos)}</div>
                <div class="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-red-300">Egresos ${money(item.egresos)}</div>
                <div class="rounded-lg bg-[#1F7EDC]/10 border border-[#1F7EDC]/20 p-2 text-[#9dcfff]">Utilidad ${money(item.utilidad)}</div>
            </div>
        </div>
    `).join('');
}

function renderCategorias(rows = []) {
    const wrap = document.getElementById('resumen-categorias');
    if (!rows.length) {
        wrap.innerHTML = '<div class="text-[#8A8F95]">Sin categorías para este periodo.</div>';
        return;
    }
    wrap.innerHTML = rows.map(item => `
        <div class="flex items-center justify-between rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3">
            <div class="font-semibold text-white">${escapeHtml(item.categoria)}</div>
            <div class="text-[#FF6A2A] font-semibold">${money(item.total)}</div>
        </div>
    `).join('');
}

async function cargarFinanzas() {
    try {
        const data = await fetchJson({ action: 'resumen_finanzas', ...getFiltros() });
        const k = data.kpis || {};
        document.getElementById('kpi-ingresos').textContent = money(k.ingresos);
        document.getElementById('kpi-egresos').textContent = money(k.egresos);
        document.getElementById('kpi-utilidad').textContent = money(k.utilidadBruta);
        document.getElementById('kpi-ticket').textContent = money(k.ticketPromedio);
        document.getElementById('kpi-entregadas').textContent = String(k.ordenesEntregadas || 0);
        document.getElementById('kpi-cotizaciones').textContent = String(k.cotizacionesConvertidas || 0);
        document.getElementById('kpi-cxc').textContent = money(k.cuentasPorCobrar);
        document.getElementById('kpi-anticipos').textContent = money(k.anticiposPendientes);
        renderComparativo(Array.isArray(data.comparativoMensual) ? data.comparativoMensual : []);
        renderCategorias(Array.isArray(data.resumenCategorias) ? data.resumenCategorias : []);
    } catch (e) {
        document.getElementById('comparativo-mensual').innerHTML = `<div class="text-red-300">${escapeHtml(e.message)}</div>`;
        document.getElementById('resumen-categorias').innerHTML = `<div class="text-red-300">${escapeHtml(e.message)}</div>`;
    }
}

document.getElementById('btn-refresh').addEventListener('click', cargarFinanzas);
document.getElementById('filtro-desde').addEventListener('change', cargarFinanzas);
document.getElementById('filtro-hasta').addEventListener('change', cargarFinanzas);

setDefaults();
cargarFinanzas();
