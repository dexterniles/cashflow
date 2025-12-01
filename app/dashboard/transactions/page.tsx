'use client'

import { TransactionTable } from '@/components/transaction-table'
import { TransactionInbox } from '@/components/transaction-inbox'
import { TransactionDialog } from '@/components/transaction-dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus } from 'lucide-react'

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
      </div>
      
      <Tabs defaultValue="inbox" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="all">All Transactions</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox" className="mt-6">
          <TransactionInbox />
        </TabsContent>
        <TabsContent value="all" className="mt-6">
          <TransactionTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
