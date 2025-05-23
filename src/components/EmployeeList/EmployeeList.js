// src/components/EmployeeList.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { onValue, ref, remove, push } from 'firebase/database'; // Added push
import { db } from '../../config/firebase';
import { ref as dbRef } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
import './EmployeeList.css';
import EditEmployee from './EditEmployee';
import EmployeeDetails from './EmployeeDetails';
import Employee from '../../models/Employee';
import EmployeeTable from './EmployeeTable'; // Import new component
import AssignmentControls from './AssignmentControls'; // Import new component
import AssignmentPreview from './AssignmentPreview'; // Import new component


const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [searchInputText, setSearchInputText] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const { user: currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [selectedOperators, setSelectedOperators] = useState([]);
  const [centerAssignments, setCenterAssignments] = useState({});
  const [bulkCenterCode, setBulkCenterCode] = useState('');
  const [bulkCenterName, setBulkCenterName] = useState('');
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [predefinedCenters, setPredefinedCenters] = useState({});
  const [showScrollToTopButton, setShowScrollToTopButton] = useState(false);
  const [selectedReferenceFilter, setSelectedReferenceFilter] = useState(''); // State for reference filter

  useEffect(() => {
    if (!authLoading && !currentUser) {
      alert('Please log in to view the employee list.');
      navigate('/login');
      return;
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
  }, [authLoading, currentUser, navigate]);

  useEffect(() => {
    const centersRef = ref(db, 'PredefinedCenters');
    const unsubscribeCenters = onValue(centersRef, (snapshot) => {
      setPredefinedCenters(snapshot.val() || {});
    });
    return () => unsubscribeCenters();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.pageYOffset > 300) {
        setShowScrollToTopButton(true);
      } else {
        setShowScrollToTopButton(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const employeeMap = useMemo(() => {
    return employees.reduce((acc, employee) => {
      acc[employee.empId] = employee;
      return acc;
    }, {});
  }, [employees]);

  const uniqueReferenceNames = useMemo(() => {
    const references = new Set(
      employees
        .map(emp => emp.referenceName)
        .filter(Boolean) // Remove null, undefined, or empty strings
    );
    return ['', ...Array.from(references).sort()]; // Add an empty string for "All" and sort
  }, [employees]);

  const totalBiometricOperatorsCount = useMemo(() => {
    return employees.filter(emp => emp.isBiometricOperator).length;
  }, [employees]);

  const availableForSelectionCount = useMemo(() => {
    return employees.filter(emp =>
      emp.isBiometricOperator &&
      !selectedOperators.includes(emp.empId) &&
      !centerAssignments[emp.empId]
    ).length;
  }, [employees, selectedOperators, centerAssignments]);




  const filteredEmployees = employees.filter(employee => {
    const searchTermLower = appliedSearchTerm.toLowerCase();
    const matchesSearch =
      appliedSearchTerm === '' ? true : (
        (employee.name && String(employee.name).toLowerCase().includes(searchTermLower)) ||
        (employee.phoneNo && String(employee.phoneNo).includes(appliedSearchTerm)) ||
        (employee.addharNo && String(employee.addharNo).includes(appliedSearchTerm))
      );
    if (!matchesSearch) {
      return false;
    }

    // Apply reference name filter
    if (selectedReferenceFilter && employee.referenceName !== selectedReferenceFilter) {
      return false;
    }

    if (showUnassignedOnly) {
      return employee.isBiometricOperator && !centerAssignments[employee.empId];
    }
    return true;
  });

  const sortedEmployees = filteredEmployees.sort((a, b) => {
    if (!a[sortColumn] || !b[sortColumn]) return 0; // Handle cases where sortable property might be missing

    if (typeof a[sortColumn] === 'string' && typeof b[sortColumn] === 'string') {
        return sortDirection === 'asc'
            ? a[sortColumn].localeCompare(b[sortColumn])
            : b[sortColumn].localeCompare(a[sortColumn]);
    }
    // Basic numeric sort (can be expanded if other types are needed)
    return sortDirection === 'asc'
        ? a[sortColumn] - b[sortColumn]
        : b[sortColumn] - a[sortColumn];
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
          // console.log("Employee deleted successfully"); // Optional: keep for debugging if needed
        })
        .catch((error) => {
          console.error("Error deleting employee:", error);
        });
    }
  };

  const handleUnassignedFilterChange = (e) => {
    setShowUnassignedOnly(e.target.checked);
  };

  const handleOperatorSelect = (employeeId, isChecked) => {
    if (isChecked) {
      if (!centerAssignments[employeeId]) {
        setSelectedOperators(prevSelected => {
          if (!prevSelected.includes(employeeId)) {
            return [...prevSelected, employeeId];
          }
          return prevSelected;
        });
      }
    } else {
      setSelectedOperators(prevSelected => prevSelected.filter(id => id !== employeeId));
      setCenterAssignments(prevAssignments => {
        if (prevAssignments[employeeId]) {
          const newAssignments = { ...prevAssignments };
          delete newAssignments[employeeId];
          return newAssignments;
        }
        return prevAssignments;
      });
    }
  };

  const handleAssignmentChange = (operatorId, field, value) => {
    setCenterAssignments(prevAssignments => {
      if (field === 'centerCode' && value) {
        const targetCenter = predefinedCenters[value];
        if (targetCenter && typeof targetCenter.count === 'number') {
          let currentAssignedToTargetCenter = 0;
          Object.values(prevAssignments).forEach(assignment => {
            if (assignment.centerCode === value) {
              currentAssignedToTargetCenter++;
            }
          });
          if (!prevAssignments[operatorId] || prevAssignments[operatorId].centerCode !== value) {
            if (currentAssignedToTargetCenter >= targetCenter.count) {
              alert(`Cannot assign to ${targetCenter.name} (${value}). Maximum operator count of ${targetCenter.count} reached.`);
              return prevAssignments;
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

    const targetCenter = predefinedCenters[bulkCenterCode];
    if (targetCenter && typeof targetCenter.count === 'number') {
      let currentAssignedToTargetCenter = 0;
      Object.values(centerAssignments).forEach(assignment => {
        if (assignment.centerCode === bulkCenterCode) {
          currentAssignedToTargetCenter++;
        }
      });

      const newlyAssignedCount = selectedOperators.filter(opId => !centerAssignments[opId] || centerAssignments[opId].centerCode !== bulkCenterCode).length;

      if (currentAssignedToTargetCenter + newlyAssignedCount > targetCenter.count) {
        alert(`Cannot assign ${selectedOperators.length} operators to ${targetCenter.name} (${bulkCenterCode}). It would exceed the maximum operator count of ${targetCenter.count}.`);
        return;
      }
    }

    const newAssignments = { ...centerAssignments };
    selectedOperators.forEach(operatorId => {
      newAssignments[operatorId] = {
        centerCode: bulkCenterCode,
        centerName: bulkCenterName,
      };
    });
    setCenterAssignments(newAssignments);

    setSelectedOperators([]);
    setBulkCenterCode('');
    setBulkCenterName('');
    alert('Bulk assignment applied to selected operators.');
  };
  
  const handleDeselectAllOperators = () => {
    setSelectedOperators([]);
  };
  
  const handleBulkCenterNameChange = (e) => {
    setBulkCenterName(e.target.value);
    // If you want to clear bulkCenterCode if name is manually typed, add logic here
  };
  
  const handleReferenceFilterChange = (referenceName) => {
    setSelectedReferenceFilter(referenceName);
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
  };

  const handleGenerateExcel = () => {
    const assignedOperatorIds = Object.keys(centerAssignments);
    if (assignedOperatorIds.length === 0) {
      alert('Please assign centers to operators to include them in the report.');
      return;
    }

    const groupedByCenter = {};
    assignedOperatorIds.forEach(operatorId => {
      const operator = employeeMap[operatorId];
      if (!operator) {
        console.warn(`Selected operator with ID ${operatorId} not found in employees list.`);
        return;
      }

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
        phoneNo: operator.phoneNo || '',
      });
    });

    if (Object.keys(groupedByCenter).length === 0) {
      alert('No operators have assigned centers.');
      return;
    }

    const sheetRows = [];
    let isFirstGroup = true;
    Object.values(groupedByCenter).forEach(group => {
      if (group.operators.length === 0) return;
      if (!isFirstGroup) sheetRows.push([]);
      isFirstGroup = false;
      sheetRows.push(['S. No.', 'Name', 'Aadhar No.', 'Mobile No.', 'Center Code', 'Center Name']);
      group.operators.forEach((op, index) => {
        sheetRows.push([index + 1, op.name, op.addharNo, op.phoneNo, group.centerCode, group.centerName]);
      });
    });

    if (sheetRows.length === 0) {
      alert('No data to generate.');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Operator Assignments');
    XLSX.writeFile(workbook, 'biometric_operator_assignments_grouped.xlsx');
  };

  const handleSaveAssignmentList = useCallback(async () => {
    if (Object.keys(centerAssignments).length === 0) {
      alert('There are no assignments to save.');
      return;
    }

    // Optional: Prompt for a name for this saved list
    const listName = prompt('Enter a name for this work list (e.g., "BSSC_List"-"RRB_List" ):', 
                           `Operator_List - ${new Date().toLocaleDateString()}`);
    
    if (listName === null) { // User cancelled the prompt
      return;
    }

    const savedListData = {
      name: listName || `Unnamed List - ${Date.now()}`, // Default name if prompt is empty
      timestamp: Date.now(),
      assignments: { ...centerAssignments } // Save a copy of current assignments
    };

    try {
      const savedListsRef = dbRef(db, 'SavedAssignmentLists');
      await push(savedListsRef, savedListData); // push() generates a unique ID
      alert(`List saved as "${listName}"`);
  
      alert('Assignment list saved successfully!');
    } catch (error) {
      console.error('Error saving assignment list:', error);
      alert('Failed to save assignment list. Please try again.');
    }
  }, [centerAssignments]); // Include dependencies for useCallback

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

if (loading || authLoading) {
    return (
      <div className="loading-spinner-container">
        <div className="loading-spinner"></div>
        <span className="loading-text">Loading Employees...</span> 
      </div>
    );
  }

  return (
    <div className="employee-list">
      <h2>Employee List</h2>

      <div className="filter-section"> {/* Removed inline styles, use CSS file */}
        <span>Show Only Unassigned Biometric Operators:</span>
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
          className="search-input"
          value={searchInputText}
          onChange={(e) => setSearchInputText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              setAppliedSearchTerm(searchInputText);
            }
          }}
        />
        <button onClick={() => setAppliedSearchTerm(searchInputText)} className="search-button">
          Search
        </button>
      </div>

      <div className="operator-counts-summary">
        <span>Total Biometric Operators: <strong>{totalBiometricOperatorsCount}</strong></span>
        <span>Operators Available for Selection: <strong>{availableForSelectionCount}</strong></span>
      </div>




      {sortedEmployees.length === 0 ? (
        <p className="no-results">No employees found</p>
      ) : (
        <EmployeeTable
          employees={sortedEmployees}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onEmployeeClick={handleEmployeeClick}
          onEdit={setEditingEmployee}
          onDelete={deleteEmployee}
          onOperatorSelect={handleOperatorSelect}
          selectedOperators={selectedOperators}
          uniqueReferenceNames={uniqueReferenceNames}
          selectedReferenceFilter={selectedReferenceFilter}
          onReferenceFilterChange={handleReferenceFilterChange}
          onDeselectAll={handleDeselectAllOperators} // Pass the new handler
          centerAssignments={centerAssignments}
        />
      )}

      <AssignmentControls
        selectedOperators={selectedOperators}
        employeeMap={employeeMap}
        centerAssignments={centerAssignments}
        predefinedCenters={predefinedCenters}
        bulkCenterCode={bulkCenterCode}
        bulkCenterName={bulkCenterName}
        onBulkCenterCodeChange={handleBulkCenterCodeChange}
        onBulkCenterNameChange={handleBulkCenterNameChange}
        onBulkAssign={handleBulkAssign}
        onAssignmentChange={handleAssignmentChange}
      />

      <AssignmentPreview
        centerAssignments={centerAssignments}
        employeeMap={employeeMap}
        predefinedCenters={predefinedCenters}
        onRemoveOperatorFromPreview={handleRemoveOperatorFromPreview}
        onClearAllAssignments={handleClearAllAssignments}
      />

      <div className="action-button-group"> {/* Wrapper for button, use CSS file */}
        <button
            onClick={handleGenerateExcel}
            disabled={Object.keys(centerAssignments).length === 0}
            className="generate-excel-btn" /* Use class for styling */
        >
          Generate Biometric Operator List
        </button>
        <button
            onClick={handleSaveAssignmentList}
            disabled={Object.keys(centerAssignments).length === 0}
            className="save-assignments-btn" // New class for styling
        >
          Save Assignment List
        </button>
      </div>

      {editingEmployee && (
        <EditEmployee
          key={`edit-${editingEmployee}`}
          employeeId={editingEmployee}
          onClose={() => setEditingEmployee(null)}
        />
      )}

      {selectedEmployeeId && (
        <EmployeeDetails
          key={`details-${selectedEmployeeId}`}
          employeeId={selectedEmployeeId}
          onClose={() => setSelectedEmployeeId(null)}
        />
      )}

      <div className="scroll-buttons-container">
        {showScrollToTopButton && (
          <button onClick={handleScrollToTop} className="scroll-button scroll-to-top" title="Scroll to Top">
            ↑
          </button>
        )}
        <button onClick={handleScrollToBottom} className="scroll-button scroll-to-bottom" title="Scroll to Bottom">
          ↓
        </button>
      </div>
    </div>
  );
};

export default EmployeeList;
