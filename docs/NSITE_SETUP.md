# nsite Setup Guide - Nostr Creator Economy

This guide walks you through setting up nsite deployment for the Nostr Creator Economy platform.

## 🎯 What is nsite?

nsite is a revolutionary tool that hosts static websites directly on the Nostr network. Instead of traditional web servers, your site is published as Nostr events and distributed across relays, making it:

- **Truly Decentralized**: No central server required
- **Censorship Resistant**: Distributed across multiple relays
- **Permanent**: Content persists as long as relays store it
- **Fast**: Served from multiple locations simultaneously

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+ installed
- A Nostr private key (nsec format)
- Basic familiarity with command line

### 2. One-Command Deployment

```bash
# Set your Nostr private key
export NOSTR_PRIVATE_KEY="nsec1your_private_key_here"

# Deploy everything
npm run deploy:nsite:full
```

That's it! Your site will be live on Nostr.

## 📋 Detailed Setup

### Step 1: Get a Nostr Private Key

If you don't have a Nostr key yet:

```bash
# Generate a new key pair
npx @noble/secp256k1 generate

# Or use any Nostr client to create an account
# Popular options: Damus, Amethyst, Iris, Snort
```

**Important**: Keep your private key secure and never share it publicly.

### Step 2: Configure Environment

```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export NOSTR_PRIVATE_KEY="nsec1your_private_key_here"

# Or create a .env file (don't commit this!)
echo "NOSTR_PRIVATE_KEY=nsec1your_private_key_here" > .env
```

### Step 3: Initialize nsite (First Time)

```bash
# Initialize nsite configuration
npm run nsite:init
```

This creates the nsite configuration and sets up your publishing identity.

### Step 4: Build and Deploy

```bash
# Build the application
npm run build

# Deploy to Nostr
npm run nsite:publish
```

## ⚙️ Configuration Options

### Basic Configuration

Edit `nsite.config.js` to customize your deployment:

```javascript
export default {
  name: "Your Site Name",
  description: "Your site description",
  
  nostr: {
    // Add more relays for better distribution
    relays: [
      "wss://relay.nostr.band",
      "wss://relay.damus.io",
      "wss://nos.lol",
      "wss://relay.snort.social",
      "wss://nostr.wine",
      "wss://relay.primal.net",  // Add more relays
      "wss://relay.current.fyi"
    ],
    
    // Customize tags for better discoverability
    tags: [
      ["t", "your-project"],
      ["t", "nostr"],
      ["t", "web3"],
      ["subject", "Your Project Title"]
    ]
  }
};
```

### Advanced Configuration

```javascript
export default {
  // ... basic config
  
  build: {
    source: "./dist",
    output: "./nsite-dist",
    // Exclude files from deployment
    exclude: ["*.map", "*.txt"]
  },
  
  site: {
    // Custom domain (if supported)
    domain: "yoursite.nostr",
    
    // Additional metadata
    meta: {
      "og:image": "https://yoursite.com/preview.jpg",
      "twitter:card": "summary_large_image"
    }
  }
};
```

## 🌐 Accessing Your Deployed Site

### Through Nostr Clients

1. **njump.me**: `https://njump.me/npub1your_public_key`
2. **nostr.band**: Search for your tags or npub
3. **Native Nostr clients**: Any client supporting NIP-23 (long-form content)

### Finding Your Site

```bash
# Get your public key (npub)
npx @noble/secp256k1 pubkey nsec1your_private_key

# Search on nostr.band
# Visit: https://nostr.band/search?q=creator-economy
```

## 🔄 Updates and Maintenance

### Updating Your Site

```bash
# Make changes to your code
# Build and redeploy
npm run deploy:nsite:full
```

### Managing Multiple Versions

nsite publishes new events for updates, so:
- Old versions remain accessible
- New versions become the "latest"
- Clients typically show the most recent version

### Monitoring Deployment

```bash
# Check deployment status
npx nsite status

# List published events
npx nsite list

# Verify on relays
npx nsite verify
```

## 🛠 Troubleshooting

### Common Issues

#### 1. Key Format Errors
```bash
# Ensure your key starts with "nsec1"
echo $NOSTR_PRIVATE_KEY
# Should output: nsec1...
```

#### 2. Relay Connection Issues
```bash
# Test relay connectivity
npx nsite test-relays

# Try with fewer relays initially
# Edit nsite.config.js and use only 1-2 relays
```

#### 3. Build Failures
```bash
# Clean build
rm -rf dist/ nsite-dist/
npm run build
```

#### 4. Publishing Failures
```bash
# Enable debug mode
DEBUG=nsite* npm run nsite:publish

# Check relay status
curl -I wss://relay.nostr.band
```

### Debug Commands

```bash
# Verbose logging
DEBUG=nsite* npm run deploy:nsite

# Check nsite version
npx nsite --version

# Validate configuration
npx nsite validate-config
```

## 🔐 Security Best Practices

### Key Management

1. **Use Environment Variables**: Never hardcode keys in files
2. **Separate Keys**: Consider using a dedicated publishing key
3. **Backup Keys**: Store securely offline
4. **Rotate Keys**: Change keys periodically for security

### CI/CD Security

```yaml
# GitHub Actions secrets
NOSTR_PRIVATE_KEY: ${{ secrets.NOSTR_PRIVATE_KEY }}

# Never log private keys
- name: Deploy
  env:
    NOSTR_PRIVATE_KEY: ${{ secrets.NOSTR_PRIVATE_KEY }}
  run: npm run deploy:nsite
```

## 📊 Monitoring and Analytics

### Deployment Verification

1. **Check Relays**: Verify events appear on configured relays
2. **Search Tags**: Find your site using configured hashtags
3. **Client Testing**: Test access through different Nostr clients

### Performance Monitoring

```bash
# Check relay response times
npx nsite benchmark-relays

# Monitor event propagation
npx nsite monitor-events
```

## 🌟 Advanced Features

### Custom Domains

Some nsite implementations support custom domains:

```javascript
// nsite.config.js
export default {
  site: {
    domain: "creator-economy.nostr"
  }
};
```

### Content Optimization

```javascript
// Optimize for nsite
export default {
  build: {
    // Compress content
    compress: true,
    
    // Split large files
    maxFileSize: "1MB",
    
    // Optimize images
    optimizeImages: true
  }
};
```

### Multi-Environment Deployment

```bash
# Production
NOSTR_ENV=production npm run deploy:nsite

# Staging
NOSTR_ENV=staging npm run deploy:nsite
```

## 🆘 Getting Help

### Resources

- [nsite GitHub](https://github.com/lez/nsite)
- [Nostr Protocol](https://nostr.com)
- [NIP-23 Specification](https://github.com/nostr-protocol/nips/blob/master/23.md)

### Community Support

- Nostr development Telegram groups
- GitHub issues for nsite
- Nostr developer Discord servers

### Debugging Checklist

- [ ] Nostr private key is valid and in nsec format
- [ ] Relays are accessible and responding
- [ ] Build completed successfully (dist/ directory exists)
- [ ] nsite configuration is valid
- [ ] Network connectivity is stable
- [ ] No firewall blocking relay connections

---

## 🎉 Success!

Once deployed, your Nostr Creator Economy platform will be:

✅ **Decentralized**: Hosted across multiple Nostr relays  
✅ **Censorship Resistant**: No single point of failure  
✅ **Permanent**: Content persists on the Nostr network  
✅ **Fast**: Served from distributed locations  
✅ **Discoverable**: Found through Nostr search and tags  

Welcome to the decentralized web! 🌐⚡