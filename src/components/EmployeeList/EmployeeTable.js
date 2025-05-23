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
    onDeselectAll, // Accept the new prop
    onOperatorSelect,
    selectedOperators,
    uniqueReferenceNames,
    selectedReferenceFilter,
    onReferenceFilterChange,
    centerAssignments,
}) => {
    return (
        <div className="employee-table-container">
            <table className="employee-table">
                <thead>
                    <tr>
                        <th onClick={onDeselectAll} style={{ cursor: 'pointer' }}>Select</th> {/* Add onClick and cursor style */}
                        <th>Profile</th>
                        <th onClick={() => onSort('name')}>Name {sortColumn === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                        <th onClick={() => onSort('phoneNo')}>Mobile No. {sortColumn === 'phoneNo' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                        <th onClick={() => onSort('addharNo')}>Aadhar No. {sortColumn === 'addharNo' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                        <th>Address</th> {/* This column is not sortable by header click in current setup */}
                        <th>
                            <div>Reference</div>
                            {uniqueReferenceNames && uniqueReferenceNames.length > 1 && ( // Show dropdown if there are references
                                <select
                                    value={selectedReferenceFilter}
                                    onChange={(e) => {
                                        e.stopPropagation(); // Prevent any parent onClick if it exists
                                        onReferenceFilterChange(e.target.value);
                                    }}
                                    onClick={(e) => e.stopPropagation()} // Also stop propagation here
                                    className="reference-filter-select" // Added class for styling
                                >
                                    {uniqueReferenceNames.map(name => (
                                        <option key={name || 'all-references'} value={name}>
                                            {name || 'All References'}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </th>
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
