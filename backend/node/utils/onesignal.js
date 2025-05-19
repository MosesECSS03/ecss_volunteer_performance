const axios = require('axios');

// OneSignal App ID and REST API Key
const ONESIGNAL_APP_ID = '62117916-bc7c-4424-a12a-f6e54aa06cc5';
const ONESIGNAL_API_KEY = 'Basic os_v2_app_miixsfv4prccjijk63suvidmyvm7nqsikitusvmkedxsb2rzugsl34k5btsmzu5fjzywwfsrhbza3aqx4rujtqciuhsxdrnr7fueydy';

/**
 * Send a OneSignal push notification to all users.
 */
async function sendOneSignalNotification({ title, message, url }) {
  try {
    console.log("Sending OneSignal notification with:", { title, message, url });
    
    // Try multiple segments to reach more users
    const data = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["Active Users", "Engaged Users", "All"],  // Try multiple segments
      // For testing with specific device
      // include_player_ids: ["YOUR-TEST-DEVICE-ID"],
      contents: { en: message },
      headings: { en: title },
      url: url,
      // Make notification more prominent
      priority: 10,
      ttl: 259200  // 3 days in seconds
    };
    
    console.log("OneSignal request payload:", JSON.stringify(data));
    
    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications', 
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': ONESIGNAL_API_KEY
        }
      }
    );
    
    console.log("OneSignal API response:", response.data);
    return response.data;
  } catch (error) {
    console.error("OneSignal API error:", error.response ? error.response.data : error.message);
    throw error;
  }
}

module.exports = { sendOneSignalNotification };