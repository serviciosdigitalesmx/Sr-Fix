"use strict";
(() => {
    const globalWindow = window;
    const backend = globalWindow.SRFIXBackend;
    if (!backend)
        return;
    if (typeof globalWindow.api !== 'function') {
        globalWindow.api = backend.request.bind(backend);
    }
    if (typeof globalWindow.buildGetUrl !== 'function') {
        globalWindow.buildGetUrl = backend.buildGetUrl.bind(backend);
    }
})();
