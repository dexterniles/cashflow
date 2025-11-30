'use client'

import { TransactionTable } from '@/components/transaction-table'
import { TransactionDialog } from '@/components/transaction-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">All Transactions</h1>
      </div>
      <TransactionTable />
    </div>
  )
}
