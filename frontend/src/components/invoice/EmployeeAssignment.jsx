import { useState, useEffect } from 'react'
import { Users, Plus, X } from 'lucide-react'
import Button from '../ui/Button'
import { useEmployees } from '../../hooks/useEmployees'

export default function EmployeeAssignment({ 
  invoiceId, 
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

  const handleAddAssignment = () => {
    const newAssignment = {
      id: Date.now(),
      employee_id: '',
      employee_name: '',
      role: 'setup',
      searchTerm: '',
      employeeOptions: []
    };
    const updatedAssignments = [...localAssignments, newAssignment];
    setLocalAssignments(updatedAssignments);
    onAssignmentsChange?.(updatedAssignments);
  };

  const handleRemoveAssignment = (index) => {
    const updatedAssignments = localAssignments.filter((_, i) => i !== index);
    setLocalAssignments(updatedAssignments);
    onAssignmentsChange?.(updatedAssignments);
  };

  const handleAssignmentChange = (index, field, value) => {
    const updatedAssignments = localAssignments.map((assignment, i) => {
      if (i === index) {
        return { ...assignment, [field]: value };
      }
      return assignment;
    });
    
    setLocalAssignments(updatedAssignments);
    onAssignmentsChange?.(updatedAssignments);
  };

  const handleSearchChange = async (index, searchTerm) => {
    // Update search term immediately
    handleAssignmentChange(index, 'searchTerm', searchTerm);
    
    if (searchTerm.length >= 2) {
      try {
        const results = await searchEmployees(searchTerm);
        handleAssignmentChange(index, 'employeeOptions', results);
      } catch (error) {
        console.error('Error searching employees:', error);
        handleAssignmentChange(index, 'employeeOptions', []);
      }
    } else {
      handleAssignmentChange(index, 'employeeOptions', []);
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
    onAssignmentsChange?.(updatedAssignments);
  };

  const organizerCount = localAssignments.filter(a => a.role === 'organizer').length;
  const setupCount = localAssignments.filter(a => a.role === 'setup').length;
  const setupCommissionEach = setupCount > 0 ? (30 / setupCount).toFixed(1) : 0;

  if (readOnly && localAssignments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Employee Assignments</h3>
          <p className="text-sm text-gray-500">
            Assign employees to this rental for commission tracking
          </p>
        </div>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddAssignment}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Employee
          </Button>
        )}
      </div>

      {/* Commission Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center space-x-4 text-sm">
          <div>
            <span className="font-medium text-blue-900">Organizer:</span>
            <span className="text-blue-700 ml-1">5% each ({organizerCount} assigned)</span>
          </div>
          <div>
            <span className="font-medium text-blue-900">Setup:</span>
            <span className="text-blue-700 ml-1">{setupCommissionEach}% each ({setupCount} assigned)</span>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-3">
        {localAssignments.map((assignment, index) => (
          <div key={assignment.id || index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      if (assignment.employee_name) {
                        handleAssignmentChange(index, 'employee_id', '');
                        handleAssignmentChange(index, 'employee_name', '');
                      }
                      
                      // Perform search
                      handleSearchChange(index, inputValue);
                    }}
                    placeholder="Search employees..."
                    className="input"
                  />
                  {assignment.employeeOptions && assignment.employeeOptions.length > 0 && !assignment.employee_name && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {assignment.employeeOptions.map((employee) => (
                        <button
                          key={employee.id}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100"
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
            
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              {readOnly ? (
                <div className="text-sm text-gray-900 capitalize">{assignment.role}</div>
              ) : (
                <select
                  value={assignment.role}
                  onChange={(e) => handleAssignmentChange(index, 'role', e.target.value)}
                  className="input"
                >
                  <option value="organizer">Organizer</option>
                  <option value="setup">Setup</option>
                </select>
              )}
            </div>
            
            {assignment.commission_percentage && (
              <div className="w-20 text-sm text-gray-500">
                {assignment.commission_percentage}%
              </div>
            )}
            
            {!readOnly && (
              <button
                type="button"
                onClick={() => handleRemoveAssignment(index)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {localAssignments.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No employees assigned to this rental</p>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddAssignment}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-1" />
              Assign Employee
            </Button>
          )}
        </div>
      )}
    </div>
  );
}