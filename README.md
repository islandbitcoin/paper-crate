# Paper Crate

A decentralized influencer micropayment platform that connects businesses with content creators for authentic social media campaigns. Built on the Nostr protocol with Bitcoin Lightning Network payments.

## 🚀 Features

### For Businesses

- **Campaign Management**: Create targeted campaigns with custom payment rates
- **Creator Discovery**: Browse and approve creator applications
- **Performance Tracking**: Real-time metrics and ROI analytics
- **Micropayments**: Pay only for verified engagement results
- **Multi-Platform Support**: Nostr, Twitter, Instagram, TikTok, and more
- **Profile Management**: Complete Nostr profile setup with branding
- **Lightning Integration**: Connect wallets for automatic payments

### For Creators

- **Campaign Browser**: Discover active campaigns with filtering and search
- **Application System**: Apply to campaigns with platform credentials
- **Performance Reports**: Submit post metrics to claim earnings
- **Instant Payments**: Receive Bitcoin micropayments via Lightning Network
- **Cross-Platform**: Monetize content across multiple social platforms
- **Profile Management**: Complete Nostr profile with social media links
- **Social Platform Manager**: Connect and verify multiple social accounts

## 🛠 Technology Stack

- **Frontend**: React 18, TypeScript, TailwindCSS, shadcn/ui
- **State Management**: Zustand with persistence
- **Data Fetching**: TanStack Query
- **Charts**: Recharts
- **Protocol**: Nostr (NIP-01, NIP-47, NIP-57)
- **Payments**: Bitcoin Lightning Network, Nostr Wallet Connect
- **Build Tool**: Vite

## 📋 Custom Nostr Event Kinds

This platform implements three custom event kinds:

- **Kind 33851**: Campaign Definition (Addressable)
- **Kind 34609**: Campaign Application (Addressable)
- **Kind 3387**: Performance Report (Regular)

See [NIP.md](./NIP.md) for detailed specifications.

## 🎯 How It Works

### User Onboarding

1. **Login** with any Nostr-compatible wallet or browser extension
2. **Complete Profile** with name, bio, and profile picture
3. **Connect Social Platforms** (creators) or setup payment wallet (businesses)
4. **Configure Settings** including Lightning wallet and relay preferences

### Campaign Flow

1. **Business** creates a campaign with payment rates and requirements
2. **Creators** browse campaigns and submit applications with platform credentials
3. **Business** reviews and approves creator applications
4. **Creators** publish content and submit performance reports
5. **Business** validates metrics and processes Lightning payments

### Payment Model

- Pay-per-engagement micropayments (likes, shares, comments, zaps)
- Transparent rate structure set by businesses
- Instant verification via Lightning Network
- 2.5% platform fee on business wallet top-ups

## 🔧 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 🌐 Deployment to Nostr

This platform can be deployed directly to the Nostr network, making it truly decentralized and censorship-resistant.

### 🚀 Quick Deploy to Nostr

```bash
# 1. Set your Nostr private key
export NOSTR_PRIVATE_KEY="nsec1your_private_key_here"

# 2. Deploy everything to Nostr
npm run deploy:nsite:full

# 3. Verify deployment
npm run nsite:verify
```

Your site will be live on Nostr and accessible through:

- **njump.me** with your npub
- **Nostr clients** that support long-form content
- **Search tags**: creator-economy, nostr, bitcoin, lightning

### 📚 Deployment Guides

- **[Quick Start Guide](DEPLOY_TO_NOSTR.md)** - Fast deployment to Nostr
- **[Detailed Setup](docs/NSITE_SETUP.md)** - Complete nsite configuration
- **[Traditional Deployment](DEPLOYMENT.md)** - Alternative deployment methods

### Alternative Deployment

```bash
# Deploy using nostr-deploy-cli (alternative)
npm run deploy
```

## 🌐 Platform Integration

### Supported Platforms

- **Nostr**: Native integration with zaps and reactions
- **Twitter**: API integration for metrics collection
- **Instagram**: Basic Display API for engagement data
- **TikTok**: API for video performance metrics
- **Facebook**: Graph API for post analytics
- **YouTube**: Analytics API for video metrics
- **LinkedIn**: API for professional content tracking

### Metric Collection

- **Nostr**: Query reactions (kind 7), reposts (kind 6/16), zaps (kind 9735)
- **Other Platforms**: API polling for likes, shares, comments, views

## 🔐 Security & Privacy

- **Decentralized**: Built on Nostr protocol for censorship resistance
- **Non-custodial**: Users control their own keys and wallets
- **Transparent**: All campaign terms and payments are publicly verifiable
- **Privacy-focused**: No personal data collection beyond public social metrics

## 💡 Revenue Model

- **Transaction Fees**: 2.5% on business wallet top-ups
- **Premium Analytics**: Advanced performance insights and creator discovery tools
- **Creator Subscriptions**: Optional premium features for high-volume creators

## 🚀 Getting Started

### Quick Start

1. **Connect Wallet**: Use any Nostr-compatible wallet or browser extension (Alby, Mutiny, Zeus, etc.)
2. **Complete Onboarding**: Follow the guided setup to complete your profile
3. **Choose Role**: Switch between Business and Creator dashboards
4. **Start Creating/Earning**: Create campaigns or apply to start earning

### Profile Management

- **Edit Profile**: Update your Nostr metadata (name, bio, picture, banner)
- **Social Platforms**: Connect Twitter, Instagram, TikTok, and other accounts
- **Lightning Wallet**: Connect via Nostr Wallet Connect (NWC) for payments
- **Relay Settings**: Configure which Nostr relays to use
- **Identity Verification**: Set up NIP-05 verification and Lightning addresses

### For Businesses

- Create campaigns with custom payment rates per engagement type
- Review creator applications with platform credentials and follower counts
- Track campaign performance with real-time analytics
- Process payments automatically via connected Lightning wallet

### For Creators

- Browse active campaigns with advanced filtering
- Apply with verified social media accounts and follower metrics
- Submit performance reports to claim earnings
- Receive instant Bitcoin payments via Lightning Network

## 📊 Analytics & Insights

- **Campaign ROI**: Track cost-per-engagement across platforms
- **Creator Performance**: Detailed metrics and earnings history
- **Platform Comparison**: Analyze which platforms deliver best results
- **Real-time Updates**: Live campaign performance monitoring

## 🤝 Contributing

This platform is built with modularity and extensibility in mind. Contributions welcome for:

- Additional platform integrations
- Enhanced analytics features
- Payment system improvements
- UI/UX enhancements

## 📄 License

Open source - see LICENSE file for details.

---

**Vibed with [MKStack](https://soapbox.pub/mkstack)** - A modern Nostr development framework.
