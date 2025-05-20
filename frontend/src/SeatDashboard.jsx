import React, { Component } from 'react';
import './SeatDashboard.css';

const ROWS = 11;
const COLS = 27;

const sectionColors = {
  available: "rgb(0, 79, 140)",
  selected: "rgb(93, 80, 35)",
  reserved: "rgb(126, 0, 0)",
  vip: "rgb(201, 114, 0)"
};

const CinemaChairSVG = ({ fillColor, seatNumber, size = 300 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 80 80"
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
  <div style={{ width: size, height: size / 2, display: 'flex' }}>
    <svg
      width={size / 2}
      height={size / 2}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="20" y="50" width="60" height="25" rx="10" fill="black" stroke="gray" strokeWidth="3" />
      <rect x="20" y="10" width="60" height="35" rx="10" fill={fillColor} stroke="gray" strokeWidth="3" />
      <rect x="8" y="10" width="12" height="30" rx="6" fill="gray" />
      <rect x="80" y="10" width="12" height="30" rx="6" fill="gray" />
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

const rowLocationCycle = [
  "CT Hub",
  "Tampines 253 Centre and Tampines North Community Club",
  "Pasir Ris West Wellness Centre"
];

const rowLocationGroupsRaw = [];
for (let i = 0; i < ROWS; i += 2) {
  const start = i + 1;
  const end = Math.min(i + 2, ROWS);
  let name;
  if (end === ROWS && start === end) {
    name = "CT Hub";
  } else {
    name = rowLocationCycle[Math.floor(i / 2) % rowLocationCycle.length];
  }
  rowLocationGroupsRaw.push({
    range: end !== start ? `${start}-${end}` : `${start}`,
    name
  });
}

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
  return String.fromCharCode(67 + rowNum);
}

class SeatDashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selected: [],
    };
  }

  getSeatLabel = (row, col) => {
    const rowLetter = String.fromCharCode(67 + Number(row));
    const colNumber = (col + 1).toString().padStart(2, '0');
    return `${rowLetter}${colNumber}`;
  };

  handleSeatClick = (seatLabel) => {
    const { selected } = this.state;
    const { reservedSeats } = this.props;

    if (reservedSeats && reservedSeats.includes(seatLabel)) return;

    let newSelected;
    if (selected.includes(seatLabel)) {
      newSelected = selected.filter(label => label !== seatLabel);
    } else {
      newSelected = [...selected, seatLabel];
    }
    this.setState({ selected: newSelected });
  };

  handleRowClick = (rowIdx) => {
    this.setState({ selected: [] });
  };

  handleClearSelection = () => {
    this.setState({ selected: [] });
    console.log("Cleared selected seats:", this.props.reservedSeats);
    console.log("Cleared selected seats:", this.props.onClearReservedSeats);
   // if (this.props.onClearReservedSeats) {
      console.log("Calling onClearReservedSeats");
      this.props.onClearReservedSeats();
    //}
  };

  render() {
    const seats = [];
    for (let row = 0; row < ROWS; row++) {
      const rowArr = [];
      for (let col = 0; col < COLS; col++) {
        const isVIP = (row === 0 || row === 1) && (col >= 7 && col <= 19);
        const reserved = !isVIP && (row < 2) && (col >= 7 && col <= 19);
        rowArr.push({ row, col, reserved });
      }
      seats.push(rowArr);
    }

    const { selected } = this.state;
    const { reservedSeats } = this.props;

    // Create array of column indices to display (skipping gaps)
    const colIndices = [];
    for (let col = 0; col < COLS; col++) {
      if ((col >= 0 && col <= 5) || (col >= 7 && col <= 19) || (col >= 21 && col <= 26)) {
        // For each visible column, add the seat number (1-based)
        if (col <= 5) colIndices.push(col + 1);  // Fixed missing parenthesis
        else if (col <= 19) colIndices.push(col); // Adjust for gap at col 6
        else colIndices.push(col-1); // Adjust for gaps at col 6 and 20
      } else {
        // For gap columns, push null
        colIndices.push(null);
      }
    }

    return (
      <div className="dashboard-container">
        <h2 style={{ fontSize: '3rem' }}>Seat Reservation Dashboard</h2>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <button
            className="clear-btn seat-action-gap"
            onClick={this.handleClearSelection}
            disabled={selected.length === 0}
            style={{
              fontSize: '1.5rem',
              background: '#245357',
              color: '#fff',
              border: '1px solid #888',
              borderRadius: 6,
            }}
          >
            Clear Selection
          </button>
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
        </div>
        <div className="seat-grid">
          <div className="stage-row">
            <div className="stage-label" style={{ fontSize: "3rem" }}>STAGE</div>
          </div>
          
          {/* Add column indices row */}
          <div className="seat-row column-indices" style={{ 
  marginBottom: '10px',
  display: 'flex',
  alignItems: 'center'
}}>
  {/* Empty cell for row index column */}
  <div style={{ 
    width: '40px', 
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFEB3B', // Yellow for contrast
    fontWeight: 'bold',
    fontSize: '1.3rem',
    marginRight: '5px' // Match the margin of row letters
  }}></div>
  
  {colIndices.map((colIndex, idx) => {
    if (colIndex === null) {
      // Render gap at colIdx 6 and 20
      return <div key={`col-gap-${idx}`} className="seat empty-seat"></div>;
    }
    
    return (
      <div key={`col-${idx}`} style={{ 
        width: '60px', // Match the width of the seat SVG (size/2)
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFEB3B', // Yellow for contrast
        fontWeight: 'bold',
        fontSize: '1.3rem',
        // Ensure perfect centering
        boxSizing: 'border-box',
        textAlign: 'center',
        position: 'relative',
        // These margins should match the button/seat spacing
        margin: '0',
        padding: '0'
      }}>
        {colIndex}
      </div>
    );
  })}
</div>
          
          {seats.map((rowArr, rowIdx) => {
            let seatNumber = 1; // Start seat number at 1 for each row
            const rowLetter = String.fromCharCode(67 + rowIdx);
            
            return (
              <div
                className="seat-row"
                key={rowIdx}
                onClick={() => this.handleRowClick(rowIdx)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {/* Add row index cell */}
                <div style={{ 
                  width: '40px', 
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFEB3B', // Yellow for contrast
                  fontWeight: 'bold',
                  fontSize: '1.5rem',
                  marginRight: '5px'
                }}>
                  {rowLetter}
                </div>
                
                {rowArr.map((seat, colIdx) => {
                  // Only render seats for 0-5, 7-19, 21-26
                  if (
                    (colIdx >= 0 && colIdx <= 5) ||
                    (colIdx >= 7 && colIdx <= 19) ||
                    (colIdx >= 21 && colIdx <= 26)
                  ) {
                    const seatLabel = `${rowLetter}${seatNumber.toString().padStart(2, '0')}`;
                    seatNumber++; // Increment only for visible seats
                    const isReserved =
                      reservedSeats && reservedSeats.includes(seatLabel);
                    const isSelected = selected && selected.includes(seatLabel);
                    const isVIP =
                      (rowIdx === 0 || rowIdx === 1) && (colIdx >= 7 && colIdx <= 19);
                    const seatColor = isReserved
                      ? "#888" // your custom reserved color
                      : isSelected
                      ? "#FFD700" // your custom selected color
                      : isVIP
                      ? "#FF8800" // your custom VIP color
                      : "#0050A0"; // your custom available color
                    return (
                      <button
                        key={seatLabel}
                        className={`seat${isSelected ? ' selected' : ''}${isVIP ? ' vip' : ''}${isReserved ? ' reserved' : ''}`}
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
                          cursor: !isReserved ? 'pointer' : 'not-allowed',
                          position: 'relative'
                        }}
                      >
                        <CinemaChairSVG1 fillColor={seatColor} seatNumber={seatLabel} />
                        {isVIP && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '70%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              color: '#ffffff',
                              fontWeight: 'bold',
                              fontSize: '0.9rem',
                              width: 32,
                              height: 32,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 6,
                              zIndex: 2
                            }}
                          >
                            VIP
                          </span>
                        )}
                      </button>
                    );
                  }
                  // Render gap at colIdx 6 and 20
                  if (colIdx === 6 || colIdx === 20) {
                    return <div key={`gap-${colIdx}`} className="seat empty-seat"></div>;
                  }
                  // Otherwise, render nothing
                  return null;
                })}
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div
          className="legend-container"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            gap: 48,
            margin: '32px auto 0 auto',
            maxWidth: 900,
            width: '100%',
          }}
        >
          {/* Section 1: Legend */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="legend-row-layout">
              <div className="legend-section">
                <h3 style={{ textAlign: 'center', marginBottom: 8, fontSize: '1.5rem', color: "#ffffff" }}>Legend</h3>
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
                    <span style={{ fontSize: '1.5rem' }}>Booked</span>
                  </div>
                  <div className="legend-item-horizontal">
                    <CinemaChairSVG fillColor={sectionColors.vip} size={50} />
                    <span style={{ fontSize: '1.5rem' }}>VIP (Reserved)</span>
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
              marginLeft: 12
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
