import { useState, useEffect } from 'react';
import { onValue, ref } from 'firebase/database';
import { db } from '../config/firebase';
import EditEmployee from './EditEmployee';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'Employees'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const employeesArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setEmployees(employeesArray);
      } else {
        setEmployees([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.phoneNo.includes(searchTerm) ||
    employee.addharNo.includes(searchTerm)
  );

  if (loading) return <div className="loading">Loading employees...</div>;

  return (
    <div className="employee-list">
      <h2>Employee List</h2>
      
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredEmployees.length === 0 ? (
        <p className="no-results">No employees found</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Profile</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Aadhar</th>
                <th>Address</th>
                <th>Reference</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(employee => (
                <tr key={employee.id}>
                  <td>
                    {employee.imageUrl && (
                      <img 
                        src={employee.imageUrl} 
                        alt={employee.name} 
                        className="thumbnail" 
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/50';
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
                      onClick={() => setEditingEmployee(employee.id)}
                      className="edit-btn"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingEmployee && (
        <EditEmployee 
          employeeId={editingEmployee} 
          onClose={() => setEditingEmployee(null)} 
        />
      )}
    </div>
  );
};

export default EmployeeList;