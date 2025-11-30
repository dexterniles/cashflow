'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { format, addDays, isBefore } from 'date-fns'
import { PaycheckForecaster } from '@/components/paycheck-forecaster'
import { SmartCalendar } from '@/components/smart-calendar'
import { TransactionTable } from '@/components/transaction-table'

export function DashboardClient({ user }: { user: any }) {
  const supabase = createClient()

  // Realtime subscription
  useRealtimeSubscription('transactions', ['transactions'])

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: true })
      
      if (error) throw error
      return data
    },
  })

  // Calculate Metrics
  const calculateMetrics = () => {
    if (!transactions) return { safeToSpend: 0, chartData: [] }

    let currentBalance = 0
    const chartData = []
    let nextPayday = null

    // Calculate current balance (cleared only)
    transactions.forEach(t => {
        if (t.status === 'cleared') {
            if (t.type === 'income') currentBalance += Number(t.amount)
            else currentBalance -= Number(t.amount)
        }
    })

    // Find next payday (first future income)
    const today = new Date()
    const futureTransactions = transactions.filter(t => new Date(t.date) >= today)
    nextPayday = futureTransactions.find(t => t.type === 'income')?.date

    // Calculate bills due before next payday
    let billsDue = 0
    if (nextPayday) {
        const bills = futureTransactions.filter(t => 
            t.type === 'expense' && 
            t.status !== 'cleared' && 
            new Date(t.date) <= new Date(nextPayday)
        )
        billsDue = bills.reduce((acc, t) => acc + Number(t.amount), 0)
    }

    const safeToSpend = currentBalance - billsDue

    // Generate Chart Data (Projected Balance)
    // Start from today with current balance
    let projectedBalance = currentBalance
    // We want next 30 days
    const endDate = addDays(today, 30)
    
    // Create a map of date -> change
    const dailyChanges = new Map<string, number>()
    futureTransactions.forEach(t => {
        const dateStr = t.date
        const amount = t.type === 'income' ? Number(t.amount) : -Number(t.amount)
        dailyChanges.set(dateStr, (dailyChanges.get(dateStr) || 0) + amount)
    })

    for (let d = today; isBefore(d, endDate); d = addDays(d, 1)) {
        const dateStr = format(d, 'yyyy-MM-dd')
        const change = dailyChanges.get(dateStr) || 0
        projectedBalance += change
        chartData.push({
            date: format(d, 'MMM dd'),
            balance: projectedBalance
        })
    }

    return { safeToSpend, chartData }
  }

  const { safeToSpend, chartData } = calculateMetrics()

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
            <CardHeader>
            <CardTitle>Safe-to-Spend</CardTitle>
            </CardHeader>
            <CardContent>
            <div className={`text-4xl font-bold ${safeToSpend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${safeToSpend.toFixed(2)}
            </div>
            <p className="text-sm text-gray-500">
                Current Balance - Bills due before next payday
            </p>
            </CardContent>
        </Card>
        <PaycheckForecaster />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>30-Day Projection</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="balance" stroke="#8884d8" fillOpacity={1} fill="url(#colorBalance)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <SmartCalendar />

      <Card>
        <CardHeader>
            <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
            <TransactionTable />
        </CardContent>
      </Card>
    </div>
  )
}
