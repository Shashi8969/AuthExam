import React from 'react';

const AssignmentPreview = ({
  centerAssignments,
  employeeMap,
  predefinedCenters,
  onRemoveOperatorFromPreview,
  onClearAllAssignments,
}) => {
  const assignedOperatorIds = Object.keys(centerAssignments);
  if (assignedOperatorIds.length === 0) return null;

  const groupedByCenter = {};
  assignedOperatorIds.forEach(operatorId => {
    const operator = employeeMap[operatorId];
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
      empId: operator.empId,
      phoneNo: operator.phoneNo || '',
    });
  });

  return (
    <div className="assignment-preview-section">
      <h3>Assignment Preview</h3>
      {Object.values(groupedByCenter).map((group, groupIndex) => {
        const centerInfo = predefinedCenters[group.centerCode];
        const maxOperators = centerInfo ? centerInfo.count : Infinity;
        const isOverAssigned = group.operators.length > maxOperators;
        return (
          <div key={`${group.centerCode}-${group.centerName}-${groupIndex}`} className={`preview-group ${isOverAssigned ? 'over-assigned' : ''}`}>
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
                  <tr key={`${group.centerCode}-${op.name}-${index}`}>
                    <td>{index + 1}</td>
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
