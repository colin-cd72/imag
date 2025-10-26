// WebSocket connection for cross-network communication
let ws = null;
let wsReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Broadcast channel for same-browser communication (fallback)
const channel = new BroadcastChannel('image-generator');

// DOM elements
const outputContainer = document.getElementById('outputContainer');
const backgroundImage = document.getElementById('backgroundImage');
const textElement = document.getElementById('textElement');
const outputText = document.getElementById('outputText');
const logoElement = document.getElementById('logoElement');
const logoImage = document.getElementById('logoImage');
const instructions = document.getElementById('instructions');
const hideInstructionsBtn = document.getElementById('hideInstructions');

// State for dragging and resizing
let isDragging = false;
let isResizing = false;
let currentElement = null; // Which element is being manipulated
let currentHandle = null;
let startX = 0;
let startY = 0;
let startLeft = 0;
let startTop = 0;
let startWidth = 0;
let startHeight = 0;
let startFontSize = 48;
let startLogoWidth = 100;

// Initialize WebSocket connection
function initWebSocket() {
    const wsUrl = window.APP_CONFIG.WS_URL;

    try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Connected to server via WebSocket');
            wsReconnectAttempts = 0;
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'update' && data.config) {
                    applyConfiguration(data.config);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');

            // Attempt to reconnect
            if (wsReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                wsReconnectAttempts++;
                console.log(`Reconnecting... (${wsReconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
                setTimeout(initWebSocket, 2000 * wsReconnectAttempts);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

    } catch (error) {
        console.error('Failed to create WebSocket:', error);
    }
}

// Fetch initial configuration from server
async function fetchInitialConfig() {
    try {
        const response = await fetch(`${window.APP_CONFIG.SERVER_URL}/api/config`);
        if (response.ok) {
            const data = await response.json();
            if (data.config) {
                applyConfiguration(data.config);
            }
        }
    } catch (error) {
        console.error('Error fetching initial config:', error);
    }
}

// Initialize
initWebSocket();
fetchInitialConfig();
loadConfiguration();
setupEventListeners();

// Listen for updates from setup page
channel.onmessage = (event) => {
    if (event.data.type === 'update') {
        applyConfiguration(event.data.config);
    }
};

// Only check localStorage if fallback is enabled and WebSocket is not connected
if (window.APP_CONFIG.USE_LOCALSTORAGE_FALLBACK) {
    setInterval(() => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            const config = localStorage.getItem('outputConfig');
            if (config) {
                try {
                    applyConfiguration(JSON.parse(config));
                } catch (e) {
                    console.error('Error parsing config:', e);
                }
            }
        }
    }, 1000);
}

function setupEventListeners() {
    // Hide instructions button
    hideInstructionsBtn.addEventListener('click', () => {
        instructions.style.display = 'none';
    });

    // Dragging for text element
    textElement.addEventListener('mousedown', (e) => startDrag(e, textElement, 'text'));

    // Dragging for logo element
    logoElement.addEventListener('mousedown', (e) => startDrag(e, logoElement, 'logo'));

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);

    // Resizing handles
    const resizeHandles = document.querySelectorAll('.resize-handle');
    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', startResize);
    });

    // Prevent text selection while dragging
    textElement.addEventListener('selectstart', (e) => {
        if (isDragging || isResizing) {
            e.preventDefault();
        }
    });

    logoElement.addEventListener('selectstart', (e) => {
        if (isDragging || isResizing) {
            e.preventDefault();
        }
    });
}

function startDrag(e, element, type) {
    // Check if we're clicking on a resize handle
    if (e.target.classList.contains('resize-handle')) {
        return;
    }

    isDragging = true;
    currentElement = element;
    element.style.cursor = 'grabbing';

    startX = e.clientX;
    startY = e.clientY;

    const rect = element.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;

    e.preventDefault();
}

function drag(e) {
    if (!isDragging && !isResizing) return;

    if (isDragging && currentElement) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        const newLeft = startLeft + deltaX;
        const newTop = startTop + deltaY;

        // Keep within bounds
        const containerRect = outputContainer.getBoundingClientRect();
        const elementRect = currentElement.getBoundingClientRect();

        const maxLeft = containerRect.width - elementRect.width;
        const maxTop = containerRect.height - elementRect.height;

        currentElement.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
        currentElement.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
    } else if (isResizing && currentElement) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        let scaleFactor = 1;

        if (currentHandle.classList.contains('resize-handle-se')) {
            // Bottom-right: increase size as we drag down-right
            scaleFactor = 1 + (deltaX + deltaY) / 400;
        } else if (currentHandle.classList.contains('resize-handle-sw')) {
            // Bottom-left: increase size as we drag down-left
            scaleFactor = 1 + (-deltaX + deltaY) / 400;
        } else if (currentHandle.classList.contains('resize-handle-ne')) {
            // Top-right: increase size as we drag up-right
            scaleFactor = 1 + (deltaX - deltaY) / 400;
        } else if (currentHandle.classList.contains('resize-handle-nw')) {
            // Top-left: increase size as we drag up-left
            scaleFactor = 1 + (-deltaX - deltaY) / 400;
        }

        // Clamp scale factor
        scaleFactor = Math.max(0.2, Math.min(5, scaleFactor));

        // Apply resize based on element type
        if (currentElement === textElement) {
            const newFontSize = Math.round(startFontSize * scaleFactor);
            outputText.style.fontSize = newFontSize + 'px';
        } else if (currentElement === logoElement) {
            const newLogoWidth = Math.round(startLogoWidth * scaleFactor);
            logoImage.style.width = newLogoWidth + 'px';
        }
    }
}

function stopDrag() {
    if (isDragging && currentElement) {
        isDragging = false;
        currentElement.style.cursor = 'grab';
        currentElement = null;
    }
    if (isResizing) {
        isResizing = false;

        // Save the new size as the base for next resize
        if (currentElement === textElement) {
            const currentFontSize = parseInt(window.getComputedStyle(outputText).fontSize);
            startFontSize = currentFontSize;
        } else if (currentElement === logoElement) {
            const currentLogoWidth = parseInt(window.getComputedStyle(logoImage).width);
            startLogoWidth = currentLogoWidth;
        }

        currentHandle = null;
        currentElement = null;
    }
}

function startResize(e) {
    isResizing = true;
    currentHandle = e.target;

    // Determine which element owns this handle
    if (e.target.parentElement === textElement) {
        currentElement = textElement;
        const currentFontSize = parseInt(window.getComputedStyle(outputText).fontSize);
        startFontSize = currentFontSize;
    } else if (e.target.parentElement === logoElement) {
        currentElement = logoElement;
        const currentLogoWidth = parseInt(window.getComputedStyle(logoImage).width);
        startLogoWidth = currentLogoWidth;
    }

    startX = e.clientX;
    startY = e.clientY;

    e.preventDefault();
    e.stopPropagation();
}

function loadConfiguration() {
    const config = localStorage.getItem('outputConfig');
    if (config) {
        try {
            applyConfiguration(JSON.parse(config));
        } catch (e) {
            console.error('Error loading configuration:', e);
        }
    }
}

function applyConfiguration(config) {
    if (!config) return;

    // Apply text
    if (config.text) {
        outputText.textContent = config.text;
    }

    // Apply font family
    if (config.fontFamily) {
        outputText.style.fontFamily = config.fontFamily;
    }

    // Apply custom font if exists
    if (config.customFont) {
        const style = document.createElement('style');
        style.textContent = `
            @font-face {
                font-family: '${config.customFont.name}';
                src: url(${config.customFont.data});
            }
        `;
        document.head.appendChild(style);
        outputText.style.fontFamily = `'${config.customFont.name}', sans-serif`;
    }

    // Apply font size
    if (config.fontSize) {
        outputText.style.fontSize = config.fontSize + 'px';
        startFontSize = parseInt(config.fontSize);
    }

    // Apply color
    if (config.color) {
        outputText.style.color = config.color;
    }

    // Apply stroke
    if (config.useStroke && config.strokeColor && config.strokeWidth) {
        const strokeWidth = config.strokeWidth + 'px';
        outputText.style.webkitTextStroke = `${strokeWidth} ${config.strokeColor}`;
        outputText.style.textStroke = `${strokeWidth} ${config.strokeColor}`;
    } else {
        outputText.style.webkitTextStroke = 'unset';
        outputText.style.textStroke = 'unset';
    }

    // Apply background image
    if (config.backgroundImage) {
        backgroundImage.style.backgroundImage = `url(${config.backgroundImage})`;
    }

    // Apply logo
    if (config.logo && config.logo.data) {
        logoImage.src = config.logo.data;
        logoImage.style.width = config.logo.size + 'px';
        logoImage.style.height = 'auto';
        logoElement.style.display = 'block';
        startLogoWidth = parseInt(config.logo.size);
    } else {
        logoElement.style.display = 'none';
    }
}

// Make elements draggable on load
textElement.style.cursor = 'grab';
logoElement.style.cursor = 'grab';
