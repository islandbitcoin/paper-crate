# Deployment Guide - Nostr Creator Economy

This guide covers deploying the Nostr Creator Economy platform using nsite, a decentralized hosting solution for Nostr.

## 🌐 About nsite

[nsite](https://github.com/lez/nsite) is a tool for hosting static websites on Nostr. It publishes your site content as Nostr events, making it truly decentralized and censorship-resistant.

## 🚀 Quick Deployment

### Prerequisites

1. **Nostr Identity**: You need a Nostr private key (nsec) to publish the site
2. **Built Application**: The site must be built first (`npm run build`)

### Deploy with nsite

```bash
# Build the application
npm run build

# Deploy to Nostr using nsite
npm run deploy:nsite
```

## 📋 Step-by-Step Deployment

### 1. Initialize nsite (First time only)

```bash
npm run nsite:init
```

This will:
- Create nsite configuration
- Set up your Nostr identity for publishing
- Configure relays and metadata

### 2. Build the Application

```bash
npm run build
```

This creates the `dist/` directory with the built application.

### 3. Build for nsite

```bash
npm run nsite:build
```

This processes the built files and prepares them for Nostr publishing.

### 4. Publish to Nostr

```bash
npm run nsite:publish
```

This publishes your site to the configured Nostr relays.

### 5. Serve Locally (Optional)

```bash
npm run nsite:serve
```

Test your nsite deployment locally before publishing.

## ⚙️ Configuration

The site is configured via `nsite.config.js`:

```javascript
export default {
  name: "Nostr Creator Economy",
  description: "A decentralized platform connecting businesses with content creators...",
  
  build: {
    source: "./dist",
    output: "./nsite-dist"
  },
  
  nostr: {
    relays: [
      "wss://relay.nostr.band",
      "wss://relay.damus.io", 
      "wss://nos.lol",
      "wss://relay.snort.social",
      "wss://nostr.wine"
    ],
    
    tags: [
      ["t", "creator-economy"],
      ["t", "nostr"],
      ["t", "bitcoin"],
      ["t", "lightning"],
      ["t", "micropayments"]
    ]
  }
};
```

### Key Configuration Options

- **relays**: Nostr relays where the site will be published
- **tags**: Hashtags for discoverability
- **source**: Directory containing built files
- **output**: Directory for nsite-processed files

## 🔐 Security & Keys

### Nostr Key Management

nsite requires a Nostr private key to publish content. Options:

1. **Environment Variable**: Set `NOSTR_PRIVATE_KEY` environment variable
2. **Interactive Setup**: nsite will prompt for key during init
3. **Config File**: Store in nsite configuration (not recommended for production)

```bash
# Using environment variable
export NOSTR_PRIVATE_KEY="nsec1..."
npm run deploy:nsite
```

### Best Practices

- **Never commit private keys** to version control
- Use environment variables for CI/CD deployments
- Consider using a dedicated publishing key
- Backup your keys securely

## 🌍 Accessing Your Site

After deployment, your site will be available through:

### Nostr Web Clients
- **njump.me**: `https://njump.me/<your-npub>`
- **nostr.band**: Search for your site by tags
- **Nostr clients**: Any client that supports nsite events

### Direct Access
- Sites are published as Nostr events (kind 30023)
- Content is distributed across configured relays
- No central server required

## 🔄 Updates & Redeployment

To update your site:

```bash
# Make changes to your code
# Build the updated application
npm run build

# Redeploy to Nostr
npm run deploy:nsite
```

nsite will publish new events with updated content.

## 🛠 Troubleshooting

### Common Issues

1. **Build Errors**
   ```bash
   # Ensure clean build
   rm -rf dist/
   npm run build
   ```

2. **Relay Connection Issues**
   - Check relay URLs in `nsite.config.js`
   - Try different relays if some are down
   - Verify internet connection

3. **Key Issues**
   ```bash
   # Verify your key format
   echo $NOSTR_PRIVATE_KEY
   # Should start with "nsec1"
   ```

4. **Publishing Failures**
   - Check relay connectivity
   - Verify key permissions
   - Try publishing to fewer relays initially

### Debug Mode

```bash
# Enable verbose logging
DEBUG=nsite* npm run deploy:nsite
```

## 📊 Monitoring

### Check Deployment Status

1. **Relay Verification**: Check if events are published to relays
2. **Content Verification**: Verify content appears correctly
3. **Tag Search**: Search for your site using configured tags

### Tools

- **nostr.band**: Search and verify published events
- **Relay explorers**: Check specific relay content
- **Nostr clients**: Test site access through various clients

## 🔗 Alternative Deployment

The project also supports traditional Nostr deployment:

```bash
# Using nostr-deploy-cli (alternative)
npm run deploy
```

This uses a different deployment method but achieves similar results.

## 📚 Resources

- [nsite Documentation](https://github.com/lez/nsite)
- [Nostr Protocol](https://nostr.com)
- [NIP-23: Long-form Content](https://github.com/nostr-protocol/nips/blob/master/23.md)
- [Nostr Relays](https://nostr.watch)

## 🆘 Support

If you encounter issues:

1. Check the [nsite GitHub issues](https://github.com/lez/nsite/issues)
2. Join Nostr development communities
3. Test with minimal configuration first
4. Verify Nostr key and relay connectivity

---

**Happy Deploying!** 🚀

Your Nostr Creator Economy platform will be truly decentralized and censorship-resistant once deployed via nsite.