# Troubleshooting Guide

## RSS Feed Issues (Nitter Down)

### Problem
All nitter instances return errors like:
- "Unable to parse XML"
- "ENOTFOUND" (DNS error)
- 403 Forbidden
- Connection timeout

### Why This Happens
Nitter instances are community-run proxies for Twitter/X that frequently go offline or get blocked. This is the #1 issue with Twitter RSS monitoring.

### Solutions

#### Option 1: Find Working Nitter Instances (Recommended)

Visit https://status.d420.de/ or https://github.com/zedeus/nitter/wiki/Instances to find currently working instances.

Update `config/default.json`:
```json
{
  "monitor": {
    "nitterInstances": [
      "https://working-instance-1.com/ArxivSound/rss",
      "https://working-instance-2.com/ArxivSound/rss",
      "https://working-instance-3.com/ArxivSound/rss"
    ]
  }
}
```

Test an instance:
```bash
curl -s "https://nitter.example.com/ArxivSound/rss" | head -20
```

If you see XML output starting with `<?xml version="1.0"?>`, it's working!

#### Option 2: Use Twitter API (Requires Developer Account)

This requires a Twitter Developer account and API key, but is more reliable.

1. Get Twitter API access at https://developer.twitter.com/
2. Install twitter-api-v2: `npm install twitter-api-v2`
3. Modify `src/monitors/rss-monitor.js` to use Twitter API instead of RSS

#### Option 3: Switch to Direct arXiv Monitoring

Instead of using @ArxivSound as a trigger, query arXiv directly for audio/music papers.

Modify `config/default.json`:
```json
{
  "monitor": {
    "source": "arxiv",  // instead of "twitter"
    "arxivCategories": ["cs.SD", "eess.AS"]
  }
}
```

This requires implementing a new monitor in `src/monitors/arxiv-monitor.js`.

---

## arXiv API Rate Limiting

### Problem
Error: `Request failed with status code 429` or `503`

### Why This Happens
arXiv rate-limits API requests to prevent abuse. The limit is approximately:
- 3 requests per second
- 50 requests per 5 minutes

### Solutions

1. **Wait and retry** - The rate limit resets after a few minutes

2. **Increase delay in fetcher** - Edit `src/arxiv-fetcher.js`:
   ```javascript
   // Add delay between requests
   await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
   ```

3. **Run monitor in production** - In production, the 15-minute poll interval naturally avoids rate limits

---

## Email Not Sending

### Problem
Email digest not being sent, or errors like "Invalid login" or "Connection refused"

### Gmail-Specific Issues

#### 1. Using Regular Password (Won't Work)
Gmail requires an **App Password**, not your regular password.

**Fix:**
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification (required for App Passwords)
3. Go to https://myaccount.google.com/apppasswords
4. Create a new App Password for "Mail"
5. Use this 16-character password in `.env`:
   ```bash
   EMAIL_PASS=your-16-char-app-password-here
   ```

#### 2. "Less Secure App Access" Disabled
This setting no longer works. You MUST use App Passwords.

#### 3. Port/TLS Issues
Gmail SMTP settings:
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587  # Use 587, not 465
```

### Test Email Connection

```bash
node -e "require('./src/output/email-sender').testConnection()"
```

### Still Not Working?

Try another SMTP service:
- **SendGrid** (free tier: 100 emails/day)
- **Mailgun** (free tier: 1,000 emails/month)
- **AWS SES** (62,000 emails/month free)

---

## Papers Not Being Queued

### Problem
Monitor runs but no papers appear in queue

### Check Score Threshold

Papers below the minimum score are filtered out. Check `config/default.json`:
```json
{
  "queue": {
    "minRelevanceScore": 5.0  // Lower this to queue more papers
  }
}
```

### Test Scoring

Run the test scorer to see how papers are scored:
```bash
node test-scorer.js
```

Adjust weights in `config/default.json` if needed:
```json
{
  "scoring": {
    "weights": {
      "dataEdge": 1.5,  // Increase to prioritize data/licensing signals
      "generative": 1.0
    }
  }
}
```

---

## Digest Never Triggers

### Problem
Queue has papers but digest never sends

### Check Triggers

Digest sends when:
- Queue has ≥10 papers (default)
- OR 7 days elapsed since last digest
- OR manual trigger: `npm run send`

Lower threshold in `config/default.json`:
```json
{
  "queue": {
    "digestThreshold": 5  // Trigger at 5 papers instead of 10
  }
}
```

### Manually Trigger Digest

```bash
npm run send
```

---

## Monitor Crashes or Stops

### Check PM2 Status

```bash
pm2 status
pm2 logs arxiv-intel --lines 50
```

### Common Causes

1. **API key invalid** - Check `.env` has correct `ANTHROPIC_API_KEY`
2. **Out of memory** - PM2 restarts at 500MB by default
3. **External service down** - RSS/arXiv temporarily unavailable (auto-retries)

### View Recent Errors

```bash
pm2 logs arxiv-intel --err --lines 100
```

### Restart

```bash
pm2 restart arxiv-intel
```

---

## Queue Data Corrupted

### Problem
Error: "Cannot read property X of undefined" when loading queue

### Fix

Backup and reset the queue:
```bash
cp data/queue.json data/queue.backup.json
echo '{"papers":[],"lastDigestSentAt":null}' > data/queue.json
pm2 restart arxiv-intel
```

---

## Getting Help

1. Check logs: `pm2 logs arxiv-intel --lines 100`
2. Test components individually:
   - Scorer: `node test-scorer.js`
   - Queue: `node test-queue.js`
   - Monitor: `npm test`
3. Check GitHub issues: https://github.com/supadupaj404/arxiv-intelligence-digest/issues
4. Enable debug mode in `.env`:
   ```bash
   DEBUG=true
   ```
