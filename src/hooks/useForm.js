// src/hooks/useForm.js
import { useState } from 'react';
import { push, set } from 'firebase/database';
import { employeesRef } from '../config/firebase';
import Employee from '../models/Employee';

const initialState = new Employee({
  name: '',
  phoneNo: '',
  addharNo: '',
  address: '',
  referenceName: '',
  imageUrl: '',
  addharFrontImageUrl: '',
  addharBackImageUrl: '',
});

const useForm = () => {
  const [formData, setFormData] = useState(initialState);
  const [empId, setEmpId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (name, url) => {
    setFormData((prev) => ({ ...prev, [name]: url }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newEmployeeRef = push(employeesRef);
      const generatedEmpId = newEmployeeRef.key;
      setEmpId(generatedEmpId);
      const employee = new Employee({
        ...formData,
        empId: generatedEmpId,
      });
      await set(newEmployeeRef, employee.toFirebase());
      setFormData(initialState);
      setEmpId(null);
      setLoading(false);
    } catch (error) {
      setError(error);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialState);
    setEmpId(null);
    setError(null);
    setLoading(false);
  };

  return {
    formData,
    setFormData,
    empId,
    setEmpId,
    error,
    setError,
    loading,
    setLoading,
    handleChange,
    handleSubmit,
    handleImageUpload,
    resetForm
  };
  
};

export default useForm;