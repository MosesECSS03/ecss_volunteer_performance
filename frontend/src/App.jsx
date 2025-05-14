import React, { Component } from 'react';
import SeatDashboard from './SeatDashboard';
import ReservationTable from './ReservationTable';
import ReservationForm from './RegistrationForm';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      records: [],
      activeTab: 'form', // 'form' or 'table'
      selectedSeatsCount: 0,
      lastReservedCount: 0,
      reservedSeats: [], // <-- add this
    };
  }

  handleAddRecords = (formData) => {
    console.log("Form Data:", formData)
    const seatRecords = (formData.seats || []).map(seat => ({
      name: formData.name,
      location: formData.location,
      price: formData.price,
      row: seat.row,
      col: seat.col,
      time: seat.time,
    }));
    this.setState(prevState => ({
      records: [...prevState.records, ...seatRecords],
      selectedSeatsCount: 0,
      lastReservedCount: 0
    }));
  };

  setActiveTab = (tab) => {
    this.setState({ activeTab: tab });
  };

  handleSelectedSeatsChange = (count) => {
    this.setState({ selectedSeatsCount: count });
  };

  handleReserve = (reservedSeats) => {
    console.log("Reserved Seats1:", reservedSeats);
    // Only update lastReservedCount and selectedSeatsCount, do not update records
    this.setState({
      lastReservedCount: reservedSeats.length,
      reservedSeats: reservedSeats,          
      selectedSeatsCount: 0
    });
  };

  render() {
    const { records, activeTab, lastReservedCount } = this.state;
    return (
      <div>
        {/* SeatDashboard is always shown */}
        <SeatDashboard
          onReserve={this.handleReserve}
          onSelectedSeatsChange={this.handleSelectedSeatsChange}
          onSelectedSeatsChangeDetails={this.handleSelectedSeatsChangeDetails}
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
              fontWeight: activeTab === 'form' ? 'bold' : 'normal'
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
              fontWeight: activeTab === 'table' ? 'bold' : 'normal'
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