import React, { Component } from 'react';
import './SeatDashboard.css';

const ROWS = 12;
const COLS = 27;

// Simple AI: Suggests the best available seat (center-most, unreserved)
function suggestBestSeats(seats, count = 1) {
  const centerRow = Math.floor(ROWS / 2);
  const centerCol = Math.floor(COLS / 2);
  let best = [];
  let minDist = Infinity;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!seats[r][c].reserved) {
        const dist = Math.abs(centerRow - r) + Math.abs(centerCol - c);
        if (dist < minDist) {
          best = [`${r}-${c}`];
          minDist = dist;
        }
      }
    }
  }
  return best;
}

class SeatDashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      seats: Array.from({ length: ROWS }, (_, row) =>
        Array.from({ length: COLS }, (_, col) => ({
          row,
          col,
          reserved:
            // A8–A20 (row 0, col 7–19) or B8–B20 (row 1, col 7–19)
            ((row === 0 || row === 1) && col >= 7 && col <= 19),
        }))
      ),
      selected: [],
      aiSuggestion: [],
      showBottomLabels: true,
    };
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.onSelectedSeatsChangeDetails && prevState.selected !== this.state.selected) {
      // Build seat objects for selected seats
      const selectedSeats = this.state.selected.map(key => {
        const [row, col] = key.split('-').map(Number);
        return {
          row: String.fromCharCode(65 + row),
          col: col + 1,
        };
      });
      this.props.onSelectedSeatsChangeDetails(selectedSeats);
    }
  }

  handleSeatClick = (row, col) => {
    const { seats } = this.state;
    if (seats[row][col].reserved) return;
    const key = `${row}-${col}`;
    this.setState(prevState => {
      const selected = prevState.selected.includes(key)
        ? prevState.selected.filter(k => k !== key)
        : [...prevState.selected, key];
      // Notify parent about the new selected seats count
      if (this.props.onSelectedSeatsChange) {
        this.props.onSelectedSeatsChange(selected.length);
      }
      return { selected };
    });
  };

  handleReserve = () => {
    this.setState(prevState => {
      const reservedSeats = prevState.selected.map(key => {
        const [row, col] = key.split('-').map(Number);
        return {
          row: String.fromCharCode(65 + row), // e.g., 'A'
          col: col + 1, // 1-based seat number
          time: new Date().toLocaleString(),
          // Add more fields as needed (name, location, price) from form if available
        };
      });
      if (this.props.onReserve) {
        this.props.onReserve(reservedSeats);
      }
      const newSeats = prevState.seats.map((rowArr, row) =>
        rowArr.map((seat, col) => {
          const key = `${row}-${col}`;
          if (prevState.selected.includes(key)) {
            return { ...seat, reserved: true };
          }
          return seat;
        })
      );
      return {
        seats: newSeats,
        selected: [],
        aiSuggestion: [],
      };
    });
  };

  handleAISuggest = () => {
    const { seats } = this.state;
    const aiSuggestion = suggestBestSeats(seats, 1);
    this.setState({ aiSuggestion, selected: aiSuggestion });
    // Notify parent about the AI suggestion selection
    if (this.props.onSelectedSeatsChange) {
      this.props.onSelectedSeatsChange(aiSuggestion.length);
    }
  };

  render() {
    const { seats, selected, aiSuggestion, showBottomLabels } = this.state;
    return (
      <div className="dashboard-container">
        <h2>Seat Reservation Dashboard</h2>
        <div className="seat-actions">
          <button
            className="reserve-btn"
            onClick={this.handleReserve}
            disabled={selected.length === 0}
          >
            Reserve Selected
          </button>
          <button className="ai-btn" onClick={this.handleAISuggest}>
            AI Suggest Best Seat
          </button>
        </div>
        <div className="seat-grid" role="grid" aria-label="Seat grid">
          {/* Seat rows with row labels and seat labels */}
          {seats.map((rowArr, rowIdx) => (
            <div className="seat-row" key={rowIdx} role="row">
              {/*<div className="seat-row-label">{String.fromCharCode(65 + rowIdx)}</div>*/}
              {rowArr.map((seat, colIdx) => {
                // Leave column 7 and 21 empty with a bigger gap
                if (colIdx === 6 || colIdx === 20) {
                  return (
                    <span
                      key={`gap-${rowIdx}-${colIdx}`}
                      style={{
                        display: 'inline-block',
                        width: '40px', // or larger than seat width for a bigger gap
                        height: '32px',
                      }}
                    />
                  );
                }
                const key = `${rowIdx}-${colIdx}`;
                let className = 'seat';
                if (seat.reserved) className += ' reserved';
                else if (selected.includes(key)) className += ' selected';
                if (aiSuggestion.includes(key)) className += ' ai-suggested';
                return (
                  <button
                    key={key}
                    className={className}
                    onClick={() => this.handleSeatClick(rowIdx, colIdx)}
                    disabled={seat.reserved}
                    title={`Row ${String.fromCharCode(65 + rowIdx)}, Seat ${colIdx + 1}`}
                    aria-label={`Row ${String.fromCharCode(65 + rowIdx)}, Seat ${colIdx + 1}${seat.reserved ? ' (reserved)' : ''}`}
                    role="gridcell"
                  >
                    <span className="seat-icon" aria-hidden="true">
                      {/* Simple seat SVG */}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <rect x="5" y="10" width="14" height="7" rx="2" fill="currentColor"/>
                        <rect x="7" y="5" width="10" height="7" rx="2" fill="currentColor" opacity="0.7"/>
                      </svg>
                    </span>
                    <span className="seat-label">{`${String.fromCharCode(65 + rowIdx)}${colIdx + 1}`}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {/* Bottom column label row - only show after reserve */}
          {/*showBottomLabels && (
            <div className="seat-grid-label-row">
              <div className="seat-row-label" style={{ visibility: 'hidden' }}></div>
              {Array.from({ length: COLS }, (_, colIdx) => (
                <div
                  key={colIdx}
                  className="seat-col-label" // <-- Use a different class here
                >
                  {colIdx + 1}
                </div>
              ))}
            </div>
          )*/}
        </div>
        <div className="legend">
          <span>
            <span className="legend-seat legend-available">
              <svg width="24" height="24" viewBox="0 0 32 32">
                <rect x="4" y="10" width="24" height="14" rx="6" fill="#3a86ff"/>
                <rect x="8" y="4" width="16" height="10" rx="5" fill="#bde0fe"/>
              </svg>
            </span>
            Available
          </span>
          <span>
            <span className="legend-seat legend-selected">
              <svg width="24" height="24" viewBox="0 0 32 32">
                <rect x="4" y="10" width="24" height="14" rx="6" fill="#00b894"/>
                <rect x="8" y="4" width="16" height="10" rx="5" fill="#a7ffeb"/>
              </svg>
            </span>
            Selected
          </span>
          <span>
            <span className="legend-seat legend-reserved">
              <svg width="24" height="24" viewBox="0 0 32 32">
                <rect x="4" y="10" width="24" height="14" rx="6" fill="#999"/>
                <rect x="8" y="4" width="16" height="10" rx="5" fill="#f1c40f"/>
              </svg>
            </span>
            Reserved
          </span>
          <span>
            <span className="legend-seat legend-ai">
              <svg width="24" height="24" viewBox="0 0 32 32">
                <rect x="4" y="10" width="24" height="14" rx="6" fill="#8e44ad"/>
                <rect x="8" y="4" width="16" height="10" rx="5" fill="#d6b3ff"/>
              </svg>
            </span>
            AI Suggestion
          </span>
        </div>
      </div>
    );
  }
}

export default SeatDashboard;