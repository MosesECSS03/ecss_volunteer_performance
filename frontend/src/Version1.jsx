import React, { Component } from 'react';
import SeatDashboard from './SeatDashboard';
import ReservationTable from './ReservationTable';
import ReservationForm from './RegistrationForm';
import axios from 'axios';
import { io } from 'socket.io-client';

//https://ecss-performance-night-2025.azurewebsites.net/
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : "https://ecss-performance-night-2025.azurewebsites.net";

function getFormattedDateTime() {
  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = now.getFullYear();
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

class Version1 extends Component {
  constructor(props) {
    super(props);
    this.state = {
      records: [],
      activeTab: 'form', // 'form' or 'table'
      selectedSeatsCount: 0,
      lastReservedCount: 0,
      reservedSeats: [],
      allReservedSeats: [],
      selected: {} // <-- Add this line
    };
    
  }

  handleAddRecords = async (formData) => {
    //console.log('Form Data:', formData);
    // Get current year
    const year = new Date().getFullYear();

    // Use all records for booking number generation (no filter)
    let nextNumber = this.state.records.length + 1;
    const padded = String(nextNumber).padStart(3, '0');
    const bookingNo = `ECSS/MC${year}/${padded}`;

    // Build the seatRecord with bookingNo
    const seatRecord = {
      name: formData.name,
      staffName: formData.staffName,
      location: formData.location,
      price: formData.price,
      seats: formData.seats,
      time: getFormattedDateTime(),
      paymentType: formData.paymentType,
      paymentRef: formData.paymentRef,
      selectedSeatsCount: formData.selectedSeatsCount,
      bookingNo,
    };

    try {
      // 1. Insert the record
      console.log("PI_BASE_URL", API_BASE_URL);
      const insertResponse = await axios.post(`${API_BASE_URL}/ticketSales`, { purpose: "insert", records: [seatRecord] });

      if (insertResponse.data.success) {
        // 2. Generate the PDF (assume you have a separate endpoint for this)
        const pdfResponse = await axios.post(`${API_BASE_URL}/ticketSales`, { purpose: "generate", records: [seatRecord] });

        if (pdfResponse.data.receiptPdfBase64) {
          const base64 = pdfResponse.data.receiptPdfBase64;
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });

          // Create a blob URL
          const blobUrl = URL.createObjectURL(blob);

          // 1. Open the PDF in a new tab for viewing
          window.open(blobUrl, '_blank');

          // 2. Download the PDF with booking number as filename
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `${seatRecord.paymentRef} ${seatRecord.bookingNo}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        this.setState(prevState => ({
          records: [...prevState.records, seatRecord],
          selectedSeatsCount: 0,
          lastReservedCount: 0
        }));

        // Refresh the page
        window.location.reload();
      }
    } catch (error) {
      console.error('❌ Error saving records:', error);
    }
  };

  setActiveTab = (tab) => {
    this.setState({ activeTab: tab });
  };

  handleSelectedSeatsChange = (count) => {
    this.setState({ selectedSeatsCount: count });
  };

  handleClearReservedSeats = () => {
    console.log("App: handleClearReservedSeats called", this.state.reservedSeats);
    const reservedSet = new Set(this.state.reservedSeats);
    this.setState(prevState => ({
      reservedSeats: [],
      allReservedSeats: prevState.allReservedSeats.filter(seat => !reservedSet.has(seat)),
      lastReservedCount: 0,
      selectedSeatsCount: 0
    }));
  };

  handleReserve = (reservedSeats) => {
    console.log("Reserved Seats:", reservedSeats);
    this.setState(prevState => ({
      lastReservedCount: reservedSeats.length,
      reservedSeats: reservedSeats,
      selectedSeatsCount: 0,
      allReservedSeats: [...prevState.allReservedSeats, ...reservedSeats]
    }));
  };

  expandSeatRange = (seatStr) => {
    // If it's a range like "F11 - F13"
    if (seatStr.includes('-')) {
      const [start, end] = seatStr.split('-').map(s => s.trim());
      const row = start[0];
      const startNum = parseInt(start.slice(1));
      const endNum = parseInt(end.slice(1));
      const seats = [];
      for (let i = startNum; i <= endNum; i++) {
        seats.push(`${row}${i.toString().padStart(2, '0')}`);
      }
      return seats;
    }
    // Single seat like "E10"
    return [seatStr];
  };

  componentDidMount() {
    this.fetchRecords();

    this.socket = io(API_BASE_URL);

    this.socket.on('reservation-updated', (data) => {
      console.log("Socket event received", data);
      this.fetchRecords();
    });
  }

  componentWillUnmount() {
    if (this.socket) this.socket.disconnect();
  }

  fetchRecords = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/ticketSales`, { purpose: "retrieve" });
      var records = response.data.result.data;
      console.log("Fetched Records:", response.data);

      const allReservedSeats = records.flatMap(record =>
        record.seats.flatMap(seatStr => this.expandSeatRange(seatStr))
      );

      this.setState({ records, allReservedSeats });
    } catch (error) {
      console.error("Error fetching ticket sales:", error);
    }
  };

  render() {
    const { records, activeTab, lastReservedCount, allReservedSeats, reservedSeats } = this.state;
    return (
      <div>
        <h1>Version 1</h1>
        {/* SeatDashboard is always shown */}
        <SeatDashboard
          onReserve={this.handleReserve}
          onSelectedSeatsChange={this.handleSelectedSeatsChange}
          reservedSeats={allReservedSeats}
          reservedSeats1={reservedSeats}
          onClearReservedSeats={this.handleClearReservedSeats}
        />
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => this.setActiveTab('form')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'form' ? '#1976d2' : '#f5f5f5',
              color: activeTab === 'form' ? '#fff' : '#222',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: activeTab === 'form' ? 'bold' : 'normal',
              fontSize: '1.5rem'
            }}
          >
            Reservation Form
          </button>
          <button
            onClick={() => this.setActiveTab('table')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'table' ? '#1976d2' : '#f5f5f5',
              color: activeTab === 'table' ? '#fff' : '#222',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: activeTab === 'table' ? 'bold' : 'normal',
              fontSize: '1.5rem'
            }}
          >
            Reservation Table
          </button>
        </div>
        {/* Only the form or the table is shown below the seating */}
        {activeTab === 'form' && (
          <ReservationForm
            onSubmit={this.handleAddRecords}
            selectedSeatsCount={lastReservedCount}
            reservedSeats={this.state.reservedSeats}
          />
        )}
        {activeTab === 'table' && (
          <ReservationTable records={records} />
        )}
      </div>
    );
  }
}

export default Version1;