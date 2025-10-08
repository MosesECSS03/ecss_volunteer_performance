import React, { Component } from 'react';
import "./StatisticsPanel.css";

class StatisticsPanel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      timeRange: 'week',
      statsData: null,
      isLoading: true
    };
  }

  componentDidMount() {
    this.fetchStatistics();
  }

  fetchStatistics = async () => {
    const { timeRange } = this.state;
    
    try {
      // Simulating API call
      // const response = await fetch(`//statistics?timeRange=${timeRange}`);
      // const data = await response.json();
      
      // Placeholder data
      const data = {
        bookingTrends: [
          { day: 'Mon', count: 45 },
          { day: 'Tue', count: 52 },
          { day: 'Wed', count: 49 },
          { day: 'Thu', count: 63 },
          { day: 'Fri', count: 58 }
        ],
        locationUsage: {
          'A': 78,
          'B': 65,
          'C': 82
        },
        peakHours: [
          { hour: '9-10am', usage: 85 },
          { hour: '10-11am', usage: 92 },
          { hour: '11-12pm', usage: 78 },
          { hour: '12-1pm', usage: 65 },
          { hour: '1-2pm', usage: 70 }
        ]
      };
      
      this.setState({
        statsData: data,
        isLoading: false
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);
      this.setState({ isLoading: false });
    }
  }

  handleTimeRangeChange = (range) => {
    this.setState({ timeRange: range, isLoading: true }, this.fetchStatistics);
  }

  render() {
    const { timeRange, statsData, isLoading } = this.state;
    
    if (isLoading) {
      return <div className="statistics-panel"><p>Loading statistics...</p></div>;
    }
    
    return (
      <div className="statistics-panel">
        <h2>Statistics & Analytics</h2>
        
        <div className="time-range-selector">
          <button 
            className={timeRange === 'day' ? 'active' : ''}
            onClick={() => this.handleTimeRangeChange('day')}
          >
            Today
          </button>
          <button 
            className={timeRange === 'week' ? 'active' : ''}
            onClick={() => this.handleTimeRangeChange('week')}
          >
            This Week
          </button>
          <button 
            className={timeRange === 'month' ? 'active' : ''}
            onClick={() => this.handleTimeRangeChange('month')}
          >
            This Month
          </button>
        </div>
        
        <div className="stats-container">
          <div className="stats-card booking-trends">
            <h3>Booking Trends</h3>
            <div className="chart">
              {/* Placeholder for actual chart component */}
              <div className="chart-placeholder">
                {statsData.bookingTrends.map(item => (
                  <div key={item.day} className="chart-bar" style={{height: `${item.count}px`}}>
                    <div className="bar-label">{item.day}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="stats-card location-usage">
            <h3>Location Usage</h3>
            <div className="usage-stats">
              {Object.entries(statsData.locationUsage).map(([location, usage]) => (
                <div key={location} className="location-usage-item">
                  <span>Location {location}</span>
                  <div className="usage-bar-container">
                    <div className="usage-bar" style={{width: `${usage}%`}}></div>
                  </div>
                  <span>{usage}%</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="stats-card peak-hours">
            <h3>Peak Hours</h3>
            <div className="peak-hours-chart">
              {statsData.peakHours.map(item => (
                <div key={item.hour} className="peak-hour-item">
                  <span>{item.hour}</span>
                  <div className="usage-bar-container">
                    <div className="usage-bar" style={{width: `${item.usage}%`}}></div>
                  </div>
                  <span>{item.usage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default StatisticsPanel;