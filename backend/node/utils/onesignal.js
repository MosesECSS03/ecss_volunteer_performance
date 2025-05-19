const axios = require('axios');

// OneSignal App ID and REST API Key
const ONESIGNAL_APP_ID = '62117916-bc7c-4424-a12a-f6e54aa06cc5';
const ONESIGNAL_API_KEY = 'Basic os_v2_app_miixsfv4prccjijk63suvidmyvm7nqsikitusvmkedxsb2rzugsl34k5btsmzu5fjzywwfsrhbza3aqx4rujtqciuhsxdrnr7fueydy';

/**
 * Send a OneSignal push notification to all users.
 * @param {Object} param0
 * @param {string} param0.title - Notification title
 * @param {string} param0.message - Notification message
 * @param {string} [param0.url] - URL to open on click
 */
async function sendOneSignalNotification({ title, message, url }) {
  const data = {
    app_id: ONESIGNAL_APP_ID,
    included_segments: ['All'],
    headings: { en: title },
    contents: { en: message },
    url: url,
  };

  await axios.post('https://onesignal.com/api/v1/notifications', data, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': ONESIGNAL_API_KEY,
    }
  });
}

module.exports = { sendOneSignalNotification };