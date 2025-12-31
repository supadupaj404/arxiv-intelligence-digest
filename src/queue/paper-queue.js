const fs = require('fs');
const path = require('path');

class PaperQueue {
  constructor(queuePath = null, configPath = null) {
    this.queuePath = queuePath || path.join(__dirname, '../../data/queue.json');

    // Load config
    const defaultConfigPath = configPath || path.join(__dirname, '../../config/default.json');
    this.config = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf8'));

    // Load or initialize queue
    this.load();
  }

  /**
   * Load queue from JSON file
   */
  load() {
    try {
      if (fs.existsSync(this.queuePath)) {
        const data = fs.readFileSync(this.queuePath, 'utf8');
        const queue = JSON.parse(data);
        this.papers = queue.papers || [];
        this.lastDigestSentAt = queue.lastDigestSentAt ? new Date(queue.lastDigestSentAt) : null;
        this.createdAt = queue.createdAt ? new Date(queue.createdAt) : new Date();
      } else {
        this.papers = [];
        this.lastDigestSentAt = null;
        this.createdAt = new Date();
        this.save();
      }
    } catch (error) {
      console.error('Error loading queue:', error.message);
      this.papers = [];
      this.lastDigestSentAt = null;
      this.createdAt = new Date();
    }
  }

  /**
   * Save queue to JSON file
   */
  save() {
    try {
      const data = {
        papers: this.papers,
        lastDigestSentAt: this.lastDigestSentAt ? this.lastDigestSentAt.toISOString() : null,
        createdAt: this.createdAt.toISOString()
      };
      fs.writeFileSync(this.queuePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving queue:', error.message);
    }
  }

  /**
   * Add a paper to the queue
   * @param {Object} paper - Paper with scoring data
   * @returns {boolean} - True if added, false if duplicate
   */
  add(paper) {
    // Check for duplicates by arXiv ID
    if (this.papers.some(p => p.id === paper.id)) {
      console.log(`Paper ${paper.id} already in queue, skipping`);
      return false;
    }

    // Check if paper meets minimum relevance score
    if (paper.scoring && paper.scoring.score < this.config.queue.minRelevanceScore) {
      console.log(`Paper ${paper.id} below min score (${paper.scoring.score} < ${this.config.queue.minRelevanceScore}), not adding to queue`);
      return false;
    }

    // Add paper with timestamp
    this.papers.push({
      ...paper,
      addedAt: new Date().toISOString()
    });

    this.save();
    console.log(`Added paper to queue: ${paper.title} [Score: ${paper.scoring.score}]`);
    return true;
  }

  /**
   * Get all papers in queue
   */
  getAll() {
    return this.papers;
  }

  /**
   * Get papers sorted by score
   */
  getSortedByScore() {
    return [...this.papers].sort((a, b) => b.scoring.score - a.scoring.score);
  }

  /**
   * Get count of papers in queue
   */
  count() {
    return this.papers.length;
  }

  /**
   * Clear the queue (called after digest sent)
   */
  clear() {
    this.papers = [];
    this.lastDigestSentAt = new Date();
    this.save();
    console.log('Queue cleared');
  }

  /**
   * Check if digest should be triggered
   * @returns {Object} - {shouldTrigger, reason}
   */
  shouldTriggerDigest() {
    const paperCount = this.count();
    const threshold = this.config.queue.digestThreshold;

    // Check paper count threshold
    if (paperCount >= threshold) {
      return {
        shouldTrigger: true,
        reason: `Paper threshold reached (${paperCount}/${threshold})`
      };
    }

    // Check time threshold (max days between digests)
    if (this.lastDigestSentAt) {
      const daysSinceLastDigest = (new Date() - this.lastDigestSentAt) / (1000 * 60 * 60 * 24);
      const maxDays = this.config.queue.maxDaysBetweenDigests;

      if (daysSinceLastDigest >= maxDays && paperCount > 0) {
        return {
          shouldTrigger: true,
          reason: `Time threshold reached (${Math.floor(daysSinceLastDigest)} days since last digest, max ${maxDays} days)`
        };
      }
    }

    return {
      shouldTrigger: false,
      reason: `Waiting for more papers (${paperCount}/${threshold}) or ${this.config.queue.maxDaysBetweenDigests} days`
    };
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const papers = this.papers;
    const threatCounts = {
      HIGH: papers.filter(p => p.scoring.threatLevel === 'HIGH').length,
      MEDIUM: papers.filter(p => p.scoring.threatLevel === 'MEDIUM').length,
      LOW: papers.filter(p => p.scoring.threatLevel === 'LOW').length
    };

    const avgScore = papers.length > 0
      ? papers.reduce((sum, p) => sum + p.scoring.score, 0) / papers.length
      : 0;

    const tripleMatchCount = papers.filter(p => p.scoring.tripleMatch).length;

    return {
      totalPapers: papers.length,
      threatCounts,
      avgScore: Math.round(avgScore * 10) / 10,
      tripleMatchCount,
      oldestPaper: papers.length > 0 ? papers[0].addedAt : null,
      lastDigestSentAt: this.lastDigestSentAt ? this.lastDigestSentAt.toISOString() : null
    };
  }

  /**
   * Remove papers older than N days (cleanup)
   */
  removeOldPapers(maxAgeDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    const initialCount = this.papers.length;
    this.papers = this.papers.filter(p => {
      const paperDate = new Date(p.addedAt);
      return paperDate >= cutoffDate;
    });

    const removed = initialCount - this.papers.length;
    if (removed > 0) {
      this.save();
      console.log(`Removed ${removed} papers older than ${maxAgeDays} days`);
    }

    return removed;
  }
}

module.exports = PaperQueue;
