const CONFIG = {
    API_URL: window.SRFIX_API_URL || 'https://script.google.com/macros/s/AKfycbwsGiHsxz32YiaSLbNBiq5-pmYvHOdKNYc8VqG37WkVz4VkAN_ZbxF8SKgextnpdPxx/exec',
    APP_URL: window.SRFIX_APP_URL || 'https://serviciosdigitalesmx.github.io/Sr-Fix',
    FRONT_PASSWORD: window.SRFIX_FRONT_PASSWORD || 'Admin1'
};
window.CONFIG = CONFIG;

function srfixGetPublicAppBaseUrl() {
    return 'https://serviciosdigitalesmx.github.io/Sr-Fix';
}

function srfixBuildPortalUrl(folio) {
    const cleanFolio = String(folio || '').trim().toUpperCase();
    if (!cleanFolio) return '';
    return `https://serviciosdigitalesmx.github.io/Sr-Fix/portal-cliente.html?folio=${encodeURIComponent(cleanFolio)}`;
}
