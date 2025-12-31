# PM2 Commands for ArXiv Intelligence Digest

## Quick Start

```bash
# Start the monitor
pm2 start ecosystem.config.js

# Save the PM2 process list (survives reboots)
pm2 save

# Enable startup on boot
pm2 startup
# Then run the command it gives you (requires sudo)
```

## Daily Operations

```bash
# View status
pm2 status

# View logs (live)
pm2 logs arxiv-intel

# View last 100 lines
pm2 logs arxiv-intel --lines 100

# View only errors
pm2 logs arxiv-intel --err

# Restart after code updates
pm2 restart arxiv-intel

# Stop monitoring
pm2 stop arxiv-intel

# Remove from PM2
pm2 delete arxiv-intel
```

## Monitoring

```bash
# Real-time monitoring dashboard
pm2 monit

# Process details
pm2 describe arxiv-intel

# CPU/Memory usage
pm2 list
```

## Logs

Logs are stored in:
- `logs/output.log` - Standard output
- `logs/error.log` - Errors only
- `~/.pm2/logs/` - PM2's own logs

```bash
# View recent logs
tail -f logs/output.log

# View errors
tail -f logs/error.log

# Clear logs
pm2 flush
```

## Troubleshooting

### Monitor not processing papers
```bash
# Check if it's running
pm2 status

# View recent logs
pm2 logs arxiv-intel --lines 50

# Restart
pm2 restart arxiv-intel
```

### High memory usage
```bash
# Check memory
pm2 list

# Restart (clears memory)
pm2 restart arxiv-intel
```

### Update code
```bash
# Pull latest changes
git pull

# Install new dependencies (if package.json changed)
npm install

# Restart monitor
pm2 restart arxiv-intel
```

## Production Checklist

- [ ] Configure .env with real credentials
- [ ] Enable email in config/default.json
- [ ] Test with: `npm test`
- [ ] Start with PM2: `pm2 start ecosystem.config.js`
- [ ] Save PM2 list: `pm2 save`
- [ ] Enable startup: `pm2 startup` (then run the command it shows)
- [ ] Monitor logs for first hour: `pm2 logs arxiv-intel`
- [ ] Verify first digest sent successfully

## Advanced

### Run multiple instances (if needed)
```bash
pm2 start ecosystem.config.js -i 2  # 2 instances
```

### Custom environment variables
```bash
pm2 start ecosystem.config.js --env production
```

### Export/Import PM2 config
```bash
# Export
pm2 save

# Import on new machine
pm2 resurrect
```
