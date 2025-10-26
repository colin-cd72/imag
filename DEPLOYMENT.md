# CloudPanel Deployment Guide

## Prerequisites
- CloudPanel installed on your server
- Node.js site created in CloudPanel
- Git repository for your code (GitHub, GitLab, etc.)

## Step-by-Step Deployment

### 1. Prepare Your Code

Upload your code to your Git repository:

```bash
# In your local project directory
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/colin-cd72/imag.git
git push -u origin main
```

### 2. Create Node.js Site in CloudPanel

1. Log into CloudPanel
2. Go to **Sites** → **Add Site**
3. Choose **Node.js**
4. Fill in:
   - **Domain Name**: imag.4tmrw.net
   - **Node.js Version**: 18.x or higher
   - **App Port**: 3030
   - **Site User**: imag

### 3. Deploy via SSH

SSH into your CloudPanel server:

```bash
ssh your-username@your-server-ip
```

Navigate to your site directory:

```bash
cd /home/imag/htdocs/imag.4tmrw.net
```

Clone your repository:

```bash
git clone https://github.com/colin-cd72/imag.git .
```

### 4. Install Dependencies

```bash
npm install --production
```

### 5. Configure Environment Variables

Create `.env` file:

```bash
nano .env
```

Add your configuration:

```
PORT=3000
OPENAI_API_KEY=sk-your-actual-key-here
ALLOW_CORS=true
```

Save and exit (Ctrl+X, Y, Enter)

### 6. Set Up PM2 (Process Manager)

CloudPanel typically uses PM2. Create an ecosystem file:

```bash
nano ecosystem.config.js
```

Add:

```javascript
module.exports = {
  apps: [{
    name: 'image-generator',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

Start the application:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 7. Configure Nginx (via CloudPanel)

CloudPanel should auto-configure Nginx, but verify the proxy settings:

Go to CloudPanel → Your Site → **Vhost** tab

Ensure it includes:

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

### 8. Enable SSL/HTTPS

In CloudPanel:
1. Go to your site
2. Click **SSL/TLS**
3. Choose **Let's Encrypt**
4. Click **Install**

### 9. Update config.js for Production

Edit `config.js` to use your domain:

```javascript
const CONFIG = {
    SERVER_URL: window.location.origin, // Auto-detects domain
    // ... rest of config
};
```

Or manually set:

```javascript
SERVER_URL: 'https://your-domain.com',
```

### 10. Verify Deployment

Visit your site:
- **Setup**: https://imag.4tmrw.net/setup.html
- **Output**: https://imag.4tmrw.net/output.html

Check PM2 status:

```bash
pm2 status
pm2 logs image-generator
```

## Post-Deployment

### Update Your Application

```bash
cd /home/imag/htdocs/imag.4tmrw.net
git pull
npm install
pm2 restart image-generator
```

### Monitor Application

```bash
pm2 monit
pm2 logs image-generator --lines 100
```

### Set Firewall Rules

Ensure port 3000 is not directly accessible from outside (only through Nginx):

```bash
sudo ufw status
# Port 3000 should NOT be listed
# Only ports 80, 443, 22 should be open
```

## Troubleshooting

### Application Won't Start

```bash
pm2 logs image-generator
# Check for errors
```

### WebSocket Issues

Ensure Nginx vhost has proper WebSocket headers (see step 7)

### API Key Not Persisting

The API key is stored in server memory. For persistence across restarts, set it in `.env`:

```
OPENAI_API_KEY=sk-your-key
```

### Can't Connect from Output Page

1. Check browser console for errors
2. Verify WebSocket URL in config.js
3. Check that SSL is enabled for WSS connections

## Performance Optimization

### Enable Gzip Compression

In Nginx vhost, add:

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
```

### Use Multiple Instances

In `ecosystem.config.js`:

```javascript
instances: 'max', // Uses all CPU cores
exec_mode: 'cluster'
```

### Set Memory Limits

```javascript
max_memory_restart: '500M'
```

## Backup Strategy

### Database-Free Architecture
This app doesn't use a database, but back up:

1. **Environment variables** (.env file)
2. **Custom configurations** (config.js)
3. **Uploaded content** (if you add file storage)

### Automated Git Backups

```bash
# Create backup script
nano ~/backup.sh
```

```bash
#!/bin/bash
cd /home/your-site-user/htdocs/your-domain.com
git add -A
git commit -m "Auto backup $(date)"
git push
```

```bash
chmod +x ~/backup.sh
crontab -e
# Add: 0 2 * * * ~/backup.sh
```

## Security Checklist

- ✅ SSL/HTTPS enabled
- ✅ API key stored in .env (not in code)
- ✅ Firewall configured (only 80, 443, 22)
- ✅ PM2 running as non-root user
- ✅ Regular server updates
- ✅ Strong server passwords/keys
- ✅ CloudPanel security features enabled

## Support

For CloudPanel-specific issues:
- Documentation: https://www.cloudpanel.io/docs/
- Forum: https://community.cloudpanel.io/

For application issues:
- Check server logs: `pm2 logs`
- Check browser console
- Verify API key is set correctly
