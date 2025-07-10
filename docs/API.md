# Paper Crate API Documentation

This document describes the Nostr-based API used by Paper Crate for campaign management, creator applications, and payment processing.

## Overview

Paper Crate uses the Nostr protocol for decentralized data storage and communication. All data is stored as Nostr events on relay servers, ensuring censorship resistance and data portability.

## Event Kinds

### Campaign Events (Kind 34608)
Addressable events for campaign creation and management.

**Required Tags:**
- `d`: Campaign identifier (unique per author)
- `title`: Campaign title
- `description`: Campaign description
- `budget`: Total campaign budget in satoshis
- `rate`: Payment rate per engagement (views, clicks, etc.)
- `status`: Campaign status (`active`, `paused`, `completed`, `cancelled`)
- `deadline`: Campaign deadline (ISO 8601 date string)

**Optional Tags:**
- `t`: Category tags for filtering (`tech`, `lifestyle`, `fitness`, etc.)
- `platform`: Target platforms (`twitter`, `instagram`, `youtube`, `tiktok`)
- `audience`: Target audience tags
- `requirements`: Campaign requirements

**Example:**
```json
{
  "kind": 34608,
  "content": "",
  "tags": [
    ["d", "campaign-001"],
    ["title", "Promote Our New App"],
    ["description", "Looking for tech creators to review our productivity app"],
    ["budget", "100000"],
    ["rate", "1000"],
    ["status", "active"],
    ["deadline", "2025-08-01T00:00:00Z"],
    ["t", "tech"],
    ["t", "productivity"],
    ["platform", "twitter"],
    ["platform", "youtube"],
    ["requirements", "Must have 1000+ followers"]
  ]
}
```

### Application Events (Kind 34609)
Addressable events for creator applications to campaigns.

**Required Tags:**
- `d`: Application identifier (unique per author)
- `e`: Campaign event ID being applied to
- `p`: Campaign author pubkey
- `status`: Application status (`pending`, `approved`, `rejected`, `completed`)

**Optional Tags:**
- `message`: Application message from creator
- `portfolio`: Links to creator's work
- `followers`: Follower count on relevant platforms
- `rate_requested`: Requested payment rate (if different from campaign rate)

**Example:**
```json
{
  "kind": 34609,
  "content": "",
  "tags": [
    ["d", "app-001"],
    ["e", "campaign_event_id"],
    ["p", "campaign_author_pubkey"],
    ["status", "pending"],
    ["message", "I'd love to review your app! I have experience with productivity tools."],
    ["portfolio", "https://youtube.com/mychannel"],
    ["followers", "5000"]
  ]
}
```

### Performance Report Events (Kind 34610)
Addressable events for reporting campaign performance and requesting payment.

**Required Tags:**
- `d`: Report identifier (unique per author)
- `e`: Application event ID this report is for
- `p`: Campaign author pubkey (who will pay)
- `status`: Report status (`submitted`, `verified`, `approved`, `paid`)
- `metrics`: Performance metrics (JSON string)

**Optional Tags:**
- `proof`: Links to proof of work (screenshots, URLs, etc.)
- `invoice`: Lightning invoice for payment
- `payment_hash`: Payment hash after successful payment

**Example:**
```json
{
  "kind": 34610,
  "content": "",
  "tags": [
    ["d", "report-001"],
    ["e", "application_event_id"],
    ["p", "campaign_author_pubkey"],
    ["status", "submitted"],
    ["metrics", "{\"views\": 2500, \"clicks\": 120, \"engagement_rate\": 4.8}"],
    ["proof", "https://example.com/screenshot.png"],
    ["invoice", "lnbc50000n1..."]
  ]
}
```

## Authentication & Authorization

### User Roles
Paper Crate implements role-based access control with three roles:

- **Creator**: Can apply to campaigns, submit reports, manage social platforms
- **Business**: Can create campaigns, approve applications, verify reports, make payments
- **Both**: Has permissions for both creator and business roles

### Role Determination
User roles are automatically determined based on activity:
- Users who create campaigns (kind 34608) are assigned business role
- Users who submit applications (kind 34609) are assigned creator role
- Users with both activities get "both" role
- New users default to creator role

### Permissions

**Creator Permissions:**
- `campaign.view` - View available campaigns
- `campaign.apply` - Apply to campaigns
- `application.create` - Create applications
- `application.view.own` - View own applications
- `report.create` - Create performance reports
- `report.view.own` - View own reports
- `profile.edit.own` - Edit own profile
- `social.manage.own` - Manage own social platforms

**Business Permissions:**
- `campaign.create` - Create new campaigns
- `campaign.edit.own` - Edit own campaigns
- `campaign.delete.own` - Delete own campaigns
- `campaign.view` - View campaigns
- `application.view.received` - View applications to own campaigns
- `application.approve` - Approve/reject applications
- `report.view.received` - View reports for own campaigns
- `report.verify` - Verify performance reports
- `report.approve` - Approve reports for payment
- `payment.send` - Send payments
- `profile.edit.own` - Edit own profile

## Security Features

### Input Validation
All user inputs are validated and sanitized:
- XSS prevention with DOMPurify
- Lightning address validation
- Nostr event signature verification
- Content length limits
- File type restrictions for uploads

### Event Validation
Nostr events are validated before processing:
- Signature verification
- Required tag validation
- Content format validation
- Rate limiting on event publishing
- Duplicate event detection

### Encryption
Sensitive data uses NIP-44 encryption:
- Private messages between users
- Sensitive configuration data
- Payment information (when applicable)

### Session Management
- Automatic session timeout (30 minutes idle)
- Maximum session duration (24 hours)
- "Remember me" option (7 days)
- Activity monitoring
- Secure session storage

## Error Handling

### Event Publishing Errors
```json
{
  "error": "validation_failed",
  "message": "Required tag 'title' is missing",
  "code": 400
}
```

### Authentication Errors
```json
{
  "error": "unauthorized",
  "message": "Insufficient permissions for this action",
  "code": 403
}
```

### Rate Limiting
```json
{
  "error": "rate_limited",
  "message": "Too many requests. Please try again later.",
  "code": 429
}
```

## Data Querying

### Campaign Discovery
```javascript
// Find active campaigns in tech category
const campaigns = await nostr.query([{
  kinds: [34608],
  '#t': ['tech'],
  '#status': ['active'],
  limit: 20
}]);
```

### Application Tracking
```javascript
// Find applications for a specific campaign
const applications = await nostr.query([{
  kinds: [34609],
  '#e': [campaignEventId],
  limit: 100
}]);
```

### Performance Reports
```javascript
// Find reports for business to review
const reports = await nostr.query([{
  kinds: [34610],
  '#p': [businessPubkey],
  '#status': ['submitted'],
  limit: 50
}]);
```

## Integration Examples

### Creating a Campaign
```javascript
import { useNostrPublish } from '@/hooks/useNostrPublish';

const { mutate: createEvent } = useNostrPublish();

const createCampaign = (campaignData) => {
  createEvent({
    kind: 34608,
    content: "",
    tags: [
      ['d', campaignData.id],
      ['title', campaignData.title],
      ['description', campaignData.description],
      ['budget', campaignData.budget.toString()],
      ['rate', campaignData.rate.toString()],
      ['status', 'active'],
      ['deadline', campaignData.deadline],
      ...campaignData.categories.map(cat => ['t', cat]),
      ...campaignData.platforms.map(platform => ['platform', platform])
    ]
  });
};
```

### Applying to a Campaign
```javascript
const applyToCampaign = (campaignId, campaignAuthor, message) => {
  createEvent({
    kind: 34609,
    content: "",
    tags: [
      ['d', `app-${Date.now()}`],
      ['e', campaignId],
      ['p', campaignAuthor],
      ['status', 'pending'],
      ['message', message]
    ]
  });
};
```

### Submitting Performance Report
```javascript
const submitReport = (applicationId, campaignAuthor, metrics, proof) => {
  createEvent({
    kind: 34610,
    content: "",
    tags: [
      ['d', `report-${Date.now()}`],
      ['e', applicationId],
      ['p', campaignAuthor],
      ['status', 'submitted'],
      ['metrics', JSON.stringify(metrics)],
      ['proof', proof]
    ]
  });
};
```

## Relay Configuration

### Default Relay
Paper Crate uses `wss://relay.nostr.band` as the default relay for optimal performance and reliability.

### Custom Relays
Users can configure additional relays through the settings interface. Supported relay types:
- Standard Nostr relays (NIP-01)
- Paid relays for enhanced service
- Private relays for sensitive data

### Relay Selection
The app automatically selects the best relay based on:
- Response time
- Availability
- Content policies
- User preferences

## Rate Limits

### Event Publishing
- 10 events per minute per user
- 100 events per hour per user
- Burst allowance: 5 events in 10 seconds

### Query Limits
- 50 queries per minute per user
- 500 results per query maximum
- 30-second timeout per query

## WebSocket Events

### Real-time Updates
Paper Crate uses WebSocket connections for real-time updates:

```javascript
// Subscribe to campaign updates
const subscription = nostr.subscribe([{
  kinds: [34608],
  authors: [userPubkey]
}]);

subscription.on('event', (event) => {
  // Handle campaign update
  updateCampaignInUI(event);
});
```

### Event Types
- Campaign status changes
- New applications received
- Report submissions
- Payment confirmations
- System notifications

## Payment Integration

### Lightning Network
Paper Crate integrates with the Lightning Network for instant micropayments:

- NWC (Nostr Wallet Connect) for wallet integration
- BOLT-11 invoice generation and validation
- Real-time payment verification
- Automatic payment distribution

### Payment Flow
1. Creator submits performance report
2. Business verifies and approves report
3. Lightning invoice generated automatically
4. Payment sent via integrated wallet
5. Payment confirmation recorded on-chain
6. Creator notified of successful payment

## Data Privacy

### Personal Information
- Profile data encrypted with user's private key
- Optional public profile information
- No personal data stored on relays without encryption

### Campaign Data
- Campaign details are public by design
- Financial information limited to necessary parties
- Payment history private between participants

### GDPR Compliance
- Right to data portability (export Nostr events)
- Right to be forgotten (delete local data)
- Data minimization principles
- Transparent data processing