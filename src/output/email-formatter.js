const fs = require('fs');
const path = require('path');

class EmailFormatter {
  constructor(templatePath = null) {
    this.templatePath = templatePath || path.join(__dirname, '../../templates/email-digest.html');
    this.template = fs.readFileSync(this.templatePath, 'utf8');
  }

  /**
   * Format a single paper as HTML
   */
  formatPaper(paper, index) {
    const threatLevel = paper.scoring.threatLevel.toLowerCase();
    const threatemoji = {
      'high': '🔴',
      'medium': '🟡',
      'low': '🟢'
    }[threatLevel] || '';

    return `
        <div class="paper threat-${threatLevel}">
            <div class="paper-header">
                <div class="paper-title">
                    <h3>${index + 1}. <a href="${paper.arxivUrl}">${paper.title}</a></h3>
                    <div style="font-size: 13px; color: #666; margin-top: 5px;">
                        ${paper.authors.slice(0, 3).join(', ')}${paper.authors.length > 3 ? ' et al.' : ''}
                    </div>
                </div>
                <div class="paper-meta">
                    <span class="score-badge">${paper.scoring.score}/10</span>
                    <span class="threat-badge ${threatLevel}">${threatemoji} ${threatLevel.toUpperCase()}</span>
                </div>
            </div>

            <div class="paper-summary">
                ${this.formatSummary(paper.aiSummary || 'Summary not available')}
            </div>

            <div style="margin-top: 15px; font-size: 13px; color: #666;">
                <strong>Links:</strong>
                <a href="${paper.arxivUrl}" style="color: #667eea;">Abstract</a> |
                <a href="${paper.pdfUrl}" style="color: #667eea;">PDF</a>
                ${paper.tweetLink ? `| <a href="${paper.tweetLink}" style="color: #667eea;">Tweet</a>` : ''}
            </div>
        </div>
    `;
  }

  /**
   * Format AI summary with proper HTML structure
   */
  formatSummary(summary) {
    // Convert markdown-style headers to HTML
    let formatted = summary
      .replace(/## ([A-Z\s&]+)/g, '<h4>$1</h4>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/- ([^\n]+)/g, '<li>$1</li>');

    // Wrap list items
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Wrap in paragraphs
    if (!formatted.startsWith('<h4>') && !formatted.startsWith('<p>')) {
      formatted = '<p>' + formatted;
    }
    if (!formatted.endsWith('</p>') && !formatted.endsWith('</ul>')) {
      formatted += '</p>';
    }

    return formatted;
  }

  /**
   * Format complete digest email
   */
  formatDigest(papers, options = {}) {
    // Calculate stats
    const threatCounts = {
      HIGH: papers.filter(p => p.scoring.threatLevel === 'HIGH').length,
      MEDIUM: papers.filter(p => p.scoring.threatLevel === 'MEDIUM').length,
      LOW: papers.filter(p => p.scoring.threatLevel === 'LOW').length
    };

    // Sort papers by score
    const sortedPapers = [...papers].sort((a, b) => b.scoring.score - a.scoring.score);

    // Limit to max papers (from config or default to 10)
    const maxPapers = options.maxPapers || 10;
    const displayPapers = sortedPapers.slice(0, maxPapers);

    // Format all papers as HTML
    const papersHtml = displayPapers.map((paper, index) =>
      this.formatPaper(paper, index)
    ).join('\n');

    // Calculate collection period
    const oldestDate = new Date(Math.min(...papers.map(p => new Date(p.addedAt))));
    const newestDate = new Date(Math.max(...papers.map(p => new Date(p.addedAt))));
    const collectionPeriod = this.formatDateRange(oldestDate, newestDate);

    // Replace template variables
    const html = this.template
      .replace('{{collectionPeriod}}', collectionPeriod)
      .replace('{{totalPapers}}', papers.length)
      .replace('{{highPriorityCount}}', threatCounts.HIGH)
      .replace('{{mediumPriorityCount}}', threatCounts.MEDIUM)
      .replace('{{lowPriorityCount}}', threatCounts.LOW)
      .replace('{{papers}}', papersHtml)
      .replace('{{generatedDate}}', new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }));

    return html;
  }

  /**
   * Format date range for collection period
   */
  formatDateRange(startDate, endDate) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const start = startDate.toLocaleDateString('en-US', options);
    const end = endDate.toLocaleDateString('en-US', options);

    if (start === end) {
      return start;
    }

    return `${start} - ${end}`;
  }

  /**
   * Create plain text version of digest
   */
  formatPlainText(papers, options = {}) {
    const maxPapers = options.maxPapers || 10;
    const sortedPapers = [...papers].sort((a, b) => b.scoring.score - a.scoring.score);
    const displayPapers = sortedPapers.slice(0, maxPapers);

    let text = '='.repeat(80) + '\n';
    text += 'ArXiv Intelligence Digest\n';
    text += 'Competitive Intelligence for Generative AI & Music\n';
    text += '='.repeat(80) + '\n\n';

    text += `Total Papers: ${papers.length}\n`;
    text += `High Priority: ${papers.filter(p => p.scoring.threatLevel === 'HIGH').length}\n`;
    text += `Medium Priority: ${papers.filter(p => p.scoring.threatLevel === 'MEDIUM').length}\n`;
    text += `Low Priority: ${papers.filter(p => p.scoring.threatLevel === 'LOW').length}\n\n`;

    text += '='.repeat(80) + '\n';
    text += 'TOP PAPERS (sorted by score)\n';
    text += '='.repeat(80) + '\n\n';

    displayPapers.forEach((paper, index) => {
      const emoji = {
        'HIGH': '🔴',
        'MEDIUM': '🟡',
        'LOW': '🟢'
      }[paper.scoring.threatLevel] || '';

      text += `${index + 1}. ${paper.title}\n`;
      text += `   Score: ${paper.scoring.score}/10 | Threat: ${emoji} ${paper.scoring.threatLevel}\n`;
      text += `   Authors: ${paper.authors.slice(0, 3).join(', ')}${paper.authors.length > 3 ? ' et al.' : ''}\n`;
      text += `   Links: ${paper.arxivUrl}\n\n`;

      if (paper.aiSummary) {
        // Clean up summary for plain text
        const cleanSummary = paper.aiSummary
          .replace(/##\s+/g, '')
          .replace(/\*\*/g, '')
          .trim();
        text += `   ${cleanSummary}\n\n`;
      }

      text += '-'.repeat(80) + '\n\n';
    });

    text += '='.repeat(80) + '\n';
    text += `Generated: ${new Date().toLocaleString()}\n`;
    text += 'Powered by Claude AI | Data source: @ArxivSound\n';

    return text;
  }
}

module.exports = EmailFormatter;
