import React, { Component } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

function groupRecords(records) {
  const grouped = {};
  records.forEach((rec, idx) => {
    const key = `${rec.name}_${rec.location}_${rec.price}_${rec.time}`;
    if (!grouped[key]) {
      grouped[key] = {
        _id: rec._id,
        id: idx + 1,
        name: rec.name,
        staffName: rec.staffName,
        location: rec.location,
        price: rec.price,
        paymentType: rec.paymentType,
        paymentRef: rec.paymentRef,
        selectedSeatsCount: rec.selectedSeatsCount,
        bookingNo: rec.bookingNo,
        reservedAt: rec.time,
        seats: Array.isArray(rec.seats)
          ? rec.seats.map(seat => seat && seat.trim()).filter(Boolean).join(', ')
          : typeof rec.seats === 'string'
            ? rec.seats.split(',').map(s => s.trim()).filter(Boolean).join(', ')
            : '',
      };
    }
  });
  return Object.values(grouped).map(row => ({
    ...row
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

    // Export essential columns only
    const exportRows = rows.map(row => ({
      id: row.id,
      name: row.name,
      staffName: row.staffName,
      paymentRef: row.paymentRef,
      selectedSeatsCount: row.selectedSeatsCount,
      bookingNo: row.bookingNo,
      seats: row.seats,
      reservedAt: row.reservedAt
    }));

    // Define custom headers
    const headers = [
      '#',
      'Name',
      'Staff',
      'Contact Number',
      'No. of Seats',
      'Booking No',
      'Seats',
      'Reserved At'
    ];

    // Create worksheet with custom headers
    const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: [
      'id',
      'name',
      'staffName',
      'paymentRef',
      'selectedSeatsCount',
      'bookingNo',
      'seats',
      'reservedAt'
    ]});

    // Insert custom header row
    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });

    // Auto-fit column widths
    const wscols = headers.map((header, i) => {
      // Find max length in this column (header or any cell)
      const colData = [header, ...exportRows.map(row => {
        const val = Object.values(row)[i];
        return val ? val.toString() : '';
      })];
      const maxLen = Math.max(...colData.map(val => val.length));
      return { wch: maxLen + 2 }; // +2 for padding
    });
    worksheet['!cols'] = wscols;

    // Bold header row
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: C })];
      if (cell && !cell.s) cell.s = {};
      if (cell) cell.s.font = { bold: true };
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reservations');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', cellStyles: true });
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
    console.log('Rows:', records);

    const columns = [
      { field: 'id', headerName: '#', width: 70, headerAlign: 'center', align: 'left' },
      { field: 'name', headerName: 'Name', width: 300, headerAlign: 'center', align: 'left' },
      { field: 'staffName', headerName: 'Staff', width: 300, headerAlign: 'center', align: 'left' },
      { field: 'location', headerName: 'Location', width: 300, headerAlign: 'center', align: 'left' },
      { 
        field: 'price',
        headerName: 'Donation Amount',
        headerAlign: 'center',
        width: 300,
        align: 'left',
        valueFormatter: (params) => {
          const value = params;
          if (typeof value === 'number') {
            return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
          return value;
        }
      },
      { field: 'paymentType', headerName: 'Payment Type', width: 300, headerAlign: 'center', align: 'left' },
      { field: 'paymentRef', headerName: 'Payment Ref', width: 300, headerAlign: 'center', align: 'left' },
      { field: 'selectedSeatsCount', headerName: 'No. of Seats', width: 300, headerAlign: 'center', align: 'left' },
      { field: 'bookingNo', headerName: 'Booking No', width: 300, headerAlign: 'center', align: 'left' },
      { field: 'seats', headerName: 'Seats', width: 800, headerAlign: 'center', align: 'left' },
      { field: 'reservedAt', headerName: 'Reserved At', width: 380, headerAlign: 'center', align: 'left' },
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
