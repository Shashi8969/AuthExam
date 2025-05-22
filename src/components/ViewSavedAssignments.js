import React, { useState, useEffect } from 'react';
import { ref, onValue, off, remove as firebaseRemove, update as firebaseUpdate } from 'firebase/database'; // Added firebaseRemove and firebaseUpdate
import { db } from '../config/firebase';
import * as XLSX from 'xlsx'; // For Excel export
import Employee from '../models/Employee'; // Import Employee model
import './ViewSavedAssignments.css'; // We'll create this CSS file

const ViewSavedAssignments = () => {
  const [savedLists, setSavedLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employeeMap, setEmployeeMap] = useState({});
  const [employeesLoading, setEmployeesLoading] = useState(true);

  // State for UI interactions
  const [expandedListId, setExpandedListId] = useState(null); // To show full details of a list
  const [renamingListId, setRenamingListId] = useState(null); // ID of the list being renamed
  const [newListName, setNewListName] = useState(''); // Current value for the new list name input
  const PREVIEW_OPERATOR_LIMIT = 5; // Number of operators to show in list preview


  useEffect(() => {
    const savedListsRef = ref(db, 'SavedAssignmentLists');
    setLoading(true);

    const listener = onValue(savedListsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const listsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first
        setSavedLists(listsArray);
      } else {
        setSavedLists([]);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching saved assignment lists:", err);
      setError("Failed to load saved assignment lists. Please check your connection or database rules.");
      setLoading(false);
    });

    // Detach the listener when the component unmounts
    return () => off(savedListsRef, 'value', listener);
  }, []);
  useEffect(() => {
    const employeesDbRef = ref(db, 'Employees');
    setEmployeesLoading(true);
    const unsubscribeEmployees = onValue(employeesDbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const empMap = Object.keys(data).reduce((acc, key) => {
          acc[key] = Employee.fromFirebase({ ...data[key], empId: key });
          return acc;
        }, {});
        setEmployeeMap(empMap);
      } else {
        setEmployeeMap({});
      }
      setEmployeesLoading(false);
    }, (err) => {
      console.error("Error fetching employees:", err);
      setEmployeesLoading(false); // Still set loading to false on error
    });
    return () => unsubscribeEmployees();
  }, []);

  const toggleExpandList = (listId) => {
    setExpandedListId(prevId => (prevId === listId ? null : listId));
  };

  const handleDownloadList = (list) => {
    if (!list.assignments || Object.keys(list.assignments).length === 0) {
      alert('This list has no assignments to download.');
      return;
    }

    // 1. Group assignments by center first
    const groupedByCenterForExcel = {};
    Object.entries(list.assignments).forEach(([operatorId, assignmentDetails]) => {
      const operator = employeeMap[operatorId];
      if (!operator) {
        console.warn(`Operator with ID ${operatorId} not found in employeeMap for Excel export.`);
        // Decide if you want to include a placeholder or skip
      }

      let opCenterCode = (assignmentDetails.centerCode || '').trim() || 'Unassigned_Code';
      let opCenterName = (assignmentDetails.centerName || '').trim() || 'Unassigned_Center';
      const groupKey = `${opCenterCode} - ${opCenterName}`;

      if (!groupedByCenterForExcel[groupKey]) {
        groupedByCenterForExcel[groupKey] = {
          centerCode: opCenterCode,
          centerName: opCenterName,
          operators: []
        };
      }
      groupedByCenterForExcel[groupKey].operators.push({
        name: operator ? operator.name : `ID: ${operatorId}`,
        phoneNo: operator ? operator.phoneNo : '-',
        addharNo: operator ? operator.addharNo : '-',
      });
    });

    // 2. Construct sheetRows with grouped data
    const sheetRows = [];
    Object.values(groupedByCenterForExcel).forEach((centerGroup, index) => {
      if (index > 0) {
        sheetRows.push([]); // Add an empty row as a separator between center tables
      }
      // Center Header
      sheetRows.push([`Center: ${centerGroup.centerName} (Code: ${centerGroup.centerCode})`]);
      // Operator Table Headers for this center
      sheetRows.push(['S. No.', 'Operator Name', 'Mobile No.', 'Aadhar No.', 'Center Code', 'Center Name']);
      // Operator Data
      centerGroup.operators.forEach((op, opIndex) => {
        sheetRows.push([opIndex + 1, op.name, op.phoneNo, op.addharNo, centerGroup.centerCode, centerGroup.centerName]);
      });
    });

    if (sheetRows.length === 0) {
      alert('No valid data to export after grouping.');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Assignments');
    XLSX.writeFile(workbook, `${list.name.replace(/[^a-z0-9]/gi, '_')}_assignments.xlsx`);
  };

  const handleDeleteList = async (listId, listName) => {
    if (window.confirm(`Are you sure you want to delete the list "${listName}"? This action cannot be undone.`)) {
      try {
        await firebaseRemove(ref(db, `SavedAssignmentLists/${listId}`));
        alert(`List "${listName}" deleted successfully.`);
        // The onValue listener will automatically update the UI
      } catch (err) {
        console.error("Error deleting list:", err);
        alert("Failed to delete the list. Please try again.");
      }
    }
  };

  const startRenameList = (list) => {
    setRenamingListId(list.id);
    setNewListName(list.name);
  };

  const cancelRenameList = () => {
    setRenamingListId(null);
    setNewListName('');
  };

  const handleSaveListName = async (listId) => {
    if (!newListName.trim()) {
      alert("List name cannot be empty.");
      return;
    }
    try {
      await firebaseUpdate(ref(db, `SavedAssignmentLists/${listId}`), { name: newListName.trim() });
      alert("List name updated successfully.");
      setRenamingListId(null);
      setNewListName('');
      // The onValue listener will update the UI
    } catch (err) {
      console.error("Error renaming list:", err);
      alert("Failed to rename the list. Please try again.");
    }
  };

    // Helper function to group assignments by center for a given list
  const groupAssignmentsByCenter = (assignments, currentEmployeeMap) => {
    const grouped = {};
    if (!assignments) return grouped;

    Object.entries(assignments).forEach(([operatorId, assignmentDetails]) => {
      const operator = currentEmployeeMap[operatorId];

      let opCenterCode = (assignmentDetails.centerCode || '').trim() || 'Unassigned_Code';
      let opCenterName = (assignmentDetails.centerName || '').trim() || 'Unassigned_Center';
      const groupKey = `${opCenterCode} - ${opCenterName}`; // Unique key for the group

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          centerCode: opCenterCode,
          centerName: opCenterName,
          operators: []
        };
      }
      grouped[groupKey].operators.push({
        empId: operatorId,
        name: operator ? operator.name : `ID: ...${operatorId.slice(-6)}`,
        phoneNo: operator ? operator.phoneNo : '-',
        addharNo: operator ? operator.addharNo : '-',
      });
    });
    return grouped;
  };

  if (loading || employeesLoading) {
    return <div className="loading-assignments">Loading saved assignment lists...</div>;
  }

  if (error) {
    return <div className="error-assignments">{error}</div>;
  }

  return (
    <div className="view-saved-assignments-container">
      <h2>Saved Assignment Lists</h2>
      {savedLists.length === 0 ? (
        <p className="no-saved-lists">No assignment lists have been saved yet.</p>
      ) : (
        <ul className="saved-lists-ul">
          
           {savedLists.map(list => { // Each 'list' is a saved assignment list
            const totalAssignmentsInList = list.assignments ? Object.keys(list.assignments).length : 0;
            const groupedAssignmentsInList = groupAssignmentsByCenter(list.assignments, employeeMap);

            // For preview mode: flatten operators from groups up to PREVIEW_OPERATOR_LIMIT
            let previewOperatorsFlat = [];
            if (expandedListId !== list.id && totalAssignmentsInList > 0) {
              let count = 0;
              for (const group of Object.values(groupedAssignmentsInList)) {
                for (const op of group.operators) {
                  if (count < PREVIEW_OPERATOR_LIMIT) {
                    previewOperatorsFlat.push({ ...op, centerCode: group.centerCode, centerName: group.centerName });
                    count++;
                  } else {
                    break;
                  }
                }
                if (count >= PREVIEW_OPERATOR_LIMIT) break;
              }
            }

            return (
              <li key={list.id} className="saved-list-item">
                {renamingListId === list.id ? (
                  <div className="list-rename-section">
                    <input
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      className="list-rename-input"
                      autoFocus
                    />
                    <button onClick={() => handleSaveListName(list.id)} className="list-action-btn save-rename-btn">Save</button>
                    <button onClick={cancelRenameList} className="list-action-btn cancel-rename-btn">Cancel</button>
                  </div>
                ) : (
                <div className="list-item-header">
                    <h3>{list.name}</h3>
                    <span className="list-timestamp">
                      Saved on: {new Date(list.timestamp).toLocaleString()}
                    </span>
                  </div>  
                )}
                <div className="list-item-details">
                  <h4>Assigned Operators:</h4>
                  {totalAssignmentsInList === 0 ? (
                    <p>No specific assignments recorded in this list entry.</p>
                  ) : expandedListId === list.id ? (
                    // Full View: Show assignments grouped by center
                    Object.values(groupedAssignmentsInList).map((centerGroup, groupIndex) => (
                      <div key={`${list.id}-group-${groupIndex}`} className="center-group-in-list">
                        <h5 className="preview-group-header">
                          Center: {centerGroup.centerName} (Code: {centerGroup.centerCode}) - Assigned: {centerGroup.operators.length}
                        </h5>
                        <table className="assignments-table-summary">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Mobile No.</th>
                              <th>Aadhar No.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {centerGroup.operators.map(op => (
                              <tr key={`${list.id}-${centerGroup.centerCode}-${op.empId}`}>
                                <td>{op.name}</td>
                                <td>{op.phoneNo}</td>
                                <td>{op.addharNo}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))
                  ) : (
                    // Preview View: Show a flat list of first N operators
                    <>
                      <table className="assignments-table-summary">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Mobile No.</th>
                            <th>Aadhar No.</th>
                            <th>Center Code</th>
                            <th>Center Name</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewOperatorsFlat.map(op => (
                            <tr key={`${list.id}-preview-${op.empId}`}>
                              <td>{op.name}</td>
                              <td>{op.phoneNo}</td>
                              <td>{op.addharNo}</td>
                              <td>{op.centerCode}</td>
                              <td>{op.centerName}</td>
                            </tr>
                          ))}
                          {totalAssignmentsInList > PREVIEW_OPERATOR_LIMIT && (
                            <tr>
                              <td colSpan="5" style={{ textAlign: 'center' }}>
                                ...and {totalAssignmentsInList - PREVIEW_OPERATOR_LIMIT} more.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </>
                  )}
                  <div className="list-item-actions">
                    {totalAssignmentsInList > PREVIEW_OPERATOR_LIMIT && (
                      <button onClick={() => toggleExpandList(list.id)} className="list-action-btn view-toggle-btn">
                        {expandedListId === list.id ? 'Hide Details' : 'View Full List'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadList(list)}
                      className="list-action-btn download-btn"
                      disabled={totalAssignmentsInList === 0}
                    >
                      Download XLSX
                    </button>
                    {renamingListId !== list.id && (
                       <button onClick={() => startRenameList(list)} className="list-action-btn rename-btn">
                         Rename
                       </button>
                    )}
                    <button
                      onClick={() => handleDeleteList(list.id, list.name)}
                      className="list-action-btn delete-btn"
                    >
                      Delete List
                     </button>
                     </div>
                </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ViewSavedAssignments;
