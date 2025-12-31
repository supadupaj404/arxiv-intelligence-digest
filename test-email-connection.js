#!/usr/bin/env node

require('dotenv').config();
const EmailSender = require('./src/output/email-sender');

console.log('Testing email connection...\n');
console.log('Email settings:');
console.log(`  From: ${process.env.EMAIL_USER}`);
console.log(`  To: ${process.env.EMAIL_TO}`);
console.log(`  Host: ${process.env.EMAIL_HOST}`);
console.log(`  Port: ${process.env.EMAIL_PORT}`);
console.log('');

const emailConfig = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  to: process.env.EMAIL_TO
};

const sender = new EmailSender(emailConfig);
sender.testConnection()
  .then(() => {
    console.log('\n✅ Email connection successful!');
    console.log('\nYou can now:');
    console.log('  1. Add a test paper: node demo-manual-add.js 2312.00752');
    console.log('  2. Send digest: node send-digest.js');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Email connection failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  - Check App Password is correct in .env');
    console.error('  - Verify 2-Step Verification is enabled');
    console.error('  - Try generating a new App Password');
    process.exit(1);
  });
