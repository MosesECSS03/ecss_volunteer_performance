import React, { Component } from 'react';
import './SearchFilterTools.css';
import axios from 'axios';

const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : "https://ecss-performance-night-2025.azurewebsites.net";

class SearchFilterTools extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      dateFilter: 'all',
      locationFilter: 'all',
      statusFilter: 'all',
      records: [],
      allReservedSeats: [],
      currentPage: 1,
      resultsPerPage: 4, // You can adjust this number
    };
  }

  componentDidMount() {
    this.fetchRecords();
  }

  fetchRecords = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/ticketSales`, { purpose: "retrieve" });
      var records = response.data.result.data;
      console.log("Fetched Records:", response.data);

      const allReservedSeats = records.flatMap(record =>
        record.seats && this.expandSeatRange
          ? record.seats.flatMap(seatStr => this.expandSeatRange(seatStr))
          : []
      );

      this.setState({ records, allReservedSeats, searchResults: records });
    } catch (error) {
      console.error("Error fetching ticket sales:", error);
    }
  };

  getAllLocations = () => {
    const { records } = this.state;
    // Get unique locations from records
    return Array.from(new Set(records.map(r => r.location).filter(Boolean)));
  };

  handleSearchChange = (e) => {
    this.setState({ searchQuery: e.target.value });
  }

  handleSearch = () => {
    const { searchQuery, dateFilter, locationFilter, records } = this.state;
    let results = records;

    // Filter by search query (searches all fields)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      results = results.filter(r =>
        Object.values(r).some(val =>
          (Array.isArray(val) ? val.join(', ') : String(val || '')).toLowerCase().includes(q)
        )
      );
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const today = new Date();
      results = results.filter(r => {
        if (!r.time) return false;
        // Parse "21/05/2025 01:30:07"
        const [datePart] = r.time.split(' ');
        const [day, month, year] = datePart.split('/').map(Number);
        const recordDate = new Date(year, month - 1, day);

        if (dateFilter === 'today') {
          return (
            recordDate.getDate() === today.getDate() &&
            recordDate.getMonth() === today.getMonth() &&
            recordDate.getFullYear() === today.getFullYear()
          );
        }
        if (dateFilter === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          return (
            recordDate.getDate() === yesterday.getDate() &&
            recordDate.getMonth() === yesterday.getMonth() &&
            recordDate.getFullYear() === yesterday.getFullYear()
          );
        }
        if (dateFilter === 'week') {
          // Get start of week (Sunday)
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          // Get end of week (Saturday)
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          return recordDate >= startOfWeek && recordDate <= endOfWeek;
        }
        return true;
      });
    }

    // Filter by location
    if (locationFilter !== 'all') {
      results = results.filter(r => r.location === locationFilter);
    }

    this.setState({ searchResults: results });
  }

  handleFilterChange = (filter, value) => {
    this.setState({ [filter]: value }, this.handleSearch);
  }

  handlePageChange = (page) => {
    this.setState({ currentPage: page });
  };

  render() {
    const { 
      searchQuery, searchResults, isSearching,
      dateFilter, locationFilter, statusFilter,
      currentPage, resultsPerPage
    } = this.state;

    // Dynamically get all unique locations from records
    const allLocations = this.getAllLocations();

    // Pagination logic
    const indexOfLast = currentPage * resultsPerPage;
    const indexOfFirst = indexOfLast - resultsPerPage;
    const currentResults = searchResults.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(searchResults.length / resultsPerPage);

    return (
      <div className="search-filter-tools">
        <h2
          style={{
            color: '#0078d4',
            marginBottom: '20px',
            fontSize: '1.5rem'
          }}
        >
          Search & Filter
        </h2>
        
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={this.handleSearchChange}
            onKeyPress={(e) => e.key === 'Enter' && this.handleSearch()}
          />
          <button 
            onClick={this.handleSearch}
            disabled={isSearching}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        <div className="filters">
          <div className="filter">
            <label>Date:</label>
            <select 
              value={dateFilter}
              onChange={(e) => this.handleFilterChange('dateFilter', e.target.value)}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
            </select>
          </div>
          
          <div className="filter">
            <label>Location:</label>
            <select 
              value={locationFilter}
              onChange={(e) => this.handleFilterChange('locationFilter', e.target.value)}
            >
              <option value="all">All Locations</option>
              {allLocations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="search-results">
          <h3>Results</h3>
          {isSearching ? (
            <p>Searching...</p>
          ) : (
              currentResults.length > 0 ? (
                <div className="results-cards">
                  {currentResults.map((result, idx) => (
                    <ExpandableCard key={result.bookingNo || idx} result={result} />
                  ))}
                </div>
              ) : (
                <p>No results found. Try adjusting your search.</p>
              )
          )}
        </div>

        {/* Pagination Controls */}
        <div className="pagination-controls">
          <button 
            onClick={() => this.handlePageChange(currentPage - 1)} 
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button 
            onClick={() => this.handlePageChange(currentPage + 1)} 
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    );
  }
}

const locationColors = {
  "CT Hub": "#1565c0", // dark blue
  "Pasir Ris West Wellness Centre": "#ad1457", // dark pink
  "Tampines 253 Centre and Tampines North Community Club": "#f9a825", // dark yellow
  // Add more locations and colors as needed
};

function getLocationColor(location) {
  return locationColors[location]; // default color
}

class ExpandableCard extends React.Component {
  state = { expanded: false };
  toggleExpand = () => this.setState(s => ({ expanded: !s.expanded }));
  render() {
    const { result } = this.props;
    const { expanded } = this.state;
    const cardBg = getLocationColor(result.location);
    console.log("Card Background Color:", cardBg);
    return (
      <div className="professional-card" style={{ background: cardBg }}>
        <div className="card-header" onClick={this.toggleExpand}>
          <div>
            <h2>{result.name}</h2>
            <span className="card-location">{result.location}</span>
          </div>
          <button className="expand-btn">{expanded ? '▲' : '▼'}</button>
        </div>
        {expanded && (
          <div className="card-body">
            <div className="card-row"><span className="card-label">Staff Name:</span><span className="card-value">{result.staffName}</span></div>
            <div className="card-row"><span className="card-label">Price:</span><span className="card-value">${result.price}</span></div>
            <div className="card-row"><span className="card-label">Payment Type:</span><span className="card-value">{result.paymentType}</span></div>
            <div className="card-row"><span className="card-label">Payment Ref:</span><span className="card-value">{result.paymentRef}</span></div>
            <div className="card-row"><span className="card-label">Selected Seats:</span><span className="card-value">{result.selectedSeatsCount}</span></div>
            <div className="card-row"><span className="card-label">Booking No:</span><span className="card-value">{result.bookingNo}</span></div>
            <div className="card-row"><span className="card-label">Seats:</span><span className="card-value">{Array.isArray(result.seats) ? result.seats.join(', ') : result.seats}</span></div>
          </div>
        )}
        <div className="card-footer">
          <span className="card-label">Time:</span>
          <span className="card-value">{result.time}</span>
        </div>
      </div>
    );
  }
}

export default SearchFilterTools;