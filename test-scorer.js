const CompetitiveIntelScorer = require('./src/scoring/competitive-intel-scorer');

// Test papers
const testPapers = [
  {
    id: 'arxiv:2401.00001',
    title: 'Proprietary Music Generation Using Diffusion Models',
    abstract: 'We present a novel approach to music generation using proprietary datasets and diffusion transformers. Our method leverages exclusive licensed catalogs to train generative models for commercial audio production.',
    categories: ['cs.SD', 'cs.LG']
  },
  {
    id: 'arxiv:2401.00002',
    title: 'Audio Classification in Embedded Systems',
    abstract: 'We propose a lightweight audio classification system for embedded devices. The model achieves real-time performance on resource-constrained hardware.',
    categories: ['eess.AS']
  },
  {
    id: 'arxiv:2401.00003',
    title: 'Data Licensing Frameworks for Generative AI',
    abstract: 'This paper examines licensing frameworks for proprietary music data used in commercial generative AI systems. We analyze copyright, consent, and attribution requirements for training datasets.',
    categories: ['cs.CY', 'cs.LG']
  }
];

console.log('Testing Competitive Intelligence Scorer\n');
console.log('=' .repeat(80));

const scorer = new CompetitiveIntelScorer();

testPapers.forEach((paper, index) => {
  console.log(`\nTest Paper ${index + 1}: ${paper.title}`);
  console.log('-'.repeat(80));

  const result = scorer.scorePaper(paper);

  console.log(`Score: ${result.score}/10 ${result.isRelevant ? '✓ RELEVANT' : '✗ FILTERED'}`);
  console.log(`Threat Level: ${result.threatLevel}`);
  console.log(`Triple Match: ${result.tripleMatch ? 'YES' : 'NO'}`);
  console.log('\nScore Breakdown:');
  console.log(`  Domain: ${result.breakdown.domain}/3`);
  console.log(`  Generative: ${result.breakdown.generative}/3`);
  console.log(`  Data Edge: ${result.breakdown.dataEdge}/4`);
  console.log(`  Commercial: ${result.breakdown.commercial}/3`);
  console.log(`  Category Boost: ${result.breakdown.categoryBoost}/2`);
});

console.log('\n' + '='.repeat(80));
console.log('\nBatch Filtering Test:');
const filtered = scorer.filterRelevantPapers(testPapers);
console.log(`Total analyzed: ${filtered.totalAnalyzed}`);
console.log(`Relevant papers: ${filtered.relevantPapers.length}`);
console.log(`Filtered out: ${filtered.filteredOut}`);
console.log('\nRelevant papers (sorted by score):');
filtered.relevantPapers.forEach((paper, index) => {
  console.log(`  ${index + 1}. [${paper.scoring.score}] ${paper.title}`);
});
