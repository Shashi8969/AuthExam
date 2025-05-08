// src/components/EmployeeList.js
import { useState, useEffect } from 'react';
import { onValue, ref, remove } from 'firebase/database';
import { db } from '../config/firebase';
import { ref as dbRef } from 'firebase/database';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { useAuth } from '../context/AuthContext'; // Import useAuth

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
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.phoneNo.includes(searchTerm) ||
    employee.addharNo.includes(searchTerm)
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

  if (loading || authLoading) return <div className="loading">Loading...</div>; // Show loading indicator while either data or auth status is loading

  return (
    <div className="employee-list">
      <h2>Employee List</h2>

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