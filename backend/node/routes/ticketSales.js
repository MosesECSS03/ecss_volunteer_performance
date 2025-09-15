var express = require('express');
var router = express.Router();
var TicketSalesController = require('../Controller/TicketSales/TicketSalesController'); 
var receiptGenerator = require("../Others/Pdf/receiptGenerated.js"); // Import the receipt generator utility
const { sendOneSignalNotification } = require('../utils/onesignal');
const archiver = require('archiver'); // Import archiver for ZIP creation

function seatsToRangesByRow(seats) {
  if (!Array.isArray(seats) || seats.length === 0) return [];
  // Group seats by row
  const rows = {};
  seats.forEach(seat => {
    const row = seat[0];
    const num = parseInt(seat.slice(1), 10);
    if (!rows[row]) rows[row] = [];
    rows[row].push(num);
  });
  // Convert each row's numbers to sorted ranges
  const ranges = [];
  Object.keys(rows).forEach(row => {
    const nums = rows[row].sort((a, b) => a - b);
    let start = nums[0];
    let end = nums[0];
    for (let i = 1; i <= nums.length; i++) {
      if (nums[i] === end + 1) {
        end = nums[i];
      } else {
        if (start === end) {
          ranges.push(`${row}${String(start).padStart(2, '0')}`);
        } else {
          ranges.push(`${row}${String(start).padStart(2, '0')} - ${row}${String(end).padStart(2, '0')}`);
        }
        start = nums[i];
        end = nums[i];
      }
    }
  });
  return ranges;
}

router.post('/', async function(req, res, next) 
{
  try 
  {
    const io = req.app.get('io'); // Get the Socket.IO instance

    if(req.body.purpose === "insert") 
    {
      const records = req.body.records;
      const grouped = {};
      console.log("Received records:", records);

      records.forEach(record => {
        const key = `${record.name}|${record.staffName}|${record.location}|${record.price}|${record.time}|${record.paymentType}|${record.paymentRef}|${record.selectedSeatsCount}|${record.bookingNo}`;
        if (!grouped[key]) {
          grouped[key] = {
            name: record.name,
            staffName: record.staffName,
            location: record.location,
            price: record.price,
            time: record.time,
            paymentType: record.paymentType,
            paymentRef: record.paymentRef,
            selectedSeatsCount: record.selectedSeatsCount,
            bookingNo: record.bookingNo,
            seats: []
          };
        }
        // If record.seats is an array of seat labels
        if (Array.isArray(record.seats)) {
          record.seats.forEach(seatLabel => {
            grouped[key].seats.push(seatLabel);
          });
        }
      });

      // Convert seats to ranges per row (array of ranges)
      const groupedRecords = Object.values(grouped).map(group => ({
        name: group.name,
        staffName: group.staffName,
        location: group.location,
        price: group.price,
        time: group.time,
        paymentType: group.paymentType,
        paymentRef: group.paymentRef,
        selectedSeatsCount: group.selectedSeatsCount,
        bookingNo: group.bookingNo,
        seats: seatsToRangesByRow(group.seats)  // returns array of seat ranges per row
      }));

      // Instantiate controller and save
      var controller = new TicketSalesController();
      console.log(" RecordsGrouped:", groupedRecords);
      var result = await controller.addSalesRecords(groupedRecords);

      // Send OneSignal notification
      const bookingNo = groupedRecords[0].bookingNo;
      const seats = groupedRecords[0].seats;

      try {
        await sendOneSignalNotification({
          title: 'New Reservation!',
          message: `Booking No: ${bookingNo}\nSeats: ${seats.join(', ')}`,
          // Platform-specific URLs
          //web_url: "http://localhost:3000", // Web browser users go here
          app_url: "ecssapp://reservations", // Mobile app users go here (deep link)
          // You can use these in production:
          web_url: 'https://white-stone-093a71d10.6.azurestaticapps.net/version2',
          // Additional platform customizations
          /*ios_attachments: {
            id1: "https://example.com/images/ticket-icon.png" // Optional: attach image for iOS
          },*/
          android_channel_id: "reservation-channel", // Optional: Android notification channel
          data: {
            bookingNo: bookingNo,
            seats: seats.join(', ')
          }
        });
        console.log("Smart OneSignal notification sent successfully");
      } catch (error) {
        console.error("Failed to send OneSignal notification:", error);
        // Continue with the response even if notification fails
      }

      if (io && groupedRecords.length > 0) {
        io.emit('reservation-updated', {
          message: 'Reservation updated successfully',
          bookingNo: groupedRecords[0].bookingNo,
          seats: Array.isArray(groupedRecords[0].seats)
            ? groupedRecords[0].seats.join(', ')
            : String(groupedRecords[0].seats)
        });
      }

      return res.json({ success: true, ...result });
    }
    else if(req.body.purpose === "generate") 
    {
      // Only generate PDF, do not insert
      const records = req.body.records;
      const grouped = {};

      console.log("Received records for PDF generation:", records);

      records.forEach(record => {
        const key = `${record.name}|${record.staffName}|${record.location}|${record.price}|${record.time}|${record.paymentType}|${record.paymentRef}|${record.selectedSeatsCount}|${record.bookingNo}`;
        if (!grouped[key]) {
          grouped[key] = {
            name: record.name,
            staffName: record.staffName,
            location: record.location,
            price: record.price,
            time: record.time,
            paymentType: record.paymentType,
            paymentRef: record.paymentRef,
            selectedSeatsCount: record.selectedSeatsCount,
            bookingNo: record.bookingNo,
            seats: []
          };
        }
        console.log("Processing record for grouping:", record);
        if (Array.isArray(record.seats)) {
          record.seats.forEach(seatLabel => {
            grouped[key].seats.push(seatLabel);
            console.log("Seat added for grouping:", seatLabel);
          });
        }
      });

      const groupedRecords = Object.values(grouped).map(group => ({
        name: group.name,
        staffName: group.staffName,
        location: group.location,
        price: group.price,
        time: group.time,
        paymentType: group.paymentType,
        paymentRef: group.paymentRef,
        selectedSeatsCount: group.selectedSeatsCount,
        bookingNo: group.bookingNo,
        seats: seatsToRangesByRow(group.seats)
      }));

      console.log("Grouped records for PDF generation:", groupedRecords);


      // Generate separate PDFs for each seat
      const pdfResults = await receiptGenerator.generate(groupedRecords);
      console.log("PDF generation results:", pdfResults, pdfResults.length);
      
      if (pdfResults.length === 1) {
        // Single PDF - return as before
        const pdfBase64 = pdfResults[0].buffer.toString('base64');
        return res.json({ success: true, receiptPdfBase64: pdfBase64 });
      } else {
        // Multiple PDFs - create ZIP file
        const archive = archiver('zip', { zlib: { level: 9 } });
        const zipBuffers = [];
        
        // Collect ZIP data
        archive.on('data', (chunk) => zipBuffers.push(chunk));
        
        // Handle ZIP completion
        const zipPromise = new Promise((resolve, reject) => {
          archive.on('end', () => {
            const zipBuffer = Buffer.concat(zipBuffers);
            const zipBase64 = zipBuffer.toString('base64');
            resolve(zipBase64);
          });
          archive.on('error', reject);
        });
        
        // Add each PDF to the ZIP
        pdfResults.forEach(result => {
          archive.append(result.buffer, { name: result.filename });
        });
        
        // Finalize the ZIP
        archive.finalize();
        
        // Wait for ZIP to be created
        const zipBase64 = await zipPromise;
        const bookingNo = groupedRecords[0]?.bookingNo || 'tickets';
        const paymentRef = groupedRecords[0]?.paymentRef || 'payment';
        
        // Sanitize filenames by replacing slashes with underscores
        const sanitizedPaymentRef = paymentRef.replace(/\//g, '_');
        const sanitizedBookingNo = bookingNo.replace(/\//g, '_');
        
        return res.json({ 
          success: true, 
          isZip: true,
          zipBase64: zipBase64,
          zipFilename: `${sanitizedPaymentRef}_${sanitizedBookingNo}_tickets.zip`
        });
      }
    }
    else if(req.body.purpose === "generateWithApp") 
    {
      // Only generate PDF, do not insert
      const records = req.body.records;
      //const grouped = {};

      console.log("Received request for PDF generation:", req.body);

      /*records.forEach(record => {
        const key = `${record.name}|${record.staffName}|${record.location}|${record.price}|${record.time}|${record.paymentType}|${record.paymentRef}|${record.selectedSeatsCount}|${record.bookingNo}`;
        if (!grouped[key]) {
          grouped[key] = {
            name: record.name,
            staffName: record.staffName,
            location: record.location,
            price: record.price,
            time: record.time,
            paymentType: record.paymentType,
            paymentRef: record.paymentRef,
            selectedSeatsCount: record.selectedSeatsCount,
            bookingNo: record.bookingNo,
            seats: []
          };
        }
        console.log("Processing record for grouping:", record);
        if (Array.isArray(record.seats)) {
          record.seats.forEach(seatLabel => {
            grouped[key].seats.push(seatLabel);
            console.log("Seat added for grouping:", seatLabel);
          });
        }
      });

      const groupedRecords = Object.values(grouped).map(group => ({
        name: group.name,
        staffName: group.staffName,
        location: group.location,
        price: group.price,
        time: group.time,
        paymentType: group.paymentType,
        paymentRef: group.paymentRef,
        selectedSeatsCount: group.selectedSeatsCount,
        bookingNo: group.bookingNo,
        seats: seatsToRangesByRow(group.seats)
      }));

      console.log("Grouped records for PDF generation:", groupedRecords);


      // Generate separate PDFs for each seat
      const pdfResults = await receiptGenerator.generate(groupedRecords);
      console.log("PDF generation results:", pdfResults, pdfResults.length);
      
      if (pdfResults.length === 1) {
        // Single PDF - return as before
        const pdfBase64 = pdfResults[0].buffer.toString('base64');
        return res.json({ success: true, receiptPdfBase64: pdfBase64 });
      } else {
        // Multiple PDFs - create ZIP file
        const archive = archiver('zip', { zlib: { level: 9 } });
        const zipBuffers = [];
        
        // Collect ZIP data
        archive.on('data', (chunk) => zipBuffers.push(chunk));
        
        // Handle ZIP completion
        const zipPromise = new Promise((resolve, reject) => {
          archive.on('end', () => {
            const zipBuffer = Buffer.concat(zipBuffers);
            const zipBase64 = zipBuffer.toString('base64');
            resolve(zipBase64);
          });
          archive.on('error', reject);
        });
        
        // Add each PDF to the ZIP
        pdfResults.forEach(result => {
          archive.append(result.buffer, { name: result.filename });
        });
        
        // Finalize the ZIP
        archive.finalize();
        
        // Wait for ZIP to be created
        const zipBase64 = await zipPromise;
        const bookingNo = groupedRecords[0]?.bookingNo || 'tickets';
        const paymentRef = groupedRecords[0]?.paymentRef || 'payment';
        
        // Sanitize filenames by replacing slashes with underscores
        const sanitizedPaymentRef = paymentRef.replace(/\//g, '_');
        const sanitizedBookingNo = bookingNo.replace(/\//g, '_');
        
        return res.json({ 
          success: true, 
          isZip: true,
          zipBase64: zipBase64,
          zipFilename: `${sanitizedPaymentRef}_${sanitizedBookingNo}_tickets.zip`
        });
      }*/
    }
    else if(req.body.purpose === "retrieve") 
    {
      // Instantiate controller and retrieve records
      var controller = new TicketSalesController();
      var result = await controller.getSalesRecords();

      // Emit all records to clients via WebSocket
      if (io && result && result.length > 0) {
        io.emit('data-retrieve', {
          message: 'Data-Retrieve successfully',
          allReservations: result
        });
      }

      return res.json({ result });
    }
  } 
  catch (error) {  
    console.error("Error in POST / route:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
