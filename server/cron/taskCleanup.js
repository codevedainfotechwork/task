const cron = require('node-cron');
const taskCleanupCron = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Automatic completed-task archival is disabled to keep task history editable and visible.');
  });
};

module.exports = taskCleanupCron;
