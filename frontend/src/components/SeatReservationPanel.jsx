import axios from 'axios';
import React, { Component } from 'react';
import './SeatReservationPanel.css';
import SeatingPlan from './SeatingPlan';
import RegistrationForm from './RegistrationForm';
import { io } from 'socket.io-client';

// Define your API base URL - could be from environment variables
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : "https://ecss-performance-night-2025.azurewebsites.net";

    // Expand a seat range string like "C01 - C03, D01, D03 - D05" to ["C01", "C02", "C03", "D01", "D03", "D04", "D05"]
function expandSeatRanges(seatRanges) {
  const result = [];
  seatRanges.forEach(range => {
    range.split(',').forEach(part => {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(s => s.trim());
        if (start[0] === end[0]) {
          // Same row
          const row = start[0];
          const startNum = parseInt(start.slice(1), 10);
          const endNum = parseInt(end.slice(1), 10);
          for (let i = startNum; i <= endNum; i++) {
            result.push(`${row}${i.toString().padStart(2, '0')}`);
          }
        }
      } else if (trimmed) {
        result.push(trimmed);
      }
    });
  });
  return result;
}

class SeatReservationPanel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedSeats: [],
      selectedSeatsCount: "", // <-- Add this line
      cfmSelectedSeatsCount: 0, // <-- Add this line
      locationFilter: 'all',
      location: '', // add this
      notifications: [
        { id: 1, type: 'info', message: 'Select seats to reserve them' },
        { id: 2, type: 'warning', message: 'VIP seats require special access' }
      ],
      isSeatingPlanOpen: false, // New state to track popup visibility
      availabilityData: {
        totalSeats: 0,
        available: 0,
        reserved: 0,
        locations: {}
      },
      isLoading: true,
      error: null,
      records: 0
    };

    // Add this in your constructor
    this.seatingPlanRef = React.createRef();
  }

  // Fetch data when component mounts
  componentDidMount() {
    this.fetchAvailabilityData();

    this.socket = io(API_BASE_URL);
    this.socket.on('reservation-updated', (data) => {
      console.log("Socket event received123", data);
      this.fetchAvailabilityData();
    });

    window.addEventListener('onesignal-notification', (e) => {
      console.log('OneSignal notification event:', e.detail);
      this.addNotification(e.detail);
    });
  }

  // Method to fetch availability data from API
  fetchAvailabilityData = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/ticketSales`, { purpose: "retrieve" });
      const records = response.data.result.data;
      console.log("Records fetched:", records);

      // Process the records to calculate availability
      const availabilityData = this.processAvailabilityData(records);

      // Generate all seat IDs (e.g. C01, C02, ..., M25)
      const allSeatRows = [
        'C','D','E','F','G','H','I','J','K','L','M'
      ];
      const allSeatIds = [];
      allSeatRows.forEach(row => {
        for (let i = 1; i <= 25; i++) {
          allSeatIds.push(`${row}${i.toString().padStart(2, '0')}`);
        }
      });

      // Find reserved seats from records
      const reservedSeats = new Set();
      records.forEach(record => {
        if (record.seats && Array.isArray(record.seats)) {
          // Expand seat ranges if needed
          const expanded = expandSeatRanges(record.seats);
          expanded.forEach(seat => reservedSeats.add(seat));
        }
      });
      console.log("Reserved seats:", reservedSeats);

      // Compute available seats
      const availableSeats = allSeatIds.filter(seatId => !reservedSeats.has(seatId));


      this.setState({
        records: records.length,
        availabilityData,
        availableSeats, // <-- Add this line
        reservedSeats: Array.from(reservedSeats), // <-- add this line
        isLoading: false
      });
    } catch (error) {
      console.error("Error fetching availability data:", error);
      this.setState({
        error: "Failed to load availability data",
        isLoading: false
      });
    }
  };

  // Process API data into the required format
  processAvailabilityData = (records) => {
    // Generate all seat IDs (e.g. C01, C02, ..., M25)
    const allSeatRows = [
      'C','D','E','F','G','H','I','J','K','L','M'
    ];
    const allSeatIds = [];
    allSeatRows.forEach(row => {
      for (let i = 1; i <= 25; i++) {
        allSeatIds.push(`${row}${i.toString().padStart(2, '0')}`);
      }
    });

    // Expand all reserved seats
    const reservedSeats = new Set();
    records.forEach(record => {
      if (record.seats && Array.isArray(record.seats)) {
        const expanded = expandSeatRanges(record.seats);
        expanded.forEach(seat => reservedSeats.add(seat));
      }
    });

    // Calculate total, available, and reserved
    const totalSeats = allSeatIds.length;
    const booked = reservedSeats.size;
    const available = totalSeats - booked;

    // Calculate per-location availability
    const locations = {
      'CT Hub': { total: 125, available: 125 },
      'Tampines': { total: 100, available: 100 },
      'Pasir Ris West Wellness Centre': { total: 50, available: 50 }
    };

    reservedSeats.forEach(seatId => {
      const loc = this.determineLocationFromSeat(seatId);
      if (locations[loc]) {
        locations[loc].available -= 1;
      }
    });

    return {
      totalSeats,
      available,
      reserved: booked,
      locations
    };
  };
  
  // Helper method to determine location from seat ID (if needed)
  determineLocationFromSeat = (seatId) => {
    // Example logic - should be adapted to your actual seat ID format
    const row = seatId.charAt(0);
    
    if (['C', 'D', 'I', 'J', 'M'].includes(row)) {
      return 'CT Hub';
    } else if (['E', 'F', 'K', 'L'].includes(row)) {
      return 'Tampines';
    } else if (['G', 'H'].includes(row)) {
      return 'Pasir Ris West Wellness Centre';
    }
    
    // Default if can't determine
    return 'CT Hub';
  };

  handleSeatSelect = (seatId) => {
    this.setState(prevState => {
      if (prevState.selectedSeats.includes(seatId)) {
        return {
          selectedSeats: prevState.selectedSeats.filter(id => id !== seatId)
        };
      } else {
        return {
          selectedSeats: [...prevState.selectedSeats, seatId]
        };
      }
    });
  }

  handleLocationFilter = (location) => {
    this.setState({ locationFilter: location });
  }

  handleReservation = async () => {
    const { selectedSeats } = this.state;
    const { socket } = this.props;
    
    if (selectedSeats.length === 0) return;
    
    try {
      // Emit reservation event to socket
      socket.emit('reserve_seats', { seatIds: selectedSeats });
      
      // Clear selection after reservation
      this.setState({ selectedSeats: [] });
    } catch (error) {
      console.error("Error reserving seats:", error);
    }
  }

  handleClearSelection = () => {
    this.setState({ selectedSeats: [] });
  }

  // New method to toggle the seating plan popup
  toggleSeatingPlan = (selectedSeats = null) => {
    // If selectedSeats is provided, update state
    console.log("Selected seats:", selectedSeats);
    if (selectedSeats) {
      this.handleSeatsSelected(selectedSeats);
    }
    this.setState(prevState => ({
      isSeatingPlanOpen: !prevState.isSeatingPlanOpen
    }));
  }

  // New method to toggle the registration form
  toggleRegistrationForm = () => {
    this.setState(prevState => ({
      isRegistrationOpen: !prevState.isRegistrationOpen
    }));
  }

  handleRegistrationSubmit = async (formData) => 
  {
    try {
      const year = new Date().getFullYear();
      let nextNumber = this.state.records + 1;
      const padded = String(nextNumber).padStart(3, '0');
      const bookingNo = `ECSS/MC${year}/${padded}`;

      // Format current time as dd/mm/yyyy hh:mm:ss
      const now = new Date();
      const pad = (n) => n.toString().padStart(2, '0');
      const time = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      // Add bookingNo and time to formData
      const submission = { ...formData, bookingNo, time };
      console.log("Registration submitted:", submission);

      const insertResponse = await axios.post(`${API_BASE_URL}/ticketSales`, { purpose: "insert", records: [submission] });
      console.log("Insert response:", insertResponse.data);

      if (insertResponse.data.success) {
        // Generate the PDF
        const pdfResponse = await axios.post(`${API_BASE_URL}/ticketSales`, { purpose: "generate", records: [submission] });

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
          link.download = `${submission.paymentRef || ''} ${submission.bookingNo}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        this.setState(prevState => ({
          records: [...prevState.records, submission],
          selectedSeatsCount: 0,
          lastReservedCount: 0
        }));

        // Refresh the page
        window.location.reload();

        // Reset location and selectedSeatsCount in state
        this.setState({
          location: "",
          selectedSeatsCount: ""
        });
      }
    } catch (error) {
      console.error('❌ Error saving records:', error);
    }

  }

  // Handler for seat count change
  handleSelectedSeatsCountChange = (count) => {
    console.log("Selected seats count changed:", count);
    this.setState({ selectedSeatsCount: count });
  };

  // Add this method to your SeatReservationPanel class
  handleSeatsSelected = (selectedSeats) => {
    // This will be called by SeatingPlan via the onSeatsSelected prop
    // You can update state or perform any action with the selected seat numbers
    this.setState({
      selectedSeats,
      selectedSeatsCount: selectedSeats.length // <-- keep count in sync
    });
    // Optionally, you can log or trigger other logic here
    console.log("Seats selected from SeatingPlan:", selectedSeats);
  };

    // Handler to auto-select seats for the current location
  handleAutoSelectSeats = () => {
    this.setState(
      { cfmSelectedSeatsCount: Number(this.state.selectedSeatsCount), isSeatingPlanOpen: true },
      () => {
        // After opening the modal, trigger auto-select in SeatingPlan
        if (this.seatingPlanRef.current) {
          this.seatingPlanRef.current.handleAutoSelectSeats();
        }
      }
    );
  };
  
  // New method to handle location change
  handleLocationChange = (location) => {
    this.setState({ location });
  };

  addNotification = (notification) => {
  console.log("Adding notification:", notification);
    this.setState(prevState => ({
      notifications: [
        ...prevState.notifications,
        { id: Date.now(), ...notification }
      ]
    }));
  };

  render() {
    const { reservedSeats = [] } = this.props;
    const { 
      selectedSeats, 
      locationFilter, 
      notifications, 
      isSeatingPlanOpen, 
      isRegistrationOpen,
      availabilityData,
      isLoading,
      error,
      selectedSeatsCount
    } = this.state;
    
    // AI insights (mock data)
    const aiInsights = [
      { id: 1, message: "Based on current trends, CT Hub will be fully booked in the next hour." },
      { id: 2, message: "Consider opening additional seats in Pasir Ris to meet demand." },
      { id: 3, message: "Peak reservation times are approaching. Prepare for increased activity." }
    ];
    
    return (
      <div className="seat-reservation-panel">
        <h2>Seat Reservation</h2>
        
        <div className="reservation-layout">
          {/* Left Column - Button to open Seating Plan and Registration Form */}
          <div className="seating-plan-column">
            <button 
              className="view-seating-plan-btn"
              onClick={this.toggleSeatingPlan}
            >
              <span className="btn-icon">🎭</span>
              View Seating Plan
            </button>

            {/* Seating Plan Popup */}
            {isSeatingPlanOpen && (
              <div className="seating-plan-modal-overlay">
                <div className="seating-plan-modal">
                  <div className="seating-plan-modal-header">
                    <h3>Seating Plan</h3>
                    <button 
                      className="close-modal-btn"
                      onClick={() => {
                        // Get selected seats from SeatingPlan via ref
                        const selectedSeats = this.seatingPlanRef.current
                          ? this.seatingPlanRef.current.getSelectedSeats()
                          : [];
                        this.toggleSeatingPlan(selectedSeats);
                      }}
                    >
                      &times;
                    </button>
                  </div>
                  <div className="seating-plan-modal-body">
                    <SeatingPlan
                      ref={this.seatingPlanRef}
                      availableSeats={this.state.availableSeats}
                      reservedSeats={this.state.reservedSeats} // <-- pass here
                      noOfReservedSeats={this.state.selectedSeatsCount}
                      onSeatSelect={this.handleSeatSelect}
                      onClearSelection={this.handleClearSelection}
                      location={this.state.location}
                      selectedSeats={this.state.selectedSeats}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Registration Form (inline, not popup) */}
            <div className="registration-form-section">
              <RegistrationForm
                selectedSeatsCount={this.state.selectedSeatsCount}
                reservedSeats={this.state.selectedSeats} // This is the array of selected seat numbers
                onSubmit={this.handleRegistrationSubmit}
                onAutoSelectSeats={this.handleAutoSelectSeats}
                onSelectedSeatsCountChange={this.handleSelectedSeatsCountChange}
                location={this.state.location}
                onLocationChange={this.handleLocationChange}
              />
            </div>
          </div>
          
          {/* Right Column - Live Availability, AI Insights, Notifications */}
          <div className="info-column">
            {/* Live Availability Section */}
            <div className="info-panel live-availability">
              <h3>Live Availability</h3>
              
              {isLoading ? (
                <div className="loading-indicator">Loading availability data...</div>
              ) : error ? (
                <div className="error-message">{error}</div>
              ) : (
                <div className="availability-overview">
                  {/* Summary metrics section */}
                  <div className="availability-summary">
                    <div className="availability-metric">
                      <span className="metric-label">Total Seats:</span>
                      <span className="metric-value">{availabilityData.totalSeats}</span>
                    </div>
                    <div className="availability-metric">
                      <span className="metric-label">Available:</span>
                      <span className="metric-value available">{availabilityData.available}</span>
                    </div>
                    <div className="availability-metric">
                      <span className="metric-label">Booked:</span>
                      <span className="metric-value reserved">{availabilityData.reserved}</span>
                    </div>
                  </div>
                  
                  <h4>Location Breakdown</h4>
                  
                  {/* Scrollable container for locations */}
                  <div className="locations-scrollable-container">
                    {Object.entries(availabilityData.locations).map(([loc, data]) => {
                      const reservedSeats = data.total - data.available;
                      const availablePercentage = (data.available / data.total) * 100;
                      const reservedPercentage = (reservedSeats / data.total) * 100;
                      
                      return (
                        <div key={loc} className="location-availability high-contrast vertical-layout">
                          {/* SECTION 1: Location name and total */}
                          <div className="location-section location-header-section">
                              <span className="location-name">{loc}</span>
                          </div>
                          
                          {/* SECTION 2: Status bars with labels */}
                          <div className="location-section location-bars-section">
                            <div className="availability-bar-wrapper">
                              {/* Available portion */}
                              <div 
                                className="availability-bar available-bar" 
                                style={{ width: `${availablePercentage}%` }}
                              ></div>
                              {/* Reserved portion */}
                              <div 
                                className="availability-bar reserved-bar" 
                                style={{ width: `${reservedPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          {/* SECTION 3: Statistics breakdown */}
                          <div className="location-section location-stats-section">
                            <div className="stats-grid">
                              <div className="stats-item">
                                <span className="stats-label">Total:</span>
                                <span className="stats-value">{data.total}</span>
                              </div>
                              <div className="stats-item">
                                <span className="stats-label">Available:</span>
                                <span className="stats-value available">{data.available}</span>
                              </div>
                              <div className="stats-item">
                                <span className="stats-label">Booked:</span>
                                <span className="stats-value reserved">{reservedSeats}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* AI Insights Section */}
           {/* <div className="info-panel ai-insights">
              <h3>AI Insights</h3>
              <ul className="insights-list">
                {aiInsights.map(insight => (
                  <li key={insight.id} className="insight-item">
                    <span className="insight-icon">💡</span>
                    <span className="insight-message">{insight.message}</span>
                  </li>
                ))}
              </ul>
            </div>*/}
            
            {/* Notifications Section */}
            <div className="info-panel notifications">
              <h3>Notifications</h3>
              <div className="notifications-list">
                {notifications.map(notification => (
                  <div key={notification.id} className={`notification-item ${notification.type}`}>
                    <span className="notification-icon">
                      {notification.type === 'info' ? 'ℹ️' : 
                       notification.type === 'warning' ? '⚠️' : '📢'}
                    </span>
                    <span className="notification-message">{notification.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '12px 0'
  }}
>
  <input
    type="number"
    min="1"
    max="10"
    value={this.props.noOfReservedSeats}
    onChange={e => this.props.onSelectedSeatsCountChange(e.target.value)}
    style={{
      width: '60px !important',
      padding: '4px 8px !important',
      fontSize: '1rem !important',
      borderRadius: '4px !important',
      border: '1px solid #ccc !important',
      marginRight: '0 !important'
    }}
  />
  <button
    onClick={this.handleAutoSelectSeats}
    style={{
      padding: '4px 14px !important',
      fontSize: '1rem !important',
      borderRadius: '4px !important',
      background: '#0078d4 !important',
      color: '#fff !important',
      border: 'none !important',
      fontWeight: 'bold !important',
      cursor: 'pointer !important'
    }}
  >
    Get Next Seats
  </button>
</div>
      </div>
    );
  }
}

export default SeatReservationPanel;