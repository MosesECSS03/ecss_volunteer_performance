var express = require('express');
var router = express.Router();
var TicketSalesController = require('../Controller/TicketSales/TicketSalesController'); 
var receiptGenerator = require("../Others/Pdf/receiptGenerated"); // Import the receipt generator utility
//const { sendOneSignalNotification } = require('../utils/onesignal');

// ...existing code...

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

      /*// Send OneSignal notification
      const bookingNo = groupedRecords[0].bookingNo;
      const seats = groupedRecords[0].seats;
      await sendOneSignalNotification({
        title: 'New Reservation!',
        message: `Booking No: ${bookingNo}\nSeats: ${seats.join(', ')}`,
        url: 'https://white-stone-093a71d10.6.azurestaticapps.net/'
      });*/

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
