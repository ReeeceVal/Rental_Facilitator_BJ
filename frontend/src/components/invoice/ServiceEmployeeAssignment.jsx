import { useState, useEffect } from 'react'
import { Users, Plus, X, Percent } from 'lucide-react'
import Button from '../ui/Button'
import { useEmployees } from '../../hooks/useEmployees'

export default function ServiceEmployeeAssignment({ 
  serviceId,
  serviceName,
  serviceAmount = 0,
  serviceDiscount = 0,
  assignments = [], 
  onAssignmentsChange,
  readOnly = false 
}) {
  const { searchEmployees } = useEmployees({ autoFetch: false });
  const [localAssignments, setLocalAssignments] = useState(assignments);

  useEffect(() => {
    // Initialize assignments with search properties if they don't have them
    const assignmentsWithSearch = assignments.map(assignment => ({
      ...assignment,
      searchTerm: assignment.searchTerm || '',
      employeeOptions: assignment.employeeOptions || []
    }));
    setLocalAssignments(assignmentsWithSearch);
  }, [assignments]);

  const serviceNetAmount = parseFloat(serviceAmount) - parseFloat(serviceDiscount || 0);

  const handleAddAssignment = () => {
    const newAssignment = {
      id: `temp-${Date.now()}`,
      invoice_service_id: serviceId,
      employee_id: '',
      employee_name: '',
      commission_percentage: 50, // Default to 50%
      searchTerm: '',
      employeeOptions: []
    };
    const updatedAssignments = [...localAssignments, newAssignment];
    setLocalAssignments(updatedAssignments);
    onAssignmentsChange?.(serviceId, updatedAssignments);
  };

  const handleRemoveAssignment = (index) => {
    const updatedAssignments = localAssignments.filter((_, i) => i !== index);
    setLocalAssignments(updatedAssignments);
    onAssignmentsChange?.(serviceId, updatedAssignments);
  };

  const handleAssignmentChange = (index, field, value) => {
    const updatedAssignments = localAssignments.map((assignment, i) => {
      if (i === index) {
        return { ...assignment, [field]: value };
      }
      return assignment;
    });
    
    setLocalAssignments(updatedAssignments);
    onAssignmentsChange?.(serviceId, updatedAssignments);
  };

  const handleSearchChange = async (index, searchTerm) => {
    // Update search term immediately in local state
    const updatedAssignments = localAssignments.map((assignment, i) => {
      if (i === index) {
        return { ...assignment, searchTerm };
      }
      return assignment;
    });
    setLocalAssignments(updatedAssignments);
    onAssignmentsChange?.(serviceId, updatedAssignments);
    
    if (searchTerm.length >= 2) {
      try {
        const results = await searchEmployees(searchTerm);
        const updatedWithOptions = updatedAssignments.map((assignment, i) => {
          if (i === index) {
            return { ...assignment, employeeOptions: results };
          }
          return assignment;
        });
        setLocalAssignments(updatedWithOptions);
        onAssignmentsChange?.(serviceId, updatedWithOptions);
      } catch (error) {
        console.error('Error searching employees:', error);
        const updatedWithEmptyOptions = updatedAssignments.map((assignment, i) => {
          if (i === index) {
            return { ...assignment, employeeOptions: [] };
          }
          return assignment;
        });
        setLocalAssignments(updatedWithEmptyOptions);
        onAssignmentsChange?.(serviceId, updatedWithEmptyOptions);
      }
    } else {
      const updatedWithEmptyOptions = updatedAssignments.map((assignment, i) => {
        if (i === index) {
          return { ...assignment, employeeOptions: [] };
        }
        return assignment;
      });
      setLocalAssignments(updatedWithEmptyOptions);
      onAssignmentsChange?.(serviceId, updatedWithEmptyOptions);
    }
  };

  const handleEmployeeSelect = (index, employee) => {
    const updatedAssignments = localAssignments.map((assignment, i) => {
      if (i === index) {
        return {
          ...assignment,
          employee_id: employee.id,
          employee_name: employee.name,
          searchTerm: '',
          employeeOptions: []
        };
      }
      return assignment;
    });
    
    setLocalAssignments(updatedAssignments);
    onAssignmentsChange?.(serviceId, updatedAssignments);
  };

  const totalCommissionPercentage = localAssignments.reduce((sum, assignment) => {
    return sum + (parseFloat(assignment.commission_percentage) || 0);
  }, 0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { 
      style: 'currency', 
      currency: 'ZAR' 
    }).format(amount || 0);
  };

  if (readOnly && localAssignments.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900 flex items-center">
            <Users className="h-4 w-4 mr-1" />
            Employee Assignments for "{serviceName}"
          </h4>
          <p className="text-xs text-gray-500">
            Service Amount: {formatCurrency(serviceNetAmount)}
          </p>
        </div>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddAssignment}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Employee
          </Button>
        )}
      </div>

      {/* Commission Summary */}
      {localAssignments.length > 0 && (
        <div className={`text-xs p-2 rounded border ${
          totalCommissionPercentage > 100 
            ? 'bg-red-50 border-red-200 text-red-700' 
            : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <div className="flex items-center justify-between">
            <span>Total Commission: {totalCommissionPercentage}%</span>
            <span>
              Total Amount: {formatCurrency(serviceNetAmount * (totalCommissionPercentage / 100))}
            </span>
          </div>
          {totalCommissionPercentage > 100 && (
            <div className="text-red-600 mt-1">
              ⚠️ Warning: Total commission exceeds 100%
            </div>
          )}
        </div>
      )}

      {/* Assignments List */}
      <div className="space-y-2">
        {localAssignments.map((assignment, index) => {
          const commissionAmount = serviceNetAmount * (parseFloat(assignment.commission_percentage || 0) / 100);
          
          return (
            <div key={assignment.id || index} className="flex items-center space-x-2 p-2 bg-white border border-gray-200 rounded text-sm">
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Employee
                </label>
                {readOnly ? (
                  <div className="text-sm text-gray-900">{assignment.employee_name}</div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={assignment.employee_name || assignment.searchTerm || ''}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        
                        // If employee is selected and user starts typing, clear the selection
                        if (assignment.employee_name && inputValue !== assignment.employee_name) {
                          const updatedAssignments = localAssignments.map((a, i) => {
                            if (i === index) {
                              return {
                                ...a,
                                employee_id: '',
                                employee_name: '',
                                searchTerm: inputValue
                              };
                            }
                            return a;
                          });
                          setLocalAssignments(updatedAssignments);
                          onAssignmentsChange?.(serviceId, updatedAssignments);
                        }
                        
                        // Perform search
                        handleSearchChange(index, inputValue);
                      }}
                      placeholder="Search..."
                      className="input text-xs py-1"
                    />
                    {assignment.employeeOptions && assignment.employeeOptions.length > 0 && !assignment.employee_name && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-auto">
                        {assignment.employeeOptions.map((employee) => (
                          <button
                            key={employee.id}
                            type="button"
                            className="w-full px-2 py-1 text-left hover:bg-gray-100 focus:bg-gray-100 text-xs"
                            onClick={() => handleEmployeeSelect(index, employee)}
                          >
                            {employee.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="w-20">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <Percent className="h-3 w-3 inline mr-1" />
                  %
                </label>
                {readOnly ? (
                  <div className="text-xs text-gray-900">{assignment.commission_percentage}%</div>
                ) : (
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={assignment.commission_percentage || ''}
                    onChange={(e) => handleAssignmentChange(index, 'commission_percentage', parseFloat(e.target.value) || 0)}
                    className="input text-xs py-1"
                    placeholder="50"
                  />
                )}
              </div>
              
              <div className="w-20 text-right">
                <div className="text-xs text-gray-500 mb-1">Amount</div>
                <div className="text-xs font-medium text-gray-900">
                  {formatCurrency(commissionAmount)}
                </div>
              </div>
              
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleRemoveAssignment(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {localAssignments.length === 0 && !readOnly && (
        <div className="text-center py-3 text-gray-400">
          <p className="text-xs">No employees assigned to this service</p>
        </div>
      )}
    </div>
  );
}