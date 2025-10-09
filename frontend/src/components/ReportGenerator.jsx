import React, { Component } from 'react';
import './ReportGenerator.css';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : "https://ecss-performance-night-2025.azurewebsites.net";

class ReportGenerator extends Component {
  constructor(props) {
    super(props);
    this.state = {
      records: [],
      allReservedSeats: [],
    };
  }

  componentDidMount() {
    this.fetchRecords();
  }

  fetchRecords = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/ticketSales`, { purpose: "retrieve" });
      const records = response.data.result.data;
      const allReservedSeats = records.flatMap(record =>
        record.seats.flatMap(seatStr => this.expandSeatRange ? this.expandSeatRange(seatStr) : seatStr)
      );
      this.setState({ records, allReservedSeats });
    } catch (error) {
      console.error("Error fetching ticket sales:", error);
    }
  };

  handleGeneratePDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Reservation Records', 14, 16);

    // Get the table element
    const table = document.getElementById('pdf-table');
    doc.html(table, {
      callback: function (doc) {
        doc.save('reservation_records.pdf');
      },
      x: 10,
      y: 22
    });
  };

  handleGenerateExcel = () => {
    const { records } = this.state;
    const filteredRecords = records;
    
     console.log('Filtered Records:', filteredRecords);

    // Export essential columns only
    const exportRows = filteredRecords.map((row, index) => ({
      id: index + 1,
      name: row.name,
      staffName: row.staffName,
      paymentRef: row.paymentRef,
      bookingNo: row.bookingNo,
      seats: Array.isArray(row.seats) ? row.seats.join(', ') : String(row.seats),
      bookedAt: row.time
    }));

    // Define custom headers
    const headers = [
      '#',
      'Name',
      'Staff',
      'Contact Number',
      'Booking No',
      'Seats',
      'Booked At'
    ];

    // Create worksheet with custom headers
    const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: [
      'id',
      'name',
      'staffName',
      'paymentRef',
      'bookingNo',
      'seats',
      'bookedAt'
    ]});

    // Insert custom header row
    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });

    // Auto-fit column widths
    const wscols = headers.map((header, i) => {
      // Find max length in this column (header or any cell)
      const colData = [header, ...exportRows.map(row => {
        const val = Object.values(row)[i];
        return val ? val.toString() : '';
      })];
      const maxLen = Math.max(...colData.map(val => val.length));
      return { wch: maxLen + 2 }; // +2 for padding
    });
    worksheet['!cols'] = wscols;

    // Bold header row
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: C })];
      if (cell && !cell.s) cell.s = {};
      if (cell) cell.s.font = { bold: true };
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Booking Records');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', cellStyles: true });
    const fileName = 'reservation_records.xlsx';
    saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), fileName);
};

  render() {
    const { records } = this.state;

    return (
      <div className="report-generator">
        <h2
          style={{
            color: '#0078d4',
            marginBottom: '20px',
            fontSize: '1.5rem'
          }}
        >
          Report Generator
        </h2>
        <div className="report-options">
          <div className="option-group">
            <div className="small-report-actions">
              {/*<button onClick={this.handleGeneratePDF} className="small-btn red-btn">Generate PDF</button>*/}
              <button onClick={this.handleGenerateExcel} className="small-btn blue-btn">Export Excel</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ReportGenerator;