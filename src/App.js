// src/App.js
import React from 'react';
import './App.css';
import EmployeeForm from './components/EmployeeForm';  // Add this import
import EmployeeList from './components/EmployeeList'; // Add this import

function App() {
  return (
    <div className="app">
      <header>
        <h1>Employee Management System</h1>
      </header>
      <main>
        <div className="container">
          <EmployeeForm />
          <EmployeeList />
        </div>
      </main>
    </div>
  );
}

export default App;