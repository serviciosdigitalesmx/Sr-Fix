"use strict";
(() => {
    const BUILD_VERSION = '2026.04.21.5';
    const MANIFEST_PATH = `./manifest.webmanifest?v=${encodeURIComponent(BUILD_VERSION)}`;
    const SW_PATH = './sw.js';
    const CACHE_RESET_KEY = 'srfix_cache_reset_version';
    function ensureMeta(name, content, attr = 'name') {
        let el = document.head.querySelector(`meta[${attr}="${name}"]`);
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute(attr, name);
            document.head.appendChild(el);
        }
        el.setAttribute('content', content);
    }
    function ensureLink(rel, href) {
        let el = document.head.querySelector(`link[rel="${rel}"]`);
        if (!el) {
            el = document.createElement('link');
            el.setAttribute('rel', rel);
            document.head.appendChild(el);
        }
        el.setAttribute('href', href);
    }
    function ensurePwaHead() {
        ensureLink('manifest', MANIFEST_PATH);
        ensureLink('icon', './favicon.png');
        ensureLink('shortcut icon', './favicon.png');
        ensureMeta('mobile-web-app-capable', 'yes');
        ensureMeta('theme-color', '#1F7EDC');
    }
    function ensureOfflineBanner() {
        let banner = document.getElementById('pwa-offline-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'pwa-offline-banner';
            banner.className = 'pwa-offline-banner hidden';
            banner.textContent = 'Sin conexion. Puedes navegar vistas ya abiertas, pero los datos en vivo no se actualizaran.';
            document.body.prepend(banner);
        }
        return banner;
    }
    function updateOfflineState() {
        const banner = ensureOfflineBanner();
        banner.classList.toggle('hidden', navigator.onLine);
        document.body.classList.toggle('is-offline', !navigator.onLine);
    }
    function registerServiceWorker() {
        if (!('serviceWorker' in navigator))
            return;
        if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1')
            return;
        navigator.serviceWorker.register(SW_PATH).then((reg) => {
            try {
                reg.update();
            }
            catch { }
        }).catch(() => { });
    }
    function resetClientCacheIfNeeded() {
        const previousVersion = localStorage.getItem(CACHE_RESET_KEY) || '';
        if (previousVersion === BUILD_VERSION)
            return;
        localStorage.setItem(CACHE_RESET_KEY, BUILD_VERSION);
        if ('caches' in window) {
            caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))).catch(() => { });
        }
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((regs) => {
                regs.forEach((reg) => {
                    try {
                        reg.unregister();
                    }
                    catch { }
                });
            }).catch(() => { });
        }
        if (navigator.serviceWorker && typeof navigator.serviceWorker.getRegistration === 'function') {
            navigator.serviceWorker.getRegistration().then((reg) => {
                if (reg) {
                    try {
                        reg.update();
                    }
                    catch { }
                }
            }).catch(() => { });
        }
    }
    ensurePwaHead();
    resetClientCacheIfNeeded();
    window.addEventListener('online', updateOfflineState);
    window.addEventListener('offline', updateOfflineState);
    document.addEventListener('DOMContentLoaded', updateOfflineState);
    registerServiceWorker();
})();
