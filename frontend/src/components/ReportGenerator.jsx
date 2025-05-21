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
      locations: [],
      records: [],
      allReservedSeats: [],
    };
  }

  componentDidMount() {
    this.fetchRecords();
  }

  handleLocationToggle = (location) => {
    this.setState(prevState => {
      if (prevState.locations.includes(location)) {
        return { locations: prevState.locations.filter(l => l !== location) };
      } else {
        return { locations: [...prevState.locations, location] };
      }
    });
  };

  fetchRecords = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/ticketSales`, { purpose: "retrieve" });
      const records = response.data.result.data;
      const allReservedSeats = records.flatMap(record =>
        record.seats.flatMap(seatStr => this.expandSeatRange ? this.expandSeatRange(seatStr) : seatStr)
      );
      // Get all unique locations from records
      const locations = Array.from(new Set(records.map(r => r.location).filter(Boolean)));
      this.setState({ records, allReservedSeats, locations });
    } catch (error) {
      console.error("Error fetching ticket sales:", error);
    }
  };

  getAllLocations = () => {
    const { records } = this.state;
    // Get unique locations from records
    return Array.from(new Set(records.map(r => r.location).filter(Boolean)));
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
    const { locations, records } = this.state;
    // If no locations selected, export all; else filter by selected locations
    const filteredRecords = locations.length === 0
      ? records
      : records.filter(r => locations.includes(r.location));
    
     console.log('Filtered Records:', filteredRecords);

    // Export all columns
    const exportRows = filteredRecords.map((row, index) => ({
      id: index + 1,
      name: row.name,
      staffName: row.staffName,
      location: row.location,
      price: typeof row.price === 'number'
        ? `$${row.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : row.price,
      paymentType: row.paymentType,
      paymentRef: row.paymentRef,
      selectedSeatsCount: row.selectedSeatsCount,
      bookingNo: row.bookingNo,
      seats: Array.isArray(row.seats) ? row.seats.join(', ') : String(row.seats),
      bookedAt: row.time
    }));

    // Define custom headers
    const headers = [
      '#',
      'Name',
      'Staff',
      'Location',
      'Donation Amount',
      'Payment Type',
      'Payment Ref',
      'No. of Seats',
      'Booking No',
      'Seats',
      'Booked At'
    ];

    // Create worksheet with custom headers
    const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: [
      'id',
      'name',
      'staffName',
      'location',
      'price',
      'paymentType',
      'paymentRef',
      'selectedSeatsCount',
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
    const { locations, records } = this.state;
    const allLocations = this.getAllLocations();
    const filteredRecords = locations.length === 0
      ? records
      : records.filter(r => locations.includes(r.location));

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
            <h3>Locations</h3>
            <div className="checkbox-group">
              {allLocations.length === 0 ? (
                <div style={{ color: '#888', fontStyle: 'italic' }}>
                  No locations available.
                </div>
              ) : (
                allLocations.map(location => (
                  <label key={location}>
                    <input 
                      type="checkbox"
                      checked={locations.includes(location)}
                      onChange={() => this.handleLocationToggle(location)}
                    />
                    {location}
                  </label>
                ))
              )}
            </div>
            <div className="small-report-actions">
              {/*<button onClick={this.handleGeneratePDF} className="small-btn red-btn">Generate PDF</button>*/}
              <button onClick={this.handleGenerateExcel} className="small-btn blue-btn">Generate Excel</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ReportGenerator;