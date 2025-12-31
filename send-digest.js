#!/usr/bin/env node

require('dotenv').config();
const IntelligenceDigestMonitor = require('./monitor');

/**
 * Manual digest sender
 * Forces immediate digest generation and sending regardless of thresholds
 */

console.log('📧 Manual Digest Sender\n');
console.log('='.repeat(80));

const monitor = new IntelligenceDigestMonitor();

// Check if queue has papers
const paperCount = monitor.queue.count();

if (paperCount === 0) {
  console.log('✗ No papers in queue. Nothing to send.');
  console.log('\nTip: Run the monitor first to collect papers:');
  console.log('  npm start\n');
  process.exit(0);
}

console.log(`Found ${paperCount} papers in queue`);
console.log('Sending digest now...\n');

// Force send digest
monitor.sendDigest()
  .then(() => {
    console.log('\n✓ Digest sent successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Error sending digest:', error.message);
    process.exit(1);
  });
