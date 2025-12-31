const PaperQueue = require('./src/queue/paper-queue');
const CompetitiveIntelScorer = require('./src/scoring/competitive-intel-scorer');

console.log('Testing Paper Queue\n');
console.log('='.repeat(80));

// Initialize
const queue = new PaperQueue();
const scorer = new CompetitiveIntelScorer();

// Test papers
const testPapers = [
  {
    id: 'arxiv:2401.00001',
    title: 'Proprietary Music Generation Using Diffusion Models',
    abstract: 'We present a novel approach to music generation using proprietary datasets and diffusion transformers.',
    categories: ['cs.SD', 'cs.LG']
  },
  {
    id: 'arxiv:2401.00002',
    title: 'Low relevance paper',
    abstract: 'This is about something unrelated.',
    categories: []
  }
];

// Score papers
const scoredPapers = testPapers.map(paper => ({
  ...paper,
  scoring: scorer.scorePaper(paper)
}));

console.log('\nTest 1: Add papers to queue');
console.log('-'.repeat(80));
scoredPapers.forEach(paper => {
  const added = queue.add(paper);
  console.log(`${added ? '✓' : '✗'} ${paper.title} [Score: ${paper.scoring.score}]`);
});

console.log('\nTest 2: Check queue stats');
console.log('-'.repeat(80));
const stats = queue.getStats();
console.log(JSON.stringify(stats, null, 2));

console.log('\nTest 3: Check if digest should trigger');
console.log('-'.repeat(80));
const trigger = queue.shouldTriggerDigest();
console.log(`Should trigger: ${trigger.shouldTrigger}`);
console.log(`Reason: ${trigger.reason}`);

console.log('\nTest 4: Get sorted papers');
console.log('-'.repeat(80));
const sorted = queue.getSortedByScore();
sorted.forEach((paper, index) => {
  console.log(`${index + 1}. [${paper.scoring.score}] ${paper.title} - ${paper.scoring.threatLevel}`);
});

console.log('\nTest 5: Try adding duplicate');
console.log('-'.repeat(80));
const duplicate = queue.add(scoredPapers[0]);
console.log(`Duplicate added: ${duplicate}`);

console.log('\n' + '='.repeat(80));
console.log(`Final queue count: ${queue.count()}`);
