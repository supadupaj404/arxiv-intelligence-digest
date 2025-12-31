const fs = require('fs');
const path = require('path');

class CompetitiveIntelScorer {
  constructor(configPath = null) {
    // Load scoring weights from config
    const weightsPath = configPath || path.join(__dirname, '../../config/scoring-weights.json');
    this.weights = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));

    // Load main config
    const defaultConfigPath = path.join(__dirname, '../../config/default.json');
    this.config = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf8'));

    // Core regex patterns (ported from arxiv_monitor.py lines 41-44)
    this.DOMAIN_PATTERN = /\b(music|audio|sound|waveform|symbolic|MIDI|stems|harmonic|timbre|melody|rhythm)\b/gi;
    this.MODELS_PATTERN = /\b(generative|diffusion|transformer|autoregressive|latent|flow|foundation)\b/gi;
    this.DATA_PATTERN = /\b(proprietary|private|in[-\s]house|internal|owned|rights|licens(e|ing|ed)|consent|commercial|dataset|corpus|curation|synthetic data|copyright|watermark|attribution|compliance)\b/gi;
    this.INDUSTRY_PATTERN = /\b(record label|production music|sync|sample library|splice|catalog|library|a&r|tv|film|advertising)\b/gi;
  }

  /**
   * Score a paper's relevance for competitive intelligence
   * Port of arxiv_monitor.py relevance_score() function (lines 83-90)
   */
  scorePaper(paper) {
    const text = `${paper.title} ${paper.abstract}`.toLowerCase();

    const scores = {
      domain: 0,
      generative: 0,
      dataEdge: 0,
      commercial: 0,
      categoryBoost: 0
    };

    // Domain scoring (music/audio relevance)
    scores.domain = this.scoreDomain(text, paper.categories);

    // Generative AI scoring
    scores.generative = this.scoreGenerative(text);

    // Data edge scoring (proprietary data, licensing - HIGHEST WEIGHT)
    scores.dataEdge = this.scoreDataEdge(text);

    // Commercial signals
    scores.commercial = this.scoreCommercial(text);

    // Category boost
    scores.categoryBoost = this.scoreCategoryRelevance(paper.categories || []);

    // Calculate weighted total
    const weightedTotal =
      scores.domain * this.config.scoring.weights.domain +
      scores.generative * this.config.scoring.weights.generative +
      scores.dataEdge * this.config.scoring.weights.dataEdge +
      scores.commercial * this.config.scoring.weights.commercial +
      scores.categoryBoost * this.config.scoring.weights.categoryBoost;

    // Triple match bonus (domain + models + data all present)
    // Port of arxiv_monitor.py line 88-89
    const hasTripleMatch =
      this.DOMAIN_PATTERN.test(text) &&
      this.MODELS_PATTERN.test(text) &&
      this.DATA_PATTERN.test(text);

    const tripleMatchBonus = hasTripleMatch ? 2.0 : 0;
    const rawScore = weightedTotal + tripleMatchBonus;

    // Normalize to 0-10 scale (max possible: domain(3) + gen(3) + data(4*1.5=6) + comm(3) + cat(2*0.5=1) + triple(2) = 18)
    const maxPossibleScore = 18;
    const normalizedScore = Math.min((rawScore / maxPossibleScore) * 10, 10);

    // Threat assessment
    const threatLevel = this.assessThreatLevel(scores, text);

    return {
      score: Math.round(normalizedScore * 10) / 10, // Round to 1 decimal
      breakdown: scores,
      tripleMatch: hasTripleMatch,
      threatLevel,
      rawScore,
      isRelevant: normalizedScore >= this.config.queue.minRelevanceScore
    };
  }

  scoreDomain(text, categories) {
    let score = 0;

    // Tier 1 keywords
    this.weights.domainKeywords.tier1.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        score += Math.min(matches.length * this.weights.domainKeywords.tier1.weight, 1.5);
      }
    });

    // Tier 2 keywords
    this.weights.domainKeywords.tier2.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(text)) {
        score += this.weights.domainKeywords.tier2.weight;
      }
    });

    // Category bonus
    const audioCats = ['cs.SD', 'eess.AS', 'cs.MM'];
    if (categories.some(cat => audioCats.includes(cat))) {
      score += 1.0;
    }

    return Math.min(score, 3);
  }

  scoreGenerative(text) {
    let score = 0;

    // Tier 1
    this.weights.generativeKeywords.tier1.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(text)) {
        score += this.weights.generativeKeywords.tier1.weight;
      }
    });

    // Tier 2
    this.weights.generativeKeywords.tier2.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(text)) {
        score += this.weights.generativeKeywords.tier2.weight;
      }
    });

    return Math.min(score, 3);
  }

  scoreDataEdge(text) {
    let score = 0;

    // Tier 1: Critical proprietary data signals
    this.weights.dataEdgeKeywords.tier1_critical.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        score += Math.min(matches.length * this.weights.dataEdgeKeywords.tier1_critical.weight, 2.0);
      }
    });

    // Tier 2: Licensing/rights
    this.weights.dataEdgeKeywords.tier2_licensing.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        score += Math.min(matches.length * this.weights.dataEdgeKeywords.tier2_licensing.weight, 2.0);
      }
    });

    // Tier 3: Commercial
    this.weights.dataEdgeKeywords.tier3_commercial.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(text)) {
        score += this.weights.dataEdgeKeywords.tier3_commercial.weight;
      }
    });

    // Tier 4: Compliance
    this.weights.dataEdgeKeywords.tier4_compliance.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(text)) {
        score += this.weights.dataEdgeKeywords.tier4_compliance.weight;
      }
    });

    return Math.min(score, 4);
  }

  scoreCommercial(text) {
    let score = 0;

    // Industry keywords (high value)
    this.weights.industryKeywords.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(text)) {
        score += this.weights.industryKeywords.weight;
      }
    });

    // Tier 1
    this.weights.commercialKeywords.tier1.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(text)) {
        score += this.weights.commercialKeywords.tier1.weight;
      }
    });

    // Tier 2
    this.weights.commercialKeywords.tier2.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(text)) {
        score += this.weights.commercialKeywords.tier2.weight;
      }
    });

    return Math.min(score, 3);
  }

  scoreCategoryRelevance(categories) {
    const highRelevance = ['cs.SD', 'eess.AS'];
    const medRelevance = ['cs.LG', 'cs.MM', 'cs.HC', 'cs.CL'];

    if (categories.some(cat => highRelevance.includes(cat))) return 2;
    if (categories.some(cat => medRelevance.includes(cat))) return 1;
    return 0;
  }

  assessThreatLevel(scores, text) {
    const thresholds = this.config.scoring.threatThresholds;

    // HIGH: Proprietary data advantage in generative models
    if (scores.dataEdge >= thresholds.high.dataEdge &&
        scores.generative >= thresholds.high.generative) {
      // Extra check for "proprietary" keywords
      if (/\b(proprietary|exclusive|private|in[-\s]house)\b/gi.test(text)) {
        return 'HIGH';
      }
      return 'MEDIUM';
    }

    // MEDIUM: Commercial product development
    if (scores.commercial >= thresholds.medium.commercial &&
        scores.generative >= thresholds.medium.generative) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  /**
   * Batch score multiple papers
   */
  scoreMultiplePapers(papers) {
    return papers.map(paper => ({
      ...paper,
      scoring: this.scorePaper(paper)
    }));
  }

  /**
   * Filter papers by minimum relevance score
   */
  filterRelevantPapers(papers) {
    const scoredPapers = this.scoreMultiplePapers(papers);
    const relevant = scoredPapers.filter(p => p.scoring.isRelevant);

    // Sort by score descending
    relevant.sort((a, b) => b.scoring.score - a.scoring.score);

    return {
      relevantPapers: relevant,
      filteredOut: papers.length - relevant.length,
      totalAnalyzed: papers.length
    };
  }
}

module.exports = CompetitiveIntelScorer;
