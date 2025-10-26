# Image Generator with ChatGPT/DALL-E Integration

A web-based image generator that creates 16:9 graphics with AI-generated backgrounds, customizable text, and logos. Perfect for sports broadcasts, presentations, and digital signage.

**Live Demo**: [https://imag.4tmrw.net](https://imag.4tmrw.net)

**Repository**: [https://github.com/colin-cd72/imag](https://github.com/colin-cd72/imag)

## Features

- **AI Image Generation**: Generate backgrounds using ChatGPT's DALL-E 3
- **16:9 Output**: Perfect aspect ratio for displays and broadcasts
- **Text Customization**: Add text with custom fonts, colors, sizes, and strokes
- **Logo Upload**: Add and position logos with drag-and-drop
- **Live Editing**: Drag and resize text/logos in real-time on the output page
- **Cross-Network**: Setup and output pages can run on different devices/networks
- **Real-time Updates**: WebSocket-based communication for instant updates

## Quick Start

### Installation

1. **Install Node.js** (if not already installed)
   - Download from [nodejs.org](https://nodejs.org/)
   - Requires Node.js 14 or higher

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start the Server**
   ```bash
   npm start
   ```

4. **Access the Application**
   - Setup Page: `http://localhost:3000/setup.html`
   - Output Page: `http://localhost:3000/output.html`

## Usage

### 1. Setup Page

1. **Enter OpenAI API Key**
   - Get your key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Enter it in the API Key field and click "Save Key"

2. **Generate Background Image**
   - Describe your desired image in the text area
   - Click "Generate Image with ChatGPT"
   - Wait 10-20 seconds for DALL-E to create the image

3. **Add Text**
   - Enter your text
   - Choose or upload a font (.ttf, .otf, .woff)
   - Adjust size, color, and stroke

4. **Upload Logo** (optional)
   - Click "Upload Logo" and select an image
   - Adjust the size slider

5. **Update Output**
   - Click "Update Output Page" to send changes
   - Click "Open Output Page" to open the display

### 2. Output Page

- **Drag** text or logo to reposition
- **Resize** by dragging the blue corner handles
- Perfect 16:9 aspect ratio maintained automatically

## Network Deployment

### Local Network Setup

1. **Find Your Server IP**
   - When you run `npm start`, the server displays available network addresses
   - Look for something like: `http://192.168.1.100:3000`

2. **Access from Other Devices**
   - **Setup Page**: `http://[SERVER-IP]:3000/setup.html`
   - **Output Page**: `http://[SERVER-IP]:3000/output.html`
   - Replace `[SERVER-IP]` with your actual IP address

### Firewall Configuration

If other devices can't connect:

**Windows:**
```bash
netsh advfirewall firewall add rule name="Image Generator" dir=in action=allow protocol=TCP localport=3000
```

**Mac:**
- System Preferences → Security & Privacy → Firewall → Firewall Options
- Add Node.js and allow incoming connections

**Linux:**
```bash
sudo ufw allow 3000/tcp
```

### Production Deployment

#### Using a Custom Port
```bash
PORT=8080 npm start
```

#### Using a Process Manager (PM2)
```bash
npm install -g pm2
pm2 start server.js --name image-generator
pm2 save
pm2 startup
```

#### Using Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t image-generator .
docker run -p 3000:3000 image-generator
```

#### Cloud Deployment

**Heroku:**
```bash
git init
git add .
git commit -m "Initial commit"
heroku create
git push heroku main
```

**DigitalOcean/AWS/Azure:**
1. Deploy the application to your server
2. Install Node.js and dependencies
3. Run with PM2 or as a systemd service
4. Configure reverse proxy (nginx) if needed

### SSL/HTTPS Setup (Optional)

For secure connections, use a reverse proxy like nginx:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Configuration

Edit `config.js` to customize settings:

```javascript
const CONFIG = {
    SERVER_URL: 'http://your-server-ip:3000',
    USE_LOCALSTORAGE_FALLBACK: true,
    DEBUG: false
};
```

## Architecture

- **server.js**: Node.js/Express server with WebSocket support
- **setup.html/setup.js**: Control interface for configuration
- **output.html/output.js**: 16:9 display page with live editing
- **config.js**: Client-side configuration
- **styles.css**: Styling for both pages

### Communication Flow

1. Setup page connects to server via WebSocket
2. User makes changes on setup page
3. Changes sent to server via WebSocket (or REST API fallback)
4. Server broadcasts to all connected output pages
5. Output pages update in real-time

### Fallback Mechanisms

- WebSocket → REST API → localStorage
- Ensures functionality even if server is unavailable
- BroadcastChannel for same-browser communication

## Troubleshooting

### Output page not updating
- Check that both pages are connected to the same server
- Open browser console and look for WebSocket errors
- Verify firewall isn't blocking port 3000

### Images not generating
- Verify your OpenAI API key is valid
- Check you have credits in your OpenAI account
- Open browser console for error messages

### Custom fonts not loading
- Use .ttf, .otf, .woff, or .woff2 formats
- Ensure font file is less than 5MB

### Server won't start
- Check port 3000 isn't already in use
- Try a different port: `PORT=8080 npm start`
- Verify Node.js version is 14+: `node --version`

## File Structure

```
IMAG Generator/
├── server.js              # Backend server
├── package.json           # Dependencies
├── config.js             # Client configuration
├── setup.html            # Setup interface
├── setup.js              # Setup logic
├── output.html           # Display interface
├── output.js             # Display logic
├── styles.css            # Styling
└── README.md             # This file
```

## API Reference

### WebSocket API

**Connect:**
```javascript
const ws = new WebSocket('ws://localhost:3000');
```

**Send Update:**
```javascript
ws.send(JSON.stringify({
    type: 'update',
    config: { /* configuration object */ }
}));
```

### REST API

**POST /api/update**
```bash
curl -X POST http://localhost:3000/api/update \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello World", "fontSize": 48}'
```

**GET /api/config**
```bash
curl http://localhost:3000/api/config
```

**GET /api/health**
```bash
curl http://localhost:3000/api/health
```

## License

MIT License

## Support

For issues, questions, or contributions, please open an issue on the repository.

## Credits

- Built with Express.js and WebSocket (ws)
- AI image generation powered by OpenAI's DALL-E 3
- Font support via CSS @font-face
