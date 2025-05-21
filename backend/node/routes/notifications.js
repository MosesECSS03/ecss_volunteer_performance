const express = require('express');
const router = express.Router();

// Example: Replace with your DB model if you have one
const NotificationController = require('../Controller/Notifications/Notifications');

router.post('/', async function(req, res) {
  try {
    const io = req.app.get('io');
    const { purpose } = req.body;
    console.log("Purpose Notification:", purpose);

    if (purpose === "insert") {
      const { type, date, description } = req.body;
      if (!type || !date || !description) {
        return res.status(400).json({ success: false, error: "Missing type, date, or description" });
      }
      var controller = new NotificationController();
      var notification = {
        type,
        date,
        description
      };
      const result = await controller.addNewNotification(notification);
      console.log("Notification Result:", result);

      // Emit the notification to all connected clients
      /*if (io) {
        io.emit('notification', { type, date, description });
      }*/

      // Return the actual result from the controller
      return res.json(result);
    } 
    else if (purpose === "retrieve") 
    {
      console.log("Purpose Notification Retrieving");
      // Handle the retrieval of notifications
      var controller = new NotificationController();
      const result = await controller.getNotifications();
      console.log("Retrieve Notification Result:", result);
      return res.json(result);
    }
  } catch (error) {
    console.error("Error in /notifications route:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;