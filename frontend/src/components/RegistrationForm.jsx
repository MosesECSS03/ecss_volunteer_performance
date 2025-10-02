import React, { Component } from 'react';
import './RegistrationForm.css';

//ok
const LOCATIONS = [
  "CT Hub",
  "Pasir Ris West Wellness Centre",
  "Tampines North Community Club"
];

const STAFF_BY_LOCATION = {
  "CT Hub": ["Rosalind Ong", "Lam Lee Chin", "Yeo Lih Yong", "Rebecca Wang", "Phang Hui San", "Chua Bee Bee", "Eileen Tan"],
  "Tampines North Community Club": ["Allison Teo", "Eileen Tan", "He Xiuxiang"],
  "Pasir Ris West Wellness Centre": ["Jeniffer Lim", "Rebecca Wang", "Phang Hui San", "Chua Bee Bee", "He Xiuxiang"]
};

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
      staffName: '',
      location: '',
      paymentType: '',
      paymentRef: '',
      price: 0,
      showPriceError: false, // <-- add this
    };
  }

  componentDidUpdate(prevProps) {
    const currentCount = Number(this.props.selectedSeatsCount);
    const prevCount = Number(prevProps.selectedSeatsCount);
    
    // Only clear when transitioning from valid to invalid seat count
    // But only clear price, not name and paymentRef (users should be able to type these anytime)
    const shouldResetPrice = (
      // Going from a valid count (> 0) to invalid (0 or empty)
      prevCount > 0 && (currentCount <= 0 || !this.props.selectedSeatsCount || this.props.selectedSeatsCount === '')
    );
    
    // Only reset price when transitioning from valid to invalid
    if (shouldResetPrice) {
      console.log("Resetting price due to seat count changing from valid to invalid");
      this.setState({
        price: 0,
      });
    }

    // Auto-populate price when selectedSeatsCount changes (only for valid counts)
    if (prevProps.selectedSeatsCount !== this.props.selectedSeatsCount && currentCount > 0) {
      const autoPrice = currentCount * 35;
      this.setState({ price: autoPrice });
    }
  }

  handleChange = (e) => {
    let { name, value } = e.target;
    // Auto-capitalize for name and staffName fields
    if (name === "name" || name === "staffName") {
      value = toTitleCase(value);
    }
    this.setState({ [name]: value });
  };

  handlePaymentTypeChange = (e) => {
    this.setState({ paymentType: e.target.value });
  };

  handlePaymentRefChange = (e) => {
    this.setState({ paymentRef: e.target.value });
  };

  // Method to manually clear form fields (only when explicitly called)
  clearFormFields = () => {
    this.setState({
      name: '',
      paymentRef: '',
      price: 0,
    });
  };

  handleStaffDropdownChange = (e) => {
    this.setState({ staffName: e.target.value });
  };

  handleSubmit = (e) => {
    console.log("Submitting form...");
    e.preventDefault();
    let { name, paymentType, paymentRef } = this.state;
    const { staffName, location, selectedSeatsCount, reservedSeats, price } = this.props;
    name = toTitleCase(name.trim());
    const staffNameTitle = toTitleCase((staffName || '').trim());
  
    // Use price from props (parent), fallback to state if not present
    const priceValue = price !== undefined ? price : this.state.price;
    const priceFloat = parseFloat(priceValue);
  
    // Allow price of 0 (free booking) but require minimum $35 for paid bookings
    if (isNaN(priceFloat) || (priceFloat > 0 && priceFloat < 35.00)) {
      this.setState({ showPriceError: true }); // <-- show popup
      return;
    }
  
    if (!name || !staffNameTitle || !location || !paymentType || !paymentRef || selectedSeatsCount === 0) return;
    this.props.onSubmit({
      name,
      staffName: staffNameTitle,
      location,
      paymentType,
      paymentRef,
      price: priceFloat,
      selectedSeatsCount,
      seats: (reservedSeats || []).map(formatSeatLabel),
    });
    // Reset form fields to default values
    this.setState({
      name: '',
      staffName: '',
      paymentType: '',
      paymentRef: '',
      price: 0,
    });
  };
  
  closePriceError = () => {
    this.setState({ showPriceError: false });
  };

  render() {
    const { name, location, paymentType, paymentRef } = this.state;
    const { selectedSeatsCount, reservedSeats, staffName } = this.props;
    // Determine staff name logic
    let staffInputProps = {
      name: "staffName",
      value: staffName,
      required: true,
      onChange: this.handleChange,
      placeholder: "Enter staff name",
      style: {
        fontSize: '2rem',
        width: '100%',
        color: '#ffffff',
        fontWeight: 500,
        textShadow: '0 1px 1px rgba(0, 0, 0, 0.5)'
      }
    };
    let showDropdown = false;
    let dropdownOptions = [];

    if (location === "CT Hub") {
      staffInputProps.readOnly = true;
      showDropdown = true;
      dropdownOptions = STAFF_BY_LOCATION["CT Hub"];
    } else if (location === "Tampines North Community Club") {
      staffInputProps.readOnly = true;
      showDropdown = true;
      dropdownOptions = STAFF_BY_LOCATION["Tampines North Community Club"];
    } else if (location === "Pasir Ris West Wellness Centre") {
      staffInputProps.readOnly = true;
      showDropdown = true;
      dropdownOptions = STAFF_BY_LOCATION["Pasir Ris West Wellness Centre"];
    }

    return (
      <form className="reservation-form" onSubmit={this.handleSubmit}>
        <h3 style={{ fontSize: '3rem' }}>Booking Form</h3>
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
              backgroundColor: name ? '#333' : '#2a2a2a', // Darker when empty
              border: `2px solid ${name ? '#4efa85' : '#555'}`, // Green border when filled
              borderRadius: '4px',
              padding: '10px 12px',
              color: 'white',
              transition: 'all 0.3s ease',
              width: '100%'
            }}
          />
        </label>
        <label style={{ fontSize: '1.5rem' }}>
          Staff Name
          <input 
            style={{ 
              fontSize: '1.5rem',
              backgroundColor: '#333',
              border: '1px solid #555',
              borderRadius: '4px',
              padding: '10px 12px',
              color: 'white',
              width: '100%'
            }} 
            {...staffInputProps} 
          />
        </label>
        {
          this.props.staffDropdownOptions.length > 0 && (
            <div style={{ margin: '0' }}>
              <select
                value={this.props.staffName}
                onChange={e => this.props.onStaffNameChange(e.target.value)}
                style={{ 
                  fontSize: '1.5rem', 
                  width: '100%', 
                  marginTop: 8,
                  backgroundColor: '#333',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  padding: '10px 12px',
                  color: 'white'
                }}
                required
              >
                <option value="">-- Select Staff --</option>
                {this.props.staffDropdownOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}
        <div className="location-radio-row" style={{ fontSize: '1.5rem' }}>
          <label style={{textAlign: 'center', width: '100%' }}>Location</label>
          {LOCATIONS.map(loc => (
            <span key={loc} className="location-radio-label" style={{ fontSize: '1.5rem' }}>
              <input
                type="radio"
                name="location"
                value={loc}
                checked={this.props.location === loc}
                onChange={this.props.onLocationChange}
                required
                style={{ width: 18, height: 18 }}
              />
              <label style={{ margin: 0, fontSize: '1.5rem' }}>{loc}</label>
            </span>
          ))}
        </div>
        <div className="payment-method-container" style={{ fontSize: '1.5rem' }}>
          <label style={{ fontWeight: 'normal', textAlign: 'center', width: '100%' }}>Payment Method</label>
          <div className="payment-options-row">
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="radio"
                name="paymentType"
                value="Cash"
                checked={paymentType === 'Cash'}
                onChange={this.handlePaymentTypeChange}
                style={{ width: 18, height: 18 }}
              />
              Cash
            </label>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="radio"
                name="paymentType"
                value="Paynow"
                checked={paymentType === 'Paynow'}
                onChange={this.handlePaymentTypeChange}
                style={{ width: 18, height: 18 }}
              />
              Paynow
            </label>
          </div>
        </div>
        <label style={{ fontSize: '1.5rem' }}>
          Payment reference
          <input
            type="text"
            name="paymentRef"
            value={paymentRef}
            required
            onChange={this.handlePaymentRefChange}
            placeholder="Enter mobile number"
            style={{ 
              fontSize: '1.5rem',
              backgroundColor: '#333',
              border: '1px solid #555',
              borderRadius: '4px',
              padding: '10px 12px',
              color: 'white',
              width: '100%'
            }}
          />
        </label>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
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
                border: '1px solid #555',
                borderRadius: '4px',
                padding: '10px 12px',
                color: 'white',
                width: '98%'
              }}
              required
            />
          </div>
          <button
            type="button"
            style={{
              fontSize: '1.2rem',
              padding: '10px 16px',
              background: '#4efa85',
              color: '#222',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: 1,
              height: '44px', // Match input total height (24px + 20px padding)
              flexShrink: 0,
              minWidth: '120px'
            }}
            onClick={this.props.onAutoSelectSeats}
            title="Auto-select next available seats"
          >
            Get Seat(s)
          </button>
        </div>
        {reservedSeats && reservedSeats.length > 0 && Number(this.props.selectedSeatsCount) > 0 && (
          <div style={{ margin: '12px 0', fontSize: '1.3rem', color: '#0078d4' }}>
            <strong>Selected Seats:</strong> {formatSeatRanges(reservedSeats)}
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: '1.5rem', width: '100%' }}>
            Total Price $
            <input
              type="text"
              name="price"
              value={this.props.price || ''}
              onChange={e => this.props.onPriceChange(e.target.value)}
              style={{
                fontSize: '1.5rem',
                backgroundColor: '#333',
                border: '1px solid #555',
                borderRadius: '4px',
                padding: '10px 12px',
                color: 'white',
                marginTop: '8px',
                width: '100%'
              }}
            />
          </label>
        </div>
        <button type="submit" disabled={selectedSeatsCount === 0} style={{ fontSize: '1.5rem', padding: '10px 24px' }}>
          Submit
        </button>
        {/* Popup Modal */}
        {this.state.showPriceError && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
          >
            <div
              style={{
                background: '#fff',
                color: '#222',
                padding: '32px 24px',
                borderRadius: '8px',
                boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
                minWidth: 300,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.3rem', marginBottom: 16 }}>
                Total Price must be at least <b>$35.00</b>
              </div>
              <button
                onClick={this.closePriceError}
                style={{
                  fontSize: '1.1rem',
                  padding: '8px 20px',
                  background: '#0078d4',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                OK
              </button>
            </div>
          </div>
        )}
      </form>
    );
  }
}

export default RegistrationForm;