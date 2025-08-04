import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/constants';

export const useEmployees = (options = {}) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const fetchEmployees = async (params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams({
        page: params.page || pagination.page,
        limit: params.limit || pagination.limit,
        ...(params.search && { search: params.search }),
        ...(params.active_only !== undefined && { active_only: params.active_only })
      });

      const response = await fetch(`${API_BASE_URL}/employees?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch employees: ${response.statusText}`);
      }
      
      const data = await response.json();
      setEmployees(data.employees);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchEmployees = async (query) => {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const response = await fetch(`${API_BASE_URL}/employees/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to search employees: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (err) {
      console.error('Error searching employees:', err);
      return [];
    }
  };

  const createEmployee = async (employeeData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(employeeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create employee');
      }

      const newEmployee = await response.json();
      setEmployees(prev => [newEmployee, ...prev]);
      return newEmployee;
    } catch (err) {
      console.error('Error creating employee:', err);
      throw err;
    }
  };

  const updateEmployee = async (employeeId, employeeData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(employeeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update employee');
      }

      const updatedEmployee = await response.json();
      setEmployees(prev => 
        prev.map(emp => emp.id === employeeId ? updatedEmployee : emp)
      );
      return updatedEmployee;
    } catch (err) {
      console.error('Error updating employee:', err);
      throw err;
    }
  };

  const deleteEmployee = async (employeeId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete employee');
      }

      setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
      return true;
    } catch (err) {
      console.error('Error deleting employee:', err);
      throw err;
    }
  };

  const getEmployeeAssignments = async (employeeId, params = {}) => {
    try {
      const queryParams = new URLSearchParams({
        page: params.page || 1,
        limit: params.limit || 20
      });

      const response = await fetch(`${API_BASE_URL}/employees/${employeeId}/assignments?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch employee assignments: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (err) {
      console.error('Error fetching employee assignments:', err);
      throw err;
    }
  };

  const getEmployeeCommissions = async (employeeId, params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);

      const response = await fetch(`${API_BASE_URL}/employees/${employeeId}/commissions?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch employee commissions: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (err) {
      console.error('Error fetching employee commissions:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (options.autoFetch !== false) {
      fetchEmployees();
    }
  }, []);

  return {
    employees,
    loading,
    error,
    pagination,
    fetchEmployees,
    searchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeAssignments,
    getEmployeeCommissions,
    refetch: fetchEmployees
  };
};