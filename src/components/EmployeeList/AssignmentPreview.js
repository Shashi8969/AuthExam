import React, { useState, useEffect, useRef } from 'react';

const AssignmentPreview = ({
  centerAssignments,
  employeeMap,
  predefinedCenters,
  onRemoveOperatorFromPreview,
  onClearAllAssignments,
}) => {
  const [displayedGroups, setDisplayedGroups] = useState([]);
  const draggedOperatorRef = useRef(null); // Stores { groupKey, operator, originalIndex }

  useEffect(() => {
    const assignedOperatorIds = Object.keys(centerAssignments);
    if (assignedOperatorIds.length === 0) {
      setDisplayedGroups([]);
      return;
    }

    const newGroupedByCenter = {};
    assignedOperatorIds.forEach(operatorId => {
      const operator = employeeMap[operatorId];
      if (!operator) return;

      const assignment = centerAssignments[operatorId];
      let opCenterCode = (assignment.centerCode || '').trim() || 'Unassigned_Code';
      let opCenterName = (assignment.centerName || '').trim() || 'Unassigned_Center';
      const groupKey = `${opCenterCode} - ${opCenterName}`;

      if (!newGroupedByCenter[groupKey]) {
        newGroupedByCenter[groupKey] = {
          groupKey, // Store the key itself for easier reference
          centerCode: opCenterCode,
          centerName: opCenterName,
          operators: []
        };
      }
      newGroupedByCenter[groupKey].operators.push({
        name: operator.name || '',
        addharNo: operator.addharNo || '',
        empId: operator.empId, // Crucial for unique key and identification
        phoneNo: operator.phoneNo || '',
      });
    });

    const groupsArray = Object.values(newGroupedByCenter).sort((a, b) => {
      // Optional: Sort groups by name or code if desired
      return a.centerName.localeCompare(b.centerName) || a.centerCode.localeCompare(b.centerCode);
    });
    setDisplayedGroups(groupsArray);
  }, [centerAssignments, employeeMap]);

  const handleDragStart = (e, groupKey, operator, index) => {
    draggedOperatorRef.current = { groupKey, operator, originalIndex: index };
    e.dataTransfer.effectAllowed = 'move';
    // You can set drag image or other data if needed: e.dataTransfer.setData('text/plain', '');
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e, targetGroupKey, dropOntoOperatorIndex) => {
    e.preventDefault();
    if (!draggedOperatorRef.current || draggedOperatorRef.current.groupKey !== targetGroupKey) {
      // Invalid drop: not dragging, or trying to drop into a different group (not supported by this reorder)
      draggedOperatorRef.current = null; // Clear ref
      return;
    }

    const { originalIndex: sourceIndex, groupKey: sourceGroupKey } = draggedOperatorRef.current;

    // If dropping onto the same position, do nothing
    if (sourceIndex === dropOntoOperatorIndex && sourceGroupKey === targetGroupKey) {
        draggedOperatorRef.current = null;
        return;
    }

    setDisplayedGroups(prevGroups =>
      prevGroups.map(group => {
        if (group.groupKey === sourceGroupKey) {
          const currentOperators = [...group.operators];
          const draggedOperator = currentOperators[sourceIndex]; // Get the full operator object

          // Remove the dragged operator from its original position
          const remainingOperators = currentOperators.filter((op, idx) => idx !== sourceIndex);

          // Insert the dragged operator at the new position (dropOntoOperatorIndex)
          remainingOperators.splice(dropOntoOperatorIndex, 0, draggedOperator);

          return { ...group, operators: remainingOperators };
        }
        return group;
      })
    );
    draggedOperatorRef.current = null; // Clear ref after drop
  };

  const handleDragEnd = () => {
    // Cleanup if needed, e.g., remove visual cues
    draggedOperatorRef.current = null;
  };

  if (displayedGroups.length === 0) return null;

  return (
    <div className="assignment-preview-section">
      <h3>Assignment Preview</h3>
      {displayedGroups.map((group) => {
        const centerInfo = predefinedCenters[group.centerCode];
        const maxOperators = centerInfo ? centerInfo.count : Infinity;
        const isOverAssigned = group.operators.length > maxOperators;
        return (
          <div key={group.groupKey} className={`preview-group ${isOverAssigned ? 'over-assigned' : ''}`}>
            <h4 className="preview-group-header">
              Center: {group.centerName} (Code: {group.centerCode}) - Assigned: {group.operators.length}
              {centerInfo && typeof centerInfo.count === 'number' ? ` / Max: ${centerInfo.count}` : ''}
              {isOverAssigned && <span className="over-limit-warning"> (Over Limit!)</span>}
            </h4>
            <table className="preview-table">
              <thead>
                <tr>
                  <th>S. No.</th>
                  <th>Name</th>
                  <th>Aadhar No.</th>
                  <th>Mobile No.</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {group.operators.map((op, index) => (
                  <tr
                    key={op.empId} // Use unique empId for the key
                    // Draggable properties are moved to the S.No. <td>
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, group.groupKey, index)}
                    // style={{ cursor: 'grab' }} // Removed from <tr>
                  >
                    <td
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, group.groupKey, op, index)}
                      onDragEnd={handleDragEnd}
                      style={{ cursor: 'grab', userSelect: 'none' }} // Visual cue and prevent text selection
                    >{index + 1}</td>
                    <td>{op.name}</td>
                    <td>{op.addharNo}</td>
                    <td>{op.phoneNo}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => onRemoveOperatorFromPreview(op.empId)}
                        className="remove-operator-btn">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
      <br />
      <button
        onClick={onClearAllAssignments}
        className="clear-assignments-btn"
      >
        Clear All Assignments
      </button>
    </div>
  );
};

export default AssignmentPreview;
