
import React from 'react';
import { Expense } from '@/lib/accounts-data';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/utils/currency';
import { Calendar, CreditCard, IndianRupee, Receipt, User } from 'lucide-react';

interface ExpenseDetailsProps {
  expense: Expense;
  onClose: () => void;
}

const ExpenseDetails: React.FC<ExpenseDetailsProps> = ({ expense, onClose }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">{expense.description}</h2>
          
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Date</p>
                <p className="text-muted-foreground">{expense.date}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <IndianRupee className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Amount</p>
                <p className="text-lg font-bold financial-amount">{formatINR(expense.amount)}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Payment Method</p>
                <p className="text-muted-foreground">{expense.paymentMethod}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Vendor/Supplier</p>
              <p className="text-muted-foreground">{expense.vendor || 'Not specified'}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="h-5 w-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mt-0.5">
              <span className="text-xs font-semibold">C</span>
            </span>
            <div>
              <p className="font-medium">Category</p>
              <p className="text-muted-foreground">{expense.category}</p>
            </div>
          </div>
          
          {expense.notes && (
            <div className="mt-6">
              <h3 className="font-medium mb-1">Notes:</h3>
              <p className="text-muted-foreground">{expense.notes}</p>
            </div>
          )}
        </div>
      </div>
      
      {expense.receiptUrl && (
        <div className="border-t pt-4">
          <h3 className="font-medium flex items-center gap-2 mb-3">
            <Receipt className="h-4 w-4" />
            Attached Receipt
          </h3>
          <div className="border rounded p-4 text-center">
            <Button variant="outline" asChild>
              <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer">
                View Receipt
              </a>
            </Button>
          </div>
        </div>
      )}
      
      <div className="flex justify-end border-t pt-4">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
};

export default ExpenseDetails;
