"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { TransactionDialog } from "@/components/transaction-dialog"
import { cn } from "@/lib/utils"

type Transaction = {
  id: string
  amount: number
  date: string
  description: string
  category: string
  type: "income" | "expense"
  status: "cleared" | "pending" | "estimated"
  reviewed: boolean
  merchant_logo?: string
  category_id?: string
}

export function TransactionInbox() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [reviewingTransaction, setReviewingTransaction] = useState<Transaction | null>(null)

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", "inbox"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("reviewed", false)
        .order("date", { ascending: false })

      if (error) throw error
      return data as Transaction[]
    },
  })

  if (isLoading) {
    return <div className="text-center py-10">Loading inbox...</div>
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg">
        <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-xl font-semibold">All caught up!</h3>
        <p className="text-muted-foreground mt-2">
          You have reviewed all your transactions.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {transactions.length} Transactions to Review
        </h2>
      </div>

      <div className="grid gap-4">
        {transactions.map((transaction) => (
          <Card 
            key={transaction.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setReviewingTransaction(transaction)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center w-12 h-12 bg-muted rounded-full">
                   {/* Placeholder for logo or date */}
                   <span className="text-xs font-bold">{format(new Date(transaction.date), "MMM")}</span>
                   <span className="text-sm font-bold">{format(new Date(transaction.date), "dd")}</span>
                </div>
                <div>
                  <h3 className="font-medium text-lg">{transaction.description}</h3>
                  <p className="text-sm text-muted-foreground">
                    {transaction.category || "Uncategorized"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={cn(
                  "text-lg font-bold",
                  transaction.type === 'income' ? "text-green-600" : "text-red-600"
                )}>
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(transaction.amount)}
                </div>
                <Button size="sm" onClick={(e) => {
                    e.stopPropagation()
                    setReviewingTransaction(transaction)
                }}>
                  Review
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TransactionDialog
        open={!!reviewingTransaction}
        onOpenChange={(open) => !open && setReviewingTransaction(null)}
        transaction={reviewingTransaction}
        isReviewMode={true}
      />
    </div>
  )
}
