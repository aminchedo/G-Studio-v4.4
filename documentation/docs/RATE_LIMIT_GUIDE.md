# Google Gemini API Rate Limit Guide

## What's Happening?

You're seeing **429 errors** in the console. This means you've hit Google's API rate limit - you've made too many requests in a short period.

## Why This Happens

Google Gemini API has rate limits based on:
- **Requests per minute (RPM)**: Maximum number of API calls per minute
- **Tokens per minute (TPM)**: Maximum number of tokens processed per minute
- **Requests per day (RPD)**: Daily quota limit

### Free Tier Limits (Typical)
- 15 RPM (requests per minute)
- 1 million TPM (tokens per minute)
- 1,500 RPD (requests per day)

## What the App Does Automatically

The app already handles 429 errors gracefully:
1. **Exponential backoff**: Automatically waits before retrying
2. **Cooldown period**: Enters a cooldown state to respect rate limits
3. **Request queuing**: Queues requests to avoid overwhelming the API
4. **Streaming fallback**: Disables streaming if rate limited

## How to Fix This

### Option 1: Wait (Recommended)
Just wait a few minutes. The rate limit resets automatically:
- **Per-minute limits**: Reset after 60 seconds
- **Per-day limits**: Reset at midnight UTC

### Option 2: Reduce Request Frequency
- Send fewer messages
- Wait between requests
- Avoid rapid-fire testing

### Option 3: Upgrade Your API Key
Get a paid API key with higher limits:
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Enable billing
3. Get higher rate limits (up to 1000 RPM)

### Option 4: Use Multiple API Keys (Advanced)
The app supports API key rotation:
1. Get multiple API keys
2. Configure them in the app
3. The app will automatically rotate between them

## Checking Your Current Usage

Visit [Google Cloud Console](https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas) to see:
- Current usage
- Remaining quota
- Rate limit details

## The Errors You're Seeing

```
429 Too Many Requests
```

This is **normal** and **expected** when you hit rate limits. The app handles it automatically - you don't need to do anything.

## Backend Connection Refused

You're also seeing:
```
Failed to load resource: net::ERR_CONNECTION_REFUSED
127.0.0.1:7242/ingest/...
```

This is the **telemetry/logging backend** (optional). It's not running, which is fine - the app works without it. This doesn't affect functionality.

## Summary

✅ **Your app is working correctly**
✅ **Rate limit handling is automatic**
✅ **Just wait a few minutes and try again**

The 429 errors are Google's way of saying "slow down" - not an app bug.
