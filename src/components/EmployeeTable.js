import React from 'react';
import './EmployeeList.css';

const EmployeeTable = ({
  employees,
  onSort,
  sortColumn,
  sortDirection,
  onEmployeeClick,
  onEdit,
  onDelete,
  onOperatorSelect,
  selectedOperators,
  centerAssignments,
}) => {
  return (
    <div className="employee-table-container">
      <table className="employee-table">
        <thead>
          <tr>
            <th>Select</th>
            <th>Profile</th>
            <th onClick={() => onSort('name')}>Name {sortColumn === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
            <th onClick={() => onSort('phoneNo')}>Phone {sortColumn === 'phoneNo' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
            <th onClick={() => onSort('addharNo')}>Aadhar {sortColumn === 'addharNo' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
            <th>Address</th>
            <th>Reference</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(employee => (
            <tr key={employee.empId} onClick={() => onEmployeeClick(employee.empId)} style={{ cursor: 'pointer' }}>
              <td onClick={(e) => {
                  e.stopPropagation();
                  const isDisabled = !employee.isBiometricOperator || !!centerAssignments[employee.empId];
                  if (isDisabled) return;
                  const isCurrentlyChecked = selectedOperators.includes(employee.empId);
                  onOperatorSelect(employee.empId, !isCurrentlyChecked);
                }}>
                <input
                  type="checkbox"
                  checked={selectedOperators.includes(employee.empId)}
                  onChange={(e) => {
                    e.stopPropagation();
                    const isDisabledCheckbox = !employee.isBiometricOperator || !!centerAssignments[employee.empId];
                    if (isDisabledCheckbox) return;
                    onOperatorSelect(employee.empId, e.target.checked);
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
                    onEdit(employee.empId);
                  }}
                  className="edit-btn"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(employee.empId);
                  }}
                  className="delete-btn"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeTable;
