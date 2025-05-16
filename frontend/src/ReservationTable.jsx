import React, { Component } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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
  constructor(props) {
    super(props);
    this.state = {
      location: 'All',
    };
  }

  handleLocationChange = (event) => {
    this.setState({ location: event.target.value });
  };

  getUniqueLocations(records) {
    const locations = records.map(r => r.location);
    return Array.from(new Set(locations));
  }

  exportToExcel = () => {
    const { location } = this.state;
    const { records } = this.props;
    const filteredRecords = location === 'All'
      ? records
      : records.filter(r => r.location === location);
    const rows = groupRecords(filteredRecords);

    // Ensure Reserved At is last and price is formatted
    const exportRows = rows.map(row => ({
      id: row.id,
      name: row.name,
      location: row.location,
      price: typeof row.price === 'number'
        ? `$${row.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : row.price,
      seats: row.seats,
      reservedAt: row.reservedAt
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);

    // Set column widths for better visibility in Excel
    worksheet['!cols'] = [
      { wch: 8 },   // id
      { wch: 25 },  // name
      { wch: 20 },  // location
      { wch: 15 },  // price
      { wch: 30 },  // seats
      { wch: 25 },  // reservedAt
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reservations');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fileName = 'reservation_records.xlsx';
    saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), fileName);
  };

  render() {
    const { location } = this.state;
    const { records } = this.props;

    // Get unique locations for dropdown
    const locations = this.getUniqueLocations(records);

    // Filter records by location
    const filteredRecords = location === 'All'
      ? records
      : records.filter(r => r.location === location);

    const rows = groupRecords(filteredRecords);

    const columns = [
      { field: 'id', headerName: '#', width: 70, headerAlign: 'center', align: 'center' },
      { field: 'name', headerName: 'Name', width: 300, headerAlign: 'center', align: 'center' },
      { field: 'location', headerName: 'Location', width: 300, headerAlign: 'center', align: 'center' },
      { 
        field: 'price',
        headerName: 'Price',
        headerAlign: 'center',
        width: 300,
        align: 'center',
        valueFormatter: (params) => {
          const value = params.value;
          if (typeof value === 'number') {
            return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
          return value;
        }
      },
      { field: 'seats', headerName: 'Seats', width: 300, headerAlign: 'center', align: 'center' },
      { field: 'reservedAt', headerName: 'Reserved At', width: 300, headerAlign: 'center', align: 'center' }, // now last
    ];

    return (
      <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', my: 4 }}>
        <h3 style={{ fontSize: '3rem', textAlign: 'center', marginBottom: 24 }}>Reservation Records</h3>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
          <FormControl sx={{ minWidth: 440, background: '#e3eaf2', borderRadius: 2, p: 2 }}>
            <Box>
              <span
                style={{
                  color: '#1976d2',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  marginBottom: 12,
                  display: 'block'
                }}
              >
                Filter by Location
              </span>
              <Autocomplete
                options={['All', ...locations]}
                value={location}
                onChange={(event, newValue) => {
                  this.setState({ location: newValue || 'All' });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    sx={{
                      color: '#1976d2',
                      fontWeight: 'bold',
                      background: '#fff',
                      borderRadius: 2,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#1976d2',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#1565c0',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#1565c0',
                      },
                    }}
                  />
                )}
              />
            </Box>
          </FormControl>
        </Box>
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
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <button
            onClick={this.exportToExcel}
            style={{
              background: '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              fontWeight: 'bold',
              fontSize: '1.2rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(25, 118, 210, 0.15)'
            }}
          >
            Export to Excel
          </button>
        </Box>
      </Box>
    );
  }
}

export default ReservationTable;
