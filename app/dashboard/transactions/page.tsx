'use client'

import { TransactionTable } from '@/components/transaction-table'
import { TransactionDialog } from '@/components/transaction-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <TransactionDialog 
            trigger={
                <Button className="gap-2">
                    <Plus className="h-4 w-4" /> Add Transaction
                </Button>
            }
        />
      </div>
      <TransactionTable />
    </div>
  )
}
