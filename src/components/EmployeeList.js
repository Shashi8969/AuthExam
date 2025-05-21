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
    console.log('EmployeeList: Component Mounted and Rendering'); // <-- ADD THIS LINE

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc'); // Get user (aliased to currentUser) and loading state from AuthContext
  const { user: currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate(); // Initialize useNavigate

  // New states for biometric operator selection and assignment
  const [selectedOperators, setSelectedOperators] = useState([]);
  const [centerAssignments, setCenterAssignments] = useState({});
  // New states for bulk assignment
  const [bulkCenterCode, setBulkCenterCode] = useState('');
  const [bulkCenterName, setBulkCenterName] = useState('');

  // Renamed state for the new toggle functionality
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

  // State for predefined centers
  const [predefinedCenters, setPredefinedCenters] = useState({});

  // New state for groups: array of { id, name }
  const [groups, setGroups] = useState([]);

  // State for new group name input
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    if (!authLoading && !currentUser) {
      console.log('EmployeeList useEffect: Redirecting! authLoading:', authLoading, 'currentUser:', currentUser); // <-- ADD THIS LOG
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

  useEffect(() => {
    // Fetch predefined centers
    const centersRef = ref(db, 'PredefinedCenters');
    const unsubscribeCenters = onValue(centersRef, (snapshot) => {
      setPredefinedCenters(snapshot.val() || {});
    });
    return () => unsubscribeCenters();
  }, []);


  const filteredEmployees = employees.filter(employee => { // Add opening curly brace
    const matchesSearch =
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.phoneNo.includes(searchTerm) ||
      employee.addharNo.includes(searchTerm);

    if (!matchesSearch) {
      return false;
    }

    if (showUnassignedOnly) {
      return employee.isBiometricOperator && !centerAssignments[employee.empId];
    }
    return true; // If toggle is off, show all employees matching search (and the search criteria)
  });

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

  // Renamed handler for the new toggle
  const handleUnassignedFilterChange = (e) => {
    setShowUnassignedOnly(e.target.checked);
  };

  const handleOperatorSelect = (employeeId, isChecked) => {
    console.log('handleOperatorSelect called for:', employeeId, 'isChecked:', isChecked);
    // Only allow selecting if not already assigned, or if unchecking

    // The `disabled` attribute on the checkbox should prevent invalid calls.
    // `employee.isBiometricOperator` is implicitly handled by the `disabled` state.

    if (isChecked) {
      // Intention is to select this operator.
      // The checkbox should only be checkable if !centerAssignments[employeeId] (handled by disabled state).
      if (!centerAssignments[employeeId]) { 
        setSelectedOperators(prevSelected => {
          if (!prevSelected.includes(employeeId)) {
            return [...prevSelected, employeeId];
          }
          return prevSelected;
        });
      }
    } else {
      // Intention is to unselect this operator.
      setSelectedOperators(prevSelected => prevSelected.filter(id => id !== employeeId));
      
      // If unselected, also remove any center assignment for this operator.
      setCenterAssignments(prevAssignments => {
        if (prevAssignments[employeeId]) {
          const newAssignments = { ...prevAssignments };
          delete newAssignments[employeeId];
          return newAssignments;
        }
        return prevAssignments; // No change if no assignment existed
      });

    }
  };

  const handleAssignmentChange = (operatorId, field, value) => {
    setCenterAssignments(prevAssignments => {
      // Check for operator count limit if assigning a new center code
      if (field === 'centerCode' && value) {
        const targetCenter = predefinedCenters[value];
        if (targetCenter && typeof targetCenter.count === 'number') {
          let currentAssignedToTargetCenter = 0;
          Object.values(prevAssignments).forEach(assignment => {
            if (assignment.centerCode === value) {
              currentAssignedToTargetCenter++;
            }
          });
          // If the operator is not already assigned to this center, count them as one more
          if (!prevAssignments[operatorId] || prevAssignments[operatorId].centerCode !== value) {
            if (currentAssignedToTargetCenter >= targetCenter.count) {
              alert(`Cannot assign to ${targetCenter.name} (${value}). Maximum operator count of ${targetCenter.count} reached. Please remove an existing operator from this center first or choose a different center.`);
              return prevAssignments; // Revert to previous assignments
            }
          }
        }
      }
      const newAssignmentForOperator = { ...(prevAssignments[operatorId] || {}), [field]: value };
      if (field === 'centerCode') {
        const selectedPredefinedCenter = predefinedCenters[value];
        newAssignmentForOperator.centerName = selectedPredefinedCenter ? selectedPredefinedCenter.name : '';
      }
      return {
        ...prevAssignments,
        [operatorId]: newAssignmentForOperator,
      };
    });
  };

  const handleBulkCenterCodeChange = (e) => {
    const code = e.target.value;
    setBulkCenterCode(code);
    const selectedPredefinedCenter = predefinedCenters[code];
    setBulkCenterName(selectedPredefinedCenter ? selectedPredefinedCenter.name : '');
  };

  const handleBulkAssign = () => {
    if (!bulkCenterCode.trim() && !bulkCenterName.trim()) {
      alert('Please enter a Center Code or Center Name for bulk assignment.');
      return;
    }

    // Check for operator count limit in bulk assignment
    const targetCenter = predefinedCenters[bulkCenterCode];
    if (targetCenter && typeof targetCenter.count === 'number') {
      let currentAssignedToTargetCenter = 0;
      Object.values(centerAssignments).forEach(assignment => {
        if (assignment.centerCode === bulkCenterCode) {
          currentAssignedToTargetCenter++;
        }
      });

      // Count how many *newly* selected operators are being assigned (not already in this center)
      const newlyAssignedCount = selectedOperators.filter(opId => !centerAssignments[opId] || centerAssignments[opId].centerCode !== bulkCenterCode).length;

      if (currentAssignedToTargetCenter + newlyAssignedCount > targetCenter.count) {
        alert(`Cannot assign ${selectedOperators.length} operators to ${targetCenter.name} (${bulkCenterCode}). It would exceed the maximum operator count of ${targetCenter.count}. Current assigned: ${currentAssignedToTargetCenter}. You are trying to add ${newlyAssignedCount} more. Please select fewer operators or remove existing ones from this center.`);
        return;
      }
    }


    const newAssignments = { ...centerAssignments }; // Declare newAssignments here
    selectedOperators.forEach(operatorId => {
      newAssignments[operatorId] = {
        centerCode: bulkCenterCode,
        centerName: bulkCenterName,
      };
    });
    setCenterAssignments(newAssignments); // Use the populated newAssignments

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
        {Object.values(groupedByCenter).map((group, groupIndex) => {
          const centerInfo = predefinedCenters[group.centerCode];
          const maxOperators = centerInfo ? centerInfo.count : Infinity; // Default to Infinity if no count defined
          const isOverAssigned = group.operators.length > maxOperators;
          return (
            <div key={`${group.centerCode}-${group.centerName}-${groupIndex}`} style={{ marginBottom: '20px', padding: '10px', border: isOverAssigned ? '2px solid red' : '1px solid #eee', borderRadius: '5px' }}>
              <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
                Center: {group.centerName} (Code: {group.centerCode}) - Assigned: {group.operators.length}{centerInfo && typeof centerInfo.count === 'number' ? ` / Max: ${centerInfo.count}` : ''}
                {isOverAssigned && <span style={{ color: 'red', marginLeft: '10px', fontWeight: 'bold' }}> (Over Limit!)</span>}
              </h4>
              <table className="preview-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>S. No.</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Name</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Aadhar No.</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Mobile No.</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {group.operators.map((op, index) => (
                    <tr key={`${group.centerCode}-${op.name}-${index}`}>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{index + 1}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{op.name}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{op.addharNo}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{op.phoneNo}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleRemoveOperatorFromPreview(op.empId)} // <-- Use op.empId directly
                          style={{ backgroundColor: '#ffc107', color: 'black', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
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

      <div className="filter-section" style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
        <span style={{ marginRight: '10px' }}>Show Only Unassigned Biometric Operators:</span>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={showUnassignedOnly}
            onChange={handleUnassignedFilterChange}
          />
          <span className="slider round"></span>
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
                  <td onClick={(e) => {
                      e.stopPropagation(); // Prevent row click

                      const isDisabled = !employee.isBiometricOperator || !!centerAssignments[employee.empId];
                      if (isDisabled) {
                        return; // Do nothing if disabled
                      }
                      // Toggle the selection state
                      const isCurrentlyChecked = selectedOperators.includes(employee.empId);
                      handleOperatorSelect(employee.empId, !isCurrentlyChecked);
                    }}>
                    <input
                      type="checkbox"
                      checked={selectedOperators.includes(employee.empId)}
                      onChange={(e) => {
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
              <select
                id="bulkCenterCode"
                value={bulkCenterCode}
                onChange={handleBulkCenterCodeChange} // Use the correct handler here
                style={{ marginRight: '20px', padding: '8px' }}
              >
                <option value="">Select Center Code</option>
                {Object.keys(predefinedCenters).map(code => (
                  <option key={code} value={code}>{code} - {predefinedCenters[code].name}</option>
                ))}
              </select>

              <label htmlFor="bulkCenterName" style={{ marginRight: '10px' }}>Center Name:</label>
              <input
                type="text"
                id="bulkCenterName"
                placeholder="Enter Bulk Center Name"
                value={bulkCenterName}
                onChange={(e) => setBulkCenterName(e.target.value)} // Allow manual edit if needed, though mostly auto-filled
                readOnly={!!(bulkCenterCode && predefinedCenters[bulkCenterCode])} // Make read-only if a predefined code is selected
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
                        <select
                          value={assignment.centerCode}
                          onChange={(e) => handleAssignmentChange(operatorId, 'centerCode', e.target.value)}
                          style={{ padding: '8px' }}
                        >
                          <option value="">Select Center Code</option>
                          {Object.keys(predefinedCenters).map(code => (
                            <option key={code} value={code}>{code} - {predefinedCenters[code].name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          placeholder="Enter Center Name"
                          value={assignment.centerName}
                          onChange={(e) => handleAssignmentChange(operatorId, 'centerName', e.target.value)} // Allow manual edit
                          readOnly={!!(assignment.centerCode && predefinedCenters[assignment.centerCode])} // Make read-only if predefined code selected
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
          onClose={() => setSelectedEmployeeId(null)} // Or your existing handleCloseDetails
        />
      )}

    </div>
  );
};

export default EmployeeList;
