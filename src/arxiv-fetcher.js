const axios = require('axios');
const xml2js = require('xml2js');

class ArxivFetcher {
  constructor() {
    this.baseUrl = 'http://export.arxiv.org/api/query';
  }

  async fetchPaperDetails(paperId) {
    try {
      const response = await axios.get(`${this.baseUrl}?id_list=${paperId}`);
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);
      
      const entry = result.feed.entry[0];
      if (!entry) {
        throw new Error(`Paper ${paperId} not found`);
      }

      return {
        id: paperId,
        title: entry.title[0].trim(),
        abstract: entry.summary[0].trim(),
        authors: entry.author.map(author => author.name[0]),
        published: entry.published[0],
        updated: entry.updated[0],
        categories: entry.category.map(cat => cat.$.term),
        pdfUrl: entry.link.find(link => link.$.type === 'application/pdf')?.$.href,
        arxivUrl: entry.link.find(link => link.$.type === 'text/html')?.$.href
      };
    } catch (error) {
      console.error(`Error fetching paper ${paperId}:`, error.message);
      return null;
    }
  }

  async fetchMultiplePapers(paperIds) {
    console.log(`Fetching details for ${paperIds.length} papers from arXiv...`);
    
    const papers = [];
    const batchSize = 10; // arXiv API rate limiting
    
    for (let i = 0; i < paperIds.length; i += batchSize) {
      const batch = paperIds.slice(i, i + batchSize);
      const batchPromises = batch.map(paperId => this.fetchPaperDetails(paperId));
      const batchResults = await Promise.all(batchPromises);
      
      papers.push(...batchResults.filter(paper => paper !== null));
      
      // Rate limiting
      if (i + batchSize < paperIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Successfully fetched ${papers.length} paper details`);
    return papers;
  }

  isAudioMusicRelevant(paper) {
    const relevantKeywords = [
      'audio', 'music', 'sound', 'speech', 'vocal', 'instrumental',
      'melody', 'harmony', 'rhythm', 'beat', 'tempo', 'genre',
      'synthesis', 'generation', 'composition', 'arrangement',
      'signal processing', 'acoustics', 'psychoacoustics',
      'mir', 'music information retrieval', 'audio analysis',
      'singing', 'voice', 'pitch', 'timbre', 'spectrum',
      'midi', 'daw', 'mixing', 'mastering', 'production'
    ];

    const textToCheck = `${paper.title} ${paper.abstract}`.toLowerCase();
    
    let score = 0;
    relevantKeywords.forEach(keyword => {
      if (textToCheck.includes(keyword)) {
        score += 1;
      }
    });

    return {
      score: score / relevantKeywords.length,
      isRelevant: score > 0,
      matchedKeywords: relevantKeywords.filter(kw => textToCheck.includes(kw))
    };
  }
}

module.exports = ArxivFetcher;