#!/bin/bash

# Deployment script for CloudPanel
# Domain: https://imag.4tmrw.net

echo "🚀 Image Generator Deployment Script"
echo "===================================="

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Create logs directory
echo "📝 Creating logs directory..."
mkdir -p logs

# Start with PM2
echo "▶️  Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Show status
echo "✅ Deployment complete!"
echo ""
echo "Application Status:"
pm2 status

echo ""
echo "🌐 Your application should be available at:"
echo "   Setup:  https://imag.4tmrw.net/setup.html"
echo "   Output: https://imag.4tmrw.net/output.html"
echo ""
echo "📊 View logs: pm2 logs image-generator"
echo "🔄 Restart: pm2 restart image-generator"
echo "⏹️  Stop: pm2 stop image-generator"
