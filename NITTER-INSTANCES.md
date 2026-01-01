# Finding Working Nitter Instances

## Current Status
As of December 31, 2025, most nitter instances are blocked with anti-bot verification pages. This is a common occurrence.

## How to Find Working Instances

### Option 1: Check Nitter Status Page (Recommended)
Visit: https://status.d420.de/

This page shows:
- ✅ Green = Working
- 🟡 Yellow = Slow/Issues
- ❌ Red = Down

Look for instances with green checkmarks, then test them.

### Option 2: GitHub Nitter Wiki
Visit: https://github.com/zedeus/nitter/wiki/Instances

Lists community-maintained nitter instances with status.

### Option 3: Manual Testing

Test an instance:
```bash
curl -s "https://nitter.example.com/ArxivSound/rss" | head -20
```

**Good response** (XML):
```xml
<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>ArXiv Sound / Twitter</title>
    ...
```

**Bad response** (blocked):
```html
<!DOCTYPE html>
<title>Verifying your browser | Nitter</title>
```

## Updating Config

Once you find a working instance, update `config/default.json`:

```json
{
  "monitor": {
    "nitterInstances": [
      "https://working-instance.com/ArxivSound/rss",
      "https://backup-instance.com/ArxivSound/rss",
      "https://another-backup.com/ArxivSound/rss"
    ]
  }
}
```

**Always include 2-3 fallback instances** in case one goes down.

## Common Working Instances (Check First)

These instances *sometimes* work (status changes frequently):

- nitter.net/ArxivSound/rss
- nitter.privacydev.net/ArxivSound/rss
- nitter.poast.org/ArxivSound/rss
- nitter.1d4.us/ArxivSound/rss
- nitter.it/ArxivSound/rss
- nitter.unixfox.eu/ArxivSound/rss
- nitter.kavin.rocks/ArxivSound/rss

**Test each one before adding to config!**

## When Instances Are Back

1. Find working instance(s)
2. Update `config/default.json`
3. Start the monitor:
   ```bash
   pm2 start ecosystem.config.js
   pm2 logs arxiv-intel
   ```

The monitor will automatically start processing papers!

## Alternative: Manual Paper Processing

While waiting for nitter instances, you can manually process papers:

```bash
# Find interesting papers on arXiv
# Then process them:
node demo-manual-add.js 2308.01546

# When you have 10+ papers, send digest:
node send-digest.js
```

## Troubleshooting

### All Instances Blocked
- Wait a few days - instances cycle on/off
- Check status sites daily
- Consider switching to direct arXiv monitoring (see TROUBLESHOOTING.md)

### Instance Works in Browser But Not CLI
- Instance may block curl/scripts
- Try with User-Agent header:
  ```bash
  curl -H "User-Agent: Mozilla/5.0" -s "https://nitter.example.com/ArxivSound/rss"
  ```

### RSS Feed Empty
- @ArxivSound may not have posted recently
- Check Twitter directly to verify
- Test with different account: `https://nitter.example.com/elonmusk/rss`
