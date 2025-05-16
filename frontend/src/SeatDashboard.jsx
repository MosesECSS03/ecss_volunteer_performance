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

const CinemaChairSVG = ({ fillColor, seatNumber, size = 200 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 80 80"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="10" y="18" width="60" height="28" rx="8" fill="black" stroke="gray" strokeWidth="1.5" />
    <rect x="10" y="50" width="60" height="28" rx="8" fill={fillColor} stroke="gray" strokeWidth="1.5" />
    <rect x="2" y="50" width="8" height="28" fill="gray" />
    <rect x="70" y="50" width="8" height="28" fill="gray" />
    <text
      x="40"
      y="62"
      fontSize="36" // 1.5rem ≈ 24px
      fontWeight="bold"
      textAnchor="middle"
      fill="white"
      dominantBaseline="middle"
    >
      {seatNumber}
    </text>
  </svg>
);

class SeatDashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      seats: Array.from({ length: ROWS }, (_, row) =>
        Array.from({ length: COLS }, (_, col) => {
          // Reserve C8–C20 (row 0, col 7–19) and D8–D20 (row 1, col 7–19)
          const isReserved = (
            (row === 0 && col >= 7 && col <= 19) || // C8–C20
            (row === 1 && col >= 7 && col <= 19)    // D8–D20
          );
          return {
            row,
            col,
            reserved: isReserved,
          };
        })
      ),
      selected: [],
    };
  }

  // Divide columns into 3 sections: left, center, right
  getSectionForCol = (col) => {
    if (col < 10) return SECTIONS[0]; // columns 0-9
    if (col < 19) return SECTIONS[1]; // columns 10-18
    return SECTIONS[2];               // columns 19-28
  };

  getSectionForRow = (rowIdx) => {
    const sectionIdx = Math.floor(rowIdx / 2) % SECTIONS.length;
    return SECTIONS[sectionIdx];
  };

  getSeatLabel = (rowIdx, colIdx) => {
    // C is 67 in ASCII, so row 0 = C, row 1 = D, etc.
    return `${String.fromCharCode(67 + Number(rowIdx))}${Number(colIdx) + 1}`;
  };

  handleSeatClick = (row, col) => {
    row = row - 2;
    console.log("Seat clicked:", row, col);
    const { seats } = this.state;
    if (seats[row][col].reserved) return;
    const key = `${row}-${col}`;
    this.setState(prevState => {
      const selected = prevState.selected.includes(key)
        ? prevState.selected.filter(k => k !== key)
        : [...prevState.selected, key];
      return { selected };
    });
  };

  render() {
    const { seats, selected } = this.state;
    const { reservedSeats } = this.props; // <-- get reservedSeats from props
    return (
      <div className="dashboard-container">
        <h2 style={{fontSize: '3rem'}}>Seat Reservation Dashboard</h2>
        <button
          className="reserve-btn seat-action-gap"
          onClick={() => this.props.onReserve(this.state.selected)}
          disabled={selected.length === 0}
          style={{
            fontSize: '1.5rem',
          }}
        >
          Reserve Selected
        </button>
        <div className="seat-grid">
          {/* Stage inside the seat grid */}
          <div className="stage-row">
            <div className="stage-label" style={{fontSize:"3rem"}}>STAGE</div>
          </div>
          {seats.map((rowArr, rowIdx) => {
            let seatNum = 1;
            const section = this.getSectionForRow(rowIdx);
            return (
              <div className="seat-row" key={rowIdx}>
                {rowArr.map((seat, colIdx) => {
                  const isGap = colIdx === 6 || colIdx === 20;
                  if (isGap) {
                    return <div key={colIdx} className="seat empty-seat"></div>;
                  }
                  const seatNumber = `${String.fromCharCode(67 + rowIdx)}${colIdx + 1}`;
                  const key = `${rowIdx}-${colIdx}`;
                  const seatLabel = this.getSeatLabel(rowIdx, colIdx);
                  // A seat is reserved if it's in reservedSeats prop OR marked reserved in state
                  const isReserved = (reservedSeats && reservedSeats.includes(seatLabel)) || seat.reserved;
                  const seatColor = isReserved
                    ? sectionColors[section].reserved
                    : selected.includes(key)
                    ? sectionColors[section].selected
                    : sectionColors[section].available;
                  return (
                    <button
                      key={key}
                      className="seat"
                      onClick={() => this.handleSeatClick(rowIdx, colIdx)}
                      disabled={isReserved}
                    >
                      <CinemaChairSVG fillColor={seatColor} seatNumber={seatNumber} />
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div className="legend-container">
          <h3 style={{ textAlign: 'center', marginBottom: 8,
            fontSize: '1.5rem',
          }}>Legend</h3>
          <div className="legend-row-layout">
            {SECTIONS.map(section => (
              <div className="legend-section" key={section}>
                <div className="legend-section-title" style={{
            fontSize: '1.5rem',
          }}>{section}</div>
                <div className="legend-icons-horizontal">
                  <div className="legend-item-horizontal">
                    <CinemaChairSVG fillColor={sectionColors[section].available} size={50} />
                    <span style={{
            fontSize: '1.5rem',
          }}>Available</span>
                  </div>
                  <div className="legend-item-horizontal">
                    <CinemaChairSVG fillColor={sectionColors[section].selected} size={50} />
                    <span style={{
            fontSize: '1.5rem',
          }}>Selected</span>
                  </div>
                  <div className="legend-item-horizontal">
                    <CinemaChairSVG fillColor={sectionColors[section].reserved} size={50} />
                    <span style={{
            fontSize: '1.5rem',
          }}>Reserved</span>
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
