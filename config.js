// Configuration file for client-side
// Update this file with your server URL when deploying

const CONFIG = {
    // Server URL - automatically uses current domain
    // Production: https://imag.4tmrw.net
    // Development: http://localhost:3000
    SERVER_URL: window.location.origin,

    // WebSocket URL - automatically derived from SERVER_URL
    get WS_URL() {
        return this.SERVER_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    },

    // Fallback to localStorage if WebSocket fails
    USE_LOCALSTORAGE_FALLBACK: true,

    // Enable debug logging
    DEBUG: false
};

// Make config globally available
window.APP_CONFIG = CONFIG;
