import React from 'react';
import './EmployeeList.css';

const AssignmentControls = ({
  selectedOperators,
  employeeMap,
  centerAssignments,
  predefinedCenters,
  bulkCenterCode,
  bulkCenterName,
  onBulkCenterCodeChange,
  onBulkCenterNameChange,
  onBulkAssign,
  onAssignmentChange,
}) => {
  if (selectedOperators.length === 0) {
    return null;
  }

  return (
    <div className="assignment-section">
      <h3>Assign Centers</h3>
      <div className="bulk-assignment">
        <h4>Bulk Assign to All Selected Operators</h4>
        <div className="bulk-assignment-controls">
          <label htmlFor="bulkCenterCode">Center Code:</label>
          <select
            id="bulkCenterCode"
            value={bulkCenterCode}
            onChange={onBulkCenterCodeChange}
          >
            <option value="">Select Center Code</option>
            {Object.keys(predefinedCenters).map(code => (
              <option key={code} value={code}>{code} - {predefinedCenters[code].name}</option>
            ))}
          </select>

          <label htmlFor="bulkCenterName">Center Name:</label>
          <input
            type="text"
            id="bulkCenterName"
            placeholder="Enter Bulk Center Name"
            value={bulkCenterName}
            onChange={onBulkCenterNameChange}
            readOnly={!!(bulkCenterCode && predefinedCenters[bulkCenterCode])}
          />
        </div>
        <button onClick={onBulkAssign} className="bulk-assign-btn">
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
              const operator = employeeMap[operatorId];
              const assignment = centerAssignments[operatorId] || { centerCode: '', centerName: '' };
              return (
                <tr key={operatorId}>
                  <td>{(operator && operator.name) || 'N/A'}</td>
                  <td>
                    <select
                      value={assignment.centerCode}
                      onChange={(e) => onAssignmentChange(operatorId, 'centerCode', e.target.value)}
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
                      onChange={(e) => onAssignmentChange(operatorId, 'centerName', e.target.value)}
                      readOnly={!!(assignment.centerCode && predefinedCenters[assignment.centerCode])}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssignmentControls;
