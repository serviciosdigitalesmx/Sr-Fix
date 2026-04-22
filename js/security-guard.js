"use strict";
const CACHE_KEY = 'srfix_admin_money_auth_v1';
const CACHE_TTL_MS = 10 * 60 * 1000;
function getSecurityGuardBackendUrl() {
    return CONFIG.API_URL
        || window.SRFIX_API_URL
        || window.SRFIX_BACKEND_URL
        || localStorage.getItem('srfix_api_url')
        || localStorage.getItem('srfix_backend_url')
        || 'https://script.google.com/macros/s/AKfycbw49B0GeqyZ2Yr0a-IZNqUhrhUBH0yldSO274EDHBU9gT5SPrXSs2ixIhwD5BRmg-6W/exec';
}
function readCache() {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object')
            return null;
        const candidate = parsed;
        if (!candidate.password || !candidate.expiresAt)
            return null;
        if (Date.now() >= Number(candidate.expiresAt || 0))
            return null;
        return {
            ok: true,
            password: String(candidate.password),
            fromCache: true
        };
    }
    catch (e) {
        return null;
    }
}
function writeCache(password) {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        password: String(password || ''),
        expiresAt: Date.now() + CACHE_TTL_MS
    }));
}
function clearCache() {
    sessionStorage.removeItem(CACHE_KEY);
}
function buildSecurityGuardGetUrl(payload) {
    const params = new URLSearchParams();
    params.set('action', 'validar_admin_password');
    params.set('t', String(Date.now()));
    Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '')
            return;
        params.set(key, String(value));
    });
    return `${getSecurityGuardBackendUrl()}?${params.toString()}`;
}
async function readSecurityGuardJson(response) {
    const text = await response.text();
    if (!text.trim()) {
        throw new Error(`Respuesta vacia (${response.status})`);
    }
    try {
        return JSON.parse(text);
    }
    catch {
        throw new Error(`Respuesta invalida (${response.status}): ${text.slice(0, 180)}`);
    }
}
async function validatePassword(password) {
    const payload = {
        action: 'validar_admin_password',
        usuario: 'admin',
        password: String(password || '').trim(),
        adminPassword: String(password || '').trim()
    };
    const requestGet = () => fetch(buildSecurityGuardGetUrl({
        adminPassword: payload.password
    }), { method: 'GET' });
    const requestPost = () => fetch(getSecurityGuardBackendUrl(), {
        method: 'POST',
        body: JSON.stringify({
            action: payload.action,
            adminPassword: payload.password
        })
    });
    try {
        const res = await requestPost();
        const candidate = await readSecurityGuardJson(res);
        return !!(candidate && candidate.success);
    }
    catch {
        const res = await requestGet();
        const candidate = await readSecurityGuardJson(res);
        return !!(candidate && candidate.success);
    }
}
async function ensureAdminPassword(reason, options = {}) {
    const cached = readCache();
    if (cached && !options.forcePrompt) {
        return cached.password
            ? { ok: true, password: cached.password, fromCache: true }
            : { ok: true, fromCache: true };
    }
    const promptReason = reason ? `Autorización requerida: ${reason}` : 'Autorización requerida';
    const password = window.prompt(`${promptReason}\n\nIngresa la clave de admin:`) || '';
    const trimmed = String(password || '').trim();
    if (!trimmed) {
        return { ok: false, error: 'Autorización cancelada' };
    }
    try {
        const ok = await validatePassword(trimmed);
        if (!ok) {
            clearCache();
            window.alert('Clave admin inválida');
            return { ok: false, error: 'Clave admin inválida' };
        }
        writeCache(trimmed);
        return { ok: true, password: trimmed, fromCache: false };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'No se pudo validar la clave admin' };
    }
}
async function attachAdminPassword(payload = {}, reason, options = {}) {
    const auth = await ensureAdminPassword(reason, options);
    if (!auth.ok)
        return null;
    return Object.assign({}, payload, {
        adminPasswordActual: auth.password
    });
}
const api = {
    ensureAdminPassword,
    attachAdminPassword,
    clearAdminPassword: clearCache,
    hasAdminPassword: function hasAdminPassword() {
        return !!readCache();
    }
};
window.SRFXSecurityGuard = api;
