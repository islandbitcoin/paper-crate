# 🚀 Deploy Nostr Creator Economy to Nostr

This guide will help you deploy the Nostr Creator Economy platform to the Nostr network using nsite, making it truly decentralized and censorship-resistant.

## 🎯 Quick Deploy (TL;DR)

```bash
# 1. Set your Nostr private key
export NOSTR_PRIVATE_KEY="nsec1your_private_key_here"

# 2. Deploy everything
npm run deploy:nsite:full

# 3. Verify deployment
npm run nsite:verify
```

Your site is now live on Nostr! 🎉

## 📋 Prerequisites

### 1. Nostr Identity

You need a Nostr private key (nsec format). If you don't have one:

**Option A: Generate a new key**
```bash
# Install nostr-tools globally
npm install -g nostr-tools

# Generate new keypair
npx @noble/secp256k1 generate
```

**Option B: Use existing Nostr account**
- Export your private key from Damus, Amethyst, Iris, or any Nostr client
- Format should be `nsec1...`

### 2. Environment Setup

```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export NOSTR_PRIVATE_KEY="nsec1your_private_key_here"

# Reload your shell
source ~/.bashrc  # or ~/.zshrc
```

## 🛠 Deployment Methods

### Method 1: Full Automated Deployment (Recommended)

```bash
# This script handles everything: build, test, deploy, verify
npm run deploy:nsite:full
```

### Method 2: Step-by-Step Deployment

```bash
# 1. Install dependencies
npm install

# 2. Run tests
npm test

# 3. Build application
npm run build

# 4. Deploy to Nostr
npm run nsite:publish

# 5. Verify deployment
npm run nsite:verify
```

### Method 3: Manual nsite Commands

```bash
# Initialize nsite (first time only)
npm run nsite:init

# Build for nsite
npm run nsite:build

# Publish to Nostr
npm run nsite:publish

# Serve locally for testing
npm run nsite:serve
```

## 🌐 Accessing Your Deployed Site

Once deployed, your site will be available through:

### 1. Nostr Web Gateways
- **njump.me**: `https://njump.me/npub1your_public_key`
- **nostr.band**: Search for "creator-economy" or your npub

### 2. Nostr Clients
Any Nostr client that supports NIP-23 (long-form content):
- Damus
- Amethyst  
- Iris
- Snort
- Coracle

### 3. Search by Tags
Search for these hashtags on any Nostr client:
- `#creator-economy`
- `#nostr`
- `#bitcoin`
- `#lightning`
- `#micropayments`

## ⚙️ Configuration

### Customize Deployment

Edit `nsite.config.js` to customize your deployment:

```javascript
export default {
  name: "Nostr Creator Economy",
  description: "Your custom description",
  
  nostr: {
    // Add more relays for better distribution
    relays: [
      "wss://relay.nostr.band",
      "wss://relay.damus.io",
      "wss://nos.lol",
      "wss://relay.snort.social",
      "wss://nostr.wine",
      "wss://relay.primal.net",    // Add more
      "wss://relay.current.fyi"
    ],
    
    // Customize tags for discoverability
    tags: [
      ["t", "creator-economy"],
      ["t", "your-custom-tag"],
      ["subject", "Your Custom Title"]
    ]
  }
};
```

### Environment Variables

```bash
# Required
NOSTR_PRIVATE_KEY=nsec1your_private_key

# Optional
NOSTR_RELAYS=wss://relay1.com,wss://relay2.com
NSITE_DEBUG=true
```

## 🔍 Verification & Monitoring

### Verify Deployment

```bash
# Check if your site is live
npm run nsite:verify
```

This script will:
- Test relay connectivity
- Search for your site events
- Provide access URLs
- Show deployment status

### Manual Verification

1. **Check nostr.band**: Search for "creator-economy"
2. **Test njump.me**: Visit `https://njump.me/npub1your_key`
3. **Use Nostr client**: Search for your tags

### Monitor Relays

```bash
# Check which relays have your content
curl -X POST https://relay.nostr.band \
  -H "Content-Type: application/json" \
  -d '["REQ","test",{"kinds":[30023],"#t":["creator-economy"],"limit":1}]'
```

## 🚨 Troubleshooting

### Common Issues

#### 1. "Private key not found"
```bash
# Check your environment variable
echo $NOSTR_PRIVATE_KEY
# Should output: nsec1...

# If empty, set it:
export NOSTR_PRIVATE_KEY="nsec1your_key_here"
```

#### 2. "Build failed"
```bash
# Clean build
rm -rf dist/ nsite-dist/
npm install
npm run build
```

#### 3. "Relay connection failed"
```bash
# Test relay connectivity
npm run nsite:verify

# Try with fewer relays
# Edit nsite.config.js and use only 1-2 relays initially
```

#### 4. "Events not found"
```bash
# Wait for propagation (can take 1-5 minutes)
# Try different relays
# Check your tags in nsite.config.js
```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=nsite* npm run deploy:nsite

# Check nsite logs
npx nsite logs

# Validate configuration
npx nsite validate
```

### Get Help

1. Check [nsite documentation](https://github.com/lez/nsite)
2. Join Nostr development communities
3. Search existing GitHub issues
4. Test with minimal configuration first

## 🔐 Security Best Practices

### Key Management
- **Never commit private keys** to version control
- Use environment variables for keys
- Consider using a dedicated publishing key
- Backup your keys securely

### CI/CD Deployment
```yaml
# GitHub Actions example
- name: Deploy to Nostr
  env:
    NOSTR_PRIVATE_KEY: ${{ secrets.NOSTR_PRIVATE_KEY }}
  run: npm run deploy:nsite
```

## 🎉 Success Indicators

Your deployment is successful when:

✅ **Build completes** without errors  
✅ **Tests pass** successfully  
✅ **nsite publishes** to relays  
✅ **Events appear** on nostr.band  
✅ **Site loads** via njump.me  
✅ **Tags work** for discovery  

## 🌟 What's Next?

After successful deployment:

1. **Share your npub** with the community
2. **Promote using hashtags** like #creator-economy
3. **Monitor performance** via Nostr analytics
4. **Update regularly** with new features
5. **Engage with users** through Nostr

## 📊 Deployment Checklist

- [ ] Nostr private key configured
- [ ] Dependencies installed (`npm install`)
- [ ] Tests passing (`npm test`)
- [ ] Build successful (`npm run build`)
- [ ] nsite configuration reviewed
- [ ] Deployment completed (`npm run deploy:nsite`)
- [ ] Verification successful (`npm run nsite:verify`)
- [ ] Site accessible via njump.me
- [ ] Tags working for discovery
- [ ] Relays serving content

## 🎯 Advanced Features

### Custom Domain (if supported)
```javascript
// nsite.config.js
export default {
  site: {
    domain: "creator-economy.nostr"
  }
};
```

### Multiple Environments
```bash
# Production
NOSTR_ENV=production npm run deploy:nsite

# Staging  
NOSTR_ENV=staging npm run deploy:nsite
```

### Automated Updates
Set up GitHub Actions to auto-deploy on commits:
- See `.github/workflows/deploy-nsite.yml`
- Add `NOSTR_PRIVATE_KEY` to repository secrets

---

## 🎊 Congratulations!

Your Nostr Creator Economy platform is now:

🌐 **Decentralized** - Hosted across multiple Nostr relays  
🛡️ **Censorship Resistant** - No single point of failure  
⚡ **Lightning Fast** - Served from distributed locations  
🔍 **Discoverable** - Found through Nostr search and tags  
💎 **Permanent** - Content persists on the Nostr network  

Welcome to the decentralized web! 🚀

---

*For detailed technical documentation, see [docs/NSITE_SETUP.md](docs/NSITE_SETUP.md)*