'use client'

import { BillGenerator } from '@/components/bill-generator'
import { TransactionTable } from '@/components/transaction-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

export default function BillsPage() {
  const supabase = createClient()

  const { data: billsDue } = useQuery({
    queryKey: ['bills_due'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'expense')
        .neq('status', 'cleared')
      
      if (error) throw error
      return data.reduce((acc, t) => acc + Number(t.amount), 0)
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Bills</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader>
            <CardTitle>Total Bills Due</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold text-red-600">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(billsDue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
                Total pending and estimated expenses
            </p>
            </CardContent>
        </Card>
      </div>

      <BillGenerator />

      <TransactionTable type="expense" excludeStatus="cleared" />
    </div>
  )
}
