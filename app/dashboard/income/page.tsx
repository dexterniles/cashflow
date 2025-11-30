'use client'

import { TransactionTable } from '@/components/transaction-table'
import { TransactionDialog } from '@/components/transaction-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { format } from 'date-fns'

export default function IncomePage() {
  const supabase = createClient()

  const { data: incomeMTD } = useQuery({
    queryKey: ['income_mtd'],
    queryFn: async () => {
      const today = new Date()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
      
      const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'income')
        .eq('status', 'cleared')
        .gte('date', startOfMonth)
      
      if (error) throw error
      return data.reduce((acc, t) => acc + Number(t.amount), 0)
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Income</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader>
            <CardTitle>Income (MTD)</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(incomeMTD || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
                Total income for {format(new Date(), 'MMMM')}
            </p>
            </CardContent>
        </Card>
      </div>

      <TransactionTable type="income" />
    </div>
  )
}
