module.exports = {
  apps: [{
    name: 'arxiv-intel',
    script: './monitor.js',

    // Restart settings
    autorestart: true,
    watch: false,  // Don't watch files (we'll restart manually after updates)
    max_memory_restart: '500M',

    // Environment
    env: {
      NODE_ENV: 'production'
    },

    // Logging
    error_file: './logs/error.log',
    out_file: './logs/output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // Advanced
    exp_backoff_restart_delay: 100,  // Exponential backoff on restart
    max_restarts: 10,  // Max restarts within min_uptime
    min_uptime: '10s',  // Minimum uptime before considering "stable"

    // Cron restart (optional - restart daily at 3am to clear any memory leaks)
    cron_restart: '0 3 * * *'
  }]
};
