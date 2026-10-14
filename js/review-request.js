"use strict";
var SrFixReviewRequest;
(function (SrFixReviewRequest) {
    function normalizeMexicanWhatsAppPhone(value) {
        const digits = String(value || '').replace(/\D/g, '');
        if (digits.length === 10)
            return `52${digits}`;
        if (digits.length === 12 && digits.startsWith('52'))
            return digits;
        // Compatibilidad con el formato móvil mexicano antiguo +52 1 seguido de 10 dígitos.
        if (digits.length === 13 && digits.startsWith('521'))
            return `52${digits.slice(3)}`;
        return '';
    }
    SrFixReviewRequest.normalizeMexicanWhatsAppPhone = normalizeMexicanWhatsAppPhone;
    const REVIEW_PLACE_ID = 'ChIJn0CVSNy_YoYRKPaDAcE8nSA';
    function normalizeReviewUrl(value) {
        const candidate = String(value || '').trim();
        try {
            const parsed = new URL(candidate);
            return parsed.protocol === 'https:'
                && parsed.hostname === 'search.google.com'
                && parsed.pathname === '/local/writereview'
                && parsed.search === `?placeid=${REVIEW_PLACE_ID}`
                && !parsed.username
                && !parsed.password
                && !parsed.port
                && !parsed.hash
                ? parsed.toString()
                : '';
        }
        catch {
            return '';
        }
    }
    SrFixReviewRequest.normalizeReviewUrl = normalizeReviewUrl;
    function createReviewContext(deviceValue, repairWorkValue) {
        const sanitizeContext = (value, maxLength) => {
            const text = String(value || '').trim();
            const containsSensitiveData = /(?:\b\d{7,}\b|\b\d{2,}[-\s()]\d{2,}[-\s()]\d{2,}\b|@|https?:\/\/|contrase(?:ñ|n)a|\bpin\b|\bimei\b|serie|folio|domicilio|direcci[oó]n)/i.test(text);
            return text && text.length <= maxLength && !containsSensitiveData ? text : '';
        };
        const safeDevice = sanitizeContext(deviceValue, 80);
        const safeRepairWork = sanitizeContext(repairWorkValue, 180);
        if (safeDevice && safeRepairWork)
            return ` para atender tu ${safeDevice} y realizar ${safeRepairWork}`;
        if (safeDevice)
            return ` para atender tu ${safeDevice}`;
        if (safeRepairWork)
            return ` para realizar ${safeRepairWork}`;
        return '';
    }
    SrFixReviewRequest.createReviewContext = createReviewContext;
    function buildReviewMessage(clientName, device, reviewUrl, repairWork) {
        const safeReviewUrl = normalizeReviewUrl(reviewUrl);
        if (!safeReviewUrl)
            return '';
        const firstName = (String(clientName || '').trim().split(/\s+/)[0] || '')
            .replace(/[^\p{L}'-]/gu, '');
        const greeting = firstName ? `Hola ${firstName},` : 'Hola,';
        const context = createReviewContext(device, repairWork);
        return `${greeting} gracias por confiar en Señor Fix${context}. ¿Nos compartirías una opinión honesta sobre tu experiencia?\n\nAbre este enlace para ver las opiniones del taller. En la ficha, pulsa “Escribir una opinión” y cuéntalo con tus propias palabras; no necesitas copiar un texto predeterminado. Cualquier opinión sincera es bienvenida.\n\n${safeReviewUrl}`;
    }
    SrFixReviewRequest.buildReviewMessage = buildReviewMessage;
    function buildWhatsAppUrl(input) {
        if (String(input.status || '').trim().toLocaleLowerCase('es-MX') !== 'entregado')
            return '';
        const phone = normalizeMexicanWhatsAppPhone(input.phone);
        const reviewUrl = normalizeReviewUrl(input.reviewUrl);
        if (!phone || !reviewUrl)
            return '';
        const message = buildReviewMessage(input.clientName, input.device, reviewUrl, input.repairWork);
        return message ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : '';
    }
    SrFixReviewRequest.buildWhatsAppUrl = buildWhatsAppUrl;
})(SrFixReviewRequest || (SrFixReviewRequest = {}));
