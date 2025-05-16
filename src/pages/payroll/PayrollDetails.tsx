import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface PayrollRecord {
  employee_name: string;
  paid_days: number;
  gross_pay: number;
  deductions: number;
  taxes: number;
  benefits: number;
  reimbursements: number;
  net_pay: number;
}

interface PayrollSummary {
  payroll_cost: number;
  total_net_pay: number;
  pay_day: string;
  employee_count: number;
  taxes: number;
  income_tax: number;
  professional_tax: number;
  benefits: number;
  donations: number;
  total_deductions: number;
}

const PayrollDetails: React.FC = () => {
  const { year, month } = useParams<{ year: string; month: string }>();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<PayrollSummary>({
    payroll_cost: 0,
    total_net_pay: 0,
    pay_day: '',
    employee_count: 0,
    taxes: 0,
    income_tax: 0,
    professional_tax: 0,
    benefits: 0,
    donations: 0,
    total_deductions: 0,
  });
  const [payrollRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayrollData = async () => {
      try {
        setLoading(true);

        // Convert month to two-digit number for the query (e.g., "jun" -> "06")
        const monthNumber = month === 'jan' ? '01' :
                           month === 'feb' ? '02' :
                           month === 'mar' ? '03' :
                           month === 'apr' ? '04' :
                           month === 'may' ? '05' :
                           month === 'jun' ? '06' :
                           month === 'jul' ? '07' :
                           month === 'aug' ? '08' :
                           month === 'sep' ? '09' :
                           month === 'oct' ? '10' :
                           month === 'nov' ? '11' : '12';

        // Define the date range for the specified month
        const startOfMonth = `${year}-${monthNumber}-01`;
        const endOfMonth = monthNumber === '02' && parseInt(year || '0') % 4 === 0
          ? `${year}-${monthNumber}-29T23:59:59+00` // Leap year
          : monthNumber === '02'
          ? `${year}-${monthNumber}-28T23:59:59+00` // Non-leap year February
          : ['04', '06', '09', '11'].includes(monthNumber)
          ? `${year}-${monthNumber}-30T23:59:59+00` // 30-day months
          : `${year}-${monthNumber}-31T23:59:59+00`; // 31-day months

        console.log(`Date range for ${month} ${year}: ${startOfMonth} to ${endOfMonth}`);

        // Step 1: Fetch payment records before the start of the specified month
        const { data: paymentRecords, error: paymentError } = await supabase
          .from('payment_records')
          .select('id, payment_amount, employee_id, updated_at, employee_name')
          .lt('updated_at', startOfMonth)
          .order('updated_at', { ascending: false });

        if (paymentError) throw paymentError;

        console.log('Fetched payment_records:', paymentRecords);

        if (!paymentRecords || paymentRecords.length === 0) {
          console.log('No payment records found before', startOfMonth);
          setSummary({
            payroll_cost: 0,
            total_net_pay: 0,
            pay_day: `02 ${month?.toUpperCase().slice(0, 3)}, ${year}`,
            employee_count: 0,
            taxes: 0,
            income_tax: 0,
            professional_tax: 0,
            benefits: 0,
            donations: 0,
            total_deductions: 0,
          });
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

        console.log('Fetched employeeData:', employeeData);

        // Step 3: Filter out terminated employees and get the latest record per employee
        const activeEmployeesMap = new Map<string, string>();
        employeeData.forEach(employee => {
          if (employee.employment_status !== 'Terminated') {
            activeEmployeesMap.set(employee.employee_id, employee.employment_status);
          }
        });

        console.log('Active employees:', Array.from(activeEmployeesMap.keys()));

        const latestRecordsMap = new Map<string, any>();
        paymentRecords.forEach(record => {
          if (activeEmployeesMap.has(record.employee_id) && !latestRecordsMap.has(record.employee_id)) {
            latestRecordsMap.set(record.employee_id, record);
          }
        });

        const latestRecords = Array.from(latestRecordsMap.values());

        console.log('Latest records after filtering:', latestRecords);

        if (latestRecords.length === 0) {
          console.log('No active employee records after filtering');
          setSummary({
            payroll_cost: 0,
            total_net_pay: 0,
            pay_day: `02 ${month?.toUpperCase().slice(0, 3)}, ${year}`,
            employee_count: 0,
            taxes: 0,
            income_tax: 0,
            professional_tax: 0,
            benefits: 0,
            donations: 0,
            total_deductions: 0,
          });
          setLoading(false);
          return;
        }
        console.log('Latest records after summary:', summary);

        // Step 4: Calculate payroll_cost and employee_count
        const payrollCost = latestRecords.reduce((sum: number, record: any) => sum + (record.payment_amount || 0), 0);
        const employeeCount = latestRecords.length;

        console.log('Calculated payroll_cost:', payrollCost, 'employee_count:', employeeCount);

        // Step 5: Fetch payment_deductions for the latest records
        const paymentIds = latestRecords.map(record => record.id);
        const { data: deductionsData, error: deductionsError } = await supabase
          .from('payment_deductions')
          .select('payment_id, income_tax, professional_tax')
          .in('payment_id', paymentIds);

        if (deductionsError) throw deductionsError;

        console.log('Fetched payment_deductions:', deductionsData);

        // Step 6: Calculate taxes (sum of income_tax and professional_tax)
        const deductionsMap = new Map<string, any>();
        deductionsData.forEach(deduction => {
          deductionsMap.set(deduction.payment_id, deduction);
        });

        const incomeTaxSum = latestRecords.reduce((sum: number, record: any) => {
          const deduction = deductionsMap.get(record.id) || {};
          return sum + (deduction.income_tax || 0);
        }, 0);
        const professionalTaxSum = latestRecords.reduce((sum: number, record: any) => {
          const deduction = deductionsMap.get(record.id) || {};
          return sum + (deduction.professional_tax || 0);
        }, 0);
        const totalTaxes = incomeTaxSum + professionalTaxSum;

        console.log('Calculated taxes:', totalTaxes, 'income_tax:', incomeTaxSum, 'professional_tax:', professionalTaxSum);

        // Step 7: Fetch payment_earnings for the latest records (only need payslipEnabled)
        const { data: earningsData, error: earningsError } = await supabase
          .from('payment_earnings')
          .select('payment_id, payslipEnabled')
          .in('payment_id', paymentIds);

        if (earningsError) throw earningsError;

        console.log('Fetched payment_earnings:', earningsData);

        // Step 8: Calculate benefits (count of payslipEnabled = true multiplied by 1800)
        const earningsMap = new Map<string, any>();
        earningsData.forEach(earning => {
          earningsMap.set(earning.payment_id, earning);
        });

        const payslipEnabledCount = latestRecords.reduce((count: number, record: any) => {
          const earning = earningsMap.get(record.id) || {};
          return earning.payslipEnabled === true ? count + 1 : count;
        }, 0);
        const benefitsSum = payslipEnabledCount * 1800;

        console.log('Calculated benefits:', benefitsSum, 'payslipEnabledCount:', payslipEnabledCount);

        // Step 9: Fetch payment_custom_deductions for the specified month only
        const { data: customDeductionsData, error: customDeductionsError } = await supabase
          .from('payment_custom_deductions')
          .select('payment_id, amount, created_at')
          .in('payment_id', paymentIds)
          .gte('created_at', `${startOfMonth}T00:00:00+00`) // Ensure deductions are from the specified month
          .lte('created_at', endOfMonth);

        if (customDeductionsError) throw customDeductionsError;

        console.log('Fetched payment_custom_deductions:', customDeductionsData);

        // Step 10: Calculate total_deductions (sum of amount for the specified month)
        const totalDeductionsSum = customDeductionsData.reduce((sum: number, deduction: any) => {
          return sum + (deduction.amount || 0);
        }, 0);

        console.log('Calculated total_deductions:', totalDeductionsSum);

        // Step 11: Calculate total taxes and deductions (Taxes + Benefits + Donations + Total Deductions)
        const totalTaxesAndDeductions = totalTaxes + benefitsSum + 0 + totalDeductionsSum; // Donations is 0
        console.log('Total Taxes & Deductions:', totalTaxesAndDeductions);

        // Step 12: Calculate total_net_pay (Payroll Cost - Total Taxes & Deductions)
        const totalNetPay = payrollCost - totalTaxesAndDeductions;
        console.log('Calculated total_net_pay:', totalNetPay);

        // Step 13: Update summary
        setSummary({
          payroll_cost: payrollCost,
          total_net_pay: totalNetPay,
          pay_day: `02 ${month?.toUpperCase().slice(0, 3)}, ${year}`,
          employee_count: employeeCount,
          taxes: totalTaxes,
          income_tax: incomeTaxSum,
          professional_tax: professionalTaxSum,
          benefits: benefitsSum,
          donations: 0,
          total_deductions: totalDeductionsSum,
        });
      } catch (error) {
        console.error('Error fetching payroll data:', error);
        setSummary({
          payroll_cost: 0,
          total_net_pay: 0,
          pay_day: `02 ${month?.toUpperCase().slice(0, 3)}, ${year}`,
          employee_count: 0,
          taxes: 0,
          income_tax: 0,
          professional_tax: 0,
          benefits: 0,
          donations: 0,
          total_deductions: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPayrollData();
  }, [year, month]);

  console.log

  if (loading) return <p>Loading payroll details...</p>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Regular Payroll - {month?.toUpperCase()} {year}</h1>
        <Button variant="outline" onClick={() => navigate('/payroll')}>Back to Payroll</Button>
      </div>

      {/* Summary Section */}
      <div className="flex items-center gap-6 mb-6 bg-white rounded-lg shadow p-4">
        {/* Left Card: Payroll Cost + Total Net Pay */}
        <div className="flex flex-col bg-gray-100 p-4 rounded-lg min-w-[280px]">
          <div className="text-sm text-gray-600 mb-1">Period: {month?.toUpperCase()} {year}</div>
          <div className="flex justify-between gap-8">
            <div>
              <div className="text-2xl font-semibold">₹{summary.payroll_cost.toLocaleString('en-IN')}</div>
              <div className="uppercase text-xs font-semibold text-gray-400 tracking-widest mt-1">Payroll Cost</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">₹{summary.total_net_pay.toLocaleString('en-IN')}</div>
              <div className="uppercase text-xs font-semibold text-gray-400 tracking-widest mt-1">Total Net Pay</div>
            </div>
          </div>
        </div>

        {/* Middle Card: Pay Day with vertical separator */}
        <div className="flex flex-col items-center justify-center px-6 py-4 border-l border-r border-gray-300 min-w-[120px]">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Pay Day</div>
          <div className="text-4xl font-bold leading-none">{summary.pay_day.split(' ')[0]}</div>
          <div className="text-xs font-semibold text-gray-600 tracking-wide">
            {summary.pay_day.split(' ').slice(1).join(' ')}
          </div>
          <div className="mt-2 text-sm font-semibold">{summary.employee_count} Employees</div>
        </div>

        {/* Right Card: Taxes & Deductions */}
        <div className="flex flex-col p-4 min-w-[260px]">
          <div className="text-lg font-semibold mb-3">Taxes & Deductions</div>
          <div className="flex flex-col gap-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>Taxes</span>
              <span>
                ₹{summary.taxes.toLocaleString('en-IN')} 
                {summary.taxes > 0 && (
                  <span className="text-gray-500">
                    {' '}
                    (IT: ₹{summary.income_tax.toLocaleString('en-IN')}, PT: ₹{summary.professional_tax.toLocaleString('en-IN')})
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Benefits</span>
              <span>₹{summary.benefits.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span>Donations</span>
              <span>₹{summary.donations.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-gray-300 pt-2 mt-2">
              <span>Total Deductions</span>
              <span>₹{summary.total_deductions.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end mb-4">
        <Button className="bg-green-600 hover:bg-green-700 text-white">Submit and Approve</Button>
      </div>

      {/* Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Paid Days</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Taxes</TableHead>
                  <TableHead>Benefits</TableHead>
                  <TableHead>Reimbursements</TableHead>
                  <TableHead>Net Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((rec, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{rec.employee_name}</TableCell>
                    <TableCell>{rec.paid_days}</TableCell>
                    <TableCell>₹{rec.gross_pay.toLocaleString('en-IN')}</TableCell>
                    <TableCell>₹{rec.deductions.toLocaleString('en-IN')}</TableCell>
                    <TableCell>₹{rec.taxes.toLocaleString('en-IN')}</TableCell>
                    <TableCell>₹{rec.benefits.toLocaleString('en-IN')}</TableCell>
                    <TableCell>₹{(rec as any).reimbursements?.toLocaleString('en-IN') || '₹0'}</TableCell>
                    <TableCell>₹{rec.net_pay.toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p>No payroll records found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollDetails;