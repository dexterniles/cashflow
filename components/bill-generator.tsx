'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash, RefreshCw, Calendar as CalendarIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type BillTemplate = {
  id: string
  description: string
  amount: number
  dayOfMonth: number
  category: string
}

export function BillGenerator() {
  const [templates, setTemplates] = useState<BillTemplate[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)) // YYYY-MM
  const supabase = createClient()
  const queryClient = useQueryClient()

  // Load templates from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('bill_templates')
    if (saved) {
      setTemplates(JSON.parse(saved))
    }
  }, [])

  // Save templates to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('bill_templates', JSON.stringify(templates))
  }, [templates])

  const addTemplate = () => {
    const newTemplate: BillTemplate = {
      id: crypto.randomUUID(),
      description: 'New Bill',
      amount: 0,
      dayOfMonth: 1,
      category: 'Bills'
    }
    setTemplates([...templates, newTemplate])
  }

  const updateTemplate = (id: string, field: keyof BillTemplate, value: any) => {
    setTemplates(templates.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ))
  }

  const removeTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id))
  }

  const generateBills = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [year, month] = selectedMonth.split('-').map(Number)
    
    const transactions = templates.map(t => {
      // Handle days that don't exist in the month (e.g. 31st in Feb)
      const date = new Date(year, month - 1, Math.min(t.dayOfMonth, new Date(year, month, 0).getDate()))
      
      return {
        user_id: user.id,
        amount: t.amount,
        date: date.toISOString().split('T')[0],
        description: t.description,
        category: t.category,
        type: 'expense',
        status: 'pending', // Default to pending for generated bills
      }
    })

    const { error } = await supabase.from('transactions').insert(transactions)

    if (error) {
      console.error(error)
      toast.error("Failed to generate bills")
    } else {
      toast.success(`Generated ${transactions.length} bills for ${selectedMonth}`)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setIsDialogOpen(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Recurring Bills</CardTitle>
                <CardDescription>Manage your monthly recurring expenses.</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        <RefreshCw className="h-4 w-4" /> Generate
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Generate Bills</DialogTitle>
                        <DialogDescription>
                            Create transactions for your recurring bills for a specific month.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="month" className="text-right">
                                Month
                            </Label>
                            <Input
                                id="month"
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={generateBills}>Generate {templates.length} Bills</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {templates.map((template) => (
          <div key={template.id} className="flex items-end gap-2 p-4 border rounded-lg bg-card/50">
            <div className="grid gap-2 flex-1 md:grid-cols-4">
                <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input 
                        value={template.description} 
                        onChange={(e) => updateTemplate(template.id, 'description', e.target.value)}
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Amount</Label>
                    <Input 
                        type="number" 
                        value={template.amount} 
                        onChange={(e) => updateTemplate(template.id, 'amount', Number(e.target.value))}
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Day of Month</Label>
                    <Input 
                        type="number" 
                        min={1} 
                        max={31} 
                        value={template.dayOfMonth} 
                        onChange={(e) => updateTemplate(template.id, 'dayOfMonth', Number(e.target.value))}
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Input 
                        value={template.category} 
                        onChange={(e) => updateTemplate(template.id, 'category', e.target.value)}
                    />
                </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeTemplate(template.id)} className="mb-0.5">
                <Trash className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button variant="outline" className="w-full border-dashed" onClick={addTemplate}>
            <Plus className="mr-2 h-4 w-4" /> Add Recurring Bill
        </Button>
      </CardContent>
    </Card>
  )
}
