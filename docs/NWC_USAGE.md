# Nostr Wallet Connect (NWC) Integration

This project now includes full Nostr Wallet Connect (NWC) integration using the `@getalby/sdk` library.

## Features

- ✅ Connect to any NWC-compatible Lightning wallet
- ✅ View wallet balance and information
- ✅ Send Lightning payments via bolt11 invoices
- ✅ Test wallet connection
- ✅ Persistent wallet connection (auto-reconnect)
- ✅ Real-time balance updates

## How to Use

### 1. Connect Your Wallet

1. Go to your Profile page
2. Navigate to the "Settings" tab
3. Find the "Lightning Wallet" section
4. Click "Connect Wallet"
5. Enter your NWC connection string (starts with `nostr+walletconnect://`)

### 2. Get Your NWC Connection String

You can get an NWC connection string from any compatible wallet:

- **Alby**: Go to Settings → Wallet Connect → Create new connection
- **Mutiny**: Settings → Connections → Nostr Wallet Connect
- **Zeus**: Settings → Wallet Connect
- **Cashu**: Settings → Nostr Wallet Connect

### 3. Test Your Connection

Once connected, you can:
- View your wallet balance
- Test the connection with the "Test Connection" button
- Refresh your balance manually
- Send test payments (use small amounts!)

### 4. Send Payments

The PaymentTest component allows you to send Lightning payments:
1. Paste a bolt11 invoice
2. Enter the amount in sats
3. Add an optional description
4. Click "Send Payment"

## Security Notes

- Your NWC connection string contains sensitive information
- Never share your connection string with anyone
- The connection string is stored locally in your browser
- You can disconnect at any time to revoke access

## Supported Wallets

- Alby (Web & Extension)
- Mutiny Wallet
- Zeus (Mobile)
- Cashu
- Any wallet supporting NIP-47 (Nostr Wallet Connect)

## Technical Implementation

The NWC integration uses:
- `@getalby/sdk` for NWC protocol implementation
- `useNWC` hook for state management
- Local storage for persistent connections
- React Query for data fetching patterns

## API Reference

### useNWC Hook

```typescript
const {
  walletInfo,      // Current wallet information
  isConnected,     // Connection status
  isConnecting,    // Loading state
  connectWallet,   // Connect function
  disconnectWallet,// Disconnect function
  sendPayment,     // Send payment function
  refreshBalance,  // Refresh balance function
  testConnection,  // Test connection function
} = useNWC();
```

### WalletInfo Interface

```typescript
interface WalletInfo {
  alias: string;     // Wallet name
  balance: number;   // Balance in sats
  pubkey: string;    // Wallet public key
  network: string;   // Network (mainnet/testnet)
  connected: boolean;// Connection status
}
```

### PaymentRequest Interface

```typescript
interface PaymentRequest {
  amount: number;      // Amount in sats
  description?: string;// Payment description
  invoice: string;     // bolt11 invoice
}
```