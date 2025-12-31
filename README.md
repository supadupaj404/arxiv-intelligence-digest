# ArXiv Intelligence Digest

Event-driven monitoring system for competitive intelligence on generative AI and music/audio research.

## Overview

This system monitors the [@ArxivSound](https://twitter.com/ArxivSound) Twitter feed for new papers, scores them for competitive intelligence relevance, generates AI-powered summaries, and sends email digests when thresholds are met.

### Key Features

- **Event-Driven**: Reacts to @ArxivSound posts in near real-time (15-minute polling)
- **Competitive Intelligence Scoring**: Multi-dimensional scoring focused on proprietary data, licensing, and commercial threats
- **AI Summaries**: Claude-generated summaries optimized for business decision-making
- **Smart Accumulation**: Sends digest when 10+ relevant papers collected OR 7 days elapsed
- **Threat Assessment**: Papers tagged as HIGH/MEDIUM/LOW priority based on competitive signals

## Quick Start

###1. Setup

```bash
cd ~/CodeProjects/Active/arxiv-intelligence-digest
npm install
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` and add:

```bash
# Required: Claude AI API Key
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Required: Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_TO=your-digest-email@gmail.com
```

### 3. Run Monitor

```bash
# Start continuous monitoring
npm start

# Or run in background with PM2
pm2 start monitor.js --name arxiv-intel

# Test mode (single check, no continuous monitoring)
npm test
```

### 4. Manual Digest Sending

```bash
# Force send digest with current queue
npm run send
```

## How It Works

```
@ArxivSound RSS feed → Poll every 15 minutes → New tweet detected →
Extract arXiv ID → Fetch paper metadata → Score (competitive intel) →
If score ≥ 5.0 → Summarize with Claude → Add to queue →
If queue has 10 papers OR 7 days elapsed → Send digest email
```

## Scoring System

Papers are scored on 5 dimensions (0-10 scale):

| Dimension | Weight | Focus |
|-----------|--------|-------|
| Domain | 1.0x | Music/audio relevance |
| Generative | 1.0x | Generative AI models |
| **Data Edge** | **1.5x** | Proprietary data, licensing (highest priority) |
| Commercial | 1.0x | Industry/commercial signals |
| Category | 0.5x | ArXiv category relevance |

**Triple Match Bonus**: +2 points when paper mentions domain (music/audio) + generative models + data/licensing signals

**Threat Levels**:
- **HIGH**: dataEdge ≥ 3 AND generative ≥ 2 (proprietary data advantage)
- **MEDIUM**: commercial ≥ 2 AND generative ≥ 2 (commercial development)
- **LOW**: everything else

## Configuration

Edit `config/default.json` to tune:

```json
{
  "monitor": {
    "pollIntervalMinutes": 15  // How often to check RSS
  },
  "queue": {
    "digestThreshold": 10,      // Papers needed to trigger digest
    "maxDaysBetweenDigests": 7, // Max days before forcing digest
    "minRelevanceScore": 5.0    // Min score to queue paper
  },
  "scoring": {
    "weights": {
      "dataEdge": 1.5  // Emphasize proprietary data concerns
    }
  }
}
```

## Project Structure

```
arxiv-intelligence-digest/
├── monitor.js              # Main daemon
├── send-digest.js          # Manual trigger
├── config/
│   ├── default.json        # Configuration
│   └── scoring-weights.json# Keyword weights
├── src/
│   ├── monitors/
│   │   └── rss-monitor.js  # Continuous RSS polling
│   ├── queue/
│   │   └── paper-queue.js  # Paper accumulation
│   ├── scoring/
│   │   └── competitive-intel-scorer.js
│   ├── ai/
│   │   └── summarizer.js   # Claude AI integration
│   └── output/
│       ├── email-formatter.js
│       └── email-sender.js
├── data/
│   ├── queue.json          # Persistent queue
│   └── last-seen.json      # RSS state
└── output/
    └── digests/            # Sent digests
```

## Monitoring & Maintenance

### View Queue Status

```javascript
const PaperQueue = require('./src/queue/paper-queue');
const queue = new PaperQueue();

console.log(queue.getStats());
// Shows: total papers, threat counts, avg score, etc.
```

### Clear Queue

```javascript
queue.clear(); // Removes all papers
```

### Cleanup Old Papers

```javascript
queue.removeOldPapers(30); // Remove papers older than 30 days
```

## Troubleshooting

### RSS Feed Fails

- System automatically tries fallback nitter instances
- Check `config/default.json` → `nitterInstances` array

### Email Not Sending

- Verify SMTP credentials in `.env`
- Test connection: `node -e "require('./src/output/email-sender').testConnection()"`

### Papers Not Being Queued

- Check `minRelevanceScore` in config (default: 5.0)
- Papers below threshold are filtered out
- Run test scorer: `node test-scorer.js`

## Development

### Run Tests

```bash
# Test scorer
node test-scorer.js

# Test queue
node test-queue.js

# Test monitor (single check)
npm test
```

### Add Custom Keywords

Edit `config/scoring-weights.json` to add domain-specific keywords for your competitive intelligence needs.

## License

ISC

## Author

Jeremy Stevenson
