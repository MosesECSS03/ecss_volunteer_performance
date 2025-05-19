var express = require('express');
var router = express.Router();
var TicketSalesController = require('../Controller/TicketSales/TicketSalesController'); 
var receiptGenerator = require("../Others/Pdf/receiptGenerated"); // Import the receipt generator utility
const { sendOneSignalNotification } = require('../utils/onesignal');

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
      console.log("Grouped Records:", groupedRecords);
      var result = await controller.addSalesRecords(groupedRecords);

      // Send OneSignal notification
      const bookingNo = groupedRecords[0].bookingNo;
      const seats = groupedRecords[0].seats;

      try {
        await sendOneSignalNotification({
          title: 'New Reservation!',
          message: `Booking No: ${bookingNo}\nSeats: ${seats.join(', ')}`,
          url: 'https://white-stone-093a71d10.6.azurestaticapps.net/' // Your actual frontend URL
        });
        console.log("OneSignal notification sent successfully");
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
        if (Array.isArray(record.seats)) {
          record.seats.forEach(seatLabel => {
            grouped[key].seats.push(seatLabel);
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

      // Generate PDF only (not insert)
      const pdfBuffer = await receiptGenerator.generate(groupedRecords);
      const pdfBase64 = pdfBuffer.toString('base64');

     // if (io) io.emit('reservation-updated');

      return res.json({ success: true, receiptPdfBase64: pdfBase64 });
    }
    else if(req.body.purpose === "retrieve") 
    {
      // Instantiate controller and retrieve records
      var controller = new TicketSalesController();
      var result = await controller.getSalesRecords();
      //if (io) io.emit('retrieve-updated');

      return res.json({result});
    }
  } 
  catch (error) {  
    console.error("Error in POST / route:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
