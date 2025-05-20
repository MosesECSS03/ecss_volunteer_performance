import React, { Component } from 'react';
import { io } from 'socket.io-client';
import './styles/Version2.css';

// Import individual components
import SeatReservationPanel from './components/SeatReservationPanel';
import ReportGenerator from './components/ReportGenerator';
import SearchFilterTools from './components/SearchFilterTools';


const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : "https://ecss-performance-night-2025.azurewebsites.net";

class Version2 extends Component {
  constructor(props) {
    super(props);
    this.state = {
      seats: [],
      reservedSeats: [],
      activeTab: 'reservation',
      aiSuggestions: [],
      notifications: [],
      isLoading: true
    };
    
    this.socket = null;
  }

  componentDidMount() 
  {
    // Initial data fetch
    this.fetchInitialData();

    // Connect to socket
    this.socket = io(API_BASE_URL);
 
     this.socket.on('reservation-updated', (data) => {
       console.log("Socket event received", data);
          this.fetchInitialData();
     });
  }
  
  componentWillUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
  
  // Socket handlers
  handleSocketConnect = () => {
    console.log('Connected to server');
  }
  
  handleSeatUpdate = (data) => {
    this.setState({
      seats: data.seats,
      reservedSeats: data.reservedSeats
    });
  }
  
  // Data fetching
  fetchInitialData = async () => {
    try {
      // Fetch initial data implementation
      this.setState({ isLoading: false });
    } catch (error) {
      console.error("Error fetching data:", error);
      this.setState({ isLoading: false });
    }
  }
  
  // Tab navigation handler
  handleTabChange = (tab) => {
    this.setState({ activeTab: tab });
  }

  render() {
    const { seats, reservedSeats, activeTab, isLoading } = this.state;
    
    if (isLoading) {
      return <div>Loading dashboard...</div>;
    }

    return (
      <div className="smart-dashboard-container">
        <h1>AI Seat Reservation Dashboard</h1>
        
        <div className="dashboard-navigation">
          <button 
            className={activeTab === 'reservation' ? 'active' : ''} 
            onClick={() => this.handleTabChange('reservation')}
          >
            Seat Reservation
          </button>
          <button 
            className={activeTab === 'reports' ? 'active' : ''} 
            onClick={() => this.handleTabChange('reports')}
          >
            Reports
          </button>
        </div>
        
        <div className="dashboard-content">
          {activeTab === 'reservation' && (
            <div className="reservation-section">
                <SeatReservationPanel 
                  seats={seats}
                  reservedSeats={reservedSeats}
                  socket={this.socket}
                />
            </div>
          )}
          {activeTab === 'reports' && (
            <div className="reports-section">
              <SearchFilterTools />
              <ReportGenerator />
            </div>
          )}
          
        </div>
      </div>
    );
  }
}

export default Version2;