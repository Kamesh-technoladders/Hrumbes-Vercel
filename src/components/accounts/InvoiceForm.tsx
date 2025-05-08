
import React, { useState, useEffect } from 'react';
import { useAccountsStore, Invoice, InvoiceItem } from '@/lib/accounts-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatINR } from '@/utils/currency';
import { 
  Calendar, 
  IndianRupee, 
  Plus, 
  Trash2 
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface InvoiceFormProps {
  invoice?: Invoice;
  onClose: () => void;
}

const generateInvoiceNumber = () => {
  const prefix = 'INV';
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const timestamp = Date.now().toString().slice(-4);
  return `${prefix}-${randomNum}${timestamp}`;
};

const formatDateString = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
};

const InvoiceForm: React.FC<InvoiceFormProps> = ({ invoice, onClose }) => {
  const { addInvoice, updateInvoice } = useAccountsStore();
  
  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoiceNumber || generateInvoiceNumber());
  const [clientName, setClientName] = useState(invoice?.clientName || '');
  const [invoiceDate, setInvoiceDate] = useState(invoice?.invoiceDate || formatDateString(new Date()));
  const [dueDate, setDueDate] = useState(invoice?.dueDate || '');
  const [items, setItems] = useState<InvoiceItem[]>(invoice?.items || [{ id: '1', description: '', quantity: 1, rate: 0, amount: 0 }]);
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [terms, setTerms] = useState(invoice?.terms || '');
  const [taxRate, setTaxRate] = useState(invoice?.taxRate || 18);
  
  // Calculated values
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  
  // Update calculations when items or tax rate changes
  useEffect(() => {
    const calculatedSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const calculatedTaxAmount = calculatedSubtotal * (taxRate / 100);
    const calculatedTotal = calculatedSubtotal + calculatedTaxAmount;
    
    setSubtotal(calculatedSubtotal);
    setTaxAmount(calculatedTaxAmount);
    setTotalAmount(calculatedTotal);
  }, [items, taxRate]);
  
  // Handle item amount calculation
  const updateItemAmount = (index: number, quantity: number, rate: number) => {
    const newItems = [...items];
    newItems[index].quantity = quantity;
    newItems[index].rate = rate;
    newItems[index].amount = quantity * rate;
    setItems(newItems);
  };
  
  // Add a new item
  const handleAddItem = () => {
    const newId = `item-${Date.now()}`;
    setItems([...items, { id: newId, description: '', quantity: 1, rate: 0, amount: 0 }]);
  };
  
  // Remove an item
  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };
  
  // Handle form submission
  const handleSubmit = (status: 'Draft' | 'Unpaid') => {
    const invoiceData: Omit<Invoice, 'id'> = {
      invoiceNumber,
      clientName,
      invoiceDate,
      dueDate,
      items,
      status,
      totalAmount,
      notes,
      terms,
      taxRate,
      taxAmount,
      subtotal,
    };
    
    if (invoice) {
      updateInvoice(invoice.id, invoiceData);
    } else {
      addInvoice(invoiceData);
    }
    
    onClose();
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="clientName">Customer Name</Label>
            <Input 
              id="clientName" 
              placeholder="Enter customer name" 
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input 
              id="invoiceNumber" 
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="invoiceDate">Invoice Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                id="invoiceDate" 
                type="text" 
                placeholder="DD-MM-YYYY" 
                className="pl-10"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                id="dueDate" 
                type="text" 
                placeholder="DD-MM-YYYY" 
                className="pl-10"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Invoice Items</h3>
          <Button type="button" size="sm" onClick={handleAddItem}>
            <Plus className="h-4 w-4 mr-2" /> Add Item
          </Button>
        </div>
        
        <div className="border rounded-md">
          <div className="grid grid-cols-12 gap-4 p-4 bg-muted/30 border-b">
            <div className="col-span-4 font-medium">Description</div>
            <div className="col-span-2 font-medium">Quantity</div>
            <div className="col-span-2 font-medium">Rate (₹)</div>
            <div className="col-span-2 font-medium">Amount (₹)</div>
            <div className="col-span-2 font-medium text-right">Action</div>
          </div>
          
          <div className="divide-y">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 p-4">
                <div className="col-span-4">
                  <Input 
                    placeholder="Item description" 
                    value={item.description}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index].description = e.target.value;
                      setItems(newItems);
                    }}
                  />
                </div>
                <div className="col-span-2">
                  <Input 
                    type="number" 
                    min="1" 
                    value={item.quantity}
                    onChange={(e) => {
                      const quantity = Number(e.target.value);
                      updateItemAmount(index, quantity, item.rate);
                    }}
                  />
                </div>
                <div className="col-span-2">
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="number" 
                      className="pl-10"
                      value={item.rate}
                      onChange={(e) => {
                        const rate = Number(e.target.value);
                        updateItemAmount(index, item.quantity, rate);
                      }}
                    />
                  </div>
                </div>
                <div className="col-span-2 flex items-center">
                  <div className="financial-amount">
                    ₹{item.amount.toLocaleString()}
                  </div>
                </div>
                <div className="col-span-2 text-right">
                  {items.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-8">
        <div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes to the customer"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                placeholder="Add terms and conditions"
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-between p-4 bg-muted/30 rounded-md">
            <span>Subtotal:</span>
            <span className="financial-amount">{formatINR(subtotal)}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Label htmlFor="taxRate">Tax Rate:</Label>
            <div className="w-32">
              <Select value={taxRate.toString()} onValueChange={(value) => setTaxRate(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tax rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="12">12%</SelectItem>
                  <SelectItem value="18">18%</SelectItem>
                  <SelectItem value="28">28%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 flex justify-between">
              <span>Tax:</span>
              <span className="financial-amount">{formatINR(taxAmount)}</span>
            </div>
          </div>
          
          <div className="flex justify-between p-4 bg-blue-50 rounded-md font-semibold">
            <span>Total Amount:</span>
            <span className="financial-amount text-lg">{formatINR(totalAmount)}</span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-8">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button 
          variant="secondary" 
          onClick={() => handleSubmit('Draft')}
        >
          Save as Draft
        </Button>
        <Button onClick={() => handleSubmit('Unpaid')}>
          {invoice ? 'Update Invoice' : 'Create Invoice'}
        </Button>
      </div>
    </div>
  );
};

export default InvoiceForm;
