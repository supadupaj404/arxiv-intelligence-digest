# Email Setup Guide

## Gmail Configuration (Recommended)

### Step 1: Enable 2-Step Verification

1. Go to https://myaccount.google.com/security
2. Click **2-Step Verification**
3. Follow the prompts to enable it

### Step 2: Create App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select **Mail** as the app
3. Select **Other** as the device, enter "ArXiv Monitor"
4. Click **Generate**
5. Copy the 16-character password (no spaces)

### Step 3: Configure .env

Edit `.env` and add your settings:

```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
EMAIL_TO=your-email@gmail.com  # Can be same or different
```

### Step 4: Enable Email in Config

Edit `config/default.json`:

```json
{
  "email": {
    "enabled": true,  // Change from false to true
    "format": "html",
    "maxPapersPerDigest": 10
  }
}
```

### Step 5: Test Email

```bash
node send-digest.js
```

If queue is empty, you'll see "No papers in queue". That's OK! Add a test paper first:

```bash
node demo-manual-add.js 2312.00752
```

Then send digest:

```bash
node send-digest.js
```

You should receive an email!

---

## Alternative: Other SMTP Services

### SendGrid (100 emails/day free)

1. Sign up at https://sendgrid.com/
2. Create an API key
3. Configure `.env`:
   ```bash
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_USER=apikey
   EMAIL_PASS=your-sendgrid-api-key
   EMAIL_TO=your-email@example.com
   ```

### Mailgun (1,000 emails/month free)

1. Sign up at https://mailgun.com/
2. Verify your domain or use sandbox
3. Get SMTP credentials
4. Configure `.env`:
   ```bash
   EMAIL_HOST=smtp.mailgun.org
   EMAIL_PORT=587
   EMAIL_USER=postmaster@your-domain.mailgun.org
   EMAIL_PASS=your-mailgun-password
   EMAIL_TO=your-email@example.com
   ```

### AWS SES (62,000 emails/month free)

1. Set up AWS account
2. Verify email address in SES console
3. Get SMTP credentials
4. Configure `.env`:
   ```bash
   EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
   EMAIL_PORT=587
   EMAIL_USER=your-ses-smtp-username
   EMAIL_PASS=your-ses-smtp-password
   EMAIL_TO=your-email@example.com
   ```

---

## Testing

### Test SMTP Connection

```javascript
node -e "require('./src/output/email-sender').testConnection()"
```

### Send Test Digest

```bash
# Add a paper to queue
node demo-manual-add.js 2312.00752

# Send digest
node send-digest.js
```

### Check Email

- Check inbox (and spam folder!)
- Email should have:
  - Subject: "ArXiv Intelligence Digest - X Papers (Y HIGH priority)"
  - HTML formatting with color-coded threat levels
  - Links to arXiv abstracts and PDFs

---

## Production Deployment

Once email is working:

1. **Start monitor with PM2**:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   ```

2. **Monitor first digest**:
   ```bash
   pm2 logs arxiv-intel
   ```

3. **Set up auto-start on boot**:
   ```bash
   pm2 startup
   # Run the command it shows
   ```

---

## Troubleshooting

### No Email Received

1. **Check spam folder** - First-time emails often go to spam
2. **Check PM2 logs**: `pm2 logs arxiv-intel --err`
3. **Test connection**: `node -e "require('./src/output/email-sender').testConnection()"`
4. **Verify credentials** - Double-check EMAIL_USER and EMAIL_PASS in `.env`

### "Invalid login" Error

- Gmail: Make sure you're using an **App Password**, not your regular password
- Other services: Verify username/password are correct

### "Connection timeout"

- Check EMAIL_PORT (should be 587 for most services)
- Check firewall isn't blocking port 587
- Try port 465 (SSL) if 587 doesn't work

### Email Formatting Broken

- Gmail/Outlook/Apple Mail should all render correctly
- If images/styles broken, check `templates/email-digest.html`

---

## Customization

### Change Email Template

Edit `templates/email-digest.html` to customize:
- Colors (threat level indicators)
- Fonts and sizing
- Layout
- Add logo/branding

### Customize Subject Line

Edit `monitor.js` line 147:
```javascript
const subject = `ArXiv Intelligence Digest - ${papers.length} Papers (${stats.threatCounts.HIGH} HIGH priority)`;
```

### Add Attachments

Edit `src/output/email-sender.js` to add PDF attachments, CSV exports, etc.
