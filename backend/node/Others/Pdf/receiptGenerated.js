const PDFDocument = require('pdfkit');

class ReceiptGenerator {
  async generate(records) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // --- Header ---
      doc.fontSize(22).text('INVOICE', { align: 'center' });
      doc.moveDown(1);

      doc.fontSize(12).text('En Community Services Society');
      doc.text('UEN - T03SS0051L');
      doc.text('Mailing Address: 2 Kallang Avenue, CT Hub #06-14');
      doc.text('Singapore 339407');
      doc.text('Tel - 67886625');
      doc.text('Email : encom@ecss.org.sg');
      doc.moveDown(1);

      // Invoice details
      const now = new Date();
      const invoiceDate = now.toLocaleDateString('en-GB');
      doc.text(`INVOICE DATE: ${invoiceDate}`);
      doc.text(`INVOICE NO.: ECSS/SFC/${now.getFullYear().toString().slice(-2)}/${now.getMonth()+1}`);
      doc.moveDown(1);

      // --- Table Header ---
      doc.fontSize(13).text('TICKET SALES RECEIPT', { align: 'center' });
      doc.moveDown(0.5);

      // Table columns
      doc.fontSize(10);
      doc.text('Name', 40, doc.y, { continued: true, width: 100 });
      doc.text('Location', 140, doc.y, { continued: true, width: 100 });
      doc.text('Price', 240, doc.y, { continued: true, width: 80 });
      doc.text('Seats', 320, doc.y, { continued: true, width: 120 });
      doc.text('Time', 440, doc.y, { width: 120 });
      doc.moveDown(0.5);

      // Table rows
      records.forEach((record) => {
        doc.text(record.name || '', 40, doc.y, { continued: true, width: 100 });
        doc.text(record.location || '', 140, doc.y, { continued: true, width: 100 });
        doc.text(record.price !== undefined ? `$${Number(record.price).toFixed(2)}` : '', 240, doc.y, { continued: true, width: 80 });
        doc.text(Array.isArray(record.seats) ? record.seats.join(', ') : '', 320, doc.y, { continued: true, width: 120 });
        doc.text(record.time || '', 440, doc.y, { width: 120 });
      });

      doc.moveDown(2);

      // --- Notes ---
      doc.fontSize(9).text('NOTES:', 40, doc.y);
      const notes = [
        '1. Please keep this receipt for your records.',
        '2. For any queries, contact us at encom@ecss.org.sg or 67886625.',
        '3. This is a computer generated receipt and requires no signature.'
      ];
      notes.forEach(note => doc.text(note, { indent: 10 }));

      doc.end();
    });
  }
}

module.exports = new ReceiptGenerator();