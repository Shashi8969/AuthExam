// src/components/EmployeeList.js
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { onValue, ref, remove, push, query, orderByChild, equalTo, serverTimestamp } from 'firebase/database'; // Added query, orderByChild, equalTo, serverTimestamp
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
  const { user: currentUser, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [selectedOperators, setSelectedOperators] = useState([]);
  const [centerAssignments, setCenterAssignments] = useState(() => {
    const assignmentsToEdit = localStorage.getItem('assignmentsToEdit');
    if (assignmentsToEdit) {
      localStorage.removeItem('assignmentsToEdit'); // Consume it once
      return JSON.parse(assignmentsToEdit);
    }
    const savedAssignments = localStorage.getItem('centerAssignments');
    return savedAssignments ? JSON.parse(savedAssignments) : {};
  });
  const [bulkCenterCode, setBulkCenterCode] = useState('');
  const [bulkCenterName, setBulkCenterName] = useState('');
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [predefinedCenters, setPredefinedCenters] = useState({});
  const [showScrollToTopButton, setShowScrollToTopButton] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default items per page
  const [selectedReferenceFilter, setSelectedReferenceFilter] = useState(''); // State for reference filter
  const [userReferenceNames, setUserReferenceNames] = useState([]); // For the filter dropdown

  useEffect(() => {
    if (!authLoading && !currentUser) {
      alert('Please log in to view the employee list.');
      navigate('/login');
      return;
    }

    let employeesQuery;
    if (isAdmin) {
      employeesQuery = ref(db, 'Employees');
    } else if (currentUser) {
      employeesQuery = query(ref(db, 'Employees'), orderByChild('createdBy'), equalTo(currentUser.uid));
    } else {
      // No user, or not admin and no specific query, clear employees and stop loading
      setEmployees([]);
      setLoading(false);
      return;
    }

    const unsubscribeEmployees = onValue(employeesQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const employeesArray = Object.keys(data).map(key => Employee.fromFirebase({ ...data[key], empId: key, createdBy: data[key].createdBy }));
        setEmployees(employeesArray);
      } else {
        setEmployees([]);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeEmployees();
    };
  }, [authLoading, currentUser, navigate, isAdmin]);

  // Effect to fetch reference names for the filter dropdown
  useEffect(() => {
    if (!currentUser && !isAdmin) return; // No user and not admin, do nothing

    let queryRef;
    if (isAdmin) {
      queryRef = ref(db, 'ReferenceNames'); // Admin sees all
    } else if (currentUser) {
      queryRef = query(ref(db, 'ReferenceNames'), orderByChild('createdBy'), equalTo(currentUser.uid)); // User sees their own
    } else {
      return; // Should not happen
    }

    const unsubscribeReferences = onValue(queryRef, (snapshot) => {
      const data = snapshot.val();
      const namesArray = [];
      if (data) {
        Object.values(data).forEach(refObj => namesArray.push(refObj.name));
      }
      // Add "All" option and sort, removing duplicates
      setUserReferenceNames(['', ...Array.from(new Set(namesArray)).sort()]);
    });
    return () => unsubscribeReferences();
  }, [currentUser, isAdmin]);

  // Effect to save centerAssignments to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('centerAssignments', JSON.stringify(centerAssignments));
  }, [centerAssignments]);

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

  // Calculate total pages and employees for the current page
  const currentTotalPages = useMemo(() => {
    if (itemsPerPage === 'all' || sortedEmployees.length === 0) {
      return 1;
    }
    return Math.ceil(sortedEmployees.length / Number(itemsPerPage));
  }, [sortedEmployees.length, itemsPerPage]);

  const paginatedEmployees = useMemo(() => {
    if (itemsPerPage === 'all' || sortedEmployees.length === 0) {
      return sortedEmployees;
    }
    const numItemsPerPage = Number(itemsPerPage);
    const startIndex = (currentPage - 1) * numItemsPerPage;
    const endIndex = Math.min(startIndex + numItemsPerPage, sortedEmployees.length);
    return sortedEmployees.slice(startIndex, endIndex);
  }, [sortedEmployees, currentPage, itemsPerPage]);

  // Effect to adjust currentPage if it's out of bounds (e.g., after filtering or itemsPerPage change)
  useEffect(() => {
    if (currentPage > currentTotalPages) {
      setCurrentPage(currentTotalPages > 0 ? currentTotalPages : 1);
    } else if (currentPage < 1 && currentTotalPages > 0) { // Ensure currentPage is at least 1
      setCurrentPage(1);
    }
  }, [sortedEmployees.length, itemsPerPage, currentPage, currentTotalPages]);

  // Reset to page 1 when primary filters, search term, or items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [appliedSearchTerm, selectedReferenceFilter, showUnassignedOnly]);

  const handleEmployeeClick = (employeeId) => {
    setSelectedEmployeeId(employeeId);
  };

  const deleteEmployee = (employeeId) => {
    if (!isAdmin) {
      alert("You do not have permission to delete employees.");
      return;
    }
    const confirmDelete = window.confirm("Are you sure you want to delete this employee?");
    if (confirmDelete) {
      remove(dbRef(db, `Employees/${employeeId}`))
        .then(() => {
          // Optionally, remove from centerAssignments if present
          setCenterAssignments(prev => { const newAssignments = {...prev}; delete newAssignments[employeeId]; return newAssignments; });
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
        if (prevAssignments[employeeId] && !prevAssignments[employeeId].individuallySet) {
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
      const currentAssignment = prevAssignments[operatorId] || {};
      if (field === 'centerCode' && value) {
        const targetCenter = predefinedCenters[value];
        if (targetCenter && typeof targetCenter.count === 'number') {
          let currentAssignedToTargetCenter = 0;
          Object.values(prevAssignments).forEach(assignment => {
            if (assignment.centerCode === value) {
              currentAssignedToTargetCenter++;
            }
          });
          if (currentAssignment.centerCode !== value) {
            if (currentAssignedToTargetCenter >= targetCenter.count) {
              alert(`Cannot assign to ${targetCenter.name} (${value}). Maximum operator count of ${targetCenter.count} reached.`);
              return prevAssignments;
            }
          }
        }
      }
      const newAssignmentForOperator = {
        ...currentAssignment,
        [field]: value,
        individuallySet: true // Mark as individually set
      }; if (field === 'centerCode') {
        const selectedPredefinedCenter = predefinedCenters[value];
        newAssignmentForOperator.centerName = selectedPredefinedCenter ? selectedPredefinedCenter.name : (value ? newAssignmentForOperator.centerName : '');
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

    if (bulkCenterCode) { // Only check capacity if a predefined center is chosen
      const targetCenter = predefinedCenters[bulkCenterCode];
      if (targetCenter && typeof targetCenter.count === 'number') {
        // Calculate the projected count for the target center after this bulk operation
        let finalCountForTargetCenter = 0;
        const tempAssignments = { ...centerAssignments };

        // Tentatively apply bulk assignments to a temporary copy
        selectedOperators.forEach(opId => {
          // Only apply bulk if not individually set or if individually set to a different center
          if (!tempAssignments[opId] || !tempAssignments[opId].individuallySet) {
            tempAssignments[opId] = { centerCode: bulkCenterCode, centerName: bulkCenterName, individuallySet: false };
          }
        });

        // Now count how many would be in the target center
        Object.values(tempAssignments).forEach(assignment => {
          if (assignment.centerCode === bulkCenterCode) {
            finalCountForTargetCenter++;
          }
        });

        if (finalCountForTargetCenter > targetCenter.count) {
          alert(`Cannot perform bulk assignment to ${targetCenter.name} (${bulkCenterCode}). It would result in ${finalCountForTargetCenter} operators, exceeding the maximum of ${targetCenter.count}. Please adjust selections or individual assignments.`);
          return;
        }
      
      }
    }

    const newAssignments = { ...centerAssignments };
    selectedOperators.forEach(operatorId => {
      // Only apply bulk assignment if the operator does not have an individually set assignment
      if (!newAssignments[operatorId] || !newAssignments[operatorId].individuallySet) {
        newAssignments[operatorId] = {
          centerCode: bulkCenterCode,
          centerName: bulkCenterName,
          individuallySet: false // Mark as not individually set (or simply omit the flag)
        };
        }
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
    localStorage.removeItem('centerAssignments'); // Clear from local storage
    alert('All center assignments have been cleared.');
  };

    const handleItemsPerPageChange = (e) => {
    const newItemsPerPage = e.target.value;
    setItemsPerPage(newItemsPerPage === 'all' ? 'all' : Number(newItemsPerPage));
    setCurrentPage(1); // Reset to first page when items per page changes
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
      assignments: { ...centerAssignments }, // Save a copy of current assignments
      createdBy: currentUser ? currentUser.uid : 'unknown_user' // Associate with user
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
  }, [centerAssignments, currentUser]); // Include dependencies for useCallback

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




      {paginatedEmployees.length === 0 && sortedEmployees.length === 0 ? (
        <p className="no-results">No employees found</p>
      ) : (
        <>
        <EmployeeTable
          employees={paginatedEmployees}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onEmployeeClick={handleEmployeeClick}
          onEdit={setEditingEmployee}
          onDelete={deleteEmployee}
          onOperatorSelect={handleOperatorSelect}
          selectedOperators={selectedOperators}
          uniqueReferenceNames={userReferenceNames} // Use fetched reference names
          selectedReferenceFilter={selectedReferenceFilter}
          onReferenceFilterChange={handleReferenceFilterChange}
          onDeselectAll={handleDeselectAllOperators} // Pass the new handler
          isAdmin={isAdmin} // Pass isAdmin prop
          centerAssignments={centerAssignments}
        />
                <div className="pagination-controls-container">
          <div className="items-per-page-selector">
            <label htmlFor="itemsPerPageSelect">Rows per page:</label>
            <select
              id="itemsPerPageSelect"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="all">All</option>
            </select>
          </div>
          {itemsPerPage !== 'all' && sortedEmployees.length > 0 && (
            <div className="pagination-navigation">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="pagination-button prev-button"
              > Previous </button>
              <span className="pagination-info"> Page {currentPage} of {currentTotalPages} </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, currentTotalPages))}
                disabled={currentPage === currentTotalPages || currentTotalPages === 0}
                className="pagination-button next-button"
              > Next </button>
            </div>
          )}
          <div className="pagination-summary"> Displaying {paginatedEmployees.length} of {sortedEmployees.length} employees </div>
        </div>
        </>
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
