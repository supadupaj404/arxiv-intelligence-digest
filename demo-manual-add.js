#!/usr/bin/env node

require('dotenv').config();
const ArxivFetcher = require('./src/arxiv-fetcher');
const CompetitiveIntelScorer = require('./src/scoring/competitive-intel-scorer');
const PaperQueue = require('./src/queue/paper-queue');
const AISummarizer = require('./src/ai/summarizer');

/**
 * Demo: Manually add a paper to test the full pipeline
 * Usage: node demo-manual-add.js <arxiv-id>
 * Example: node demo-manual-add.js 2401.00001
 */

async function processPaper(arxivId) {
  console.log(`\n🔬 Processing arXiv paper: ${arxivId}\n`);
  console.log('='.repeat(80));

  try {
    // Step 1: Fetch paper details
    console.log('\n1️⃣ Fetching paper metadata from arXiv...');
    const fetcher = new ArxivFetcher();
    const paper = await fetcher.fetchPaperDetails(arxivId);

    if (!paper) {
      console.log('✗ Failed to fetch paper');
      return;
    }

    console.log(`✓ Title: ${paper.title}`);
    console.log(`✓ Authors: ${paper.authors.slice(0, 3).join(', ')}${paper.authors.length > 3 ? '...' : ''}`);
    console.log(`✓ Categories: ${paper.categories.join(', ')}`);

    // Step 2: Score paper
    console.log('\n2️⃣ Scoring for competitive intelligence...');
    const scorer = new CompetitiveIntelScorer();
    const scoring = scorer.scorePaper(paper);
    paper.scoring = scoring;

    console.log(`✓ Score: ${scoring.score}/10`);
    console.log(`✓ Threat Level: ${scoring.threatLevel}`);
    console.log(`✓ Triple Match: ${scoring.tripleMatch ? 'YES' : 'NO'}`);
    console.log('\nScore Breakdown:');
    console.log(`  - Domain: ${scoring.breakdown.domain}/3`);
    console.log(`  - Generative: ${scoring.breakdown.generative}/3`);
    console.log(`  - Data Edge: ${scoring.breakdown.dataEdge}/4`);
    console.log(`  - Commercial: ${scoring.breakdown.commercial}/3`);
    console.log(`  - Category Boost: ${scoring.breakdown.categoryBoost}/2`);

    if (!scoring.isRelevant) {
      console.log(`\n✗ Paper below relevance threshold (${scoring.score} < 5.0)`);
      return;
    }

    // Step 3: Generate AI summary
    console.log('\n3️⃣ Generating AI summary with Claude...');
    const summarizer = new AISummarizer();
    const summary = await summarizer.summarizePaper(paper);
    paper.aiSummary = summary.summary;

    console.log('✓ Summary generated:');
    console.log('\n' + '-'.repeat(80));
    console.log(summary.summary);
    console.log('-'.repeat(80));

    // Step 4: Add to queue
    console.log('\n4️⃣ Adding to queue...');
    const queue = new PaperQueue();
    const added = queue.add(paper);

    if (added) {
      console.log(`✓ Paper added to queue`);
      console.log(`\n📊 Queue stats:`, queue.getStats());

      const trigger = queue.shouldTriggerDigest();
      console.log(`\n📬 Digest trigger: ${trigger.reason}`);
    } else {
      console.log('✗ Paper not added (duplicate or below threshold)');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Processing complete!\n');

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error);
  }
}

// CLI entry point
const arxivId = process.argv[2];

if (!arxivId) {
  console.log('Usage: node demo-manual-add.js <arxiv-id>');
  console.log('Example: node demo-manual-add.js 2401.00001');
  console.log('\nTry these real papers:');
  console.log('  - 2311.13466 (Music generation with diffusion)');
  console.log('  - 2310.17025 (Audio generation)');
  console.log('  - 2312.00752 (Music information retrieval)');
  process.exit(1);
}

processPaper(arxivId);
