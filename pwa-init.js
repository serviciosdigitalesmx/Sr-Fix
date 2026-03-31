(function () {
    const MANIFEST_PATH = './manifest.webmanifest';
    const SW_PATH = './sw.js';
    let deferredPrompt = null;

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
        ensureMeta('theme-color', '#1F7EDC');
        ensureMeta('apple-mobile-web-app-capable', 'yes');
        ensureMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
        ensureMeta('apple-mobile-web-app-title', 'SrFix');
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

    function ensureInstallButton() {
        let btn = document.getElementById('pwa-install-btn');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'pwa-install-btn';
            btn.type = 'button';
            btn.className = 'pwa-install-btn hidden';
            btn.textContent = 'Instalar app';
            document.body.appendChild(btn);
        }
        btn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            try {
                await deferredPrompt.userChoice;
            } catch (e) {}
            deferredPrompt = null;
            btn.classList.add('hidden');
        });
        return btn;
    }

    function updateOfflineState() {
        const banner = ensureOfflineBanner();
        banner.classList.toggle('hidden', navigator.onLine);
        document.body.classList.toggle('is-offline', !navigator.onLine);
    }

    function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
        navigator.serviceWorker.register(SW_PATH).catch(() => {});
    }

    function setupInstallPrompt() {
        const btn = ensureInstallButton();
        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            deferredPrompt = event;
            btn.classList.remove('hidden');
        });
        window.addEventListener('appinstalled', () => {
            btn.classList.add('hidden');
            deferredPrompt = null;
        });
    }

    ensurePwaHead();
    window.addEventListener('online', updateOfflineState);
    window.addEventListener('offline', updateOfflineState);
    document.addEventListener('DOMContentLoaded', updateOfflineState);
    registerServiceWorker();
    setupInstallPrompt();
})();
