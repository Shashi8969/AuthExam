// src/components/EmployeeList.js
import React, { useState, useEffect } from 'react';
import { onValue, ref, remove } from 'firebase/database';
import { db } from '../config/firebase';
import { ref as dbRef } from 'firebase/database';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { useAuth } from '../context/AuthContext'; // Import useAuth
import * as XLSX from 'xlsx'; // Import the xlsx library

import EditEmployee from './EditEmployee';
import EmployeeDetails from './EmployeeDetails';
import Employee from '../models/Employee';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const { currentUser, loading: authLoading } = useAuth(); // Get currentUser and loading state from AuthContext
  const navigate = useNavigate(); // Initialize useNavigate

  // New states for biometric operator selection and assignment
  const [selectedOperators, setSelectedOperators] = useState([]);
  const [centerAssignments, setCenterAssignments] = useState({});
  const [showOnlyBiometricOperators, setShowOnlyBiometricOperators] = useState(false);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      alert('Please log in to view the employee list.'); // Show a popup message
      navigate('/login'); // Redirect to the login page
      return; // Prevent further execution of this useEffect
    }

    const unsubscribe = onValue(ref(db, 'Employees'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const employeesArray = Object.keys(data).map(key => Employee.fromFirebase({ ...data[key], empId: key }));
        setEmployees(employeesArray);
      } else {
        setEmployees([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authLoading, currentUser, navigate]); // Add authLoading, currentUser, and navigate to the dependency array

  const filteredEmployees = employees.filter(employee =>
    (employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.phoneNo.includes(searchTerm) ||
      employee.addharNo.includes(searchTerm)) &&
    (!showOnlyBiometricOperators || employee.isBiometricOperator) // Apply biometric operator filter
  );

  const sortedEmployees = filteredEmployees.sort((a, b) => {
    if (sortColumn === 'name') {
      return sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    } else if (sortColumn === 'phoneNo') {
      return sortDirection === 'asc' ? a.phoneNo.localeCompare(b.phoneNo) : b.phoneNo.localeCompare(a.phoneNo);
    } else if (sortColumn === 'addharNo') {
      return sortDirection === 'asc' ? a.addharNo.localeCompare(b.addharNo) : b.addharNo.localeCompare(a.addharNo);
    } else {
      return 0;
    }
  });

  const handleSort = (column) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleEmployeeClick = (employeeId) => {
    setSelectedEmployeeId(employeeId);
  };

  const deleteEmployee = (employeeId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this employee?");
    if (confirmDelete) {
      remove(dbRef(db, `Employees/${employeeId}`))
        .then(() => {
          console.log("Employee deleted successfully");
        })
        .catch((error) => {
          console.error("Error deleting employee:", error);
        });
    }
  };

  const handleCloseDetails = () => {
    setSelectedEmployeeId(null);
  };

  const handleBiometricOperatorFilterChange = (e) => {
    setShowOnlyBiometricOperators(e.target.checked);
  };

  const handleOperatorSelect = (employeeId, isChecked) => {
  console.log('handleOperatorSelect called for:', employeeId, 'isChecked:', isChecked);
  if (isChecked) {
    setSelectedOperators([...selectedOperators, employeeId]);
    console.log('selectedOperators after adding:', [...selectedOperators, employeeId]);
  } else {
    setSelectedOperators(selectedOperators.filter(id => id !== employeeId));
    console.log('selectedOperators after removing:', selectedOperators.filter(id => id !== employeeId));
    // Also remove assignment if unselected
    const newAssignments = { ...centerAssignments };
    delete newAssignments[employeeId];
    setCenterAssignments(newAssignments);
  }
};

  const handleAssignmentChange = (operatorId, field, value) => {
    setCenterAssignments(prevAssignments => ({
      ...prevAssignments,
      [operatorId]: {
        ...prevAssignments[operatorId],
        [field]: value,
      },
    }));
  };

  const handleGenerateExcel = () => {
    const selectedAndAssignedOperators = selectedOperators.map(operatorId => {
      const operator = employees.find(emp => emp.empId === operatorId);
      const assignment = centerAssignments[operatorId] || {};
      return {
        sNo: '', // Will be filled later
        name: operator?.name || '',
        aadharNo: operator?.addharNo || '',
        phoneNo: operator?.phoneNo || '',
        centerCode: assignment.centerCode || '',
        centerName: assignment.centerName || '',
      };
    });

    if (selectedAndAssignedOperators.length === 0) {
      alert('Please select operators and assign them to centers.');
      return;
    }

    const data = selectedAndAssignedOperators.map((item, index) => ({ ...item, sNo: index + 1 }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Biometric Operators');
    XLSX.writeFile(workbook, 'biometric_operator_assignments.xlsx');
  };

  if (loading || authLoading) return <div className="loading">Loading...</div>; // Show loading indicator while either data or auth status is loading

  return (
    <div className="employee-list">
      <h2>Employee List</h2>

      <div className="filter-section">
        <label>
          Show Only Biometric Operators:
          <input
            type="checkbox"
            checked={showOnlyBiometricOperators}
            onChange={handleBiometricOperatorFilterChange}
          />
        </label>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {sortedEmployees.length === 0 ? (
        <p className="no-results">No employees found</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Select</th>
                <th>Profile</th>
                <th onClick={() => handleSort('name')}>Name {sortColumn === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => handleSort('phoneNo')}>Phone {sortColumn === 'phoneNo' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => handleSort('addharNo')}>Aadhar {sortColumn === 'addharNo' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                <th>Address</th>
                <th>Reference</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.map(employee => (
                <tr key={employee.empId} onClick={() => handleEmployeeClick(employee.empId)} style={{ cursor: 'pointer' }}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedOperators.includes(employee.empId)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleOperatorSelect(employee.empId, e.target.checked);
                      }}
                      disabled={!employee.isBiometricOperator} // Assuming you have 'isBiometricOperator' in your Employee model
                    />
                  </td>
                  <td>
                    {employee.imageUrl && (
                      <img
                        src={employee.imageUrl}
                        alt={employee.name}
                        className="thumbnail"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/50';
                        }}
                      />
                    )}
                  </td>
                  <td>{employee.name}</td>
                  <td>{employee.phoneNo}</td>
                  <td>{employee.addharNo}</td>
                  <td>{employee.address}</td>
                  <td>{employee.referenceName || '-'}</td>
                  <td>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingEmployee(employee.empId);
                      }}
                      className="edit-btn"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteEmployee(employee.empId);
                      }}
                      className="delete-btn"
                      style={{ marginTop: '8px', backgroundColor: 'red', color: 'white' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOperators.length > 0 && (
        <div className="center-assignment">
          <h3>Assign Centers to Selected Operators</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Center Code</th>
                <th>Center Name</th>
              </tr>
            </thead>
            <tbody>
              {selectedOperators.map(operatorId => {
                const operator = employees.find(emp => emp.empId === operatorId);
                const assignment = centerAssignments[operatorId] || { centerCode: '', centerName: '' };

                return (
                  <tr key={operatorId}>
                    <td>{operator ? operator.name : 'N/A'}</td>
                    <td>
                      <input
                        type="text"
                        placeholder="Enter Center Code"
                        value={assignment.centerCode}
                        onChange={(e) => handleAssignmentChange(operatorId, 'centerCode', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="Enter Center Name"
                        value={assignment.centerName}
                        onChange={(e) => handleAssignmentChange(operatorId, 'centerName', e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <button onClick={handleGenerateExcel} disabled={selectedOperators.length === 0}>
        Generate Biometric Operator List
      </button>

      {editingEmployee && (
        <EditEmployee
          employeeId={editingEmployee}
          onClose={() => setEditingEmployee(null)}
        />
      )}

      {selectedEmployeeId && (
        <EmployeeDetails
          employeeId={selectedEmployeeId}
          onClose={handleCloseDetails}
        />
      )}
    </div>
  );
};

export default EmployeeList;