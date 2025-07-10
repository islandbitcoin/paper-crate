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
- **Security**: Comprehensive security hardening with monitoring and incident response

## 📚 Documentation

### Core Documentation
- **[API Documentation](docs/API.md)** - Complete Nostr event specifications and API usage
- **[Development Guide](docs/DEVELOPMENT.md)** - Setup, workflow, and contribution guidelines
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Deployment options and CI/CD setup
- **[Security Documentation](docs/SECURITY.md)** - Comprehensive security measures and best practices

### Deployment & Setup
- **[Nostr Deployment Guide](docs/DEPLOY_TO_NOSTR.md)** - Deploy to decentralized Nostr network
- **[Nostr Deployment Summary](docs/NOSTR_DEPLOYMENT_SUMMARY.md)** - Quick deployment overview
- **[NWC Usage Guide](docs/NWC_USAGE.md)** - Lightning wallet integration

### Protocol Specifications
- **[Custom NIP](docs/NIP.md)** - Paper Crate's custom Nostr event specifications

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

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Nostr-compatible browser extension (Alby, nos2x, etc.)
- Lightning wallet for payments (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/paper-crate.git
cd paper-crate

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Live Deployment

The application is live on Nostr at:
**https://npub13cle7rncdmf3lkqj6pz9q9z8ue4cpfauxa62msy65c6v7ym9rwxscndxjg.nostrdeploy.com**

## 🌐 Deployment Options

### 1. Nostr Deployment (Recommended)

Deploy directly to the decentralized Nostr network:

```bash
# Deploy to Nostr using Blossom servers
npm run deploy

# Alternative deployment method
npm run nostr:deploy
```

### 2. Traditional Hosting

Deploy to conventional hosting platforms:

- **Vercel**: `vercel deploy`
- **Netlify**: Connect repository and deploy
- **GitHub Pages**: Use included workflow

For detailed deployment instructions, see [Deployment Guide](docs/DEPLOYMENT.md).

## 📋 Custom Nostr Event Kinds

This platform implements custom event kinds for decentralized campaign management:

- **Kind 34608**: Campaign Definition (Addressable)
- **Kind 34609**: Campaign Application (Addressable)
- **Kind 34610**: Performance Report (Addressable)

See [Custom NIP Documentation](docs/NIP.md) for detailed specifications.

## 🔐 Security & Privacy

Paper Crate implements comprehensive security measures:

- **5-Phase Security Hardening**: Authentication, data protection, infrastructure security
- **Automated Monitoring**: Real-time threat detection and incident response
- **Encryption**: NIP-44 encryption for sensitive data
- **Session Management**: Secure session handling with automatic timeout
- **Input Validation**: XSS prevention and comprehensive sanitization
- **Payment Security**: Lightning Network security with anti-fraud measures

For complete security details, see [Security Documentation](docs/SECURITY.md).

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

## 📊 Analytics & Insights

- **Campaign ROI**: Track cost-per-engagement across platforms
- **Creator Performance**: Detailed metrics and earnings history
- **Platform Comparison**: Analyze which platforms deliver best results
- **Real-time Updates**: Live campaign performance monitoring
- **Security Metrics**: Comprehensive security event tracking

## 🤝 Contributing

We welcome contributions! Please read our [Development Guide](docs/DEVELOPMENT.md) for:

- Development environment setup
- Code standards and best practices
- Testing requirements
- Pull request process
- Security guidelines

### Areas for Contribution

- Additional platform integrations
- Enhanced analytics features
- Payment system improvements
- UI/UX enhancements
- Security improvements
- Documentation updates

## 💡 Revenue Model

- **Transaction Fees**: 2.5% on business wallet top-ups
- **Premium Analytics**: Advanced performance insights and creator discovery tools
- **Creator Subscriptions**: Optional premium features for high-volume creators

## 🛡️ Security

This project has undergone comprehensive security hardening including:

- Input validation and XSS prevention
- Role-based access control (RBAC)
- Session management and authentication security
- Data encryption and privacy controls
- Infrastructure security with CSP headers
- Automated monitoring and incident response
- Threat detection and forensic capabilities

All security implementations are documented in our [Security Guide](docs/SECURITY.md).

## 📄 License

Open source - see LICENSE file for details.

## 🆘 Support

- **Documentation**: Check the `docs/` folder for comprehensive guides
- **Issues**: Report bugs and request features via GitHub Issues
- **Security**: Report security issues to security@papercrate.com
- **Community**: Join discussions via GitHub Discussions

## 🏗️ Architecture

Paper Crate is built with a modular, secure architecture:

```
Frontend (React + Nostr) → Authentication (NIP-07) → Nostr Protocol → Lightning Network
                                    ↓
Security Layer (Monitoring + Incident Response + Threat Detection)
```

---

**Vibed with [MKStack](https://soapbox.pub/mkstack)** - A modern Nostr development framework.