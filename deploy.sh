#!/bin/bash

# Fleeditto Deployment Script
echo "🚀 Deploying Fleeditto to Vercel..."

# Set proper PATH
export PATH="/opt/homebrew/bin:/Users/alex/Library/pnpm:$PATH"

# Deploy to production
vercel deploy --prod --yes

echo "✅ Deployment completed!"
echo "📝 To view logs: vercel logs"
echo "🔄 To redeploy: ./deploy.sh"