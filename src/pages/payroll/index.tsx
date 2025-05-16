import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface PayrollSummary {
  totalSalary: number;
  employeeCount: number;
}

const Payroll: React.FC = () => {
  const navigate = useNavigate();
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const today = new Date(); // Today’s date: May 15, 2025
  const upcomingMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1); // June 1, 2025
  const upcomingMonth = format(upcomingMonthDate, 'MMM'); // "Jun"
  const upcomingYear = upcomingMonthDate.getFullYear(); // 2025
  const upcomingMonthNumber = format(upcomingMonthDate, 'MM'); // "06" for June, dynamically generated

  // Fetch payroll summary for the upcoming month
  useEffect(() => {
    const fetchPayrollSummary = async () => {
      try {
        setLoading(true);

        // Step 1: Fetch payment records
        const { data: paymentRecords, error: paymentError } = await supabase
          .from('payment_records')
          .select('payment_amount, employee_id, updated_at')
          .lt('updated_at', `${upcomingYear}-${upcomingMonthNumber}-01`)
          .order('updated_at', { ascending: false });

        if (paymentError) throw paymentError;

        if (!paymentRecords || paymentRecords.length === 0) {
          setPayrollSummary({ totalSalary: 0, employeeCount: 0 });
          setLoading(false);
          return;
        }

        // Step 2: Fetch employment status from hr_employees for the employee_ids
        const employeeIds = [...new Set(paymentRecords.map(record => record.employee_id))];
        const { data: employeeData, error: employeeError } = await supabase
          .from('hr_employees')
          .select('employee_id, employment_status')
          .in('employee_id', employeeIds);

        if (employeeError) throw employeeError;

        // Step 3: Filter out terminated employees and get the latest record per employee
        const activeEmployeesMap = new Map<string, string>();
        employeeData.forEach(employee => {
          if (employee.employment_status !== 'Terminated') {
            activeEmployeesMap.set(employee.employee_id, employee.employment_status);
          }
        });

        const latestRecordsMap = new Map<string, any>();
        paymentRecords.forEach(record => {
          // Only include records for employees who are not terminated
          if (activeEmployeesMap.has(record.employee_id) && !latestRecordsMap.has(record.employee_id)) {
            latestRecordsMap.set(record.employee_id, record);
          }
        });

        const latestRecords = Array.from(latestRecordsMap.values());

        // Step 4: Calculate total salary and employee count
        const totalSalary = latestRecords.reduce((sum: number, record: any) => sum + record.payment_amount, 0);
        const employeeCount = latestRecords.length;

        setPayrollSummary({ totalSalary, employeeCount });
      } catch (error) {
        console.error('Error fetching payroll summary:', error);
        setPayrollSummary({ totalSalary: 0, employeeCount: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchPayrollSummary();
  }, [upcomingMonth, upcomingYear]);

  const handleViewDetails = () => {
    navigate(`/payroll/${upcomingYear}/${upcomingMonth.toLowerCase()}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Payroll</h1>
      {loading ? (
        <p>Loading payroll data...</p>
      ) : payrollSummary ? (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>
              Pay Run {upcomingMonth} {upcomingYear} (Projected)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Salary:</span>
                <span className="font-semibold">
                  ₹{payrollSummary.totalSalary.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">No. of Employees:</span>
                <span className="font-semibold">{payrollSummary.employeeCount}</span>
              </div>
              <Button onClick={handleViewDetails} className="w-full">
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p>No payroll data available for the upcoming month.</p>
      )}
    </div>
  );
};

export default Payroll;