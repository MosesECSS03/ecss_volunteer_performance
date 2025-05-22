const axios = require('axios');

// OneSignal App ID and REST API Key
const ONESIGNAL_APP_ID = '62117916-bc7c-4424-a12a-f6e54aa06cc5';
const ONESIGNAL_API_KEY = 'Basic os_v2_app_miixsfv4prccjijk63suvidmyvm7nqsikitusvmkedxsb2rzugsl34k5btsmzu5fjzywwfsrhbza3aqx4rujtqciuhsxdrnr7fueydy';

/**
 * Send a OneSignal push notification to all users as a visible banner.
 */
async function sendOneSignalNotification({ title, message, url }) {
  try {
    console.log("Sending OneSignal notification with:", { title, message, url });

    const data = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["Active Users", "Engaged Users", "All"],
      contents: { en: message },
      headings: { en: title },
      url: url,
      priority: 10,
      ttl: 259200,
      android_sound: "default",
      ios_sound: "default",
      chrome_web_icon: "https://ecss.org.sg/wp-content/uploads/2023/03/cropped-EN_Logo_RGB_Normal_Small-01.png", // Optional: your icon URL
      chrome_web_image: "https://ecss.org.sg/wp-content/uploads/2023/03/cropped-EN_Logo_RGB_Normal_Small-01.png", // Optional: banner image
      // Remove content_available/mutable_content to avoid silent notifications
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