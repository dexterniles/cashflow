"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns"
import { AlertCircle, CheckCircle2, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

type Category = {
  id: string
  name: string
  icon: string
  type: "income" | "expense"
  group: string
  budget_limit: number
}

type Transaction = {
  id: string
  amount: number
  date: string
  category_id: string
}

export default function BudgetPage() {
  const supabase = createClient()
  const currentDate = new Date()
  const start = startOfMonth(currentDate).toISOString()
  const end = endOfMonth(currentDate).toISOString()

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name")
      if (error) throw error
      return data as Category[]
    },
  })

  const { data: transactions } = useQuery({
    queryKey: ["transactions", "month", start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, date, category_id")
        .gte("date", start)
        .lte("date", end)
      
      if (error) throw error
      return data as Transaction[]
    },
  })

  if (!categories || !transactions) {
    return <div className="p-8 text-center">Loading budget data...</div>
  }

  // Group categories by "group"
  const groupedCategories = categories.reduce((acc, category) => {
    if (!acc[category.group]) {
      acc[category.group] = []
    }
    acc[category.group].push(category)
    return acc
  }, {} as Record<string, Category[]>)

  // Calculate spending per category
  const spendingByCategory = transactions.reduce((acc, t) => {
    if (t.category_id) {
      acc[t.category_id] = (acc[t.category_id] || 0) + t.amount
    }
    return acc
  }, {} as Record<string, number>)

  const getProgressColor = (spent: number, limit: number) => {
    if (limit === 0) return "bg-slate-200"
    const percentage = (spent / limit) * 100
    if (percentage >= 100) return "bg-red-500"
    if (percentage >= 85) return "bg-yellow-500"
    return "bg-green-500"
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monthly Budget</h1>
          <p className="text-muted-foreground">
            {format(currentDate, "MMMM yyyy")}
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {Object.entries(groupedCategories).map(([group, groupCategories]) => (
          <Card key={group}>
            <CardHeader>
              <CardTitle>{group}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              {groupCategories.map((category) => {
                const spent = spendingByCategory[category.id] || 0
                const limit = category.budget_limit || 0 // Default to 0 if null
                const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
                
                // Skip income categories for budget bars usually, but prompt asked for all.
                // However, "Budget Bar" implies expenses.
                // If type is income, maybe show differently? 
                // For now, I'll treat everything as a budget item as requested.
                
                return (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(spent)}</span>
                        <span>/</span>
                        <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(limit)}</span>
                      </div>
                    </div>
                    <Progress 
                        value={percentage} 
                        className="h-2" 
                        indicatorClassName={getProgressColor(spent, limit)}
                    />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
