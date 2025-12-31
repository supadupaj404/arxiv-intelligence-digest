# ArXiv Intelligence Digest

## Project Overview

Event-driven monitoring system for competitive intelligence tracking of generative AI and music/audio research papers from arXiv.

## Created

December 31, 2025

## Project Status

🟢 Production Ready

## Purpose

Monitor @ArxivSound Twitter feed for new arXiv papers, score them for competitive intelligence relevance (proprietary data, licensing, commercial threats), generate AI summaries optimized for business decision-making, and send email digests when thresholds are met.

## Technology Stack

- **Runtime**: Node.js
- **AI**: Claude Sonnet 4.5 (Anthropic API)
- **Email**: Nodemailer
- **Data**: RSS Parser, arXiv API, JSON file storage
- **Dependencies**: axios, cheerio, rss-parser, xml2js, nodemailer, dotenv

## Key Features

### 1. Event-Driven Architecture
- Polls @ArxivSound RSS feed every 15 minutes
- Near real-time detection of new papers (within 15-30 min)
- State persistence (survives restarts)

### 2. Competitive Intelligence Scoring
- Multi-dimensional scoring: domain, generative AI, **data edge** (proprietary/licensing), commercial signals
- **Data edge** weighted highest (1.5x) for tracking proprietary data advantages
- "Triple match" bonus when paper combines domain + generative + data signals
- Threat levels: HIGH/MEDIUM/LOW based on competitive patterns

### 3. AI-Powered Summaries
- Claude Sonnet 4.5 generates business-focused summaries
- Structured analysis: threat assessment, data edge, commercial readiness, licensing signals, action items
- 200-250 words per paper (scannable in <1 minute)

### 4. Smart Queue Management
- Accumulates papers until threshold met
- Triggers: 10+ papers OR 7 days elapsed OR manual
- Deduplication by arXiv ID
- Persistence to JSON (survives crashes)

### 5. Email Digest
- HTML email with threat-level color coding
- Papers sorted by relevance score
- Includes links to abstract, PDF, and original tweet
- Plain text fallback

## Use Case

**Competitive intelligence** for music industry stakeholders tracking:
- Companies training generative AI on proprietary music data
- Licensing/rights management innovations
- Commercial audio generation products
- Data advantages and moats

## Workflow

```
1. RSS Monitor polls @ArxivSound every 15 minutes
2. New tweet detected → Extract arXiv ID
3. Fetch paper metadata from arXiv API
4. Score paper with competitive intel algorithm
5. If score ≥ 5.0:
   a. Generate Claude AI summary
   b. Add to queue
6. If queue has 10 papers OR 7 days elapsed:
   → Send email digest
   → Clear queue
```

## Configuration

### Key Tunables (`config/default.json`)

- **Poll interval**: 15 minutes (adjust based on urgency)
- **Digest threshold**: 10 papers (balance frequency vs. email fatigue)
- **Max days between digests**: 7 (ensure timely updates)
- **Min relevance score**: 5.0/10 (filter noise)
- **Scoring weights**: Emphasize `dataEdge` (1.5x) for proprietary data focus

### Scoring Dimensions

Papers scored 0-10 based on:
- Domain (3 pts): music, audio, sound keywords + arXiv categories
- Generative (3 pts): diffusion, transformer, generative keywords
- **Data Edge (4 pts)**: proprietary, licensed, in-house, rights, consent, commercial
- Commercial (3 pts): industry, production, real-time, platform keywords
- Category Bonus (2 pts): cs.SD, eess.AS prioritized

Max raw score: ~18 points → normalized to 10

## Architecture Decisions

### Why Event-Driven vs Batch?
- **Event-driven**: Near real-time notifications (15-30 min latency)
- **Batch**: Weekly digests miss time-sensitive competitive threats
- Decision: Event-driven better for competitive intelligence where timing matters

### Why Twitter as Trigger vs Direct arXiv Queries?
- **@ArxivSound**: Pre-curated for audio/music papers (human curation)
- **Direct queries**: More comprehensive but noisy, requires complex filtering
- Decision: Leverage @ArxivSound's curation, focus on scoring/summarizing

### Why Node.js vs Python?
- **Node.js**: Better async handling for I/O-heavy tasks (RSS polling, API calls, emails)
- **Python**: Simpler for data science, but overkill for this use case
- Decision: Node.js for event-driven architecture

## Critical Files

1. **monitor.js** - Main daemon, integrates all components
2. **src/scoring/competitive-intel-scorer.js** - Ported from Python `arxiv-audio-monitor`
3. **src/queue/paper-queue.js** - Smart accumulation with persistence
4. **src/monitors/rss-monitor.js** - Continuous polling with state tracking
5. **src/ai/summarizer.js** - Claude integration with competitive intel prompts
6. **config/default.json** - All tunables

## Development Notes

### Ported Components from arxiv-audio-monitor (Python)
- Scoring algorithm (regex patterns for DOMAIN, MODELS, DATA, INDUSTRY)
- Weighted keyword scoring
- Triple match bonus logic
- Threat assessment patterns

### Enhanced Components from arxiv-sound-digest
- RSS fetcher → continuous monitor with state persistence
- Email sender → kept as-is
- arXiv fetcher → kept for metadata retrieval

### New Components Built
- Paper queue with smart thresholds
- Email formatter with HTML templates
- Competitive intelligence prompts for Claude
- Main monitor daemon

## Deployment

### Production Run
```bash
pm2 start monitor.js --name arxiv-intel
pm2 save
pm2 startup  # Enable auto-start on reboot
```

### Logs
```bash
pm2 logs arxiv-intel
```

### Monitoring
```bash
pm2 status
```

## Success Criteria

- [x] Monitor runs continuously without crashes
- [x] State persists across restarts
- [x] Scoring correlates with competitive value
- [x] Claude API rate limiting works
- [x] Email renders in Gmail/Outlook/Apple Mail
- [x] Deduplication prevents duplicate papers
- [x] Digest triggered at 10 papers or 7 days
- [x] Near real-time response (within 15-30 min of @ArxivSound post)

## Future Enhancements

- [ ] Web dashboard for queue visualization
- [ ] Slack/Discord notification option
- [ ] Historical trend analysis (weekly reports)
- [ ] Custom keyword profiles per user
- [ ] Multi-source aggregation (beyond just @ArxivSound)
- [ ] Notification webhook API

## Related Projects

- **arxiv-sound-digest** (legacy): Original weekly batch system with Twitter RSS + email
- **arxiv-audio-monitor** (legacy): Python-based arXiv API monitor with competitive intel scoring

Both deprecated in favor of this unified event-driven system.

## Last Updated

December 31, 2025 - Initial implementation completed
