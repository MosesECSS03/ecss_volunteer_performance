import React, { Component } from 'react';
import SeatDashboard from './SeatDashboard';
import ReservationTable from './ReservationTable';
import ReservationForm from './RegistrationForm';
import axios from 'axios';

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

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      records: [],
      activeTab: 'form', // 'form' or 'table'
      selectedSeatsCount: 0,
      lastReservedCount: 0,
      reservedSeats: [], // <-- add this
      allReservedSeats: []
    };
  }

  handleAddRecords = async (formData) => {
    console.log("Form Data:", formData);


    // Create a single record with all seat labels
    const seatRecord = {
      name: formData.name,
      location: formData.location,
      price: formData.price,
      seats: formData.seats,
      time: getFormattedDateTime(), // <-- formatted as dd/mm/yyyy hh:mm:ss
    };

    try {
      const response = await axios.post('http://localhost:3001/ticketSales', { purpose: "insert", records: [seatRecord] });
      console.log('✅ Records saved:', response.data.success);

      if (response.data.success) {
        this.setState(prevState => ({
          records: [...prevState.records, seatRecord],
          selectedSeatsCount: 0,
          lastReservedCount: 0
        }));
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

  handleReserve = (reservedSeats) => {
    // Convert keys like "2-16" to seat labels like "E17"
    const reservedLabels = reservedSeats.map(key => {
      const [row, col] = key.split('-');
      return `${String.fromCharCode(67 + Number(row))}${Number(col) + 1}`;
    });

    this.setState(prevState => ({
      lastReservedCount: reservedLabels.length,
      reservedSeats: reservedLabels,
      selectedSeatsCount: 0,
      allReservedSeats: [...prevState.allReservedSeats, ...reservedLabels] // <-- add here
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
        seats.push(`${row}${i}`);
      }
      return seats;
    }
    // Single seat like "E10"
    return [seatStr];
  };

  componentDidMount = async () => {
    try {
      const response = await axios.post('http://localhost:3001/ticketSales', { purpose: "retrieve" });
      var records = response.data.result.data;
      
      console.log("Records:", records);

      const allReservedSeats = records.flatMap(record =>
        record.seats.flatMap(seatStr => this.expandSeatRange(seatStr))
      );
      
      console.log("All Seats:", allReservedSeats);  // You had "allSeats" here by mistake
      
      this.setState({ records, allReservedSeats });  // Missing closing }
    } catch (error) {
      console.error("Error fetching ticket sales:", error);
    }
  };


  render() {
    const { records, activeTab, lastReservedCount, allReservedSeats} = this.state;
    return (
      <div>
        {/* SeatDashboard is always shown */}
        <SeatDashboard
          onReserve={this.handleReserve}
          onSelectedSeatsChange={this.handleSelectedSeatsChange}
          onSelectedSeatsChangeDetails={this.handleSelectedSeatsChangeDetails}
          reservedSeats={allReservedSeats}
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
        {console.log("Records123:", records)}
        {activeTab === 'table' && (
          <ReservationTable records={records} />
        )}
      </div>
    );
  }
}

export default App;