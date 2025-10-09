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
      paymentMethodFilter: 'all',
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
      console.log("Fetched Records:", response.data);
      
      // Handle multiple possible response structures
      let records = response.data.result?.data;
      
      if (!records || !Array.isArray(records)) {
        // Try alternative access patterns
        if (response.data.result && Array.isArray(response.data.result)) {
          records = response.data.result;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          records = response.data.data;
        } else {
          console.error("Could not find records in response");
          records = [];
        }
      }

      console.log("Final records:", records);

      const allReservedSeats = records.flatMap(record =>
        record.seats && this.expandSeatRange
          ? record.seats.flatMap(seatStr => this.expandSeatRange(seatStr))
          : []
      );

      this.setState({ records, allReservedSeats, searchResults: records });
    } catch (error) {
      console.error("Error fetching ticket sales:", error);
      this.setState({ records: [], allReservedSeats: [], searchResults: [] });
    }
  };

  getAllPaymentMethods = () => {
    const { records } = this.state;
    // Get unique payment methods from records
    return Array.from(new Set(records.map(r => r.paymentType).filter(Boolean)));
  };

  handleSearchChange = (e) => {
    this.setState({ searchQuery: e.target.value });
  }

  handleSearch = () => {
    const { searchQuery, paymentMethodFilter, records } = this.state;
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

    // Filter by payment method
    if (paymentMethodFilter !== 'all') {
      results = results.filter(r => r.paymentType === paymentMethodFilter);
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
      paymentMethodFilter, statusFilter,
      currentPage, resultsPerPage
    } = this.state;

    // Dynamically get all unique payment methods from records
    const allPaymentMethods = this.getAllPaymentMethods();

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
            <label>Payment Method:</label>
            <select 
              value={paymentMethodFilter}
              onChange={(e) => this.handleFilterChange('paymentMethodFilter', e.target.value)}
            >
              <option value="all">All Payment Methods</option>
              {allPaymentMethods.map(method => (
                <option key={method} value={method}>{method}</option>
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
  state = { 
    expanded: false,
    isGeneratingTicket: false
  };
  
  toggleExpand = () => this.setState(s => ({ expanded: !s.expanded }));
  
  handleGenerateTicket = async () => {
    const { result } = this.props;
    
    this.setState({ isGeneratingTicket: true });
    
    try {
      console.log('Generating ticket for:', result);
      
      // Generate the PDF using the existing backend endpoint
      const pdfResponse = await axios.post(`${API_BASE_URL}/ticketSales`, { 
        purpose: "generateWithApp", 
        records: [result] 
      });

      console.log("PDF Response:", pdfResponse.data);

      if (pdfResponse.data.success === false) {
        throw new Error(pdfResponse.data.message || 'Failed to generate ticket');
      }

      if (pdfResponse.data.isZip && pdfResponse.data.zipBase64) {
        // Handle ZIP file containing multiple PDFs
        const base64 = pdfResponse.data.zipBase64;
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/zip' });

        // Create a blob URL and download the ZIP file
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = pdfResponse.data.zipFilename || `${result.bookingNo || 'booking'}_tickets.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        
      } else if (pdfResponse.data.receiptPdfBase64) {
        // Handle single PDF
        const base64 = pdfResponse.data.receiptPdfBase64;
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });

        // Create a blob URL and download the PDF
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${result.bookingNo || 'booking'}_ticket.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Also open in new tab for immediate viewing
        window.open(blobUrl, '_blank');
        
        // Clean up the blob URL
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } else {
        throw new Error('No PDF data received from server');
      }

    } catch (error) {
      console.error('Error generating ticket:', error);
    } finally {
      this.setState({ isGeneratingTicket: false });
    }
  };
  
  render() {
    const { result } = this.props;
    const { expanded, isGeneratingTicket } = this.state;
    // Override dynamic background with light grey
    return (
      <div 
        className="professional-card" 
        style={{ 
          background: '#f5f5f5',
          cursor: isGeneratingTicket ? 'wait' : 'pointer',
          opacity: isGeneratingTicket ? 0.7 : 1,
          transition: 'opacity 0.3s ease'
        }}
        onClick={() => {
          if (!isGeneratingTicket) {
            this.handleGenerateTicket();
          }
        }}
        title={isGeneratingTicket ? 'Generating ticket...' : 'Click to generate ticket(s)'}
      >
        <div className="card-header">
          <div>
            <h2>{result.name}</h2>
            <span className="card-location">{result.location}</span>
          </div>
          <button 
            className="expand-btn"
            onClick={(e) => {
              e.stopPropagation(); // Only prevent for the expand button
              this.toggleExpand();
            }}
            title={expanded ? 'Collapse details' : 'Expand details'}
          >
            {expanded ? '▲' : '▼'}
          </button>
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
          {isGeneratingTicket && (
            <span className="generating-indicator">🎫 Generating...</span>
          )}
        </div>
      </div>
    );
  }
}

export default SearchFilterTools;