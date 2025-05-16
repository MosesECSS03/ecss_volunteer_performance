import React, { Component } from 'react';
import './SeatDashboard.css';

const ROWS = 11;
const COLS = 27;
const SECTIONS = [
  "CT Hub",
  "Tampines 253 Centre and Tampines North Community Club",
  "Pasir Ris West Wellness Centre"
];

const sectionColors = {
  "CT Hub": {
    available: "#0d47a1",
    selected: "#00e676", // bright green
    reserved: "#b8860b"
  },
  "Tampines 253 Centre and Tampines North Community Club": {
    available: "#4a148c",   // deep purple
    selected:  "#8e24aa",   // violet
    reserved:  "#b71c1c"    // dark red
  },
 "Pasir Ris West Wellness Centre": {
  available: "#6d1b7b",   // dark magenta
  selected:  "#283593",   // dark indigo
  reserved:  "#f57c00"    // dark orange (distinct from red)
}
};


const CinemaChairSVG = ({ fillColor, seatNumber, size = 300}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 80 80" // <-- FIXED: set to match your drawing coordinates
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="10" y="50" width="60" height="28" rx="8" fill="black" stroke="gray" strokeWidth="1.5" />
    <rect x="10" y="18" width="60" height="28" rx="8" fill={fillColor} stroke="gray" strokeWidth="1.5" />
    <rect x="2" y="19" width="8" height="28" rx="6" fill="gray" />
    <rect x="70" y="19" width="8" height="28" rx="6" fill="gray" />
    <text
      x="40"
      y="62"
      fontSize="36"
      fontWeight="bold"
      textAnchor="middle"
      fill="white"
      dominantBaseline="middle"
    >
      {seatNumber}
    </text>
  </svg>
);

const CinemaChairSVG1 = ({ fillColor, seatNumber, size = 120 }) => (
  <div style={{ width: size, height: size / 2, display: 'flex'}}>
    <svg
      width={size/2}
      height={size / 2}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="20" y="50" width="60" height="25" rx="10" fill="black" stroke="gray" strokeWidth="3" />
      <rect x="20" y="10" width="60" height="35" rx="10" fill={fillColor} stroke="gray" strokeWidth="3" />
      {/* Chair seat */}
      <rect x="8" y="10" width="12" height="30" rx="6" fill="gray" />
      <rect x="80" y="10" width="12" height="30" rx="6" fill="gray" />
      {/* Seat label */}
      <text
        x="45"
        y="30"
        fontSize="35"
        fontWeight="bold"
        textAnchor="middle"
        fill="white"
        dominantBaseline="middle"
        style={{ pointerEvents: 'none' }}
      >
        {seatNumber}
      </text>
    </svg>
  </div>
);

class SeatDashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      seats: [],
      selected: [],
    };
  }

  getSectionForCol = (col) => {
    if (col < 10) return SECTIONS[0];
    if (col < 19) return SECTIONS[1];
    return SECTIONS[2];
  };

  getSectionForRow = (rowIdx) => {
    const sectionIdx = Math.floor(rowIdx / 2) % SECTIONS.length;
    return SECTIONS[sectionIdx];
  };

  getSeatLabel = (row, col) => {
    const rowLetter = String.fromCharCode(67 + Number(row)); // 65 = 'A'
    const colNumber = (col + 1).toString().padStart(2, '0');
    return `${rowLetter}${colNumber}`;
  };

  handleSeatClick = (seatLabel) => {
    const { seats, selected } = this.state;
    const { reservedSeats } = this.props;

    // Find the seat object by label
    let foundSeat = null;
    for (let row of seats) {
      for (let seat of row) {
        if (this.getSeatLabel(seat.row, seat.col) === seatLabel) {
          foundSeat = seat;
          break;
        }
      }
      if (foundSeat) break;
    }

    // If seat is reserved, do nothing
    if (
      (reservedSeats && reservedSeats.includes(seatLabel)) ||
      (foundSeat && foundSeat.reserved)
    ) return;

    // Toggle selection in array
    let newSelected;
    if (selected.includes(seatLabel)) {
      newSelected = selected.filter(label => label !== seatLabel);
    } else {
      newSelected = [...selected, seatLabel];
    }
    this.setState({ selected: newSelected });
  };

  handleRowClick = (rowIdx) => {
    // Deselect any selected seat if row is clicked
    this.setState({ selected: null });
  };

  render() {
    const seats = [];
    // Reserve middle section (cols 7-19) for first 2 rows (row 0 and 1)
    for (let row = 0; row < ROWS; row++) {
      const rowArr = [];
      for (let col = 0; col < COLS; col++) {
        const reserved = (row < 2) && (col >= 7 && col <= 19);
        rowArr.push({ row, col, reserved });
      }
      seats.push(rowArr);
    }

    const { selected } = this.state;
    const { reservedSeats } = this.props;

    return (
      <div className="dashboard-container">
        <h2 style={{fontSize: '3rem'}}>Seat Reservation Dashboard</h2>
        <button
          className="reserve-btn seat-action-gap"
          onClick={() => this.props.onReserve(selected)}
          disabled={selected.length === 0}
          style={{
            fontSize: '1.5rem',
          }}
        >
          Reserve Selected
        </button>
        <div className="seat-grid">
          <div className="stage-row">
            <div className="stage-label" style={{fontSize:"3rem"}}>STAGE</div>
          </div>
          {seats.map((rowArr, rowIdx) => {
            const section = this.getSectionForRow(rowIdx);
            return (
              <div
                className="seat-row"
                key={rowIdx}
                onClick={() => this.handleRowClick(rowIdx)}
                style={{ cursor: 'pointer' }}
              >
                {rowArr.map((seat, colIdx) => {
                  const seatLabel = this.getSeatLabel(rowIdx, colIdx);
                  const isGap = colIdx === 6 || colIdx === 20;
                  if (isGap) {
                    return <div key={colIdx} className="seat empty-seat"></div>;
                  }
                  // Mark as reserved if in reservedSeats prop or if reserved in seat object
                  const isReserved =
                    (reservedSeats && reservedSeats.includes(seatLabel)) ||
                    seat.reserved;
                  const isSelected = selected.includes(seatLabel);
                  const seatColor = sectionColors[section]
                    ? (isReserved
                        ? sectionColors[section].reserved
                        : isSelected
                        ? sectionColors[section].selected
                        : sectionColors[section].available)
                    : "#888";
                  return (
                    <button
                      key={seatLabel}
                      className="seat"
                      onClick={
                        !isReserved
                          ? (e) => {
                              e.stopPropagation();
                              this.handleSeatClick(seatLabel);
                            }
                          : undefined
                      }
                      disabled={isReserved}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: !isReserved ? 'pointer' : 'not-allowed'
                      }}
                    >
                      <CinemaChairSVG1 fillColor={seatColor} seatNumber={seatLabel} />
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div className="legend-container">
          <h3 style={{ textAlign: 'center', marginBottom: 8, fontSize: '1.5rem' }}>Legend</h3>
          <div className="legend-row-layout">
            {SECTIONS.map(section => (
              <div className="legend-section" key={section}>
                <div className="legend-section-title" style={{ fontSize: '1.5rem' }}>{section}</div>
                <div className="legend-icons-horizontal">
                  <div className="legend-item-horizontal">
                    <CinemaChairSVG fillColor={sectionColors[section].available} size={50} />
                    <span style={{ fontSize: '1.5rem' }}>Available</span>
                  </div>
                  <div className="legend-item-horizontal">
                    <CinemaChairSVG fillColor={sectionColors[section].selected} size={50} />
                    <span style={{ fontSize: '1.5rem' }}>Selected</span>
                  </div>
                  <div className="legend-item-horizontal">
                    <CinemaChairSVG fillColor={sectionColors[section].reserved} size={50} />
                    <span style={{ fontSize: '1.5rem' }}>Reserved</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

export default SeatDashboard;
