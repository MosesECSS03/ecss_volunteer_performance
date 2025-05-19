import React, { Component } from 'react';
import './ReservationForm.css';

const LOCATIONS = [
  "CT Hub",
  "Pasir Ris West Wellness Centre",
  "Tampines 253 Centre",
  "Tampines North Community Club"
];

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

class RegistrationForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: '',
      staffName: '',
      location: '',
      paymentType: '',
      paymentRef: '', // <-- add this
    };
  }

  componentDidUpdate(prevProps) {
    // Reset form fields if seat count is reset to 0 after reservation
    if (prevProps.selectedSeatsCount !== 0 && this.props.selectedSeatsCount === 0) {
      this.setState({
        name: '',
        staffName: '',
        location: '',
        paymentType: '', // reset to default value
        paymentRef: '', // reset to default value
      });
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

  handleLocationChange = (e) => {
    this.setState({ location: e.target.value });
  };

  handlePaymentTypeChange = (e) => {
    this.setState({ paymentType: e.target.value });
  };

  handlePaymentRefChange = (e) => {
    this.setState({ paymentRef: e.target.value });
  };

  handleSubmit = (e) => {
    e.preventDefault();
    let { name, staffName, location, paymentType, paymentRef } = this.state;
    const { selectedSeatsCount, reservedSeats } = this.props;
    name = toTitleCase(name.trim());
    staffName = toTitleCase(staffName.trim());
    const price = (selectedSeatsCount || 0) * 35;
    if (!name || !staffName || !location || !paymentType || !paymentRef || selectedSeatsCount === 0) return;
    this.props.onSubmit({
      name,
      staffName,
      location,
      paymentType,
      paymentRef,
      price,
      selectedSeatsCount,
      seats: (reservedSeats || []).map(formatSeatLabel),
    });
    // Reset form fields to default values
    this.setState({
      name: '',
      staffName: '',
      location: '',
      paymentType: '', // reset to default value
      paymentRef: '', // reset to default value
    });
  };

  render() {
    const { name, staffName, location, paymentType, paymentRef } = this.state;
    const { selectedSeatsCount, reservedSeats } = this.props;
    const price = (selectedSeatsCount || 0) * 35;

    return (
      <form className="reservation-form" onSubmit={this.handleSubmit}>
        <h3 style={{ fontSize: '3rem' }}>Registration Details</h3>
        <label style={{ fontSize: '1.5rem' }}>
          Name
          <input
            type="text"
            name="name"
            value={name}
            required
            onChange={this.handleChange}
            placeholder="Enter name"
            style={{ fontSize: '1.5rem' }}
          />
        </label>
        <label style={{ fontSize: '1.5rem' }}>
          Staff Name
          <input
            type="text"
            name="staffName"
            value={staffName}
            required
            onChange={this.handleChange}
            placeholder="Enter staff name"
            style={{ fontSize: '1.5rem' }}
          />
        </label>
        <div className="location-radio-row" style={{ fontSize: '1.5rem' }}>
          <span className="info-label" style={{ marginRight: 12 }}>Location</span>
          {LOCATIONS.map(loc => (
            <span key={loc} className="location-radio-label" style={{ fontSize: '1.5rem' }}>
              <input
                type="radio"
                name="location"
                value={loc}
                checked={location === loc}
                onChange={this.handleLocationChange}
                required
                style={{ width: 18, height: 18 }}
              />
              <label style={{ margin: 0, fontSize: '1.5rem' }}>{loc}</label>
            </span>
          ))}
        </div>
        <div style={{ fontSize: '1.5rem', marginBottom: 12, display: 'flex', alignItems: 'center' }}>
          <label style={{ marginRight: 12, fontWeight: 600 }}>Payment Method</label>
          <label style={{ marginRight: 18, display: 'flex', alignItems: 'center' }}>
            <input
              type="radio"
              name="paymentType"
              value="Cash"
              checked={paymentType === 'Cash'}
              onChange={this.handlePaymentTypeChange}
              style={{ width: 18, height: 18, marginRight: 6 }}
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
              style={{ width: 18, height: 18, marginRight: 6 }}
            />
            Paynow
          </label>
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
            style={{ fontSize: '1.5rem' }}
          />
        </label>
        <div>
          <label style={{ fontSize: '1.5rem' }}>
            Selected Seats Count&nbsp;
            <span style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>{selectedSeatsCount}</span>
          </label>
        </div>
        <div>
          <label style={{ fontSize: '1.5rem' }}>
            Total Price&nbsp;
            <span style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>${price}</span>
          </label>
        </div>
        <button type="submit" disabled={selectedSeatsCount === 0} style={{ fontSize: '1.5rem', padding: '10px 24px' }}>
          Submit
        </button>
      </form>
    );
  }
}

export default RegistrationForm;