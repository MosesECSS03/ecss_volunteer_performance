const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');
const crypto = require('crypto');

class ReceiptGenerator {
  async generate(records) {
    return new Promise(async (resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Register Chinese font using path module
      const fontPath = path.join(__dirname, 'fonts', 'NotoSansSC-Regular.ttf');
      doc.registerFont('NotoSansSC', fontPath);

      // HEADER
      doc.rect(40, 40, 520, 70).stroke();
      doc.fontSize(14).font('Helvetica-Bold').text('En Community Services Society', 50, 50);
      doc.font('Helvetica').fontSize(10)
        .text('UEN - T03SS0051L', 50, 68)
        .text('Mailing Address: 2 Kallang Avenue, CT Hub #06-14', 50, 83)
        .text('Singapore 339407', 50, 98)
        .text('Tel - 67886625', 320, 68)
        .text('Email : encom@ecss.org.sg', 320, 83);

      // BODY (Main Table)
      const record = records[0] || {};

      const now = new Date();
      const invoiceDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      // Calculate vertical center position for the block above the table
      const headerBottom = 110; // bottom of header box (40 + 70)
      const tableTop = 270;     // where your table starts (adjust as needed)
      const blockHeight = 140;  // estimated height of all lines above the table (adjust as needed)
      let y = headerBottom + ((tableTop - headerBottom - blockHeight) / 2);

      // Date and Booking No (left-aligned, not centered)
      doc.fontSize(10).font('Helvetica')
        .text(`Date Issued:  ${invoiceDate}`, 400, y); // 50 is left margin
      y += 15;
      doc.text(`Booking No:  ${record.bookingNo || ''}`, 400, y);
      y += 25;

      // SUB-HEADER with logo and pink color (centered, aligned with English title)
      const logoPath = path.join(__dirname, 'en.png');
      const pink = '#e84393';
      const subHeaderText = '恩满群心·圆梦公益';
      const subHeaderFontSize = 22;
      const englishTitle = 'Musical Concert 2025';
      const englishFontSize = 20;

      // Calculate the taller of the two lines (Chinese or English)
      const subHeaderLineHeight = Math.max(subHeaderFontSize, englishFontSize);

      // Set logo height to match the combined height of both lines
      const logoHeight = subHeaderFontSize + englishFontSize + 5; // 5px gap between lines
      const logoWidth = logoHeight * 1.1; // Adjust width/height ratio as needed

      // Calculate text widths
      doc.font('NotoSansSC').fontSize(subHeaderFontSize);
      const chineseWidth = doc.widthOfString(subHeaderText);
      doc.font('Helvetica-Bold').fontSize(englishFontSize);
      const englishWidth = doc.widthOfString(englishTitle);

      // The widest line (for centering)
      const maxTextWidth = Math.max(chineseWidth, englishWidth);

      // Total width for logo + gap + widest text
      const totalWidth = logoWidth + 10 + maxTextWidth;
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const startX = doc.page.margins.left + (pageWidth - totalWidth) / 2;
      let ySubHeader = y;

      // Draw logo, vertically centered with both lines
      doc.image(logoPath, startX, ySubHeader, { width: logoWidth, height: logoHeight });

      // Draw Chinese text, aligned with top of logo
      doc.font('NotoSansSC').fontSize(subHeaderFontSize).fillColor(pink)
         .text(subHeaderText, startX + logoWidth + 10, ySubHeader, { width: maxTextWidth, align: 'left' });

      // Draw English title, aligned with bottom of logo, with a small gap below for footer spacing
      doc.font('Helvetica-Bold').fontSize(englishFontSize).fillColor(pink)
         .text(englishTitle, startX + logoWidth + 10, ySubHeader + subHeaderFontSize + 5, { width: maxTextWidth, align: 'left' });

      // Add a small gap after the sub-header block before the next content
      doc.fillColor('black');
      y += logoHeight + 18; // Increased from 10 to 18 for a small gap at the footer

      // English event title and details, all centered
      doc.fontSize(12).font('Helvetica-Bold').text('Concert Date: 02/11/2025 (4:30pm - 7:00pm)', 35, y, { align: 'center', width: pageWidth });
      y += 18;
      doc.fontSize(11).font('Helvetica-Bold').text('Venue: Stephen Riady Auditorium @NTUC, 1 Marina Blvd, #07-01, Singapore 018989', 35, y, { align: 'center', width: pageWidth });
      y += 18;
      doc.fontSize(16).font('Helvetica-Bold').text('Booking Confirmation', 35, y, { align: 'center', width: pageWidth });
      y += 18;
      doc.fontSize(10).font('Helvetica').text('(Admission by this booking)', 35, y, { align: 'center', width: pageWidth });

      // Add extra gap before the table
      y += 20;

      // MAIN TABLE (2x2 grid, each cell keeps its content)
      const tableLeft = 50; // Move table further to the left
      const tableWidth = 500;
      const tableHeight = 280;
      const colWidth = tableWidth / 2;
      const rowHeight = tableHeight / 2;

      // Draw outer border
      doc.rect(tableLeft, y, tableWidth, tableHeight).stroke();

      // Draw vertical divider
      doc.moveTo(tableLeft + colWidth, y)
         .lineTo(tableLeft + colWidth, y + tableHeight)
         .stroke();

      // Draw horizontal divider
      doc.moveTo(tableLeft, y + rowHeight)
         .lineTo(tableLeft + tableWidth, y + rowHeight)
         .stroke();

      // --- Cell 1: Top Left (Ticket Info) ---
      let cell1Y = y + 5;
      doc.fontSize(12).font('Helvetica-Bold').text('No of Ticket(s) Booked:', tableLeft + 5, cell1Y, { continued: true });
      doc.font('Helvetica').text(` ${record.selectedSeatsCount || 2}`, { continued: false });
      cell1Y += 22;
      doc.font('Helvetica-Bold').text('Seating No:', tableLeft + 5, cell1Y, { continued: true });
      doc.font('Helvetica').text(` ${Array.isArray(record.seats) ? record.seats.join(', ') : 'A01, A02, A03'}`, { continued: false });
      cell1Y += 22;
      doc.font('Helvetica-Bold').text('Payment Type:', tableLeft + 5, cell1Y, { continued: true });
      doc.font('Helvetica').text(` ${record.paymentType || 'Cash or Paynow'}`, { continued: false });
      cell1Y += 22;
      doc.font('Helvetica-Bold').text('Payment Reference:', tableLeft + 5, cell1Y, { continued: true });
      doc.font('Helvetica').text(` ${record.paymentRef || 'Mobile No. (Eg: 91234567)'}`, { continued: false });
      cell1Y += 22;
      doc.font('Helvetica-Bold').text('Total Booking Donation:', tableLeft + 5, cell1Y, { continued: true });
      doc.font('Helvetica').text(` $${record.price !== undefined ? Number(record.price).toFixed(2) : '105.00'}`, { continued: false });

      // --- Cell 2: Top Right (Booking QR Code) ---
      let cell2Y = y + 5;
      doc.fontSize(12).font('Helvetica-Bold').text('Booking QR Code', tableLeft + colWidth + 1, cell2Y);

      // QR Code content (plain text)
      const qrPlainText = [
        `Name: ${record.name || ''}`,
        `Booking No: ${record.bookingNo || ''}`,
        `No of Tickets: ${record.selectedSeatsCount || 2}`,
        `Seats: ${Array.isArray(record.seats) ? record.seats.join(', ') : 'A01, A02, A03'}`,
        `Payment Ref: ${record.paymentRef || '91234567'}`
      ].join('\n');

      // Encrypt the QR content
      const qrText = encrypt(qrPlainText);

      // Generate QR code with encrypted content
      const qrBuffer = await QRCode.toBuffer(qrText, { margin: 1, width: 100 });

      // Draw QR code in top right cell, as close to the left/top of the cell as possible but still inside
      const qrX = tableLeft + colWidth + 1;
      const qrY = y + 28;
      doc.image(qrBuffer, qrX, qrY, { width: 100, height: 100 });

      // --- Cell 3: Bottom Left (empty or add more info if needed) ---

      // --- Cell 4: Bottom Right (Donation Code) ---
      let cell4Y = y + rowHeight + 5;
      doc.fontSize(12).font('Helvetica-Bold').text('Donation Code', tableLeft + colWidth + 1, cell4Y);

      // --- Footer Section ---
      let footerY = y + tableHeight + 30; // leave some space below the table

      // Notes (bold)
      doc.fontSize(11).font('Helvetica-Bold').text('Notes:', tableLeft, footerY);
      footerY += 18;
      doc.fontSize(10).font('Helvetica-Bold').text(
        '• Please be seated 30 mins before the concert starts.\n' +
        '• Latecomers may only be admitted during suitable breaks.\n' +
        '• Kindly keep your mobile devices silent.\n' +
        '• Follow all event staff instructions at all times.\n' +
        '• No food and drinks are allowed inside the auditorium.',
        tableLeft,
        footerY,
        { width: tableWidth - 10 }
      );

      // Computer generated receipt notice
      footerY += 150;
      doc.fontSize(9).font('Helvetica').text(
        'This is a computer generated receipt. No signature is required.',
        tableLeft,
        footerY
      );

      doc.end();
    });
  }
}

// Define your secret key and IV (must be 32 bytes for AES-256, IV is 16 bytes)
const ENCRYPTION_KEY = Buffer.from('happy123'.padEnd(32, '0')); // "happy123" padded to 32 bytes
const IV = Buffer.from('1234567890123456'); // 16 bytes

function encrypt(text) {
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

module.exports = new ReceiptGenerator();