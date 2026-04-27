import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CurrencyDollar, CheckCircle, XCircle, Clock, Link as LinkIcon } from '@phosphor-icons/react'
import type { Shipment, PaymentTransaction } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { createBlockchainPayment, fetchBlockchainPaymentData } from '@/lib/api'

interface BlockchainPaymentProps {
  shipment: Shipment
}

export function BlockchainPayment({ shipment }: BlockchainPaymentProps) {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
  const [amount, setAmount] = useState<string>('0.5')
  const [recipient, setRecipient] = useState<string>('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const shipmentTransactions = (transactions || []).filter((t) => t.shipmentId === shipment.id)

  useEffect(() => {
    let active = true
    setIsLoading(true)

    void fetchBlockchainPaymentData(shipment.id)
      .then((response) => {
        if (active) {
          setTransactions(response.transactions)
        }
      })
      .catch(() => {
        if (active) {
          toast.error('Unable to load blockchain history')
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [shipment.id])

  const handlePayment = async () => {
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Invalid amount', { description: 'Please enter a valid payment amount' })
      return
    }

    if (!recipient || !recipient.startsWith('0x')) {
      toast.error('Invalid recipient', { description: 'Please enter a valid wallet address' })
      return
    }

    setIsProcessing(true)
    
    try {
      const { transaction } = await createBlockchainPayment({
        shipmentId: shipment.id,
        amount: amountNum,
        currency: 'ETH',
        from: '0x...yourWallet',
        to: recipient,
      })

      setTransactions((currentTransactions) => [transaction, ...currentTransactions])
      
      toast.success('Payment confirmed', {
        description: `Successfully sent ${amountNum} ETH to ${recipient.substring(0, 10)}...`,
      })
      
      setAmount('')
    } catch (error) {
      console.error('Payment error:', error)
      toast.error('Payment failed', {
        description: 'Unable to process blockchain transaction. Please try again.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getTotalPaid = () => {
    return (shipmentTransactions || [])
      .filter((t) => t.status === 'confirmed')
      .reduce((sum, t) => sum + t.amount, 0)
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold mb-1">Blockchain Payment</h3>
            <p className="text-sm text-muted-foreground">Secure crypto payments for {shipment.name}</p>
          </div>
          <Badge className="bg-accent/20 text-accent border-accent/30 gap-1">
            <LinkIcon size={12} weight="duotone" />
            On-Chain
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="amount" className="text-sm">Amount (ETH)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="recipient" className="text-sm">Recipient Address</Label>
            <Input
              id="recipient"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="mt-1.5 font-mono text-xs"
            />
          </div>

          <Button 
            onClick={handlePayment} 
            disabled={isProcessing || isLoading}
            className="w-full gap-2"
          >
            {isProcessing ? (
              <>
                <Clock size={16} className="animate-spin" weight="duotone" />
                Processing...
              </>
            ) : (
              <>
                <CurrencyDollar size={16} weight="duotone" />
                Send Payment
              </>
            )}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">Transaction History</h4>
          <div className="text-sm">
            <span className="text-muted-foreground">Total Paid:</span>
            <span className="font-bold font-mono ml-2">{getTotalPaid().toFixed(4)} ETH</span>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock size={32} className="mx-auto mb-2 opacity-50 animate-spin" weight="duotone" />
            <p className="text-sm">Loading on-chain history...</p>
          </div>
        ) : shipmentTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CurrencyDollar size={32} className="mx-auto mb-2 opacity-50" weight="duotone" />
            <p className="text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(shipmentTransactions || []).map((tx) => (
              <Card key={tx.id} className="p-4 bg-secondary/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {tx.status === 'confirmed' ? (
                        <CheckCircle size={18} className="text-success shrink-0" weight="duotone" />
                      ) : tx.status === 'failed' ? (
                        <XCircle size={18} className="text-destructive shrink-0" weight="duotone" />
                      ) : (
                        <Clock size={18} className="text-warning shrink-0" weight="duotone" />
                      )}
                      <span className="font-mono text-xs text-muted-foreground">{tx.id}</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-bold font-mono">{tx.amount} {tx.currency}</span>
                      </div>
                      {tx.blockchainHash && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Hash:</span>
                          <span className="font-mono text-xs truncate">{tx.blockchainHash}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(tx.timestamp).toLocaleString()}</span>
                        {tx.gasUsed && <span>• Gas: {tx.gasUsed.toLocaleString()}</span>}
                      </div>
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      tx.status === 'confirmed'
                        ? 'bg-success/20 text-success border-success/30'
                        : tx.status === 'failed'
                        ? 'bg-destructive/20 text-destructive border-destructive/30'
                        : 'bg-warning/20 text-warning border-warning/30'
                    )}
                  >
                    {tx.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
