import React, { Component } from 'react';
import { io } from 'socket.io-client';
import './SeatingPlan.css';

const COLS = 26; // 6 left + 1 gap + 13 middle + 1 gap + 6 right
const ROW_LETTERS = [
  'C','D','E','F','G','H','I','J','K','L','M','N',
  'O','P','Q','R','S','T','U','V','W','X', 'Y', 'Z'
];
const API_BASE_URL = window.location.hostname === "localhost"
  ? "http://localhost:3001"
  : "https://ecss-performance-night-2025.azurewebsites.net";

const sectionColors = {
  available: "rgb(0, 79, 140)",
  selected: "#DAA520",  // Golden color for selected
  reserved: "#8B0000",  // Dark red color for reserved (more visible)
};

// Helper function to determine seat color
const getSeatColor = (isReserved, isSelected) => {
  if (isReserved) return sectionColors.reserved;
  if (isSelected) return sectionColors.selected;
  return sectionColors.available;
};

// ====================
// Seat SVG
// ====================
const CinemaChairSVG1 = ({ fillColor, seatNumber, size = 100 }) => (
  <div style={{ width: size, height: size / 2, display: 'flex' }}>
    <svg width={size / 2} height={size / 2} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="50" width="60" height="25" rx="10" fill="black" stroke="gray" strokeWidth="3" />
      <rect x="20" y="10" width="60" height="35" rx="10" fill={fillColor} stroke="gray" strokeWidth="3" />
      <rect x="8" y="10" width="12" height="30" rx="6" fill="gray" />
      <rect x="80" y="10" width="12" height="30" rx="6" fill="gray" />
      <text x="45" y="30" fontSize="30" fontWeight="bold" textAnchor="middle" fill="white" dominantBaseline="middle"
        style={{ pointerEvents: 'none' }}>
        {seatNumber}
      </text>
    </svg>
  </div>
);

// ====================
// SeatingPlan Component
// ====================
class SeatingPlan extends Component {
  constructor(props) {
    super(props);
    // Initialize with selected seats from props if available, ensure it's always an array
    this.state = { 
      selected: Array.isArray(props.selectedSeats) ? props.selectedSeats : [] 
    };
  }

  getSelectedSeats = () => {
    return this.state.selected;
  }

  componentDidMount() {
    this.socket = io(API_BASE_URL);
    this.socket.on('reservation-updated', (data) => {
      console.log("Socket event received", data);
    });
  }

  componentWillUnmount() {
    if (this.props.socket) {
      this.props.socket.off('reservation-updated');
    }
  }

  componentDidUpdate(prevProps) {
    // Update selected seats if props change, ensure it's always an array
    if (prevProps.selectedSeats !== this.props.selectedSeats) {
      this.setState({ 
        selected: Array.isArray(this.props.selectedSeats) ? this.props.selectedSeats : [] 
      });
    }
    // Only clear selection if reserved seats change, no auto-selection
    if (prevProps.reservedSeats !== this.props.reservedSeats) {
      // Clear any seats that are now reserved
      this.setState(prevState => ({
        selected: (Array.isArray(prevState.selected) ? prevState.selected : []).filter(seatLabel => 
          !this.props.reservedSeats.includes(seatLabel)
        )
      }));
    }
  }

  handleClearSelection = () => {
    this.setState({ selected: [] });
    if (this.props.onClearReservedSeats) {
      this.props.onClearReservedSeats();
    }
  };

  handleSeatClick = (seatLabel) => {
    // If view only mode, don't allow seat clicks
    if (this.props.viewOnly) {
      return;
    }
    
    this.setState((prevState) => {
      const alreadySelected = prevState.selected.includes(seatLabel);
      let updatedSelected;
      if (alreadySelected) {
        updatedSelected = prevState.selected.filter(s => s !== seatLabel);
      } else {
        updatedSelected = [...prevState.selected, seatLabel].sort();
      }
      
      // Update seat colors and notify parent
      if (this.props.onSeatsSelected) {
        this.props.onSeatsSelected(updatedSelected);
      }
      
      return { selected: updatedSelected };
    });
  };

  getSeatColor = (seatLabel, isReserved, isSelected) => {
    if (isReserved) return sectionColors.reserved;
    if (isSelected) return sectionColors.selected;
    return sectionColors.available;
  };

  render() {
    const { reservedSeats = [] } = this.props;
    const { selected } = this.state;
    // Ensure selected is always an array
    const selectedSeats = Array.isArray(selected) ? selected : [];
    const SEAT_WIDTH = 50;
    const GAP_WIDTH = 100;

    // Debug logging for reserved seats
    console.log("SeatingPlan render - reservedSeats:", reservedSeats);
    console.log("SeatingPlan render - reservedSeats type:", typeof reservedSeats);
    console.log("SeatingPlan render - reservedSeats length:", reservedSeats?.length);

    // Group seat labels for display
    const groupSeatLabels = (seatLabels) => {
      if (!seatLabels || seatLabels.length === 0) return [];
      const sorted = [...seatLabels].sort();
      const result = [];
      let rangeStart = null;
      let rangeEnd = null;
      for (let label of sorted) {
        const row = label.slice(0,1);
        const num = parseInt(label.slice(1),10);
        if (!rangeStart) {
          rangeStart = { row,num,label };
          rangeEnd = { row,num,label };
        } else if (row === rangeEnd.row && num === rangeEnd.num+1) {
          rangeEnd = { row,num,label };
        } else {
          result.push(rangeStart.label === rangeEnd.label ? rangeStart.label : `${rangeStart.label}-${rangeEnd.label}`);
          rangeStart = { row,num,label };
          rangeEnd = { row,num,label };
        }
      }
      if (rangeStart) result.push(rangeStart.label === rangeEnd.label ? rangeStart.label : `${rangeStart.label}-${rangeEnd.label}`);
      return result;
    };

    return (
      <div className="seating-plan-container">
        {/* Selected seats display - hide in view only mode */}
        {!this.props.viewOnly && (
          <div style={{ margin: '0 auto 16px auto', maxWidth: 900, width: '100%', textAlign: 'center',
            fontWeight: 'bold', fontSize: '1.2rem', color: '#004f8c', letterSpacing: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
            userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>
            <span>
              {selectedSeats.length > 0 ? `Selected Seats: ${groupSeatLabels(selectedSeats).join(', ')}` : 'No seats selected'}
            </span>
            {selectedSeats.length > 0 && (
              <button onClick={this.handleClearSelection}
                style={{ marginLeft: 12, padding: '4px 16px', background: '#e74c3c',
                color: '#fff', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>
                Clear Selection
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        <div className="seating-scroll-container">
          <div className="stage-row"><div className="stage-label">STAGE</div></div>
          <div className="seat-grid-wrapper">
            <div className="grid-container">
              <div className="scrollable-seats-row" style={{ overflowX: 'auto', width: '100%' }}>
                <div>
                {/* Header row */}
                <div style={{ display: 'flex' }}>
                  <div className="corner-cell" style={{ minWidth: 40, textAlign: 'center' }}></div>
                  {(() => {
                    // Create header structure that matches seat rows
                    // Most rows: left: 25-20, middle: 19-7, right: 6-1
                    // Row Y: left: 21-25, middle: 7-18, right: 1-5
                    // Using the most common pattern for headers
                    const headerNumbers = [25, 24, 23, 22, 21, 20, null, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, null, 6, 5, 4, 3, 2, 1];
                    return headerNumbers.map((colIndex, idx) =>
                      colIndex === null ? (
                        <div key={`col-gap-${idx}`} style={{ width: SEAT_WIDTH * 1.5, minWidth: SEAT_WIDTH * 1.5 }}></div>
                      ) : (
                        <div
                          key={`col-${idx}`}
                          className="col-index-cell"
                          style={{
                            width: SEAT_WIDTH,
                            minWidth: SEAT_WIDTH,
                            textAlign: "center",
                            fontWeight: "bold",
                            fontSize: "1.2rem",
                            color: "yellow",
                          }}
                        >
                          {colIndex}
                        </div>
                      )
                    );
                  })()}
                </div>

                  {/* Seat rows */}
                  <div className="seats-grid-container">
                    {ROW_LETTERS.map((letter, rowIdx) => {
                      if (letter === 'N') {
                        return (
                          <React.Fragment key={`gap-${rowIdx}`}>
                            <div style={{height:32}}></div>
                            <SeatRow
                              key={rowIdx}
                              rowLetter={letter}
                              selected={selectedSeats}
                              reservedSeats={reservedSeats}
                              SEAT_WIDTH={SEAT_WIDTH}
                              GAP_WIDTH={GAP_WIDTH}
                              onSeatClick={this.props.viewOnly ? null : this.handleSeatClick}
                              viewOnly={this.props.viewOnly}
                            />
                          </React.Fragment>
                        );
                      }
                      return (
                        <SeatRow
                          key={rowIdx}
                          rowLetter={letter}
                          selected={selectedSeats}
                          reservedSeats={reservedSeats}
                          SEAT_WIDTH={SEAT_WIDTH}
                          GAP_WIDTH={GAP_WIDTH}
                          onSeatClick={this.props.viewOnly ? null : this.handleSeatClick}
                          viewOnly={this.props.viewOnly}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="legend-container"
          style={{ display:'flex', justifyContent:'center', alignItems:'flex-start',
          gap:48, margin:'32px auto 0 auto', maxWidth:900, width:'100%' }}>
          <div style={{flex:1,minWidth:220}}>
            <div className="legend-row-layout">
              <div className="legend-section">
                <h3 style={{textAlign:'center',marginBottom:8,fontSize:'1.5rem',color:"#ffffff"}}>Legend</h3>
                <div className="legend-icons-horizontal">
                  <div className="legend-item-horizontal">
                    <CinemaChairSVG1 fillColor={sectionColors.available} size={50} />
                    <span style={{ fontSize: '1.5rem' }}>Available</span>
                  </div>
                  <div className="legend-item-horizontal">
                    <CinemaChairSVG1 fillColor={sectionColors.selected} size={50} />
                    <span style={{ fontSize: '1.5rem' }}>Selected</span>
                  </div>
                  <div className="legend-item-horizontal">
                    <CinemaChairSVG1 fillColor={sectionColors.reserved} size={50} />
                    <span style={{ fontSize: '1.5rem' }}>Booked</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

// ====================
// SeatRow component
// ====================
const SeatRow = ({ rowLetter, selected, reservedSeats, SEAT_WIDTH, GAP_WIDTH, onSeatClick, viewOnly }) => {
  const getSeatNumbers = () => {
    // Special case for row Y - only has seats Y05, Y04, Y03, Y02, Y01
    if (rowLetter === 'Y') {
      const left = [25, 24, 23, 22, 21];     // 5 seats (25-21)
      const middle = [null, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7]; // 13 seats (19-7)
      const right = [null, 5, 4, 3, 2, 1];  
      return [...left, null, ...middle, null, ...right]; // Smaller gaps with single null
    }

    if (rowLetter === 'Z') {
      const left = ["empty", "empty","empty","empty","empty"];     // 5 seats (25-21)
      const middle = [null, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7]; // 13 seats (19-7)
      const right = ["empty", "empty","empty","empty","empty"];  
      return [...left, null, ...middle, null, ...right]; // Smaller gaps with single null
    }

    // Match the same pattern as in the main component for other rows
    const left = [25, 24, 23, 22, 21, 20];     // 6 seats (25-20)
    const middle = [19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7]; // 13 seats (19-7)
    const right = [6, 5, 4, 3, 2, 1];          // 6 seats (6-1)
    
    return [...left, null, ...middle, null, ...right];
  };

  let seatNumbers = getSeatNumbers();
  let seatIdx = 0;

  return (
    <div className="seat-row" style={{ display:'flex', alignItems:'center'}}>
      <div className="row-index-cell" style={{minWidth:40,textAlign:'center',fontWeight:'bold'}}>{rowLetter}</div>
      {seatNumbers.map((seatNumber, colIdx) => {
        // Condition 1: Handle aisle gaps
        if (seatNumber === null) {
          return <div key={`gap-${colIdx}`} style={{ width: SEAT_WIDTH * 1.5, minWidth: SEAT_WIDTH * 1.5 }}></div>;
        }
        
        // Condition 2: Handle empty seats (no seat exists in this position)
        if (seatNumber === 'empty') {
          return <div key={`empty-${colIdx}`} style={{ width: SEAT_WIDTH, minWidth: SEAT_WIDTH }}></div>;
        }
        
        // Condition 3: Handle actual seats
        const seatLabel = `${rowLetter}${String(seatNumber).padStart(2,'0')}`;
        const isSelected = selected.includes(seatLabel);
        const isReserved = reservedSeats.includes(seatLabel);
        const seatColor = getSeatColor(isReserved, isSelected);
        
        // Debug logging for seat rendering
        if (isReserved) {
          console.log(`Seat ${seatLabel} is reserved, color: ${seatColor}`);
        }
        
        return (
          <div key={seatLabel} className="seat-container" style={{width: SEAT_WIDTH, minWidth: SEAT_WIDTH}}>
            <button
              className={`seat ${isSelected?'selected':''} ${isReserved?'reserved':''}`}
              disabled={isReserved || viewOnly}
              onClick={() => onSeatClick && !viewOnly && onSeatClick(seatLabel)}
              style={{ cursor: viewOnly ? 'default' : (isReserved ? 'not-allowed' : 'pointer') }}
            >
              <CinemaChairSVG1 fillColor={seatColor} seatNumber={seatLabel} />
            </button>
          </div>
        );
      })}
    </div>
  )
};

export default SeatingPlan;
