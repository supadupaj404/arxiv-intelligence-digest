const axios = require('axios');
const fs = require('fs');
const path = require('path');

class AISummarizer {
  constructor(apiKey = null, configPath = null) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found in environment');
    }

    this.baseUrl = 'https://api.anthropic.com/v1/messages';

    // Load config
    const defaultConfigPath = configPath || path.join(__dirname, '../../config/default.json');
    this.config = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf8'));

    // Load prompt template
    const promptPath = path.join(__dirname, 'prompts/paper-analysis.txt');
    this.promptTemplate = fs.readFileSync(promptPath, 'utf8');
  }

  /**
   * Create competitive intelligence prompt for a paper
   */
  createPrompt(paper) {
    const authors = paper.authors.join(', ');
    const categories = paper.categories.join(', ');
    const score = paper.scoring ? paper.scoring.score : 'N/A';
    const threatLevel = paper.scoring ? paper.scoring.threatLevel : 'UNKNOWN';

    return this.promptTemplate
      .replace('{{title}}', paper.title)
      .replace('{{authors}}', authors)
      .replace('{{abstract}}', paper.abstract)
      .replace('{{categories}}', categories)
      .replace('{{score}}', score)
      .replace('{{threatLevel}}', threatLevel);
  }

  /**
   * Summarize a single paper using Claude
   */
  async summarizePaper(paper) {
    const prompt = this.createPrompt(paper);

    try {
      console.log(`Summarizing paper: ${paper.title.substring(0, 60)}...`);

      const response = await axios.post(this.baseUrl, {
        model: this.config.ai.model,
        max_tokens: this.config.ai.maxTokens,
        messages: [{
          role: 'user',
          content: prompt
        }]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        }
      });

      const summary = response.data.content[0].text;

      console.log(`✓ Generated summary (${summary.length} chars)`);

      return {
        paperId: paper.id,
        summary: summary,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`✗ Error summarizing paper ${paper.id}:`, error.response?.data || error.message);
      return {
        paperId: paper.id,
        summary: `Error generating summary: ${error.message}`,
        generatedAt: new Date().toISOString(),
        error: true
      };
    }
  }

  /**
   * Summarize multiple papers with rate limiting
   */
  async summarizeMultiplePapers(papers) {
    console.log(`\nGenerating AI summaries for ${papers.length} papers...`);
    const summaries = [];

    for (const paper of papers) {
      const summary = await this.summarizePaper(paper);
      summaries.push({
        ...paper,
        aiSummary: summary.summary,
        summaryGeneratedAt: summary.generatedAt,
        summaryError: summary.error || false
      });

      // Rate limiting (from config)
      if (this.config.ai.rateLimitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, this.config.ai.rateLimitMs));
      }
    }

    console.log(`\n✓ Generated ${summaries.length} summaries`);
    return summaries;
  }

  /**
   * Test connection to Claude API
   */
  async testConnection() {
    try {
      const response = await axios.post(this.baseUrl, {
        model: this.config.ai.model,
        max_tokens: 50,
        messages: [{
          role: 'user',
          content: 'Say "API connection test successful" and nothing else.'
        }]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        }
      });

      console.log('✓ Claude API connection successful');
      console.log(`Model: ${this.config.ai.model}`);
      return true;

    } catch (error) {
      console.error('✗ Claude API connection failed:', error.response?.data || error.message);
      return false;
    }
  }
}

module.exports = AISummarizer;
