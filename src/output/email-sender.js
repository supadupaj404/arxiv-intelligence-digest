const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class EmailSender {
  constructor(config) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass
      }
    });
  }

  async sendDigest(digestContent, summaryCount, timeframe = '7 days') {
    const subject = `ArXiv Sound Digest - ${summaryCount} Papers (${timeframe})`;
    
    const htmlContent = this.convertMarkdownToHtml(digestContent);
    
    const mailOptions = {
      from: this.config.user,
      to: this.config.to,
      subject: subject,
      text: digestContent,
      html: htmlContent
    };

    try {
      console.log(`Sending email digest to ${this.config.to}...`);
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending email:', error.message);
      throw error;
    }
  }

  convertMarkdownToHtml(markdown) {
    // Simple markdown to HTML conversion
    let html = markdown
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/^---$/gm, '<hr>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #2c3e50; border-bottom: 2px solid #3498db; }
            h2 { color: #34495e; margin-top: 30px; }
            h3 { color: #7f8c8d; }
            a { color: #3498db; text-decoration: none; }
            a:hover { text-decoration: underline; }
            hr { border: none; border-top: 1px solid #ecf0f1; margin: 20px 0; }
            .relevance { background: #f8f9fa; padding: 5px 10px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <p>${html}</p>
        </body>
      </html>
    `;
  }

  async saveDigestToFile(digestContent, filename = null) {
    if (!filename) {
      const date = new Date().toISOString().split('T')[0];
      filename = `digest_${date}.md`;
    }
    
    const outputDir = path.join(process.cwd(), 'output');
    await fs.mkdir(outputDir, { recursive: true });
    
    const filepath = path.join(outputDir, filename);
    await fs.writeFile(filepath, digestContent, 'utf8');
    
    console.log(`Digest saved to: ${filepath}`);
    return filepath;
  }

  async sendEmail({ subject, html, text }) {
    const mailOptions = {
      from: this.config.user,
      to: this.config.to,
      subject: subject,
      html: html,
      text: text
    };

    try {
      console.log(`📤 Sending email to ${this.config.to}...`);
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✓ Email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('✗ Email sending failed:', error.message);
      throw error;
    }
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('Email connection verified successfully');
      return true;
    } catch (error) {
      console.error('Email connection failed:', error.message);
      return false;
    }
  }
}

module.exports = EmailSender;