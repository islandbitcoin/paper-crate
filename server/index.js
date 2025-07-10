// Simple Express proxy server for social media API calls
// This handles CORS and keeps API keys secure on the backend

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generic proxy endpoint
app.post('/api/social-media/fetch', async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    // Security: Only allow specific domains
    const allowedDomains = [
      'api.twitter.com',
      'api.x.com',
      'www.googleapis.com',
      'graph.instagram.com',
      'open-api.tiktok.com',
    ];
    
    const urlObj = new URL(url);
    if (!allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
      return res.status(403).json({ error: 'Domain not allowed' });
    }
    
    const response = await axios({
      method: options.method || 'GET',
      url,
      headers: options.headers || {},
      data: options.body,
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      status: error.response?.status,
    });
  }
});

// Twitter API endpoint
app.get('/api/twitter/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    
    if (!bearerToken) {
      return res.status(500).json({ error: 'Twitter API not configured' });
    }
    
    const response = await axios.get(
      `https://api.twitter.com/2/users/by/username/${username}?user.fields=public_metrics,verified`,
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
        },
      }
    );
    
    const data = response.data.data;
    res.json({
      followers: data.public_metrics.followers_count,
      verified: data.verified,
    });
  } catch (error) {
    console.error('Twitter API error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch Twitter data',
    });
  }
});

// YouTube API endpoint
app.get('/api/youtube/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'YouTube API not configured' });
    }
    
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`
    );
    
    const channel = response.data.items?.[0];
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    res.json({
      subscribers: parseInt(channel.statistics.subscriberCount),
      hiddenSubscriberCount: channel.statistics.hiddenSubscriberCount,
    });
  } catch (error) {
    console.error('YouTube API error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch YouTube data',
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /health');
  console.log('  POST /api/social-media/fetch');
  console.log('  GET  /api/twitter/:username');
  console.log('  GET  /api/youtube/:channelId');
});

module.exports = app;