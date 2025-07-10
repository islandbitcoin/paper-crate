import { useState, useEffect } from 'react';
import { Copy, Check, Wallet, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useNWC } from '@/hooks/useNWCContext';
import { useToast } from '@/hooks/useToast';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface Invoice {
  id: string;
  amount: number;
  description: string;
  invoice: string;
  status: 'pending' | 'paid' | 'expired';
  createdAt: number;
  paidAt?: number;
}

export function CreatorInvoiceManager() {
  const { user } = useCurrentUser();
  const { isConnected: walletConnected, walletInfo } = useNWC();
  const { toast } = useToast();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedInvoice, setCopiedInvoice] = useState<string | null>(null);

  // Load invoices from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`creator-invoices-${user?.pubkey}`);
    if (stored) {
      setInvoices(JSON.parse(stored));
    }
  }, [user?.pubkey]);

  // Save invoices to localStorage
  const saveInvoices = (newInvoices: Invoice[]) => {
    setInvoices(newInvoices);
    if (user?.pubkey) {
      localStorage.setItem(`creator-invoices-${user?.pubkey}`, JSON.stringify(newInvoices));
    }
  };

  const generateInvoice = async () => {
    if (!amount || !description) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both amount and description',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Generate a mock invoice for demonstration purposes
      const mockInvoice = `lnbc${amount}000n1p${Date.now()}example...`;

      const newInvoice: Invoice = {
        id: Date.now().toString(),
        amount: Number(amount),
        description,
        invoice: mockInvoice,
        status: 'pending',
        createdAt: Date.now(),
      };

      const updatedInvoices = [newInvoice, ...invoices];
      saveInvoices(updatedInvoices);

      setAmount('');
      setDescription('');

      toast({
        title: 'Invoice Generated',
        description: `Created invoice for ${amount} sats`,
      });

      // TODO: Implement actual invoice generation

    } catch {
      toast({
        title: 'Failed to Generate Invoice',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyInvoice = async (invoice: string) => {
    try {
      await navigator.clipboard.writeText(invoice);
      setCopiedInvoice(invoice);
      setTimeout(() => setCopiedInvoice(null), 2000);
      toast({
        title: 'Copied!',
        description: 'Invoice copied to clipboard',
      });
    } catch {
      toast({
        title: 'Failed to Copy',
        description: 'Please copy manually',
        variant: 'destructive',
      });
    }
  };

  const markAsPaid = (invoiceId: string) => {
    const updatedInvoices = invoices.map(inv =>
      inv.id === invoiceId
        ? { ...inv, status: 'paid' as const, paidAt: Date.now() }
        : inv
    );
    saveInvoices(updatedInvoices);

    toast({
      title: 'Payment Received',
      description: 'Invoice marked as paid',
    });
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="py-12 px-8 text-center">
          <p className="text-muted-foreground">
            Please log in as a creator to manage invoices.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Creator Invoice Manager</span>
          </CardTitle>
          <CardDescription>
            Generate Lightning invoices to receive payments from businesses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {walletConnected ? (
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-green-600">
                Wallet Connected
              </Badge>
              <span className="text-sm text-muted-foreground">
                Balance: {walletInfo?.balance || 0} sats
              </span>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Connect your Lightning wallet in Profile → Settings to receive payments.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Generate Invoice */}
      <Card>
        <CardHeader>
          <CardTitle>Generate New Invoice</CardTitle>
          <CardDescription>
            Create a Lightning invoice for business payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount (sats)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Content creation services..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            onClick={generateInvoice}
            disabled={isGenerating || !walletConnected || !amount || !description}
            className="w-full"
          >
            {isGenerating ? 'Generating...' : 'Generate Invoice'}
          </Button>
        </CardContent>
      </Card>

      {/* Invoice List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Invoices</CardTitle>
          <CardDescription>
            Manage and track your Lightning invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No invoices yet. Generate your first invoice above.
            </p>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{invoice.amount} sats</h4>
                      <p className="text-sm text-muted-foreground">
                        {invoice.description}
                      </p>
                    </div>
                    <Badge
                      variant={
                        invoice.status === 'paid' ? 'default' :
                        invoice.status === 'pending' ? 'secondary' : 'destructive'
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 p-2 bg-muted rounded text-xs font-mono">
                        {invoice.invoice.slice(0, 50)}...
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyInvoice(invoice.invoice)}
                      >
                        {copiedInvoice === invoice.invoice ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Created: {new Date(invoice.createdAt).toLocaleString()}
                      </span>
                      {invoice.paidAt && (
                        <span>
                          Paid: {new Date(invoice.paidAt).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {invoice.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsPaid(invoice.id)}
                        className="w-full"
                      >
                        Mark as Paid (Demo)
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}