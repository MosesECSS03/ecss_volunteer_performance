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
      isLoading: true,
      showSeatingPlanModal: false
    };
    
    this.socket = null;
  }

  componentDidMount() 
  {
    // Initial data fetch
    this.fetchInitialData();

    // Connect to socket with better configuration
    this.socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });
    
    this.socket.on('connect', () => {
      console.log('Version2 Socket connected successfully:', this.socket.id);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Version2 Socket connection error:', error);
    });
 
    this.socket.on('reservation-updated', (data) => {
      console.log("Version2 Socket event received", data);
      this.fetchInitialData();
    });
  }
  
  componentWillUnmount() {
    if (this.socket) {
      this.socket.off('reservation-updated');
      this.socket.off('connect');
      this.socket.off('connect_error');
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
      // SeatReservationPanel handles its own data fetching
      // No need to fetch reserved seats here
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

  // Modal control methods
  openSeatingPlanModal = () => {
    console.log('Opening seating plan modal...');
    this.setState({ showSeatingPlanModal: true }, () => {
      console.log('Modal state after opening:', this.state.showSeatingPlanModal);
    });
  }

  closeSeatingPlanModal = () => {
    console.log('Closing seating plan modal...');
    this.setState({ showSeatingPlanModal: false }, () => {
      console.log('Modal state after closing:', this.state.showSeatingPlanModal);
    });
  }

  render() {
    const { seats, reservedSeats, activeTab, isLoading, showSeatingPlanModal } = this.state;
    
    if (isLoading) {
      return <div>Loading dashboard...</div>;
    }

    return (
      <div className="smart-dashboard-container">
        <h1>ECSS Musical Concert 2025 Seat Reservation Dashboard</h1>
        
        <div className="dashboard-navigation">
          <button 
            className={activeTab === 'reservation' ? 'active' : ''} 
            onClick={() => this.handleTabChange('reservation')}
          >
            Seat Reservation Form
          </button>
          <button 
            className="seating-plan-modal-btn"
            onClick={this.openSeatingPlanModal}
          >
            🎭 View Seating Plan
          </button>
          <button 
            className={activeTab === 'reports' ? 'active' : ''} 
            onClick={() => this.handleTabChange('reports')}
          >
            📊 Search & Generate Reports
          </button>
        </div>        <div className="dashboard-content">
          {activeTab === 'reservation' && (
            <div className="reservation-section">
                <SeatReservationPanel 
                  seats={seats}
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

        {/* Seating Plan Modal */}
        {this.state.showSeatingPlanModal && (
          <div className="modal-overlay" onClick={this.closeSeatingPlanModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Seating Plan</h2>
                <button className="modal-close-btn" onClick={this.closeSeatingPlanModal}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <SeatReservationPanel 
                  seats={seats}
                  socket={this.socket}
                  viewOnlyMode={true}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default Version2;