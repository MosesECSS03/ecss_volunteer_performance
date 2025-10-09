import React, { Component } from 'react';
import './RegistrationForm.css';

function formatSeatLabel(seat) {
  // If already in format 'A01', return as is
  if (/^[A-Z]\d{2}$/.test(seat)) return seat;
  // If in format 'A1', pad the number
  if (/^[A-Z]\d{1,2}$/.test(seat)) {
    const row = seat[0];
    const col = seat.slice(1).padStart(2, '0');
    return `${row}${col}`;
  }
  return seat;
}

function toTitleCase(str) {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

// Helper to group consecutive seats into ranges (e.g., A01, A02, A03 -> A01-A03)
function formatSeatRanges(seats) {
  if (!seats || seats.length === 0) return '';
  // Format and sort seats
  const formatted = seats.map(formatSeatLabel).sort();
  const ranges = [];
  let start = formatted[0];
  let end = formatted[0];

  for (let i = 1; i < formatted.length; i++) {
    const prev = formatted[i - 1];
    const curr = formatted[i];
    // Check if same row and consecutive number
    if (
      curr[0] === prev[0] &&
      parseInt(curr.slice(1), 10) === parseInt(prev.slice(1), 10) + 1
    ) {
      end = curr;
    } else {
      ranges.push(start === end ? start : `${start}-${end}`);
      start = end = curr;
    }
  }
  ranges.push(start === end ? start : `${start}-${end}`);
  return ranges.join(', ');
}

class RegistrationForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: '',
      staffName: '', // Empty - user must select
      location: '',
      paymentRef: '',
      showPriceError: false, // <-- add this
    };
  }

  componentDidUpdate(prevProps) {
    // Remove automatic price calculation - users will manually enter price
    // No automatic price updates based on seat count
  }

  handleChange = (e) => {
    let { name, value } = e.target;
    // Auto-capitalize for name and staffName fields
    if (name === "name" || name === "staffName") {
      value = toTitleCase(value);
    }
    this.setState({ [name]: value });
  };

  handlePaymentRefChange = (e) => {
    this.setState({ paymentRef: e.target.value });
  };

  // Method to manually clear form fields (only when explicitly called)
  clearFormFields = () => {
    this.setState({
      name: '',
      paymentRef: '',
    });
  };

  handleSubmit = (e) => {
    console.log("Submitting form...");
    e.preventDefault();
    let { name, paymentRef, staffName } = this.state;
    const { selectedSeatsCount, reservedSeats } = this.props;
    name = toTitleCase(name.trim());
  
    // Simplified validation - no price validation needed
    if (!name || !paymentRef || !staffName || selectedSeatsCount === 0) {
      console.log("Form validation failed:", { name, paymentRef, staffName, selectedSeatsCount });
      alert("Please fill in all fields and select at least one seat.");
      return;
    }
    
    console.log("Form data being submitted:", {
      name,
      staffName,
      paymentRef,
      selectedSeatsCount,
      seats: (reservedSeats || []).map(formatSeatLabel),
    });
    
    this.props.onSubmit({
      name,
      staffName,
      paymentRef,
      selectedSeatsCount,
      seats: (reservedSeats || []).map(formatSeatLabel),
    });
    
    // Reset form fields to default values
    this.setState({
      name: '',
      staffName: '',
      paymentType: '',
      paymentRef: '',
      price: '',
    });
  };
  
  closePriceError = () => {
    this.setState({ showPriceError: false });
  };

  render() {
    const { name, paymentRef, staffName } = this.state;
    const { selectedSeatsCount, reservedSeats } = this.props;

    // Progressive form logic - enable fields step by step
    const isNameComplete = name && name.trim().length > 0;
    const isStaffComplete = isNameComplete && staffName && staffName.trim().length > 0;
    const isSeatsComplete = isStaffComplete && selectedSeatsCount > 0;
    const isPaymentRefComplete = paymentRef && paymentRef.trim().length > 0;
    const isFormComplete = isSeatsComplete && isPaymentRefComplete;

    return (
      <form className="reservation-form" onSubmit={this.handleSubmit}>
        <h3 style={{ fontSize: '3rem' }}>Booking Form</h3>
        
        {/* Step 1: Name */}
        <label style={{ fontSize: '1.5rem' }}>
          Name
          <input
            type="text"
            name="name"
            value={name}
            required
            onChange={this.handleChange}
            placeholder="Enter name"
            style={{ 
              fontSize: '1.5rem',
              backgroundColor: name ? '#333' : '#2a2a2a',
              border: `2px solid ${name ? '#4efa85' : '#555'}`,
              borderRadius: '4px',
              padding: '10px 12px',
              color: 'white',
              transition: 'all 0.3s ease',
              width: '100%'
            }}
          />
        </label>

        {/* Step 2: Staff Name - dropdown with default value */}
        <label style={{ 
          fontSize: '1.5rem',
          opacity: isNameComplete ? 1 : 0.5,
          transition: 'opacity 0.3s ease'
        }}>
          Staff Name
        </label>
        <select
          name="staffName"
          value={this.state.staffName}
          onChange={this.handleChange}
          disabled={!isNameComplete}
          style={{
            fontSize: '1.5rem',
            padding: '8px 12px',
            border: '2px solid white',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            transition: 'all 0.3s ease',
            width: '100%',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="" style={{backgroundColor: '#333', color: 'white'}}>Select Staff Name</option>
          <option value="Phang Hui San" style={{backgroundColor: '#333', color: 'white'}}>Phang Hui San</option>
          <option value="Yeo Lih Yong" style={{backgroundColor: '#333', color: 'white'}}>Yeo Lih Yong</option>
        </select>

        {/* Step 3: Seat Selection - enabled after staff is complete */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-end', 
          gap: 16,
          opacity: isStaffComplete ? 1 : 0.5,
          transition: 'opacity 0.3s ease'
        }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px', textAlign: 'center' }}>
              Selected Seats Count
            </label>
            <input
              type="text"
              name="selectedSeatsCount"
              value={this.props.selectedSeatsCount}
              onChange={e => this.props.onSelectedSeatsCountChange(e.target.value)}
              style={{
                fontSize: '1.5rem',
                backgroundColor: '#333',
                border: `1px solid ${isSeatsComplete ? '#4efa85' : '#555'}`,
                borderRadius: '4px',
                padding: '10px 12px',
                color: 'white',
                width: '98%'
              }}
              placeholder='Click "Get Seat(s)" button to choose seats'
              disabled
              required
            />
          </div>
          <button
            type="button"
            disabled={!isStaffComplete}
            style={{
              fontSize: '1.2rem',
              padding: '10px 16px',
              background: isStaffComplete ? '#4efa85' : '#666',
              color: isStaffComplete ? '#222' : '#999',
              border: 'none',
              borderRadius: '4px',
              cursor: isStaffComplete ? 'pointer' : 'not-allowed',
              opacity: isStaffComplete ? 1 : 0.6,
              height: '44px',
              flexShrink: 0,
              minWidth: '120px',
              transition: 'all 0.3s ease'
            }}
            onClick={this.props.onAutoSelectSeats}
            title={isStaffComplete ? "Open seating plan to select seats" : "Complete staff selection first"}
          >
            Get Seat(s)
          </button>
        </div>

        {/* Show selected seats */}
        {reservedSeats && reservedSeats.length > 0 && Number(this.props.selectedSeatsCount) > 0 && (
          <div style={{ margin: '12px 0', fontSize: '1.3rem', color: '#0078d4' }}>
            <strong>Selected Seats:</strong> {formatSeatRanges(reservedSeats)}
          </div>
        )}

        {/* Step 4: Payment Reference - enabled after seats are selected */}
        <label style={{ 
          fontSize: '1.5rem',
          opacity: isSeatsComplete ? 1 : 0.5,
          transition: 'opacity 0.3s ease'
        }}>
          Payment reference
          <input
            type="text"
            name="paymentRef"
            value={paymentRef}
            required
            disabled={!isSeatsComplete}
            onChange={this.handlePaymentRefChange}
            placeholder="Enter mobile number"
            style={{ 
              fontSize: '1.5rem',
              backgroundColor: isSeatsComplete ? '#333' : '#222',
              border: `1px solid ${isPaymentRefComplete ? '#4efa85' : '#555'}`,
              borderRadius: '4px',
              padding: '10px 12px',
              color: isSeatsComplete ? 'white' : '#666',
              width: '100%',
              cursor: isSeatsComplete ? 'text' : 'not-allowed',
              transition: 'all 0.3s ease'
            }}
          />
        </label>

        {/* Step 5: Submit - enabled when all fields are complete */}
        <button 
          type="submit" 
          disabled={!isFormComplete || this.props.selectedSeatsCount === 0} 
          style={{ 
            fontSize: '1.5rem', 
            padding: '10px 24px',
            backgroundColor: (isFormComplete && this.props.selectedSeatsCount > 0) ? '#0078d4' : '#666',
            color: (isFormComplete && this.props.selectedSeatsCount > 0) ? 'white' : '#999',
            cursor: (isFormComplete && this.props.selectedSeatsCount > 0) ? 'pointer' : 'not-allowed',
            border: 'none',
            borderRadius: '4px',
            transition: 'all 0.3s ease',
            opacity: (isFormComplete && this.props.selectedSeatsCount > 0) ? 1 : 0.6,
            marginTop: '16px'
          }}
        >
          Submit
        </button>
      </form>
    );
  }
}

export default RegistrationForm;