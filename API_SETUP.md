# Social Media API Setup Guide

This guide explains how to set up real-time follower count fetching for Paper Crate.

## Quick Start

1. Copy `.env.example` to `.env.local`
2. Add your API keys to `.env.local`
3. Restart your development server
4. (Optional) Run the proxy server for direct API access

## API Options

### Option 1: Direct API Access (Recommended for Production)

#### Twitter/X API v2
1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app or use existing one
3. Generate a Bearer Token
4. Add to `.env.local`:
   ```
   VITE_TWITTER_BEARER_TOKEN=your_bearer_token_here
   ```

#### YouTube Data API v3
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable YouTube Data API v3
3. Create credentials (API Key)
4. Add to `.env.local`:
   ```
   VITE_YOUTUBE_API_KEY=your_api_key_here
   ```

#### Instagram Basic Display API
- Requires Facebook app and OAuth implementation
- More complex setup - see [Instagram docs](https://developers.facebook.com/docs/instagram-basic-display-api)

### Option 2: RapidAPI (Easiest Setup)

1. Sign up at [RapidAPI](https://rapidapi.com)
2. Subscribe to these APIs:
   - Twitter API v2
   - Instagram Profile API
   - TikTok API
   - YouTube Data API
3. Get your RapidAPI key
4. Add to `.env.local`:
   ```
   VITE_RAPIDAPI_KEY=your_rapidapi_key_here
   ```

### Option 3: Backend Proxy Server

For production use or to avoid CORS issues:

1. Navigate to server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file in server directory:
   ```
   TWITTER_BEARER_TOKEN=your_token
   YOUTUBE_API_KEY=your_key
   PORT=3001
   ```

4. Run the server:
   ```bash
   npm run dev
   ```

5. Configure frontend to use proxy in `.env.local`:
   ```
   VITE_API_PROXY_URL=http://localhost:3001
   ```

## API Rate Limits

Be aware of rate limits for each service:
- **Twitter API v2**: 300 requests per 15-minute window
- **YouTube API**: 10,000 units per day (1 unit per profile request)
- **RapidAPI**: Varies by subscription plan
- **Instagram**: Varies by app type and usage

## Troubleshooting

### CORS Errors
- Use the backend proxy server
- Or use RapidAPI which handles CORS
- For development only: Use `VITE_CORS_PROXY_URL`

### API Key Not Working
- Check if the key is correctly copied (no extra spaces)
- Ensure the API is enabled in the provider's dashboard
- Check if you've hit rate limits

### No Data Returned
- Verify the social media handle exists
- Check if the account is public
- Some platforms hide follower counts for private accounts

## Security Best Practices

1. **Never commit API keys** - Always use environment variables
2. **Use backend proxy in production** - Keeps keys secure
3. **Implement rate limiting** - Prevent abuse of your API quotas
4. **Monitor usage** - Track API calls to avoid unexpected charges

## Deployment

For production deployment:

1. Set environment variables in your hosting platform
2. Use the backend proxy server to secure API keys
3. Consider caching follower counts to reduce API calls
4. Implement proper error handling for API failures

## Need Help?

- Check the API provider's documentation
- Look for error messages in browser console
- Verify your API quotas haven't been exceeded
- Consider using manual follower entry as fallback