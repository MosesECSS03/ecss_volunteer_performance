import React, { Component } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Version1 from './Version1.jsx';
import Version2 from './Version2.jsx';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // Initialize any app-level state here
    };
  }

  render() {
    return (
      <div className="app-container">
        <Routes>
          {/* <Route path="/version1" element={<Version1 />} />*/}
           <Route path="/" element={<Version2 />} />
        </Routes>
      </div>
    );
  }
}

export default App;