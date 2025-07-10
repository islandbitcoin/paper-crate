#!/bin/bash

# Nostr Creator Economy - nsite Deployment Script
# This script builds and deploys the application to Nostr using nsite

set -e  # Exit on any error

echo "🚀 Deploying Nostr Creator Economy to Nostr via nsite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if nsite is installed
if ! command -v npx &> /dev/null; then
    print_error "npx is required but not installed. Please install Node.js and npm."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check for Nostr private key
if [ -z "$NOSTR_PRIVATE_KEY" ]; then
    print_warning "NOSTR_PRIVATE_KEY environment variable not set."
    print_status "nsite will prompt for your private key during deployment."
    echo ""
fi

# Step 1: Install dependencies
print_status "Installing dependencies..."
npm install

# Step 2: Run tests
print_status "Running tests..."
npm test

# Step 3: Build the application
print_status "Building application..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    print_error "Build failed - dist directory not found."
    exit 1
fi

print_success "Build completed successfully!"

# Step 4: Deploy with nsite
print_status "Deploying to Nostr with nsite..."
print_status "This will publish your site to the configured Nostr relays..."

# Check if nsite config exists
if [ ! -f "nsite.config.js" ]; then
    print_warning "nsite.config.js not found. Using default configuration."
fi

# Deploy
if npm run nsite:publish; then
    print_success "🎉 Deployment successful!"
    echo ""
    print_status "Your Nostr Creator Economy platform is now live on Nostr!"
    print_status "Access your site through:"
    echo "  • njump.me with your npub"
    echo "  • Nostr clients that support nsite"
    echo "  • Search for tags: creator-economy, nostr, bitcoin"
    echo ""
    print_status "Site metadata:"
    echo "  • Name: Nostr Creator Economy"
    echo "  • Tags: creator-economy, nostr, bitcoin, lightning, micropayments"
    echo "  • Relays: relay.nostr.band, relay.damus.io, nos.lol, relay.snort.social, nostr.wine"
    echo ""
else
    print_error "Deployment failed!"
    print_status "Troubleshooting tips:"
    echo "  • Check your Nostr private key (NOSTR_PRIVATE_KEY)"
    echo "  • Verify relay connectivity"
    echo "  • Try deploying to fewer relays initially"
    echo "  • Check the deployment logs above for specific errors"
    echo ""
    print_status "For detailed troubleshooting, see DEPLOYMENT.md"
    exit 1
fi

# Optional: Verify deployment
print_status "Verifying deployment..."
echo "You can verify your deployment by:"
echo "  1. Searching for your npub on nostr.band"
echo "  2. Looking for events with tags: creator-economy"
echo "  3. Checking the configured relays for your content"

print_success "Deployment script completed!"