const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');

class ReceiptGenerator 
{
  // Function to expand seat ranges like "C01-C03" to "C01, C02, C03"
  expandSeatRanges(seatString) {
    if (!seatString) return [];
    
    const parts = seatString.split(',').map(part => part.trim());
    const expandedSeats = [];
    
    parts.forEach(part => {
      if (part.includes('-')) {
        // Handle range like "C01-C03"
        const [start, end] = part.split('-').map(s => s.trim());
        const startLetter = start.match(/[A-Z]+/)[0];
        const startNum = parseInt(start.match(/\d+/)[0]);
        const endLetter = end.match(/[A-Z]+/)[0];
        const endNum = parseInt(end.match(/\d+/)[0]);
        
        if (startLetter === endLetter) {
          // Same row, expand numbers
          for (let i = startNum; i <= endNum; i++) {
            expandedSeats.push(startLetter + i.toString().padStart(2, '0'));
          }
        } else {
          // Different rows, add both seats
          expandedSeats.push(start, end);
        }
      } else {
        // Single seat
        expandedSeats.push(part);
      }
    });
    
    return expandedSeats;
  }

  async generate(records) {
    const record = records[0] || {};

    // Expand seat ranges to get individual seats
    let expandedSeats = [];
    if (record.seats) {
      if (Array.isArray(record.seats)) {
        expandedSeats = this.expandSeatRanges(record.seats.join(', '));
      } else {
        expandedSeats = this.expandSeatRanges(record.seats);
      }
    }

    // Generate a separate PDF for each seat
    const pdfBuffers = [];
    for (let i = 0; i < expandedSeats.length; i++) {
      const currentSeat = expandedSeats[i];
      const pdfBuffer = await this.generatePDFForSeat(record, currentSeat);
      
      // Sanitize filename by replacing slashes with underscores to avoid folder creation
      const sanitizedPaymentRef = record.paymentRef ? record.paymentRef.replace(/\//g, '_') : 'payment';
      const sanitizedBookingNo = record.bookingNo ? record.bookingNo.replace(/\//g, '_') : 'booking';
      
      pdfBuffers.push({
        seatNumber: currentSeat,
        buffer: pdfBuffer,
        filename: `${sanitizedPaymentRef}_${sanitizedBookingNo}_${currentSeat}.pdf`
      });
    }

    return pdfBuffers;
  }

  async generatePDFForSeat(record, seatNumber) {
    return new Promise(async (resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Register Arial fonts
      const arialFontPath = path.join(__dirname, 'fonts', 'ARIAL.TTF');
      const arialBoldFontPath = path.join(__dirname, 'fonts', 'ARIALBD.TTF');
      doc.registerFont('Arial', arialFontPath);
      doc.registerFont('Arial Bold', arialBoldFontPath);

      // Generate the ticket page for this seat
      await this.generatePageForSeat(doc, record, seatNumber);
      
      // Add directions page as second page
      doc.addPage();
      await this.generateDirectionsPage(doc);

      doc.end();
    });
  }

  async generatePageForSeat(doc, record, seatNumber) {
    // Date Issued and Booking No (top right, aligned from end)
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    const dateIssued = `${day} ${month} ${year}`;
    const pageWidth = doc.page.width - doc.page.margins.right;
    
    // Event Logo at 100% original size on A4
    const eventLogoPath = path.join(__dirname, 'images', 'EventLogo.png');
    const eventDetailsPath = path.join(__dirname, 'images', 'EventDetails.png');
    const notesDetailsPath = path.join(__dirname, 'images', 'NotesDetails.png');
    
    try {
      // Display logo with exact sizing from PDF reference image
      doc.image(eventLogoPath, 50, 30, { width: 350, height: 90 });
      doc.fontSize(8).font('Arial').fillColor('black')
       .text(`Date Issued: ${dateIssued}`, 40, 65, { align: 'right', width: pageWidth - 30 })
       .text(`Booking No.: ${record.bookingNo}`, 40, 75, { align: 'right', width: pageWidth - 30 });
      doc.image(eventDetailsPath, 50, 150, { width: pageWidth - 40 , height: 100 });
      
      // E-TICKET text - bold and centered horizontally on the page (below the image box)
      doc.fontSize(30).font('Arial Bold').fillColor('black')
       .text(`E-TICKET`, 0, 275, { align: 'center', width: doc.page.width });
      doc.fontSize(8).font('Arial').fillColor('black')
       .text(`(Admission by this booking)`, 0, 305, { align: 'center', width: doc.page.width });
      
      // Draw a black thin line border around ticket details and QR code
      doc.rect(50, 325, pageWidth - 40, 320)
       .lineWidth(1)
       .stroke('black');
      
      // Ticket details below E-TICKET - show specific seat for this page
      doc.fontSize(25).font('Arial').fillColor('black')
       .text(`Seat Number:`,100, 350);
      doc.fontSize(25).font('Arial Bold').fillColor('black')
       .text(seatNumber, 260, 350);
      
      doc.fontSize(15).font('Arial').fillColor('black')
       .text(`Booking Reference:`, 100, 380);
      doc.fontSize(15).font('Arial Bold').fillColor('black')
       .text(`${record.paymentRef}`, 235, 380);
      
      doc.fontSize(15).font('Arial').fillColor('black')
       .text(`Ticket Price:`, 100, 400);
      // With this conditional logic:
      doc.fontSize(15).font('Arial Bold').fillColor('black');
      if (record.price != "0") {
        doc.text(`$35`, 185, 400);
      } else {
        doc.text(`Complimentary`, 185, 400);
      }
      
      // Generate QR code for this specific seat number
      try {
        const qrCodeData = await QRCode.toDataURL(seatNumber, {
          width: 150,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        // Convert base64 to buffer and add to PDF (centered horizontally, below ticket details)
        const qrBuffer = Buffer.from(qrCodeData.split(',')[1], 'base64');
        const qrSize = 200;
        const centerX = (doc.page.width - qrSize) / 2;
        doc.image(qrBuffer, centerX, 425, { width: qrSize, height: qrSize });
      } catch (qrError) {
        console.log('QR code generation failed:', qrError);
      }
      
      // Add NotesDetails image below QR code (full page width) - positioned after the border box
      try {
        doc.image(notesDetailsPath, 0, 665, { width: doc.page.width, height: 200 });
      } catch (notesError) {
        console.log('NotesDetails.png not found');
      }
    } catch (error) {
      console.log('EventLogo.png not found');
    }
  }

  async generateDirectionsPage(doc) {
    try {
      // Add directions/map image (assuming you have saved the image as DirectionsMap.png)
      const moreDetailsPath = path.join(__dirname, 'images', 'MoreDetails.png');
        // Add the full directions map image
        doc.image(moreDetailsPath, 0, 0, { width: doc.page.width, height: doc.page.height });
    } catch (error) {
      console.log('Error generating directions page:', error);
    }
  }
}

module.exports = new ReceiptGenerator();