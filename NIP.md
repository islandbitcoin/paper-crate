# NIP-XX: Nostr Influencer Micropayment Platform

`draft` `optional`

This NIP defines event kinds for a decentralized influencer micropayment platform that connects businesses with content creators on Nostr and other social platforms.

## Event Kinds

| Kind    | Name                    | Description                                    |
|---------|-------------------------|------------------------------------------------|
| `33851` | Campaign Definition     | Business campaign with payment terms          |
| `34609` | Campaign Application    | Creator application to join a campaign        |
| `3387`  | Performance Report      | Post performance metrics and payment claims   |

## Campaign Definition (Kind 33851)

A replaceable event that defines a marketing campaign created by a business.

### Tags

- `d` (required): Unique campaign identifier
- `title` (required): Campaign title
- `description` (required): Campaign description and requirements
- `budget` (required): Total campaign budget in millisats
- `rate_like` (optional): Payment per like in millisats
- `rate_repost` (optional): Payment per repost/share in millisats  
- `rate_zap` (optional): Payment per zap in millisats
- `rate_comment` (optional): Payment per comment in millisats
- `platforms` (required): Supported platforms (comma-separated: "nostr,twitter,instagram")
- `start_date` (required): Campaign start date (ISO 8601)
- `end_date` (required): Campaign end date (ISO 8601)
- `min_followers` (optional): Minimum follower count requirement
- `max_posts` (optional): Maximum posts per creator
- `t` (required): "campaign" for discoverability
- `status` (required): "active", "paused", or "completed"

### Content

Empty string.

### Example

```json
{
  "kind": 33851,
  "content": "",
  "tags": [
    ["d", "summer-promo-2025"],
    ["title", "Summer Product Launch"],
    ["description", "Promote our new summer collection with authentic posts"],
    ["budget", "5000000"],
    ["rate_like", "100"],
    ["rate_repost", "500"],
    ["rate_zap", "1000"],
    ["platforms", "nostr,twitter,instagram"],
    ["start_date", "2025-07-01T00:00:00Z"],
    ["end_date", "2025-07-31T23:59:59Z"],
    ["min_followers", "1000"],
    ["max_posts", "3"],
    ["t", "campaign"],
    ["status", "active"]
  ]
}
```

## Campaign Application (Kind 34609)

A replaceable event where creators apply to join campaigns.

### Tags

- `d` (required): Unique application identifier (campaign_id:creator_pubkey)
- `a` (required): Campaign coordinate (33851:business_pubkey:campaign_id)
- `p` (required): Business pubkey
- `platforms` (required): Creator's platform handles (format: "platform:handle")
- `followers` (required): Follower counts (format: "platform:count")
- `t` (required): "campaign-application" for discoverability
- `status` (required): "pending", "approved", "rejected"

### Content

Creator's application message and portfolio links.

### Example

```json
{
  "kind": 34609,
  "content": "I'd love to promote your summer collection! Check out my previous work: https://example.com/portfolio",
  "tags": [
    ["d", "summer-promo-2025:creator123"],
    ["a", "33851:business456:summer-promo-2025"],
    ["p", "business456"],
    ["platforms", "nostr:npub123,twitter:@creator123,instagram:@creator123"],
    ["followers", "nostr:5000,twitter:15000,instagram:8000"],
    ["t", "campaign-application"],
    ["status", "pending"]
  ]
}
```

## Performance Report (Kind 3387)

A regular event that reports post performance metrics and claims payment.

### Tags

- `a` (required): Campaign coordinate (33851:business_pubkey:campaign_id)
- `p` (required): Business pubkey
- `platform` (required): Platform where post was published
- `post_url` (required): URL to the post
- `e` (optional): Nostr event ID if posted on Nostr
- `metrics` (required): Performance metrics (format: "type:count")
- `amount_claimed` (required): Total amount claimed in millisats
- `t` (required): "performance-report" for discoverability

### Content

Optional notes about the post performance.

### Example

```json
{
  "kind": 3387,
  "content": "Great engagement on this post! Lots of positive feedback.",
  "tags": [
    ["a", "33851:business456:summer-promo-2025"],
    ["p", "business456"],
    ["platform", "twitter"],
    ["post_url", "https://twitter.com/creator123/status/123456789"],
    ["metrics", "likes:150,reposts:25,comments:8"],
    ["amount_claimed", "20300"],
    ["t", "performance-report"]
  ]
}
```

## Implementation Notes

### Payment Flow

1. Business creates campaign (kind 33851) with payment rates
2. Creators apply (kind 34609) with platform credentials
3. Business approves applications by updating status tag
4. Creators publish content and submit performance reports (kind 3387)
5. Business validates metrics and processes payments via Lightning/NWC

### Platform Integration

Clients should implement platform-specific metric collection:
- **Nostr**: Query reactions (kind 7), reposts (kind 6/16), zaps (kind 9735)
- **Twitter**: Use Twitter API for likes, retweets, replies
- **Instagram**: Use Instagram Basic Display API for likes, comments
- **TikTok**: Use TikTok API for likes, shares, comments

### Security Considerations

- Businesses should validate platform metrics independently
- Use NIP-47 (Nostr Wallet Connect) for secure payment processing
- Implement rate limiting to prevent spam applications
- Consider requiring proof of platform ownership via verification posts

## Rationale

This NIP enables decentralized influencer marketing by:
- Providing transparent campaign terms on Nostr
- Enabling cross-platform performance tracking
- Facilitating micropayments via Lightning Network
- Maintaining creator autonomy and direct business relationships