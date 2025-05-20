import React, { Component } from 'react';
import { io } from 'socket.io-client';
import './SeatingPlan.css';

const ROWS = 11;
const COLS = 27;

const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : "https://ecss-performance-night-2025.azurewebsites.net";

const sectionColors = {
  available: "rgb(0, 79, 140)",
  selected: "rgb(93, 80, 35)",
  reserved: "rgb(126, 0, 0)",
  vip: "rgb(201, 114, 0)"
};

const CinemaChairSVG1 = ({ fillColor, seatNumber, size = 100 }) => (
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
        fontSize="30"
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

function rowNumberToLetter(rowNum) {
  return String.fromCharCode(67 + rowNum);
}

function isVipSeat(rowIdx, colIdx) {
  // C07–C19 (rowIdx 0, colIdx 6–18), D07–D19 (rowIdx 1, colIdx 6–18)
  return (
    (rowIdx === 0 && colIdx >= 6 && colIdx <= 19) ||
    (rowIdx === 1 && colIdx >= 6 && colIdx <= 19)
  );
}

const LOCATION_ROWS = {
  'CT Hub': ['C', 'D', 'I', 'J', 'M'],
  'Tampines': ['E', 'F', 'K', 'L'],
  'Pasir Ris West Wellness Centre': ['G', 'H']
};

class SeatingPlan extends Component {
  constructor(props) {
    super(props);
    const { location, noOfReservedSeats } = props;
    const allowedRows = LOCATION_ROWS[location] || [];
    const autoSelectedSeats = this.autoSelectSeatsFromRows(allowedRows, Number(noOfReservedSeats));
    this.state = {
      selected: autoSelectedSeats,
    };
  }

  static computeAutoSelectedSeats(props) {
    const { reservedSeats = [], noOfReservedSeats = 0 } = props;
    const allSelectableSeats = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (
          (col >= 0 && col <= 5) ||
          (col >= 7 && col <= 19) ||
          (col >= 21 && col <= 26)
        ) {
          if (!isVipSeat(row, col)) {
            const rowLetter = rowNumberToLetter(row);
            const seatNumber = (
              [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26].indexOf(col) + 1
            ).toString().padStart(2, '0');
            const seatLabel = `${rowLetter}${seatNumber}`;
            if (!reservedSeats.includes(seatLabel)) {
              allSelectableSeats.push(seatLabel);
            }
          }
        }
      }
    }
    return allSelectableSeats.slice(0, noOfReservedSeats);
  }

  componentDidMount() {
    this.socket = io(API_BASE_URL);
    this.socket.on('reservation-updated', (data) => {
      console.log("Socket event received123", data);
    });
  }

  componentWillUnmount() {
    // Clean up the socket listener to prevent memory leaks
    if (this.props.socket) {
      this.props.socket.off('reservation-updated');
    }
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.reservedSeats !== this.props.reservedSeats ||
      prevProps.noOfReservedSeats !== this.props.noOfReservedSeats ||
      prevProps.location !== this.props.location
    ) {
      const allowedRows = LOCATION_ROWS[this.props.location] || [];
      const autoSelectedSeats = this.autoSelectSeatsFromRows(allowedRows, Number(this.props.noOfReservedSeats));
      this.setState({ selected: autoSelectedSeats });
    }
  }

  getSeatLabel = (row, col) => {
    const rowLetter = String.fromCharCode(67 + Number(row));
    const colNumber = (col + 1).toString().padStart(2, '0');
    return `${rowLetter}${colNumber}`;
  };

  handleSeatClick = (seatLabel) => {
    const { selected } = this.state;
    let newSelected;
    if (selected.includes(seatLabel)) {
      newSelected = selected.filter(label => label !== seatLabel);
    } else {
      newSelected = [...selected, seatLabel];
    }
    this.setState({ selected: newSelected });
  };

  handleSeatsSelected = (selectedSeats) => {
    this.setState({ selectedSeats });
  };

  handleClearSelection = () => {
    this.setState({ selected: [] });
    if (this.props.onClearReservedSeats) {
      this.props.onClearReservedSeats();
    }
  };

  getSelectedSeats = () => {
    return this.state.selected;
  };

  /**
   * Auto-select seats only from allowed rows for a location.
   * @param {string[]} allowedRows - Array of row letters (e.g., ['C','D','I','J','M'])
   * @param {number} count - Number of seats to select
   * @returns {string[]} Array of selected seat labels (may be less than count)
   */
  autoSelectSeatsFromRows = (allowedRows, count) => {
    const { reservedSeats = [] } = this.props;
    let selectedSeats = [];

    for (const rowLetter of allowedRows) {
      const rowIdx = rowLetter.charCodeAt(0) - 67;
      let seatNumber = 1;
      for (let col = 0; col < COLS; col++) {
        if (
          (col >= 0 && col <= 5) ||
          (col >= 7 && col <= 19) ||
          (col >= 21 && col <= 26)
        ) {
          const seatLabel = `${rowLetter}${seatNumber.toString().padStart(2, '0')}`;
          if (!isVipSeat(rowIdx, col)) {
            if (!reservedSeats.includes(seatLabel)) {
              selectedSeats.push(seatLabel);
              if (selectedSeats.length === count) {
                return selectedSeats;
              }
            }
          } else {
            console.log(`Skipping VIP seat: ${seatLabel}`);
          }
          seatNumber++; // Always increment for every seat, VIP or not!
        }
      }
    }
    return selectedSeats;
  };

  handleAutoSelectSeats = () => {
    const { location, noOfReservedSeats } = this.props;
    const allowedRows = LOCATION_ROWS[location] || [];
    const selectedSeats = this.autoSelectSeatsFromRows(allowedRows, Number(noOfReservedSeats));
    console.log("Auto-selected seats:", selectedSeats);
    this.setState({ selected: selectedSeats });
    if (this.props.onSeatSelect) {
      this.props.onSeatSelect(selectedSeats);
    }
  };

  render() {
    const { reservedSeats = [] } = this.props;
    const { selected } = this.state;

    const allSelectableSeats = [];
    for (let row = 0; row < ROWS; row++) {
      const rowLetter = rowNumberToLetter(row);
      let seatNumber = 1;
      for (let col = 0; col < COLS; col++) {
        if (
          (col >= 0 && col <= 5) ||
          (col >= 7 && col <= 19) ||
          (col >= 21 && col <= 26)
        ) {
          if (!isVipSeat(row, col)) {
            const seatLabel = `${rowLetter}${seatNumber.toString().padStart(2, '0')}`;
            if (!reservedSeats.includes(seatLabel)) {
              allSelectableSeats.push(seatLabel);
            }
            seatNumber++;
          }
        }
      }
    }

    const seats = [];
    for (let row = 0; row < ROWS; row++) {
      const rowArr = [];
      for (let col = 0; col < COLS; col++) {
        const isVIP = (row === 0 && col >= 6 && col <= 18) || (row === 1 && col >= 6 && col <= 17);
        const reserved = !isVIP && (row < 2) && (col >= 7 && col <= 19);
        rowArr.push({ row, col, reserved });
      }
      seats.push(rowArr);
    }

    // Create array of column indices to display (skipping gaps)
    const colIndices = [];
    for (let col = 0; col < COLS; col++) {
      if ((col >= 0 && col <= 5) || (col >= 7 && col <= 19) || (col >= 21 && col <= 26)) {
        if (col <= 5) colIndices.push(col + 1);
        else if (col <= 19) colIndices.push(col);
        else colIndices.push(col - 1);
      } else {
        colIndices.push(null);
      }
    }

    const SEAT_WIDTH = 50;
    const GAP_WIDTH = 100;

    // Legend and row location data
    const rowLocationGroups = [
      { name: 'CT Hub', ranges: ['3-5', '9-11', '13'] }, // C-E, I-K, M
      { name: 'Tampines', ranges: ['6-7', '11-12'] },    // F-G, K-L
      { name: 'Pasir Ris West Wellness Centre', ranges: ['8-9'] }, // H-I
    ];

    // CinemaChairSVG for legend (reuse your CinemaChairSVG1 or define a simple one)
    const CinemaChairSVG = CinemaChairSVG1;

    // Utility to group seat labels into ranges per row, e.g. ["C03", "C04", "C05", "D07", "D08", "D09"] => ["C03-C05", "D07-D09"]
    function groupSeatLabels(seatLabels) {
      if (!seatLabels || seatLabels.length === 0) return [];
      // Sort seat labels
      const sorted = [...seatLabels].sort();
      const result = [];
      let rangeStart = null;
      let rangeEnd = null;

      for (let i = 0; i < sorted.length; i++) {
        const label = sorted[i];
        const row = label.slice(0, 1);
        const num = parseInt(label.slice(1), 10);

        if (!rangeStart) {
          rangeStart = { row, num, label };
          rangeEnd = { row, num, label };
        } else if (row === rangeEnd.row && num === rangeEnd.num + 1) {
          // Continue the range
          rangeEnd = { row, num, label };
        } else {
          // Push previous range
          if (rangeStart.label === rangeEnd.label) {
            result.push(rangeStart.label);
          } else {
            result.push(`${rangeStart.label}-${rangeEnd.label}`);
          }
          // Start new range
          rangeStart = { row, num, label };
          rangeEnd = { row, num, label };
        }
      }
      // Push the last range
      if (rangeStart) {
        if (rangeStart.label === rangeEnd.label) {
          result.push(rangeStart.label);
        } else {
          result.push(`${rangeStart.label}-${rangeEnd.label}`);
        }
      }
      return result;
    }

    return (
      <div className="seating-plan-container">
        {/* Selected Seats Display */}
        <div
          style={{
            margin: '0 auto 16px auto',
            maxWidth: 900,
            width: '100%',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '1.2rem',
            color: '#004f8c',
            letterSpacing: 1,
          }}
        >
          {selected.length > 0
            ? `Selected Seats: ${groupSeatLabels(selected).join(', ')}`
            : 'No seats selected'}
        </div>

        <div className="seating-scroll-container">
          <div className="stage-row">
            <div className="stage-label">STAGE</div>
          </div>
          <div className="seat-grid-wrapper">
            <div className="grid-container">
              <div
                className="scrollable-seats-row"
                style={{ overflowX: 'auto', width: '100%' }}
              >
                <div>
                  {/* Column indices row */}
                  <div style={{ display: 'flex' }}>
                    <div className="corner-cell" style={{ minWidth: 40 }}></div>
                    {colIndices.map((colIndex, idx) => {
                      if (colIndex === null) {
                        return <div key={`col-gap-${idx}`} className="col-index-gap" style={{ width: GAP_WIDTH }}></div>;
                      }
                      return (
                        <div key={`col-${idx}`} className="col-index-cell" style={{ width: SEAT_WIDTH }}>
                          {colIndex}
                        </div>
                      );
                    })}
                  </div>
                  {/* Seat rows */}
                  <div className="seats-grid-container">
                    {seats.map((rowArr, rowIdx) => {
                      let seatNumber = 1;
                      const rowLetter = rowNumberToLetter(rowIdx);
                      return (
                        <div className="seat-row" key={rowIdx} style={{ display: 'flex', alignItems: 'center' }}>
                          <div className="row-index-cell" style={{ minWidth: 40, textAlign: 'center', fontWeight: 'bold' }}>
                            {rowLetter}
                          </div>
                          {rowArr.map((seat, colIdx) => {
                            if (
                              (colIdx >= 0 && colIdx <= 5) ||
                              (colIdx >= 7 && colIdx <= 19) ||
                              (colIdx >= 21 && colIdx <= 26)
                            ) {
                              const seatLabel = `${rowLetter}${seatNumber.toString().padStart(2, '0')}`;
                              const isVIP = isVipSeat(rowIdx, colIdx);
                              const isSelected = selected.includes(seatLabel);
                              const isReserved = reservedSeats.includes(seatLabel);
                              const seatColor = isReserved
                                ? sectionColors.reserved
                                : isSelected
                                ? sectionColors.selected
                                : isVIP
                                ? sectionColors.vip
                                : sectionColors.available;

                              const button = isVIP ? (
                                <button
                                  key={seatLabel}
                                  className="seat vip"
                                  disabled
                                >
                                  <CinemaChairSVG1 fillColor={seatColor} seatNumber={seatLabel} />
                                  <span className="vip-badge">VIP</span>
                                </button>
                              ) : (
                                <button
                                  key={seatLabel}
                                  className={`seat ${isSelected ? 'selected' : ''} ${isReserved ? 'reserved' : ''}`}
                                  onClick={e => {
                                    e.stopPropagation();
                                    if (!isReserved) this.handleSeatClick(seatLabel);
                                  }}
                                  disabled={isReserved}
                                >
                                  <CinemaChairSVG1 fillColor={seatColor} seatNumber={seatLabel} />
                                </button>
                              );

                              seatNumber++; // Always increment for every seat, VIP or not!
                              return (
                                <div className="seat-container" style={{ width: SEAT_WIDTH }}>
                                  {button}
                                </div>
                              );
                            }
                            if (colIdx === 6 || colIdx === 20) {
                              return <div key={`gap-${colIdx}`} className="seat-gap" style={{ width: GAP_WIDTH }}></div>;
                            }
                            return null;
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend and Row Locations */}
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

export default SeatingPlan;