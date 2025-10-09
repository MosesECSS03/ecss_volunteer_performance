import axios from 'axios';
import React, { Component } from 'react';
import './SeatReservationPanel.css';
import SeatingPlan from './SeatingPlan';
import RegistrationForm from './RegistrationForm';
import { io } from 'socket.io-client';
//Latest

// Define your API base URL - could be from environment variables
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : "https://ecss-performance-night-2025.azurewebsites.net";

// Expand a seat range string like "C01 - C03, D01, D03 - D05" to ["C01", "C02", "C03", "D01", "D03", "D04", "D05"]
function expandSeatRanges(seatRanges) {
  console.log("expandSeatRanges input:", seatRanges);
  const result = [];
  seatRanges.forEach((range, index) => {
    console.log(`Processing range ${index}: "${range}"`);
    range.split(',').forEach(part => {
      const trimmed = part.trim();
      console.log(`Processing part: "${trimmed}"`);
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(s => s.trim());
        console.log(`Found range: "${start}" to "${end}"`);
        if (start[0] === end[0]) {
          // Same row
          const row = start[0];
          const startNum = parseInt(start.slice(1), 10);
          const endNum = parseInt(end.slice(1), 10);
          console.log(`Expanding row ${row} from ${startNum} to ${endNum}`);
          for (let i = startNum; i <= endNum; i++) {
            const seat = `${row}${i.toString().padStart(2, '0')}`;
            console.log(`Adding seat: ${seat}`);
            result.push(seat);
          }
        }
      } else if (trimmed) {
        console.log(`Adding individual seat: ${trimmed}`);
        result.push(trimmed);
      }
    });
  });
  console.log("expandSeatRanges result:", result);
  return result;
}

// New helper function to format seat ranges
function formatSeatRanges(seats) {
  if (!Array.isArray(seats) || seats.length === 0) return '';
  // Sort seats by row and number
  const sorted = [...seats].sort((a, b) => {
    if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
    return parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10);
  });

  const ranges = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const prev = end;
    const curr = sorted[i];
    // Check if same row and consecutive number
    if (
      curr[0] === prev[0] &&
      parseInt(curr.slice(1), 10) === parseInt(prev.slice(1), 10) + 1
    ) {
      end = curr;
    } else {
      ranges.push(start === end ? start : `${start} - ${end}`);
      start = end = curr;
    }
  }
  ranges.push(start === end ? start : `${start} - ${end}`);
  return ranges.join(', ');
}

class SeatReservationPanel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedSeats: [],
      selectedSeatsCount: "", // <-- Add this line
      cfmSelectedSeatsCount: 0, // <-- Add this line
      locationFilter: 'all',
      staffName: '', // simplified staff namexw
      isSeatingPlanOpen: false, // New state to track popup visibility
      isViewOnly: false, // Track if seating plan is in view-only mode
      isLoading: true,
      error: null,
      records: 0,
      notifications: [], // <-- Add this line
    };

    // Add this in your constructor
    this.seatingPlanRef = React.createRef();
  }

  // Fetch data when component mounts
  componentDidMount() {
    this.fetchAvailabilityData();
    this.fetchNotifications();

    this.socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });
    
    this.socket.on('connect', () => {
      console.log('Socket connected successfully:', this.socket.id);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
    
    this.socket.on('reservation-updated', (data) => {
      console.log("Socket event received123", data);
      this.fetchAvailabilityData();
      this.fetchNotifications();
    });

    window.addEventListener('onesignal-notification', (e) => {
      console.log('OneSignal notification event:', e.detail);
      this.addNotification(e.detail);
    });
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.off('reservation-updated');
      this.socket.off('connect');
      this.socket.off('connect_error');
      this.socket.disconnect();
    }
    window.removeEventListener('onesignal-notification', this.addNotification);
  }


  // Method to fetch availability data from API
  fetchAvailabilityData = async () => {
    try {
      console.log("Starting fetchAvailabilityData...");
      const response = await axios.post(`${API_BASE_URL}/ticketSales`, { purpose: "retrieve" });
      console.log("Full API response:", response);
      console.log("Response data:", response.data);
      console.log("Response.data.result:", response.data.result);
      
      // Based on the backend code: return res.json({ result });
      // where result = { success: true, data: records }
      // So the structure is response.data.result.data
      let records = response.data.result.data;
      
      console.log("Final records:", records);
      console.log("Records type:", typeof records);
      console.log("Records is array:", Array.isArray(records));
      
      if (!records || !Array.isArray(records)) {
        console.error("No valid records found in API response");
        console.log("Attempting alternative data access...");
        // Try alternative access patterns
        if (response.data.result && Array.isArray(response.data.result)) {
          records = response.data.result;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          records = response.data.data;
        } else {
          console.error("Could not find records in any expected location");
          this.setState({ 
            isLoading: false,
            error: "No data found" 
          });
          return;
        }
      }

      // Generate all seat IDs (e.g. C01, C02, ..., Y25)
      const allSeatRows = [
        'C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y'
      ];
      const allSeatIds = [];
      allSeatRows.forEach(row => {
        for (let i = 1; i <= 25; i++) {
          allSeatIds.push(`${row}${i.toString().padStart(2, '0')}`);
        }
      });

      // Find reserved seats from records
      const reservedSeats = new Set();
      records.forEach((record, index) => {
        console.log(`Processing record ${index}:`, record);
        console.log(`Record ${index} seats:`, record.seats);
        
        if (record.seats && Array.isArray(record.seats)) {
          console.log(`Expanding seat ranges for record ${index}:`, record.seats);
          // Expand seat ranges if needed
          const expanded = expandSeatRanges(record.seats);
          console.log(`Expanded seats for record ${index}:`, expanded);
          expanded.forEach(seat => {
            console.log(`Adding seat to reserved set: ${seat}`);
            reservedSeats.add(seat);
          });
        }
      });
      console.log("All reserved seats (Set):", reservedSeats);
      console.log("Reserved seats (Array):", Array.from(reservedSeats));

      this.setState({
        records: records.length,
        reservedSeats: Array.from(reservedSeats),
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
    // Generate all seat IDs (e.g. C01, C02, ..., L25)
    const allSeatRows = [
      'C','D','E','F','G','H','I','J','K','L'
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

    return {
      totalSeats,
      available,
      reserved: booked,
      locations: {} // Default empty locations object
    };
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

  // Method to toggle the seating plan popup in VIEW-ONLY mode (🎭View Seating Plan button)
  toggleSeatingPlan = () => {
    this.setState(prevState => ({
      isSeatingPlanOpen: !prevState.isSeatingPlanOpen,
      isViewOnly: true // Always view-only for this button
    }));
  }

  // Method to open seating plan in INTERACTIVE mode (for Get Seat(s) button)
  openSeatingPlan = () => {
    // Open in interactive mode for seat selection
    this.setState({ 
      isSeatingPlanOpen: true,
      isViewOnly: false // Interactive mode for seat selection
    });
  }

  // New method to toggle the registration form
  toggleRegistrationForm = () => {
    this.setState(prevState => ({
      isRegistrationOpen: !prevState.isRegistrationOpen
    }));
  }

  handleRegistrationSubmit = async (formData) => {
    try {
      const year = new Date().getFullYear();
      let nextNumber = this.state.records + 1;
      const padded = String(nextNumber).padStart(3, '0');
      const bookingNo = `ECSS/MC${year}/${padded}`;
  
      // Format current time as dd/mm/yyyy hh:mm:ss
      const now = new Date();
      const pad = (n) => n.toString().padStart(2, '0');
      const notificationDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const time = notificationDate;
  
      // Add bookingNo and time to formData
      const submission = { ...formData, bookingNo, time };
      console.log("Registration submitted:", submission);
  
      // --- Check for overlapping reserved seats before proceeding ---
      const { reservedSeats = [] } = this.state;
      const selectedSeats = Array.isArray(submission.seats)
        ? submission.seats
        : (typeof submission.seats === 'string' ? submission.seats.split(',').map(s => s.trim()) : []);
  
      // Check for overlap
      const overlap = selectedSeats.filter(seat => reservedSeats.includes(seat));
      if (overlap.length > 0) {
        alert(`The following seats are already reserved: ${overlap.join(', ')}. Please select different seats.`);
        // Open the seating plan popup and show the current selection
        this.setState({
          isSeatingPlanOpen: true,
          selectedSeats: selectedSeats
        });
        return;
      }
  
      const insertResponse = await axios.post(`${API_BASE_URL}/ticketSales`, { purpose: "insert", records: [submission] });
      console.log("Insert response:", insertResponse.data);
  
      if (insertResponse.data.success) {
        // Generate the PDF(s)
        const pdfResponse = await axios.post(`${API_BASE_URL}/ticketSales`, { purpose: "generate", records: [submission] });
  
        if (pdfResponse.data.isZip && pdfResponse.data.zipBase64) {
          // Handle ZIP file containing multiple PDFs
          const base64 = pdfResponse.data.zipBase64;
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/zip' });
  
          // Create a blob URL and download the ZIP file
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = pdfResponse.data.zipFilename || 'tickets.zip';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
        } else if (pdfResponse.data.multiplePdfs && pdfResponse.data.pdfFiles) {
          // Handle multiple PDFs - one for each seat (fallback)
          pdfResponse.data.pdfFiles.forEach((pdfFile, index) => {
            const base64 = pdfFile.pdfBase64;
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
    
            // Create a blob URL
            const blobUrl = URL.createObjectURL(blob);
    
            // 1. Open the first PDF in a new tab for viewing
            if (index === 0) {
              window.open(blobUrl, '_blank');
            }
    
            // 2. Download each PDF with seat-specific filename
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = pdfFile.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          });
        } else if (pdfResponse.data.receiptPdfBase64) {
          // Handle single PDF (backwards compatibility)
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
        console.log("Sending notification to backend:");
        // Store notification in backend
        try {
          await axios.post(`${API_BASE_URL}/notifications`, {
            purpose: "insert",
            type: "reservation",
            date: notificationDate,
            description: `Booking:${submission.name} (${submission.bookingNo}) - ${formatSeatRanges(submission.seats)}`,
          });
        } catch (notifyErr) {
          console.error("Failed to store notification:", notifyErr);
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
    const numCount = Number(count);
    console.log("Selected seats count changed:", count);
    
    // If count is 0 or empty, clear selected seats as well
    if (!count || count === '' || numCount <= 0) {
      this.setState({ 
        selectedSeatsCount: count, 
        selectedSeats: [] // Clear selected seats when count is 0/empty
      });
      
      // Trigger form field clearing in RegistrationForm by forcing a re-render
      // This ensures name and paymentRef are cleared immediately
      this.forceUpdate();
    } else {
      this.setState({ selectedSeatsCount: count });
    }
  };

  // Add this method to your SeatReservationPanel class
  handleSeatsSelected = (selectedSeats) => {
    // This will be called by SeatingPlan via the onSeatsSelected prop
    // Update selectedSeats, selectedSeatsCount, and price
    const selectedSeatsCount = selectedSeats.length;
    
    if (selectedSeatsCount > 0) {
      // User is selecting seats - update everything
      this.setState({
        selectedSeats,
        selectedSeatsCount
      });
    } else {
      // User is clearing selection - clear everything including the seat count field
      this.setState({
        selectedSeats,
        selectedSeatsCount: '' // Clear the seat count field to make form blank
      });
    }
    console.log("Seats selected from SeatingPlan:", selectedSeats);
  };

    // Handler to auto-select seats for the current location
  handleAutoSelectSeats = () => {
    const rawCount = this.state.selectedSeatsCount;
    let count = Number(rawCount);
    
    // Handle empty, null, undefined, or 0 values - default to 0 for manual selection
    if (!rawCount || rawCount === '' || count <= 0 || isNaN(count)) {
      count = 0; // No auto-selection, user will select manually
    }
    
    this.setState(
      { 
        cfmSelectedSeatsCount: count,
        isSeatingPlanOpen: true
      },
      () => {
        // After opening the modal, trigger auto-select in SeatingPlan only if count > 0
        if (this.seatingPlanRef.current && count > 0) {
          this.seatingPlanRef.current.handleAutoSelectSeats();
        }
      }
    );
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

  // New method to fetch notifications from the server
  fetchNotifications = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/notifications`, { purpose: "retrieve" });
      console.log("Notifications", response.data.data.data);
      if (response.data.success && response.data.data.data) {
        const notifications = response.data.data.data.map((n, idx) => ({
          ...n,
          id: n._id || idx, // Ensure React key
        }));
        this.setState({ notifications });
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  render() {
    const { reservedSeats = [] } = this.props;
    const { 
      selectedSeats, 
      locationFilter, 
      notifications, 
      isSeatingPlanOpen, 
      isRegistrationOpen,
      isViewOnly,
      availabilityData,
      isLoading,
      error,
      selectedSeatsCount
    } = this.state;
    
    return (
        <div className="reservation-layout">
          {/* Left Column - Registration Form and optional View Seating Plan button */}
          <div className="seating-plan-column">

            {/* If in viewOnlyMode, show seating plan directly */}
            {this.props.viewOnlyMode ? (
              <div className="view-only-seating-plan">
                <SeatingPlan
                  ref={this.seatingPlanRef}
                  availableSeats={this.state.availableSeats}
                  reservedSeats={this.state.reservedSeats}
                  noOfReservedSeats={this.state.selectedSeatsCount}
                  onSeatsSelected={null} // Disable selection in view-only mode
                  onClearSelection={null} // Disable clearing in view-only mode
                  selectedSeats={[]} // No selected seats in view-only mode
                  viewOnly={true} // Always view-only
                />
              </div>
            ) : (
              <>
                {/* Seating Plan Popup - only show if not in viewOnlyMode */}
                {isSeatingPlanOpen && (
                  <div className="seating-plan-modal-overlay">
                    <div className="seating-plan-modal">
                      <div className="seating-plan-modal-header">
                        <h3>Seating Plan</h3>
                        <button 
                          className="close-modal-btn"
                          onClick={() => {
                            this.setState({ isSeatingPlanOpen: false });
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
                          onSeatsSelected={isViewOnly ? null : this.handleSeatsSelected} // Enable/disable based on mode
                          onClearSelection={isViewOnly ? null : this.handleClearSelection} // Enable/disable based on mode
                          selectedSeats={this.state.selectedSeats}
                          viewOnly={isViewOnly} // Use dynamic view-only prop
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Registration Form (inline, not popup) - only show if not in viewOnlyMode */}
                <div className="registration-form-section">
                  <RegistrationForm
                    selectedSeatsCount={this.state.selectedSeatsCount}
                    reservedSeats={this.state.selectedSeats}
                    onSubmit={this.handleRegistrationSubmit}
                    onAutoSelectSeats={this.openSeatingPlan}
                    onSelectedSeatsCountChange={this.handleSelectedSeatsCountChange}
                  />
                </div>
              </>
            )}
          </div>
        </div>
    );
  }
}

export default SeatReservationPanel;