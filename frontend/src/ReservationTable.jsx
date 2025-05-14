import React, { Component } from 'react';
import './ReservationTable.css';

class ReservationTable extends Component {
  groupRecords(records) {
    const grouped = {};

    records.forEach((rec) => {
      const key = `${rec.name}_${rec.location}_${rec.price}`;
      if (!grouped[key]) {
        grouped[key] = {
          name: rec.name,
          location: rec.location,
          price: rec.price,
          reservedAt: rec.time,
          seatsByRow: {}, // Organize by row
        };
      }

      if (!grouped[key].seatsByRow[rec.row]) {
        grouped[key].seatsByRow[rec.row] = [];
      }

      grouped[key].seatsByRow[rec.row].push(parseInt(rec.col));
    });

    // Format each group's seats into ranges like A1–A3
    return Object.values(grouped).map(group => {
      const formattedSeats = [];

      Object.entries(group.seatsByRow).forEach(([row, cols]) => {
        cols.sort((a, b) => a - b); // Sort column numbers
        let start = cols[0];
        let end = cols[0];

        for (let i = 1; i < cols.length; i++) {
          if (cols[i] === end + 1) {
            end = cols[i];
          } else {
            formattedSeats.push(
              start === end ? `${row}${start}` : `${row}${start}–${row}${end}`
            );
            start = cols[i];
            end = cols[i];
          }
        }

        // Add final range or single seat
        formattedSeats.push(
          start === end ? `${row}${start}` : `${row}${start} – ${row}${end}`
        );
      });

      return {
        ...group,
        formattedSeats,
      };
    });
  }

  render() {
    const groupedRecords = this.groupRecords(this.props.records);

    return (
      <div>
        <h3>Reservation Records</h3>
        <div className="table-scroll-container">
          <table className="records-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Location</th>
                <th>Price</th>
                <th>Seats</th>
                <th>Reserved At</th>
              </tr>
            </thead>
            <tbody>
              {groupedRecords.length === 0 ? (
                <tr>
                  <td colSpan="6">No reservations yet.</td>
                </tr>
              ) : (
                groupedRecords.map((rec, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{rec.name}</td>
                    <td>{rec.location}</td>
                    <td>{rec.price ? `$${rec.price}` : ''}</td>
                    <td>{rec.formattedSeats.join(', ')}</td>
                    <td>{rec.reservedAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

export default ReservationTable;
