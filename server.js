const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const PORT = process.env.PORT || 3000;
const ALLOW_CORS = process.env.ALLOW_CORS !== 'false';

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

if (ALLOW_CORS) {
    app.use(cors());
}

// Store the latest configuration and API key
let latestConfig = null;
let openaiApiKey = process.env.OPENAI_API_KEY || null;

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    console.log('New client connected from:', req.socket.remoteAddress);

    // Send the latest config to newly connected clients
    if (latestConfig) {
        ws.send(JSON.stringify({
            type: 'update',
            config: latestConfig
        }));
    }

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'update') {
                // Store the latest configuration
                latestConfig = data.config;
                console.log('Configuration updated');

                // Broadcast to all connected clients
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'update',
                            config: data.config
                        }));
                    }
                });
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// REST API endpoint for updates (fallback)
app.post('/api/update', (req, res) => {
    try {
        latestConfig = req.body;
        console.log('Configuration updated via REST API');

        // Broadcast to all WebSocket clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'update',
                    config: latestConfig
                }));
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating configuration:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
});

// GET endpoint to retrieve latest config
app.get('/api/config', (req, res) => {
    res.json({
        config: latestConfig || null
    });
});

// API Key endpoints
app.post('/api/set-api-key', (req, res) => {
    try {
        const { apiKey } = req.body;
        if (!apiKey || !apiKey.startsWith('sk-')) {
            return res.status(400).json({ error: 'Invalid API key format' });
        }

        openaiApiKey = apiKey;
        console.log('OpenAI API key updated');

        res.json({ success: true, message: 'API key saved on server' });
    } catch (error) {
        console.error('Error saving API key:', error);
        res.status(500).json({ error: 'Failed to save API key' });
    }
});

app.get('/api/check-api-key', (req, res) => {
    res.json({
        hasKey: !!openaiApiKey,
        keyPrefix: openaiApiKey ? openaiApiKey.substring(0, 10) + '...' : null
    });
});

// Image generation endpoint (server-side)
app.post('/api/generate-image', async (req, res) => {
    try {
        if (!openaiApiKey) {
            return res.status(400).json({ error: 'OpenAI API key not configured on server' });
        }

        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Image prompt is required' });
        }

        console.log('Generating image with DALL-E 3...');

        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: prompt,
                n: 1,
                size: '1792x1024',
                quality: 'standard'
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to generate image');
        }

        const data = await response.json();
        const imageUrl = data.data[0].url;

        console.log('Image generated successfully');

        res.json({
            success: true,
            imageUrl: imageUrl
        });

    } catch (error) {
        console.error('Error generating image:', error);
        res.status(500).json({ error: error.message || 'Failed to generate image' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        connections: wss.clients.size,
        hasApiKey: !!openaiApiKey,
        timestamp: new Date().toISOString()
    });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║  Image Generator Server                                  ║
╠══════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}              ║
║  WebSocket endpoint: ws://localhost:${PORT}               ║
║                                                          ║
║  Setup Page:  http://localhost:${PORT}/setup.html         ║
║  Output Page: http://localhost:${PORT}/output.html        ║
║                                                          ║
║  Active connections: ${wss.clients.size}                             ║
╚══════════════════════════════════════════════════════════╝
    `);

    // Display network interfaces
    const networkInterfaces = require('os').networkInterfaces();
    console.log('\nAvailable on your network:');
    Object.keys(networkInterfaces).forEach((interfaceName) => {
        networkInterfaces[interfaceName].forEach((iface) => {
            if (iface.family === 'IPv4' && !iface.internal) {
                console.log(`  → http://${iface.address}:${PORT}`);
            }
        });
    });
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
