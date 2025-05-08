
import React, { useState } from 'react';
import { Invoice, InvoiceStatus, useAccountsStore } from '@/lib/accounts-data';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/utils/currency';
import { 
  Download, CheckCircle, FileText, AlertTriangle,
  Clock, IndianRupee, Loader2
} from 'lucide-react';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { generateInvoicePDF } from '@/utils/pdf-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface InvoiceDetailsProps {
  invoice: Invoice;
  onStatusChange: (id: string, status: InvoiceStatus) => void;
  onClose: () => void;
}

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({ 
  invoice, 
  onStatusChange,
  onClose
}) => {
  const { exportInvoice } = useAccountsStore();
  const [isExporting, setIsExporting] = useState(false);
  
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'unpaid':
        return <Clock className="h-5 w-5 text-warning" />;
      case 'overdue':
        return <AlertTriangle className="h-5 w-5 text-danger" />;
      case 'draft':
        return <FileText className="h-5 w-5 text-gray-500" />;
      default:
        return null;
    }
  };
  
  const handleExport = (format: 'pdf' | 'csv') => {
    if (format === 'csv') {
      exportInvoice(invoice.id, format);
      return;
    }
    
    // Handle PDF export
    setIsExporting(true);
    
    generateInvoicePDF(invoice)
      .then(() => {
        toast.success('Invoice PDF generated successfully');
      })
      .catch(error => {
        console.error('Error generating PDF:', error);
        toast.error('Failed to generate PDF. Please try again.');
      })
      .finally(() => {
        setIsExporting(false);
      });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Invoice #{invoice.invoiceNumber}</h2>
          <p className="text-muted-foreground">Issued on: {invoice.invoiceDate}</p>
          <p className="text-muted-foreground">Due on: {invoice.dueDate}</p>
        </div>
        
        <div className="flex flex-col gap-2 items-end">
          <div className="flex items-center gap-2 mb-2">
            {getStatusIcon(invoice.status)}
            <span 
              className={`text-lg font-semibold ${
                invoice.status === 'Paid' ? 'text-success-dark' :
                invoice.status === 'Unpaid' ? 'text-warning-dark' :
                invoice.status === 'Overdue' ? 'text-danger-dark' :
                'text-gray-500'
              }`}
            >
              {invoice.status}
            </span>
          </div>
          
          <Select 
            value={invoice.status} 
            onValueChange={(value) => onStatusChange(invoice.id, value as InvoiceStatus)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Paid">Mark as Paid</SelectItem>
              <SelectItem value="Unpaid">Mark as Unpaid</SelectItem>
              <SelectItem value="Overdue">Mark as Overdue</SelectItem>
              <SelectItem value="Draft">Mark as Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <div>
          <h3 className="text-lg font-semibold mb-2">Bill To:</h3>
          <p className="font-medium">{invoice.clientName}</p>
          {/* Address would go here */}
        </div>
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60%]">Description</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell className="financial-amount">
                  <div className="flex items-center">
                    <IndianRupee className="h-3 w-3 mr-1" />
                    {item.rate.toLocaleString()}
                  </div>
                </TableCell>
                <TableCell className="text-right financial-amount">
                  <div className="flex items-center justify-end">
                    <IndianRupee className="h-3 w-3 mr-1" />
                    {item.amount.toLocaleString()}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          {(invoice.notes || invoice.terms) && (
            <div className="space-y-4">
              {invoice.notes && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">Notes:</h3>
                  <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                </div>
              )}
              
              {invoice.terms && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">Terms & Conditions:</h3>
                  <p className="text-sm text-muted-foreground">{invoice.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">Subtotal:</span>
            <span className="financial-amount">{formatINR(invoice.subtotal || 0)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Tax ({invoice.taxRate || 0}%):</span>
            <span className="financial-amount">{formatINR(invoice.taxAmount || 0)}</span>
          </div>
          
          <div className="flex justify-between border-t pt-2 mt-2">
            <span className="font-semibold">Total:</span>
            <span className="financial-amount font-bold">{formatINR(invoice.totalAmount)}</span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button 
          variant="outline" 
          onClick={() => handleExport('csv')}
          disabled={isExporting}
        >
          <FileText className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        <Button 
          onClick={() => handleExport('pdf')}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Download PDF
        </Button>
      </div>
    </div>
  );
};

export default InvoiceDetails;
