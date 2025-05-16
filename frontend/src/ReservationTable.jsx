import React, { Component } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import Box from '@mui/material/Box';

function seatsToRangesByRow(seats) {
  if (!seats || seats.length === 0) return [];
  const rows = {};
  seats.forEach(seat => {
    const row = seat[0];
    const col = parseInt(seat.slice(1));
    if (!rows[row]) rows[row] = [];
    rows[row].push(col);
  });
  const ranges = [];
  Object.keys(rows).sort().forEach(row => {
    const cols = rows[row].sort((a, b) => a - b);
    let tempGroup = [cols[0]];
    for (let i = 1; i < cols.length; i++) {
      if (cols[i] === cols[i - 1] + 1) {
        tempGroup.push(cols[i]);
      } else {
        ranges.push(formatRange(row, tempGroup));
        tempGroup = [cols[i]];
      }
    }
    ranges.push(formatRange(row, tempGroup));
  });
  return ranges;
}

function formatRange(row, cols) {
  if (cols.length === 1) return `${row}${cols[0]}`;
  return `${row}${cols[0]}-${row}${cols[cols.length - 1]}`;
}

function groupRecords(records) {
  const grouped = {};
  records.forEach((rec, idx) => {
    const key = `${rec.name}_${rec.location}_${rec.price}_${rec.time}`;
    if (!grouped[key]) {
      grouped[key] = {
        id: idx + 1,
        name: rec.name,
        location: rec.location,
        price: rec.price,
        reservedAt: rec.time,
        seats: [...rec.seats],
      };
    } else {
      grouped[key].seats.push(...rec.seats);
    }
  });
  return Object.values(grouped).map(row => ({
    ...row,
    seats: seatsToRangesByRow(row.seats).join(', ')
  }));
}

class ReservationTable extends Component {
  render() {
    const rows = groupRecords(this.props.records);
    console.log

    const columns = [
      { field: 'id', headerName: '#', width: 70, headerAlign: 'center', align: 'center' },
      { field: 'name', headerName: 'Name', flex: 1, headerAlign: 'center', align: 'center' },
      { field: 'location', headerName: 'Location', flex: 1, headerAlign: 'center', align: 'center' },
      { 
        field: 'price',
        headerName: 'Price',
        flex: 1,
        headerAlign: 'center',
        align: 'center'
      },
      { field: 'seats', headerName: 'Seats', flex: 1.5, headerAlign: 'center', align: 'center' },
      { field: 'reservedAt', headerName: 'Reserved At', flex: 1.5, headerAlign: 'center', align: 'center' },
    ];

    return (
      <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', my: 4 }}>
        <h3 style={{ fontSize: '3rem', textAlign: 'center', marginBottom: 24 }}>Reservation Records</h3>
        <div style={{ height: 500, width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            pageSize={10}
            disableRowSelectionOnClick
            style={{
              fontSize: '1.7rem',
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#1976d2',
                color: '#fff',
                fontSize: '2rem',
                fontWeight: 'bold',
                minHeight: '4rem',
                maxHeight: '4rem',
              },
              '& .MuiDataGrid-cell': {
                fontSize: '1.7rem',
                fontWeight: 600,
                textAlign: 'center',
                alignItems: 'center',
                minHeight: '4rem',
                maxHeight: '4rem',
              },
              '& .MuiDataGrid-row': {
                minHeight: '4rem',
                maxHeight: '4rem',
              },
              '& .MuiDataGrid-row:nth-of-type(even)': {
                backgroundColor: '#e3eaf2',
              },
              '& .MuiDataGrid-row:nth-of-type(odd)': {
                backgroundColor: '#f5f7fa',
              },
            }}
          />
        </div>
      </Box>
    );
  }
}

export default ReservationTable;
