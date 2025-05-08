
import React, { useState } from 'react';
import { useAccountsStore, Expense, ExpenseCategory, PaymentMethod } from '@/lib/accounts-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, IndianRupee, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ExpenseFormProps {
  expense?: Expense;
  onClose: () => void;
}

const formatDateString = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
};

const ExpenseForm: React.FC<ExpenseFormProps> = ({ expense, onClose }) => {
  const { addExpense, updateExpense } = useAccountsStore();
  
  // Form state
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category || 'Office Supplies');
  const [description, setDescription] = useState(expense?.description || '');
  const [date, setDate] = useState(expense?.date || formatDateString(new Date()));
  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(expense?.paymentMethod || 'Cash');
  const [vendor, setVendor] = useState(expense?.vendor || '');
  const [notes, setNotes] = useState(expense?.notes || '');
  const [receiptUrl, setReceiptUrl] = useState(expense?.receiptUrl || '');
  
  // Handle file upload (mock)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, this would upload the file to storage
      // For now, just set a placeholder
      setReceiptUrl(`/uploads/${file.name}`);
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const expenseData: Omit<Expense, 'id'> = {
      category,
      description,
      date,
      amount: parseFloat(amount),
      paymentMethod,
      vendor,
      notes,
      receiptUrl: receiptUrl || undefined,
    };
    
    if (expense) {
      updateExpense(expense.id, expenseData);
    } else {
      addExpense(expenseData);
    }
    
    onClose();
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select 
              value={category} 
              onValueChange={(value) => setCategory(value as ExpenseCategory)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Rent">Rent</SelectItem>
                <SelectItem value="Utilities">Utilities</SelectItem>
                <SelectItem value="Salary">Salary</SelectItem>
                <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                <SelectItem value="Travel">Travel</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Software">Software</SelectItem>
                <SelectItem value="Hardware">Hardware</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Input 
              id="description"
              placeholder="Expense description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="vendor">Vendor/Supplier</Label>
            <Input 
              id="vendor"
              placeholder="Vendor name"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                id="date"
                type="text"
                placeholder="DD-MM-YYYY"
                className="pl-10"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                id="amount"
                type="text"
                placeholder="0.00"
                className="pl-10"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select 
              value={paymentMethod} 
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Credit Card">Credit Card</SelectItem>
                <SelectItem value="Debit Card">Debit Card</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Check">Check</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Any additional notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      
      <div>
        <Label htmlFor="receipt">Upload Receipt</Label>
        <div className="mt-1 flex items-center">
          <label 
            htmlFor="receipt" 
            className="flex items-center gap-2 px-4 py-2 border border-input rounded-md cursor-pointer hover:bg-muted"
          >
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Choose file</span>
          </label>
          <Input 
            id="receipt"
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
          <span className="ml-3 text-sm text-muted-foreground">
            {receiptUrl ? 'Receipt uploaded' : 'No file selected'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Supported formats: JPEG, PNG, PDF. Max size: 5MB
        </p>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          {expense ? 'Update Expense' : 'Save Expense'}
        </Button>
      </div>
    </form>
  );
};

export default ExpenseForm;
