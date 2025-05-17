import React, { Component } from 'react';
import './SeatDashboard.css';

const ROWS = 11;
const COLS = 27;

const sectionColors = {
  available: "rgb(0, 79, 140)",      // maroon (dark, not red)
  selected: "rgb(93, 80, 35)",       // dark goldenrod (gold/yellow)
  reserved: "rgb(126, 0, 0)"         // dark blue
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

// Group rows in pairs and cycle through locations
const rowLocationCycle = [
  "CT Hub",
  "Tampines 253 Centre and Tampines North Community Club",
  "Pasir Ris West Wellness Centre"
];

const rowLocationGroupsRaw = [];
for (let i = 0; i < ROWS; i += 2) {
  const start = i + 1;
  const end = Math.min(i + 2, ROWS);
  const name = rowLocationCycle[Math.floor(i / 2) % rowLocationCycle.length];
  rowLocationGroupsRaw.push({
    range: end !== start ? `${start}-${end}` : `${start}`,
    name
  });
}

// Group ranges by location name
const rowLocationGroups = rowLocationGroupsRaw.reduce((acc, curr) => {
  const found = acc.find(g => g.name === curr.name);
  if (found) {
    found.ranges.push(curr.range);
  } else {
    acc.push({ name: curr.name, ranges: [curr.range] });
  }
  return acc;
}, []);

function rowNumberToLetter(rowNum) {
  // Your rows start from 1, and you want C for 1, D for 2, etc.
  // So: 1 -> C, 2 -> D, 3 -> E, ...
  return String.fromCharCode(67 + rowNum); // 65 = 'A'
}

class SeatDashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      seats: [],
      selected: [],
    };
  }

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
          {seats.map((rowArr, rowIdx) => (
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
                const isReserved =
                  (reservedSeats && reservedSeats.includes(seatLabel)) ||
                  seat.reserved;
                const isSelected = selected.includes(seatLabel);
                const seatColor = isReserved
                  ? sectionColors.reserved
                  : isSelected
                  ? sectionColors.selected
                  : sectionColors.available;
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
          ))}
        </div>
        {/* Legend */}
        <div
          className="legend-container"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            gap: 48, // Increased gap for more space between columns
            margin: '32px auto 0 auto', // Add top margin for separation from seats
            maxWidth: 900,
            width: '100%',
          }}
        >
          {/* Section 1: Legend */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="legend-row-layout">
              <div className="legend-section">
                <h3 style={{ textAlign: 'center', marginBottom: 8, fontSize: '1.5rem', color: "#ffffff"}}>Legend</h3>
                <div className="legend-icons-horizontal">
                  <div className="legend-item-horizontal">
                    <CinemaChairSVG fillColor={sectionColors.available} size={50} />
                    <span style={{ fontSize: '1.5rem' }}>Available</span>
                  </div>
                  <div className="legend-item-horizontal">
                    <CinemaChairSVG fillColor={sectionColors.selected} size={50} />
                    <span style={{ fontSize: '1.5rem' }}>Selected</span>
                  </div>
                  <div className="legend-item-horizontal">
                    <CinemaChairSVG fillColor={sectionColors.reserved} size={50} />
                    <span style={{ fontSize: '1.5rem' }}>Reserved</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Section 2: Row Locations */}
          <div
            style={{
              flex: 1,
              borderRadius: 8,
              padding: '18px 24px',
              minWidth: 500,
              fontSize: '1.5rem',
              color: '#ffffff',
              textAlign: 'left',  
              marginLeft: 12 // Extra gap inside the flex container
            }}
          >
            <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 8 }}>
              Row Locations
            </div>
            <div style={{ marginTop: 12 }}>
              {rowLocationGroups.map((loc, idx) => (
                <div key={idx} style={{ marginBottom: 10 }}>
                  Rows&nbsp;
                  {loc.ranges.map(range => {
                    if (range.includes('-')) {
                      const [start, end] = range.split('-').map(Number);
                      return (
                        rowNumberToLetter(start - 1) + '-' + rowNumberToLetter(end - 1)
                      );
                    } else {
                      return rowNumberToLetter(Number(range) - 1);
                    }
                  }).join(', ')}
                  : {loc.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default SeatDashboard;
