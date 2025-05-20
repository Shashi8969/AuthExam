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
  // New states for bulk assignment
  const [bulkCenterCode, setBulkCenterCode] = useState('');
  const [bulkCenterName, setBulkCenterName] = useState('');

  const [showOnlyBiometricOperators, setShowOnlyBiometricOperators] = useState(false);

  // New state for groups: array of { id, name }
  const [groups, setGroups] = useState([]);

  // State for new group name input
  const [newGroupName, setNewGroupName] = useState('');

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
  // Prevent opening details if clicking on checkbox or buttons
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
    // Only allow selecting if not already assigned, or if unchecking
    if (isChecked && !centerAssignments[employeeId]) {
      setSelectedOperators([...selectedOperators, employeeId]);
    } else if (!isChecked) {
      setSelectedOperators(selectedOperators.filter(id => id !== employeeId));
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

  const handleBulkAssign = () => {
    if (!bulkCenterCode.trim() && !bulkCenterName.trim()) {
      alert('Please enter a Center Code or Center Name for bulk assignment.');
      return;
    }
    const newAssignments = { ...centerAssignments };
    selectedOperators.forEach(operatorId => {
      newAssignments[operatorId] = {
        centerCode: bulkCenterCode,
        centerName: bulkCenterName,
      };
    });
    setCenterAssignments(newAssignments);
    // --- New: Deselect operators and clear bulk inputs after assignment ---
    setSelectedOperators([]); // Clear selected operators
    setBulkCenterCode(''); // Clear bulk code input
    setBulkCenterName(''); // Clear bulk name input
    alert('Bulk assignment applied to selected operators.');
  };

  const handleClearAllAssignments = () => {
    setCenterAssignments({});
    setSelectedOperators([]);
    setBulkCenterCode('');
    setBulkCenterName('');
    alert('All center assignments have been cleared.');
  };

  const handleRemoveOperatorFromPreview = (operatorIdToRemove) => {
    setCenterAssignments(prevAssignments => {
      const newAssignments = { ...prevAssignments };
      delete newAssignments[operatorIdToRemove];
      return newAssignments;
    });
    // Optionally, you might want to add a confirmation or notification here
    // alert(`Operator removed from assignment.`);
  };
  const handleGenerateExcel = () => {
    const assignedOperatorIds = Object.keys(centerAssignments);

    if (assignedOperatorIds.length === 0) {
      alert('Please assign centers to operators to include them in the report.');
      return;
    }

    const groupedByCenter = {};

    assignedOperatorIds.forEach(operatorId => {
      const operator = employees.find(emp => emp.empId === operatorId);
      if (!operator) {
        console.warn(`Selected operator with ID ${operatorId} not found in employees list.`);
        return; // Skip if operator data not found
      }

      const assignment = centerAssignments[operatorId]; // We know this exists
      let opCenterCode = (assignment.centerCode || '').trim();
      let opCenterName = (assignment.centerName || '').trim();

      if (!opCenterCode) opCenterCode = 'Unassigned_Code';
      if (!opCenterName) opCenterName = 'Unassigned_Center';

      const groupKey = `${opCenterCode} - ${opCenterName}`;

      if (!groupedByCenter[groupKey]) {
        groupedByCenter[groupKey] = {
          centerCode: opCenterCode,
          centerName: opCenterName,
          operators: []
        };
      }
      groupedByCenter[groupKey].operators.push({
        name: operator.name || '',
        addharNo: operator.addharNo || '', // Data field from employee object
        phoneNo: operator.phoneNo || '',   // Data field from employee object
      });
    });

    if (Object.keys(groupedByCenter).length === 0) {
      alert('No operators have assigned centers. Please assign centers to selected operators.');
      return;
    }

    const sheetRows = [];
    let isFirstGroup = true;

    Object.values(groupedByCenter).forEach(group => {
      if (group.operators.length === 0) return;

      if (!isFirstGroup) {
        sheetRows.push([]); // Add a blank row as a separator
      }
      isFirstGroup = false;

      // Add table headers for this group
      sheetRows.push(['S. No.', 'Name', 'Aadhar No.', 'Mobile No.', 'Center Code', 'Center Name']);

      // Add operator data for this group
      group.operators.forEach((op, index) => {
        sheetRows.push([
          index + 1,
          op.name,
          op.addharNo,
          op.phoneNo,
          group.centerCode,
          group.centerName,
        ]);
      });
    });

    if (sheetRows.length === 0) {
      alert('No data to generate. Please ensure operators are selected and have assigned centers with operators.');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Operator Assignments');
    XLSX.writeFile(workbook, 'biometric_operator_assignments_grouped.xlsx');
  };

  const renderAssignmentPreview = () => {
    const assignedOperatorIds = Object.keys(centerAssignments);
    if (assignedOperatorIds.length === 0) {
      return null;
    }

    const groupedByCenter = {};
    assignedOperatorIds.forEach(operatorId => {
      const operator = employees.find(emp => emp.empId === operatorId);
      if (!operator) return;

      const assignment = centerAssignments[operatorId];
      let opCenterCode = (assignment.centerCode || '').trim() || 'Unassigned_Code';
      let opCenterName = (assignment.centerName || '').trim() || 'Unassigned_Center';
      const groupKey = `${opCenterCode} - ${opCenterName}`;

      if (!groupedByCenter[groupKey]) {
        groupedByCenter[groupKey] = {
          centerCode: opCenterCode,
          centerName: opCenterName,
          operators: []
        };
      }
      groupedByCenter[groupKey].operators.push({
        name: operator.name || '',
        addharNo: operator.addharNo || '',
        empId: operator.empId, // <-- Add empId here
        phoneNo: operator.phoneNo || '',
      });
    });

    return (
      <div className="assignment-preview-section" style={{ marginTop: '30px', borderTop: '2px solid #007bff', paddingTop: '20px' }}>
        <h3>Assignment Preview</h3>
        {Object.values(groupedByCenter).map((group, groupIndex) => (
          <div key={`${group.centerCode}-${group.centerName}-${groupIndex}`} style={{ marginBottom: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
            <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
              Center: {group.centerName} (Code: {group.centerCode})
            </h4>
            <table className="preview-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{border: '1px solid #ddd', padding: '8px', textAlign: 'left'}}>S. No.</th>
                  <th style={{border: '1px solid #ddd', padding: '8px', textAlign: 'left'}}>Name</th>
                  <th style={{border: '1px solid #ddd', padding: '8px', textAlign: 'left'}}>Aadhar No.</th>
                  <th style={{border: '1px solid #ddd', padding: '8px', textAlign: 'left'}}>Mobile No.</th>
                  <th style={{border: '1px solid #ddd', padding: '8px', textAlign: 'left'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {group.operators.map((op, index) => (
                  <tr key={`${group.centerCode}-${op.name}-${index}`}>
                    <td style={{border: '1px solid #ddd', padding: '8px'}}>{index + 1}</td>
                    <td style={{border: '1px solid #ddd', padding: '8px'}}>{op.name}</td>
                    <td style={{border: '1px solid #ddd', padding: '8px'}}>{op.addharNo}</td>
                    <td style={{border: '1px solid #ddd', padding: '8px'}}>{op.phoneNo}</td>
                    <td style={{border: '1px solid #ddd', padding: '8px', textAlign: 'center'}}>
                      <button
                        onClick={() => handleRemoveOperatorFromPreview(op.empId)} // <-- Use op.empId directly
                        style={{backgroundColor: '#ffc107', color: 'black', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer'}}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <button 
          onClick={handleClearAllAssignments} 
          style={{ marginTop: '10px', backgroundColor: '#dc3545', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Clear All Assignments
        </button>
      </div>
    );
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
                      disabled={!employee.isBiometricOperator || !!centerAssignments[employee.empId]} 
                    />
                  </td>
                  <td>
                    {employee.imageUrl && (
                      <img
                        src={employee.imageUrl}
                        alt={employee.name}
                        className="thumbnail"
                        onError={(e) => {
                          e.target.src = 'https://www.ncenet.com/wp-content/uploads/2020/04/no-image-png-2.png';
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
        <div className="assignment-section" style={{ marginTop: '20px', border: '1px solid #ccc', padding: '15px' }}>
          <h3>Assign Centers</h3>

          <div className="bulk-assignment" style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
            <h4>Bulk Assign to All Selected Operators</h4>
            <div style={{ marginBottom: '10px' }}>
              <label htmlFor="bulkCenterCode" style={{ marginRight: '10px' }}>Center Code:</label>
              <input
                type="text"
                id="bulkCenterCode"
                placeholder="Enter Bulk Center Code"
                value={bulkCenterCode}
                onChange={(e) => setBulkCenterCode(e.target.value)}
                style={{ marginRight: '20px' }}
              />
              <label htmlFor="bulkCenterName" style={{ marginRight: '10px' }}>Center Name:</label>
              <input
                type="text"
                id="bulkCenterName"
                placeholder="Enter Bulk Center Name"
                value={bulkCenterName}
                onChange={(e) => setBulkCenterName(e.target.value)}
              />
            </div>
            <button onClick={handleBulkAssign} style={{ padding: '8px 15px' }}>
              Apply to All Selected
            </button>
          </div>

          <div className="center-assignment">
            <h4>Individual Assignments (can override bulk)</h4>
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
        </div>
      )}

      {/* Render Assignment Preview */}
      {renderAssignmentPreview()}

      <div style={{ marginTop: '20px' }}> {/* Wrapper for generate button for spacing */}
        <button onClick={handleGenerateExcel} disabled={Object.keys(centerAssignments).length === 0} style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Generate Biometric Operator List
        </button>
      </div>

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
