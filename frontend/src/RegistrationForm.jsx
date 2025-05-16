import React, { Component } from 'react';
import './ReservationForm.css';

const LOCATIONS = [
  "CT Hub",
  "Pasir Ris West Wellness Centre",
  "Tampines 253 Centre",
  "Tampines North Community Club"
];

class RegistrationForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: '',
      staffName: '',
      location: LOCATIONS[0],
    };
  }

  componentDidUpdate(prevProps) {
    // Reset form fields if seat count is reset to 0 after reservation
    if (prevProps.selectedSeatsCount !== 0 && this.props.selectedSeatsCount === 0) {
      this.setState({
        name: '',
        staffName: '',
        location: LOCATIONS[0],
      });
    }
  }

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  handleLocationChange = (e) => {
    this.setState({ location: e.target.value });
  };

  handleSubmit = (e) => {
    e.preventDefault();
    const { name, staffName, location } = this.state;
    const { selectedSeatsCount, reservedSeats } = this.props;
    console.log("Reserved Seats:", this.props)
    const price = (selectedSeatsCount || 0) * 35;
    if (!name || !staffName || !location || selectedSeatsCount === 0) return;
    this.props.onSubmit({
      name,
      staffName,
      location,
      price,
      selectedSeatsCount,
      seats: this.props.reservedSeats || [],
    });
    // Reset form fields to default values
    this.setState({
      name: '',
      staffName: '',
      location: LOCATIONS[0],
    });
  };

  render() {
    const { name, staffName, location } = this.state;
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
        <div>
          <label style={{ fontSize: '1.5rem' }}>
            Selected Seats Count:&nbsp;
            <span style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>{selectedSeatsCount}</span>
          </label>
        </div>
        <div>
          <label style={{ fontSize: '1.5rem' }}>
            Total Price:&nbsp;
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