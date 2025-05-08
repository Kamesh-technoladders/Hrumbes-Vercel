
import { create } from 'zustand';
import { toast } from 'sonner';
import { formatINR } from '@/utils/currency';
import { generateCSV, formatDateForFilename } from '@/utils/export-utils';

export type InvoiceStatus = 'Paid' | 'Unpaid' | 'Overdue' | 'Draft';
export type ExpenseCategory = 'Rent' | 'Utilities' | 'Salary' | 'Office Supplies' | 'Travel' | 'Marketing' | 'Software' | 'Hardware' | 'Other';
export type PaymentMethod = 'Cash' | 'Credit Card' | 'Debit Card' | 'Bank Transfer' | 'UPI' | 'Check' | 'Other';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  status: InvoiceStatus;
  totalAmount: number;
  notes?: string;
  terms?: string;
  taxRate?: number;
  taxAmount?: number;
  subtotal?: number;
  adjustments?: number;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  taxable?: boolean;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  receiptUrl?: string;
  notes?: string;
  vendor?: string;
}

export interface AccountsStats {
  totalInvoiced: number;
  totalPaid: number;
  totalOverdue: number;
  totalDraft: number;
  totalExpenses: number;
  netProfit: number;
  invoiceCount: {
    all: number;
    paid: number;
    unpaid: number;
    overdue: number;
    draft: number;
  };
}

interface AccountsState {
  invoices: Invoice[];
  expenses: Expense[];
  stats: AccountsStats;
  selectedInvoice: Invoice | null;
  selectedExpense: Expense | null;
  
  // Invoice actions
  addInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  updateInvoice: (id: string, data: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  selectInvoice: (id: string | null) => void;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  exportInvoice: (id: string, format: 'pdf' | 'csv') => void;
  
  // Expense actions
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  selectExpense: (id: string | null) => void;
  uploadReceipt: (id: string, receiptUrl: string) => void;
  
  // Report actions
  generateReport: (type: 'invoices' | 'expenses', dateRange: {start: string, end: string}) => void;
  exportData: (type: 'invoices' | 'expenses', format: 'csv') => void;
}

// Mock data for initial state
const mockInvoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'TLSN-0001',
    clientName: 'Techno Solutions Ltd',
    invoiceDate: '05-10-2023',
    dueDate: '04-11-2023',
    items: [
      { id: '1-1', description: 'Web Development Services', quantity: 1, rate: 45000, amount: 45000 },
    ],
    status: 'Overdue',
    totalAmount: 45000,
  },
  {
    id: '2',
    invoiceNumber: 'INV-0002',
    clientName: 'Global Marketing Inc',
    invoiceDate: '05-07-2024',
    dueDate: '02-09-2024',
    items: [
      { id: '2-1', description: 'SEO Consultation', quantity: 1, rate: 15000, amount: 15000 },
      { id: '2-2', description: 'Content Writing', quantity: 1, rate: 8000, amount: 8000 },
    ],
    status: 'Overdue',
    totalAmount: 23000,
  },
  {
    id: '3',
    invoiceNumber: 'INV-0003',
    clientName: 'Innovate Design Co',
    invoiceDate: '21-07-2024',
    dueDate: '04-09-2024',
    items: [
      { id: '3-1', description: 'Logo Design', quantity: 1, rate: 5000, amount: 5000 },
    ],
    status: 'Overdue',
    totalAmount: 5000,
  },
  {
    id: '4',
    invoiceNumber: 'INV-0004',
    clientName: 'XYZ Corporation',
    invoiceDate: '29-07-2024',
    dueDate: '12-09-2024',
    items: [
      { id: '4-1', description: 'IT Infrastructure Setup', quantity: 1, rate: 40000, amount: 40000 },
    ],
    status: 'Overdue',
    totalAmount: 40000,
  },
];

const mockExpenses: Expense[] = [
  {
    id: '1',
    category: 'Rent',
    description: 'Office Rent for July',
    date: '01-07-2024',
    amount: 35000,
    paymentMethod: 'Bank Transfer',
    vendor: 'Commercial Properties Ltd',
  },
  {
    id: '2',
    category: 'Utilities',
    description: 'Electricity and Internet',
    date: '05-07-2024',
    amount: 8500,
    paymentMethod: 'Credit Card',
    vendor: 'City Power & Broadband',
  },
  {
    id: '3',
    category: 'Office Supplies',
    description: 'Stationery and Printer Cartridges',
    date: '10-07-2024',
    amount: 3200,
    paymentMethod: 'Cash',
    vendor: 'Office Depot',
  },
  {
    id: '4',
    category: 'Software',
    description: 'Adobe Creative Suite Subscription',
    date: '15-07-2024',
    amount: 4500,
    paymentMethod: 'Credit Card',
    vendor: 'Adobe Inc',
  },
];

const calculateStats = (invoices: Invoice[], expenses: Expense[]): AccountsStats => {
  const totalInvoiced = invoices.reduce((total, inv) => total + inv.totalAmount, 0);
  const totalPaid = invoices.filter(inv => inv.status === 'Paid').reduce((total, inv) => total + inv.totalAmount, 0);
  const totalOverdue = invoices.filter(inv => inv.status === 'Overdue').reduce((total, inv) => total + inv.totalAmount, 0);
  const totalDraft = invoices.filter(inv => inv.status === 'Draft').reduce((total, inv) => total + inv.totalAmount, 0);
  const totalExpenses = expenses.reduce((total, exp) => total + exp.amount, 0);
  
  return {
    totalInvoiced,
    totalPaid,
    totalOverdue,
    totalDraft,
    totalExpenses,
    netProfit: totalPaid - totalExpenses,
    invoiceCount: {
      all: invoices.length,
      paid: invoices.filter(inv => inv.status === 'Paid').length,
      unpaid: invoices.filter(inv => inv.status === 'Unpaid').length,
      overdue: invoices.filter(inv => inv.status === 'Overdue').length,
      draft: invoices.filter(inv => inv.status === 'Draft').length,
    }
  };
};

export const useAccountsStore = create<AccountsState>((set, get) => ({
  invoices: mockInvoices,
  expenses: mockExpenses,
  stats: calculateStats(mockInvoices, mockExpenses),
  selectedInvoice: null,
  selectedExpense: null,
  
  // Invoice actions
  addInvoice: (invoice) => {
    try {
      const newInvoice = {
        ...invoice,
        id: Math.random().toString(36).substring(2, 9),
      };
      
      set((state) => {
        const updatedInvoices = [newInvoice, ...state.invoices];
        return {
          invoices: updatedInvoices,
          stats: calculateStats(updatedInvoices, state.expenses),
        };
      });
      
      toast.success(`Invoice ${invoice.invoiceNumber} added successfully`);
    } catch (error) {
      console.error('Error adding invoice:', error);
      toast.error('Failed to add invoice. Please try again.');
    }
  },
  
  updateInvoice: (id, data) => {
    try {
      set((state) => {
        const updatedInvoices = state.invoices.map((invoice) => 
          invoice.id === id ? { ...invoice, ...data } : invoice
        );
        
        return {
          invoices: updatedInvoices,
          selectedInvoice: state.selectedInvoice?.id === id 
            ? { ...state.selectedInvoice, ...data } 
            : state.selectedInvoice,
          stats: calculateStats(updatedInvoices, state.expenses),
        };
      });
      
      toast.success('Invoice updated successfully');
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice. Please try again.');
    }
  },
  
  deleteInvoice: (id) => {
    try {
      set((state) => {
        const updatedInvoices = state.invoices.filter((invoice) => invoice.id !== id);
        return {
          invoices: updatedInvoices,
          selectedInvoice: state.selectedInvoice?.id === id ? null : state.selectedInvoice,
          stats: calculateStats(updatedInvoices, state.expenses),
        };
      });
      
      toast.success('Invoice deleted successfully');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice. Please try again.');
    }
  },
  
  selectInvoice: (id) => {
    set((state) => ({
      selectedInvoice: id ? state.invoices.find((inv) => inv.id === id) || null : null,
    }));
  },
  
  updateInvoiceStatus: (id, status) => {
    try {
      set((state) => {
        const updatedInvoices = state.invoices.map((invoice) => 
          invoice.id === id ? { ...invoice, status } : invoice
        );
        
        return {
          invoices: updatedInvoices,
          selectedInvoice: state.selectedInvoice?.id === id 
            ? { ...state.selectedInvoice, status } 
            : state.selectedInvoice,
          stats: calculateStats(updatedInvoices, state.expenses),
        };
      });
      
      toast.success(`Invoice status updated to ${status}`);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status. Please try again.');
    }
  },
  
  exportInvoice: (id, format) => {
    try {
      const invoice = get().invoices.find(inv => inv.id === id);
      
      if (!invoice) {
        toast.error('Invoice not found');
        return;
      }
      
      if (format === 'csv') {
        const invoiceData = [
          ['Invoice Number', 'Client Name', 'Invoice Date', 'Due Date', 'Status', 'Total Amount'],
          [
            invoice.invoiceNumber,
            invoice.clientName,
            invoice.invoiceDate,
            invoice.dueDate,
            invoice.status,
            formatINR(invoice.totalAmount)
          ]
        ];
        
        generateCSV(invoiceData, `invoice_${invoice.invoiceNumber}_${formatDateForFilename()}`);
        toast.success('Invoice exported as CSV');
      } else {
        // For PDF export - this would typically use a library like jspdf
        // As a placeholder, we'll just show a message
        toast.info('PDF export functionality will be implemented soon');
        console.log('PDF export requested for invoice:', invoice);
      }
    } catch (error) {
      console.error('Error exporting invoice:', error);
      toast.error('Failed to export invoice. Please try again.');
    }
  },
  
  // Expense actions
  addExpense: (expense) => {
    try {
      const newExpense = {
        ...expense,
        id: Math.random().toString(36).substring(2, 9),
      };
      
      set((state) => {
        const updatedExpenses = [newExpense, ...state.expenses];
        return {
          expenses: updatedExpenses,
          stats: calculateStats(state.invoices, updatedExpenses),
        };
      });
      
      toast.success(`Expense for ${expense.description} added successfully`);
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense. Please try again.');
    }
  },
  
  updateExpense: (id, data) => {
    try {
      set((state) => {
        const updatedExpenses = state.expenses.map((expense) => 
          expense.id === id ? { ...expense, ...data } : expense
        );
        
        return {
          expenses: updatedExpenses,
          selectedExpense: state.selectedExpense?.id === id 
            ? { ...state.selectedExpense, ...data } 
            : state.selectedExpense,
          stats: calculateStats(state.invoices, updatedExpenses),
        };
      });
      
      toast.success('Expense updated successfully');
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Failed to update expense. Please try again.');
    }
  },
  
  deleteExpense: (id) => {
    try {
      set((state) => {
        const updatedExpenses = state.expenses.filter((expense) => expense.id !== id);
        return {
          expenses: updatedExpenses,
          selectedExpense: state.selectedExpense?.id === id ? null : state.selectedExpense,
          stats: calculateStats(state.invoices, updatedExpenses),
        };
      });
      
      toast.success('Expense deleted successfully');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense. Please try again.');
    }
  },
  
  selectExpense: (id) => {
    set((state) => ({
      selectedExpense: id ? state.expenses.find((exp) => exp.id === id) || null : null,
    }));
  },
  
  uploadReceipt: (id, receiptUrl) => {
    try {
      set((state) => {
        const updatedExpenses = state.expenses.map((expense) => 
          expense.id === id ? { ...expense, receiptUrl } : expense
        );
        
        return {
          expenses: updatedExpenses,
          selectedExpense: state.selectedExpense?.id === id 
            ? { ...state.selectedExpense, receiptUrl } 
            : state.selectedExpense,
        };
      });
      
      toast.success('Receipt uploaded successfully');
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast.error('Failed to upload receipt. Please try again.');
    }
  },
  
  // Report actions
  generateReport: (type, dateRange) => {
    try {
      // In a real app, this would filter data by date range and prepare a report
      // For now, we'll just show a message
      toast.info(`Report for ${type} from ${dateRange.start} to ${dateRange.end} would be generated here`);
      console.log(`Report requested for ${type} from ${dateRange.start} to ${dateRange.end}`);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report. Please try again.');
    }
  },
  
  exportData: (type, format) => {
    try {
      if (format === 'csv') {
        if (type === 'invoices') {
          const invoicesData = [
            ['Invoice Number', 'Client Name', 'Invoice Date', 'Due Date', 'Status', 'Total Amount'],
            ...get().invoices.map(inv => [
              inv.invoiceNumber,
              inv.clientName,
              inv.invoiceDate,
              inv.dueDate,
              inv.status,
              formatINR(inv.totalAmount)
            ])
          ];
          
          generateCSV(invoicesData, `invoices_export_${formatDateForFilename()}`);
        } else {
          const expensesData = [
            ['Category', 'Description', 'Date', 'Amount', 'Payment Method', 'Vendor'],
            ...get().expenses.map(exp => [
              exp.category,
              exp.description,
              exp.date,
              formatINR(exp.amount),
              exp.paymentMethod,
              exp.vendor || ''
            ])
          ];
          
          generateCSV(expensesData, `expenses_export_${formatDateForFilename()}`);
        }
        
        toast.success(`${type} exported as CSV`);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data. Please try again.');
    }
  },
}));
