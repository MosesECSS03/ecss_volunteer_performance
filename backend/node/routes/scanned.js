const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Path to the scanned tickets JSON file
const scannedTicketsPath = path.join(__dirname, '../Others/scannedTickets.json');

// Helper function to safely read JSON file
async function readScannedTickets() {
  try {
    const data = await fs.readFile(scannedTicketsPath, 'utf8');
    console.log("Read scanned tickets data:", data);
    return data.trim() ? JSON.parse(data) : [];
  } catch (error) {
    // File doesn't exist or has error, return empty array
    return [];
  }
}

// Helper function to safely write to JSON file
async function writeScannedTickets(tickets) {
  try {
    await fs.writeFile(scannedTicketsPath, JSON.stringify(tickets, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing to scanned tickets file:', error);
    return false;
  }
}

router.post('/', async function(req, res) {
  try {
    const io = req.app.get('io');
    const { purpose } = req.body;
    console.log("Purpose Scanned:", purpose);

    if (purpose === "scan") {
      const { seatNumber } = req.body;
      console.log("Seat Number Scanned:", seatNumber);
      
      if (!seatNumber) {
        return res.status(400).json({ success: false, error: "Missing seat number" });
      }

      // Read existing scanned tickets from JSON file
      const scannedTickets = await readScannedTickets();
      console.log("Current scanned tickets:", scannedTickets);
      
      // Write current state back to ensure file exists
      await writeScannedTickets(scannedTickets);

      // Check if seat is already scanned
      const existingTicket = scannedTickets.find(ticket => ticket.seatNumber === seatNumber);
      if (existingTicket) {
        return res.status(400).json({ 
          success: false, 
          error: "Seat already scanned"
        });
      }

      // Create new scanned ticket entry
      const scannedTicket = {
        seatNumber
      };

      // Add individual seat to the array
      scannedTickets.push(scannedTicket);

      // Write back to JSON file
      const writeSuccess = await writeScannedTickets(scannedTickets);
      if (!writeSuccess) {
        return res.status(500).json({ 
          success: false, 
          error: "Failed to save scanned ticket" 
        });
      }

      console.log("Ticket Scanned:", scannedTicket);

      // Emit the scanned ticket to all connected clients
      if (io) {
        io.emit('ticketScanned', scannedTicket);
      }

      return res.json({ 
        success: true, 
        message: "Ticket scanned successfully",
        data: scannedTicket
      });
    }
    else if (purpose === "retrieve") {
      console.log("Purpose Scanned Retrieving");
      
      // Read from JSON file and return only seat numbers
      const scannedTickets = await readScannedTickets();
      const seatNumbers = scannedTickets.map(ticket => ticket.seatNumber);
      
      return res.json({ 
        success: true, 
        data: seatNumbers
      });
    }
    else if (purpose === "check") {
      const { seatNumber } = req.body;
      console.log("Checking if seat exists:", seatNumber);
      
      if (!seatNumber) {
        return res.status(400).json({ success: false, error: "Missing seat number" });
      }

      // Read existing scanned tickets from JSON file
      const scannedTickets = await readScannedTickets();
      
      // Check if seat exists in scanned tickets
      const existingTicket = scannedTickets.find(ticket => ticket.seatNumber === seatNumber);
      
      if (existingTicket) {
        return res.json({ 
          success: true, 
          exists: true,
          message: "Seat number found in scanned tickets",
          data: existingTicket
        });
      } else {
        return res.json({ 
          success: true, 
          exists: false,
          message: "Seat number not found in scanned tickets"
        });
      }
    }
    else {
      return res.status(400).json({ success: false, error: "Invalid purpose" });
    }
  } catch (error) {
    console.error("Error in /scanned route:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET route to retrieve and display all scanned tickets
router.get('/', async function(req, res) {
  try {
    console.log("GET request - Retrieving scanned tickets");
    
    // Read from JSON file
    const scannedTickets = await readScannedTickets();
    console.log("GET route - Retrieved scanned tickets:", scannedTickets);
    
    // Return complete ticket data with seat numbers
    return res.json({ 
      success: true, 
      data: scannedTickets,
      seatNumbers: scannedTickets.map(ticket => ticket.seatNumber),
      count: scannedTickets.length
    });
  } catch (error) {
    console.error("Error in GET /scanned route:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      data: [],
      count: 0
    });
  }
});

module.exports = router;
