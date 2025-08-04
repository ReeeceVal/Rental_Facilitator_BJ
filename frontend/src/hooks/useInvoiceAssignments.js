import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/constants';

export const useInvoiceAssignments = (invoiceId) => {
  const [assignments, setAssignments] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [totalCommission, setTotalCommission] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAssignments = async () => {
    if (!invoiceId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/assignments`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch assignments: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAssignments(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissions = async () => {
    if (!invoiceId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/commissions`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch commissions: ${response.statusText}`);
      }
      
      const data = await response.json();
      setCommissions(data.commissions);
      setTotalCommission(data.total_commission);
    } catch (err) {
      console.error('Error fetching commissions:', err);
    }
  };

  const assignEmployees = async (assignmentData) => {
    if (!invoiceId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/assign-employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignments: assignmentData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign employees');
      }

      const result = await response.json();
      setAssignments(result.assignments);
      await fetchCommissions(); // Refresh commissions after assignment
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error assigning employees:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchAssignments();
      fetchCommissions();
    }
  }, [invoiceId]);

  return {
    assignments,
    commissions,
    totalCommission,
    loading,
    error,
    assignEmployees,
    fetchAssignments,
    fetchCommissions,
    refetch: () => {
      fetchAssignments();
      fetchCommissions();
    }
  };
};