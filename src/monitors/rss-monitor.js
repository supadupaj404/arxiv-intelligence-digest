const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');

class RSSMonitor {
  constructor(configPath = null, statePath = null) {
    this.parser = new Parser();

    // Load config
    const defaultConfigPath = configPath || path.join(__dirname, '../../config/default.json');
    this.config = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf8'));

    // Load nitter instances from config
    this.nitterInstances = this.config.monitor.nitterInstances;
    this.pollIntervalMs = this.config.monitor.pollIntervalMinutes * 60 * 1000;

    // State persistence
    this.statePath = statePath || path.join(__dirname, '../../data/last-seen.json');
    this.loadState();

    // Monitoring state
    this.isRunning = false;
    this.pollTimeout = null;
  }

  /**
   * Load last-seen state from JSON file
   */
  loadState() {
    try {
      if (fs.existsSync(this.statePath)) {
        const data = fs.readFileSync(this.statePath, 'utf8');
        const state = JSON.parse(data);
        this.lastSeenTweetId = state.lastSeenTweetId || null;
        this.lastCheckedAt = state.lastCheckedAt ? new Date(state.lastCheckedAt) : null;
      } else {
        this.lastSeenTweetId = null;
        this.lastCheckedAt = null;
        this.saveState();
      }
    } catch (error) {
      console.error('Error loading monitor state:', error.message);
      this.lastSeenTweetId = null;
      this.lastCheckedAt = null;
    }
  }

  /**
   * Save last-seen state to JSON file
   */
  saveState() {
    try {
      const data = {
        lastSeenTweetId: this.lastSeenTweetId,
        lastCheckedAt: new Date().toISOString()
      };
      fs.writeFileSync(this.statePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving monitor state:', error.message);
    }
  }

  /**
   * Fetch tweets from RSS feed with fallback instances
   */
  async fetchTweets() {
    for (const instance of this.nitterInstances) {
      try {
        console.log(`Fetching RSS from: ${instance}`);
        const feed = await this.parser.parseURL(instance);
        console.log(`✓ Fetched ${feed.items.length} items from RSS`);
        return feed.items;
      } catch (error) {
        console.log(`✗ Failed to fetch from ${instance}: ${error.message}`);
      }
    }

    throw new Error('All RSS sources failed');
  }

  /**
   * Extract arXiv ID from tweet content
   */
  extractArxivId(tweet) {
    const arxivPattern = /arxiv\.org\/abs\/(\d{4}\.\d{4,5})/i;
    const match = tweet.content.match(arxivPattern) || tweet.title.match(arxivPattern);

    if (match) {
      return match[1];
    }

    return null;
  }

  /**
   * Get unique tweet ID
   */
  getTweetId(tweet) {
    // Use tweet link as unique ID
    return tweet.link || tweet.guid;
  }

  /**
   * Check for new tweets since last check
   */
  async checkForNewPapers() {
    try {
      const tweets = await this.fetchTweets();
      const newPapers = [];

      // Find the index of last seen tweet
      let lastSeenIndex = -1;
      if (this.lastSeenTweetId) {
        lastSeenIndex = tweets.findIndex(t => this.getTweetId(t) === this.lastSeenTweetId);
      }

      // Get new tweets (all tweets before last seen, or all if first run)
      const newTweets = lastSeenIndex >= 0 ? tweets.slice(0, lastSeenIndex) : tweets;

      console.log(`Found ${newTweets.length} new tweets`);

      // Extract arXiv papers from new tweets
      for (const tweet of newTweets) {
        const arxivId = this.extractArxivId(tweet);
        if (arxivId) {
          newPapers.push({
            arxivId: arxivId,
            tweetTitle: tweet.title,
            tweetDate: tweet.pubDate,
            tweetLink: this.getTweetId(tweet),
            arxivUrl: `https://arxiv.org/abs/${arxivId}`
          });
        }
      }

      // Update last seen tweet ID (most recent)
      if (tweets.length > 0 && newTweets.length > 0) {
        this.lastSeenTweetId = this.getTweetId(tweets[0]);
        this.saveState();
      }

      console.log(`Extracted ${newPapers.length} new arXiv papers`);
      return newPapers;

    } catch (error) {
      console.error('Error checking for new papers:', error.message);
      return [];
    }
  }

  /**
   * Start continuous monitoring
   * @param {Function} onNewPaper - Callback when new paper detected
   */
  async startMonitoring(onNewPaper) {
    if (this.isRunning) {
      console.log('Monitor already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting RSS monitor (polling every ${this.config.monitor.pollIntervalMinutes} minutes)`);

    // Main monitoring loop
    const poll = async () => {
      if (!this.isRunning) return;

      try {
        console.log(`\n[${new Date().toISOString()}] Checking for new papers...`);
        const newPapers = await this.checkForNewPapers();

        // Process each new paper
        for (const paper of newPapers) {
          console.log(`New paper detected: ${paper.arxivId}`);
          if (onNewPaper) {
            await onNewPaper(paper);
          }
        }

      } catch (error) {
        console.error('Error in monitoring loop:', error.message);
      }

      // Schedule next poll
      if (this.isRunning) {
        this.pollTimeout = setTimeout(poll, this.pollIntervalMs);
      }
    };

    // Start first poll immediately
    await poll();
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring() {
    if (!this.isRunning) {
      console.log('Monitor not running');
      return;
    }

    this.isRunning = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }

    console.log('Monitor stopped');
  }

  /**
   * One-time check for new papers (no continuous monitoring)
   */
  async checkOnce() {
    console.log('Running one-time check for new papers...');
    return await this.checkForNewPapers();
  }
}

module.exports = RSSMonitor;
