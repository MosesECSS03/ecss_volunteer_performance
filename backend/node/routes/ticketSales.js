var express = require('express');
var router = express.Router();
var TicketSalesController = require('../Controller/TicketSales/TicketSalesController'); 
var receiptGenerator = require("../Others/Pdf/receiptGenerated"); // Import the receipt generator utility

function seatsToRangesByRow(seats) {
  if (!seats || seats.length === 0) return [];

  // Group seats by row letter
  const rows = {};

  seats.forEach(seat => {
    const row = seat[0];
    const col = parseInt(seat.slice(1));
    if (!rows[row]) rows[row] = [];
    rows[row].push(col);
  });

  const ranges = [];

  Object.keys(rows).sort().forEach(row => {
    const cols = rows[row].sort((a,b) => a - b);

    // Use a temp array to group continuous columns
    let tempGroup = [cols[0]];

    for (let i = 1; i < cols.length; i++) {
      if (cols[i] === cols[i-1] + 1) {
        // Continuous seat, add to group
        tempGroup.push(cols[i]);
      } else {
        // Not continuous, push the previous group as range or single seats
        ranges.push(formatRange(row, tempGroup));
        tempGroup = [cols[i]];
      }
    }
    // Push the last group
    ranges.push(formatRange(row, tempGroup));
  });

  return ranges;
}

function formatRange(row, cols) {
  const pad = n => n.toString().padStart(2, '0');
  if (cols.length === 1) {
    return `${row}${pad(cols[0])}`;
  } else {
    return `${row}${pad(cols[0])} - ${row}${pad(cols[cols.length - 1])}`;
  }
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

      // Emit socket event after successful insert
      if (io) io.emit('reservation-updated', { message: 'Reservation updated successfully' });

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
