# Paper Crate Deployment Guide

This guide covers deploying Paper Crate to various platforms, with a focus on Nostr-based deployment using Blossom servers.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Nostr Deployment (Recommended)](#nostr-deployment-recommended)
- [Traditional Hosting](#traditional-hosting)
- [Environment Configuration](#environment-configuration)
- [CI/CD Setup](#cicd-setup)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

## Overview

Paper Crate can be deployed in multiple ways:

1. **Nostr Deployment** (Recommended): Deploy to Blossom servers for decentralized hosting
2. **Traditional Hosting**: Deploy to conventional web hosts (Vercel, Netlify, etc.)
3. **Self-Hosted**: Deploy to your own infrastructure

## Prerequisites

- Node.js 18+ and npm
- Git repository access
- Nostr keypair for deployment (for Nostr deployment)
- Lightning wallet for payments (optional but recommended)

## Nostr Deployment (Recommended)

Nostr deployment uses Blossom servers for decentralized file hosting, providing censorship resistance and global availability.

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Application

```bash
npm run build
```

This creates optimized production files in the `dist/` directory.

### 3. Deploy to Nostr

```bash
npm run deploy
```

Or use the specific Nostr deployment command:

```bash
npm run nostr:deploy
```

### 4. Deployment Process

The deployment script will:

1. **Build the application** with production optimizations
2. **Upload files** to multiple Blossom servers for redundancy
3. **Generate deployment URL** in the format: `https://npub[...].nostrdeploy.com`
4. **Verify deployment** by checking file availability

### 5. Deployment Output

```
🚀 Starting Deployment

✅ Using existing configuration
📄 Deploying 6 files from ./dist
📤 Uploading 6 files to 4 Blossom server(s)...
✅ Successfully uploaded all 6 files

🎉 Deployment Successful!

  🌐 URL: https://npub13cle7rncdmf3lkqj6pz9q9z8ue4cpfauxa62msy65c6v7ym9rwxscndxjg.nostrdeploy.com
  📁 Files: 6
  📅 Deployed: 7/10/2025, 2:08:22 AM
```

### Configuration Options

The deployment uses `nostr-deploy-cli` with these default settings:

- **Multiple Blossom servers** for redundancy
- **Automatic file optimization** and compression
- **Content-addressed storage** for integrity
- **Global CDN** distribution

### Custom Deployment Configuration

Create a `nsite.config.js` file to customize deployment:

```javascript
module.exports = {
  // Custom Blossom servers
  servers: [
    'https://blossom.primal.net',
    'https://blossom.nostr.band',
    // Add your preferred servers
  ],
  
  // File optimization
  optimize: true,
  
  // Compression
  gzip: true,
  
  // Custom domain (if supported)
  domain: 'your-custom-domain.com'
};
```

## Traditional Hosting

### Vercel Deployment

1. **Connect Repository**
   ```bash
   npm i -g vercel
   vercel login
   vercel
   ```

2. **Environment Variables**
   Set these in Vercel dashboard:
   ```
   NODE_ENV=production
   VITE_DEFAULT_RELAY=wss://relay.nostr.band
   ```

3. **Build Configuration**
   Vercel auto-detects Vite configuration. Ensure `vercel.json` exists:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "framework": "vite"
   }
   ```

### Netlify Deployment

1. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`

2. **Redirects Configuration**
   Create `public/_redirects`:
   ```
   /*    /index.html   200
   ```

3. **Environment Variables**
   ```
   NODE_ENV=production
   VITE_DEFAULT_RELAY=wss://relay.nostr.band
   ```

### GitHub Pages

1. **Workflow Configuration**
   The repository includes `.github/workflows/deploy-nsite.yml` for automated deployment.

2. **Manual Deployment**
   ```bash
   npm run build
   npx gh-pages -d dist
   ```

## Environment Configuration

### Production Environment Variables

```bash
# Application
NODE_ENV=production
VITE_APP_NAME=Paper Crate
VITE_APP_VERSION=1.0.0

# Nostr Configuration
VITE_DEFAULT_RELAY=wss://relay.nostr.band
VITE_BACKUP_RELAYS=wss://relay.damus.io,wss://relay.primal.net

# Security
VITE_CSP_NONCE=random-nonce-value
VITE_ENABLE_MONITORING=true

# Features
VITE_ENABLE_PAYMENTS=true
VITE_ENABLE_ANALYTICS=false
```

### Build Optimization

The production build includes:

- **Tree shaking** for minimal bundle size
- **Code splitting** for faster loading
- **Asset optimization** (images, fonts, CSS)
- **Service worker** for offline functionality
- **Compression** (Gzip/Brotli)

### Performance Configuration

```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          nostr: ['@nostrify/nostrify', 'nostr-tools'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    },
    target: 'esnext',
    minify: 'terser',
    sourcemap: false
  }
});
```

## CI/CD Setup

### GitHub Actions Workflow

```yaml
name: Deploy to Nostr

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build application
      run: npm run build
    
    - name: Deploy to Nostr
      run: npm run deploy
      env:
        NOSTR_PRIVATE_KEY: ${{ secrets.NOSTR_PRIVATE_KEY }}
```

### Deployment Secrets

Configure these secrets in your repository:

```
NOSTR_PRIVATE_KEY=your_deployment_private_key_hex
LIGHTNING_ADDRESS=your_lightning_address_for_tips
```

### Automated Testing

```yaml
- name: Run Security Tests
  run: npm run test:security

- name: Check Bundle Size
  run: npm run analyze

- name: Validate Build
  run: npm run validate:build
```

## Monitoring & Maintenance

### Health Checks

Monitor deployment health with:

```bash
# Check if site is accessible
curl -I https://your-deployed-site.com

# Verify API endpoints
curl https://your-deployed-site.com/api/health

# Test Nostr connectivity
npm run test:nostr
```

### Performance Monitoring

- **Core Web Vitals** tracking
- **Bundle size** monitoring
- **Load time** analysis
- **Error tracking** with Sentry (optional)

### Update Strategy

1. **Test changes** in development
2. **Run test suite** to ensure stability
3. **Deploy to staging** environment first
4. **Gradual rollout** to production
5. **Monitor metrics** after deployment

### Rollback Procedure

For Nostr deployments, rollback by:

1. **Identify previous deployment** hash
2. **Redeploy previous version**:
   ```bash
   git checkout previous-commit
   npm run deploy
   ```
3. **Verify rollback** success
4. **Update monitoring** to track issues

## Troubleshooting

### Common Deployment Issues

#### Build Failures

```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Nostr Upload Failures

```bash
# Check Blossom server status
curl -I https://blossom.primal.net/health

# Retry with different servers
npm run deploy -- --servers="https://blossom.nostr.band"
```

#### Browser Compatibility Issues

```bash
# Check polyfill configuration
npm run analyze:polyfills

# Test in different browsers
npm run test:browser
```

### Performance Issues

#### Large Bundle Size

```bash
# Analyze bundle composition
npm run analyze

# Check for duplicate dependencies
npm run duplicate-check

# Optimize imports
npm run optimize:imports
```

#### Slow Loading

- Enable compression on hosting platform
- Optimize images and assets
- Implement lazy loading
- Use CDN for static assets

### Security Issues

#### CSP Violations

Check browser console for CSP errors and update headers:

```javascript
// Update CSP in index.html
<meta http-equiv="content-security-policy" content="...">
```

#### Mixed Content Warnings

Ensure all resources use HTTPS:

```bash
# Check for HTTP resources
grep -r "http://" dist/
```

### Nostr-Specific Issues

#### Relay Connectivity

```bash
# Test relay connection
npx nostr-tools relay-test wss://relay.nostr.band
```

#### Event Publishing Failures

```bash
# Verify Nostr keys
npx nostr-tools key-validate your-private-key

# Test event creation
npm run test:nostr:events
```

## Support

For deployment issues:

1. **Check logs** for error details
2. **Consult documentation** for specific platforms
3. **Test locally** to isolate issues
4. **Contact support** for platform-specific problems

### Useful Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Deploy to Nostr
npm run deploy

# Run all tests
npm test

# Analyze bundle
npm run analyze
```