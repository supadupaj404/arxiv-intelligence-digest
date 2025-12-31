#!/usr/bin/env node

require('dotenv').config();
const RSSMonitor = require('./src/monitors/rss-monitor');
const ArxivFetcher = require('./src/arxiv-fetcher');
const CompetitiveIntelScorer = require('./src/scoring/competitive-intel-scorer');
const PaperQueue = require('./src/queue/paper-queue');
const AISummarizer = require('./src/ai/summarizer');
const EmailFormatter = require('./src/output/email-formatter');
const EmailSender = require('./src/output/email-sender');
const fs = require('fs');
const path = require('path');

class IntelligenceDigestMonitor {
  constructor() {
    console.log('🚀 Initializing ArXiv Intelligence Digest Monitor\n');

    // Initialize components
    this.rssMonitor = new RSSMonitor();
    this.arxivFetcher = new ArxivFetcher();
    this.scorer = new CompetitiveIntelScorer();
    this.queue = new PaperQueue();
    this.summarizer = new AISummarizer();
    this.emailFormatter = new EmailFormatter();

    // Load config
    const configPath = path.join(__dirname, 'config/default.json');
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Initialize email sender if enabled
    if (this.config.email.enabled) {
      const emailConfig = {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        to: process.env.EMAIL_TO
      };
      this.emailSender = new EmailSender(emailConfig);
    }

    // Bind methods
    this.handleNewPaper = this.handleNewPaper.bind(this);
    this.checkQueueAndSendDigest = this.checkQueueAndSendDigest.bind(this);

    // Setup graceful shutdown
    this.setupShutdownHandlers();
  }

  /**
   * Handle a newly detected paper from RSS
   */
  async handleNewPaper(paperInfo) {
    try {
      console.log(`\n📄 Processing paper: ${paperInfo.arxivId}`);

      // Step 1: Fetch full paper metadata from arXiv
      console.log('  ├─ Fetching metadata from arXiv...');
      const paperDetails = await this.arxivFetcher.fetchPaperDetails(paperInfo.arxivId);

      if (!paperDetails) {
        console.log('  └─ ✗ Failed to fetch paper details');
        return;
      }

      // Add tweet metadata
      paperDetails.tweetLink = paperInfo.tweetLink;
      paperDetails.tweetTitle = paperInfo.tweetTitle;
      paperDetails.tweetDate = paperInfo.tweetDate;

      // Step 2: Score paper for competitive intelligence
      console.log('  ├─ Scoring for competitive intelligence...');
      const scoring = this.scorer.scorePaper(paperDetails);
      paperDetails.scoring = scoring;

      console.log(`  ├─ Score: ${scoring.score}/10 | Threat: ${scoring.threatLevel} | Triple Match: ${scoring.tripleMatch}`);

      // Step 3: Check if relevant (score >= threshold)
      if (!scoring.isRelevant) {
        console.log(`  └─ ✗ Below relevance threshold (${scoring.score} < ${this.config.queue.minRelevanceScore})`);
        return;
      }

      // Step 4: Generate AI summary
      console.log('  ├─ Generating competitive intel summary...');
      const summary = await this.summarizer.summarizePaper(paperDetails);
      paperDetails.aiSummary = summary.summary;
      paperDetails.summaryGeneratedAt = summary.generatedAt;

      // Step 5: Add to queue
      console.log('  ├─ Adding to queue...');
      const added = this.queue.add(paperDetails);

      if (added) {
        console.log(`  └─ ✓ Successfully queued (${this.queue.count()} papers in queue)`);

        // Check if we should send digest
        await this.checkQueueAndSendDigest();
      } else {
        console.log('  └─ ✗ Not added to queue (duplicate or below threshold)');
      }

    } catch (error) {
      console.error(`  └─ ✗ Error processing paper:`, error.message);
    }
  }

  /**
   * Check queue and send digest if threshold met
   */
  async checkQueueAndSendDigest() {
    const trigger = this.queue.shouldTriggerDigest();

    console.log(`\n📊 Queue status: ${trigger.reason}`);

    if (trigger.shouldTrigger) {
      console.log(`✅ ${trigger.reason} - Sending digest!`);
      await this.sendDigest();
    }
  }

  /**
   * Send digest email
   */
  async sendDigest() {
    try {
      console.log('\n📧 Preparing digest email...');

      const papers = this.queue.getSortedByScore();

      if (papers.length === 0) {
        console.log('✗ No papers to send');
        return;
      }

      // Format email
      const htmlContent = this.emailFormatter.formatDigest(papers, {
        maxPapers: this.config.email.maxPapersPerDigest
      });

      const textContent = this.emailFormatter.formatPlainText(papers, {
        maxPapers: this.config.email.maxPapersPerDigest
      });

      // Save digest to file
      const timestamp = new Date().toISOString().split('T')[0];
      const digestPath = path.join(__dirname, `output/digests/digest_${timestamp}.html`);
      fs.writeFileSync(digestPath, htmlContent, 'utf8');
      console.log(`✓ Saved digest to: ${digestPath}`);

      // Send email if enabled
      if (this.config.email.enabled && this.emailSender) {
        const stats = this.queue.getStats();
        const subject = `ArXiv Intelligence Digest - ${papers.length} Papers (${stats.threatCounts.HIGH} HIGH priority)`;

        await this.emailSender.sendEmail({
          subject,
          html: htmlContent,
          text: textContent
        });

        console.log('✓ Email sent successfully');
      } else {
        console.log('ℹ Email sending disabled - digest saved to file only');
      }

      // Clear queue
      this.queue.clear();
      console.log('✓ Queue cleared\n');

    } catch (error) {
      console.error('✗ Error sending digest:', error.message);
    }
  }

  /**
   * Start monitoring
   */
  async start() {
    try {
      console.log('='.repeat(80));
      console.log('📡 Starting RSS Monitor');
      console.log('='.repeat(80));
      console.log(`Poll interval: ${this.config.monitor.pollIntervalMinutes} minutes`);
      console.log(`Queue threshold: ${this.config.queue.digestThreshold} papers`);
      console.log(`Max days between digests: ${this.config.queue.maxDaysBetweenDigests}`);
      console.log(`Min relevance score: ${this.config.queue.minRelevanceScore}`);
      console.log('='.repeat(80) + '\n');

      // Test API connections
      console.log('Testing connections...');
      await this.summarizer.testConnection();
      if (this.emailSender) {
        await this.emailSender.testConnection();
      }
      console.log('');

      // Start RSS monitoring loop
      await this.rssMonitor.startMonitoring(this.handleNewPaper);

    } catch (error) {
      console.error('✗ Fatal error:', error.message);
      process.exit(1);
    }
  }

  /**
   * Stop monitoring
   */
  stop() {
    console.log('\n\n🛑 Stopping monitor...');
    this.rssMonitor.stopMonitoring();
    console.log('✓ Monitor stopped gracefully\n');
    process.exit(0);
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupShutdownHandlers() {
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }
}

// CLI entry point
if (require.main === module) {
  const monitor = new IntelligenceDigestMonitor();

  // Handle command line arguments
  const args = process.argv.slice(2);

  if (args.includes('--test')) {
    console.log('Test mode: Running single check...\n');
    monitor.rssMonitor.checkOnce().then(papers => {
      console.log(`\nFound ${papers.length} papers`);
      papers.forEach(p => console.log(`- ${p.arxivId}`));
      process.exit(0);
    });
  } else {
    monitor.start();
  }
}

module.exports = IntelligenceDigestMonitor;
