// WebSocket connection for cross-network communication
let ws = null;
let wsReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Broadcast channel for same-browser communication (fallback)
const channel = new BroadcastChannel('image-generator');

// State management
let customFontLoaded = null;
let generatedImageUrl = null;
let uploadedLogo = null;

// Initialize WebSocket connection
function initWebSocket() {
    const wsUrl = window.APP_CONFIG.WS_URL;

    try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Connected to server via WebSocket');
            wsReconnectAttempts = 0;
            if (window.APP_CONFIG.DEBUG) {
                showStatus('Connected to server', 'success');
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

// DOM elements
const apiKeyInput = document.getElementById('apiKey');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const imagePromptInput = document.getElementById('imagePrompt');
const generateImageBtn = document.getElementById('generateImage');
const imagePreview = document.getElementById('imagePreview');
const generationStatus = document.getElementById('generationStatus');
const textContentInput = document.getElementById('textContent');
const fontFamilySelect = document.getElementById('fontFamily');
const customFontInput = document.getElementById('customFont');
const customFontName = document.getElementById('customFontName');
const fontSizeInput = document.getElementById('fontSize');
const fontSizeValue = document.getElementById('fontSizeValue');
const textColorInput = document.getElementById('textColor');
const textStrokeCheckbox = document.getElementById('textStroke');
const strokeColorInput = document.getElementById('strokeColor');
const strokeWidthInput = document.getElementById('strokeWidth');
const strokeWidthValue = document.getElementById('strokeWidthValue');
const previewText = document.getElementById('previewText');
const preview = document.getElementById('preview');
const updateOutputBtn = document.getElementById('updateOutput');
const openOutputBtn = document.getElementById('openOutput');
const logoUploadInput = document.getElementById('logoUpload');
const logoFileName = document.getElementById('logoFileName');
const logoSizeInput = document.getElementById('logoSize');
const logoSizeValue = document.getElementById('logoSizeValue');
const logoPreview = document.getElementById('logoPreview');
const previewLogo = document.getElementById('previewLogo');

// Initialize
initWebSocket();
checkApiKey(); // Check if API key is already configured on server
loadSavedSettings();
updatePreview();

// Event Listeners
saveApiKeyBtn.addEventListener('click', saveApiKey);
generateImageBtn.addEventListener('click', generateImage);
customFontInput.addEventListener('change', handleCustomFont);
textContentInput.addEventListener('input', updatePreview);
fontFamilySelect.addEventListener('change', updatePreview);
fontSizeInput.addEventListener('input', () => {
    fontSizeValue.textContent = fontSizeInput.value;
    updatePreview();
});
textColorInput.addEventListener('change', updatePreview);
textStrokeCheckbox.addEventListener('change', updatePreview);
strokeColorInput.addEventListener('change', updatePreview);
strokeWidthInput.addEventListener('input', () => {
    strokeWidthValue.textContent = strokeWidthInput.value;
    updatePreview();
});
updateOutputBtn.addEventListener('click', sendToOutput);
openOutputBtn.addEventListener('click', () => {
    window.open('output.html', '_blank', 'width=1920,height=1080');
});
logoUploadInput.addEventListener('change', handleLogoUpload);
logoSizeInput.addEventListener('input', () => {
    logoSizeValue.textContent = logoSizeInput.value;
    updatePreview();
});

// Functions
async function saveApiKey() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        showStatus('Please enter a valid API key', 'error');
        return;
    }

    try {
        const response = await fetch(`${window.APP_CONFIG.SERVER_URL}/api/set-api-key`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ apiKey })
        });

        const data = await response.json();

        if (response.ok) {
            showStatus('API Key saved on server successfully!', 'success');
        } else {
            throw new Error(data.error || 'Failed to save API key');
        }
    } catch (error) {
        console.error('Error saving API key:', error);
        showStatus(`Error: ${error.message}`, 'error');
    }
}

// Check if API key is configured on server
async function checkApiKey() {
    try {
        const response = await fetch(`${window.APP_CONFIG.SERVER_URL}/api/check-api-key`);
        const data = await response.json();

        if (data.hasKey) {
            apiKeyInput.placeholder = `Key configured: ${data.keyPrefix}`;
        }
    } catch (error) {
        console.error('Error checking API key:', error);
    }
}

async function generateImage() {
    const prompt = imagePromptInput.value.trim();
    if (!prompt) {
        showStatus('Please enter an image description', 'error');
        return;
    }

    generateImageBtn.disabled = true;
    showStatus('Generating image with ChatGPT...', 'loading');

    try {
        // Call server endpoint for image generation
        const response = await fetch(`${window.APP_CONFIG.SERVER_URL}/api/generate-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate image');
        }

        generatedImageUrl = data.imageUrl;

        // Display the image
        imagePreview.innerHTML = `<img src="${generatedImageUrl}" alt="Generated image">`;
        showStatus('Image generated successfully!', 'success');

        // Save to localStorage for output page
        localStorage.setItem('generatedImage', generatedImageUrl);

    } catch (error) {
        console.error('Error generating image:', error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        generateImageBtn.disabled = false;
    }
}

function handleCustomFont(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const fontData = e.target.result;
        const fontName = 'CustomFont_' + Date.now();

        // Create a style element to load the font
        const style = document.createElement('style');
        style.textContent = `
            @font-face {
                font-family: '${fontName}';
                src: url(${fontData});
            }
        `;
        document.head.appendChild(style);

        // Add to font family dropdown
        const option = document.createElement('option');
        option.value = `'${fontName}', sans-serif`;
        option.textContent = file.name;
        option.selected = true;
        fontFamilySelect.appendChild(option);

        customFontLoaded = {
            name: fontName,
            data: fontData,
            filename: file.name
        };

        customFontName.textContent = file.name;
        updatePreview();
    };

    reader.readAsDataURL(file);
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const logoData = e.target.result;

        uploadedLogo = {
            data: logoData,
            filename: file.name,
            size: logoSizeInput.value
        };

        // Display in preview boxes
        logoPreview.innerHTML = `<img src="${logoData}" alt="Logo preview">`;
        logoFileName.textContent = file.name;

        previewLogo.src = logoData;
        previewLogo.style.display = 'block';
        updatePreview();
    };

    reader.readAsDataURL(file);
}

function updatePreview() {
    const text = textContentInput.value || 'Sample Text';
    const fontFamily = fontFamilySelect.value;
    const fontSize = fontSizeInput.value + 'px';
    const color = textColorInput.value;
    const useStroke = textStrokeCheckbox.checked;
    const strokeColor = strokeColorInput.value;
    const strokeWidth = strokeWidthInput.value + 'px';

    previewText.textContent = text;
    previewText.style.fontFamily = fontFamily;
    previewText.style.fontSize = fontSize;
    previewText.style.color = color;

    if (useStroke) {
        previewText.style.webkitTextStroke = `${strokeWidth} ${strokeColor}`;
        previewText.style.textStroke = `${strokeWidth} ${strokeColor}`;
    } else {
        previewText.style.webkitTextStroke = 'unset';
        previewText.style.textStroke = 'unset';
    }

    // Update preview background if image exists
    if (generatedImageUrl) {
        preview.style.backgroundImage = `url(${generatedImageUrl})`;
        preview.style.backgroundSize = 'cover';
        preview.style.backgroundPosition = 'center';
    }

    // Update logo preview
    if (uploadedLogo) {
        previewLogo.style.width = logoSizeInput.value + 'px';
        previewLogo.style.height = 'auto';
    }
}

function sendToOutput() {
    const config = {
        text: textContentInput.value || 'Sample Text',
        fontFamily: fontFamilySelect.value,
        fontSize: fontSizeInput.value,
        color: textColorInput.value,
        useStroke: textStrokeCheckbox.checked,
        strokeColor: strokeColorInput.value,
        strokeWidth: strokeWidthInput.value,
        customFont: customFontLoaded,
        backgroundImage: generatedImageUrl || localStorage.getItem('generatedImage'),
        logo: uploadedLogo
    };

    // Save to localStorage (fallback)
    if (window.APP_CONFIG.USE_LOCALSTORAGE_FALLBACK) {
        localStorage.setItem('outputConfig', JSON.stringify(config));
    }

    // Send via WebSocket for cross-network communication
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'update',
            config: config
        }));
        showStatus('Configuration sent to output page via server!', 'success');
    } else {
        // Fallback to REST API
        sendViaRestAPI(config);
    }

    // Also broadcast locally (for same-browser tabs)
    channel.postMessage({
        type: 'update',
        config: config
    });
}

// Fallback to REST API if WebSocket is not available
async function sendViaRestAPI(config) {
    try {
        const response = await fetch(`${window.APP_CONFIG.SERVER_URL}/api/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            showStatus('Configuration sent to output page via API!', 'success');
        } else {
            throw new Error('Failed to send configuration');
        }
    } catch (error) {
        console.error('Error sending via REST API:', error);
        showStatus('Using local storage (server unavailable)', 'loading');
    }
}

function loadSavedSettings() {
    const savedConfig = localStorage.getItem('outputConfig');
    if (savedConfig) {
        try {
            const config = JSON.parse(savedConfig);
            textContentInput.value = config.text || '';
            fontSizeInput.value = config.fontSize || 48;
            fontSizeValue.textContent = config.fontSize || 48;
            textColorInput.value = config.color || '#ffffff';
            textStrokeCheckbox.checked = config.useStroke || false;
            strokeColorInput.value = config.strokeColor || '#000000';
            strokeWidthInput.value = config.strokeWidth || 2;
            strokeWidthValue.textContent = config.strokeWidth || 2;

            if (config.backgroundImage) {
                generatedImageUrl = config.backgroundImage;
                imagePreview.innerHTML = `<img src="${generatedImageUrl}" alt="Generated image">`;
            }

            if (config.logo) {
                uploadedLogo = config.logo;
                logoFileName.textContent = config.logo.filename;
                logoSizeInput.value = config.logo.size || 100;
                logoSizeValue.textContent = config.logo.size || 100;
                logoPreview.innerHTML = `<img src="${config.logo.data}" alt="Logo preview">`;
                previewLogo.src = config.logo.data;
                previewLogo.style.display = 'block';
            }
        } catch (e) {
            console.error('Error loading saved settings:', e);
        }
    }
}

function showStatus(message, type) {
    generationStatus.textContent = message;
    generationStatus.className = 'status-message ' + type;
    setTimeout(() => {
        generationStatus.textContent = '';
        generationStatus.className = 'status-message';
    }, 5000);
}
