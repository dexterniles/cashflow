'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/utils/supabase/client'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PlusCircle } from 'lucide-react'

const formSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date",
  }),
  description: z.string().min(1, "Description is required"),
  category_id: z.string().min(1, "Category is required"),
  type: z.enum(['income', 'expense']),
  status: z.enum(['cleared', 'pending', 'estimated']),
  reviewed: z.boolean().default(false),
})

type TransactionFormValues = z.infer<typeof formSchema>

interface TransactionDialogProps {
  transaction?: any // If provided, we are in edit mode
  trigger?: React.ReactNode
  defaultType?: 'income' | 'expense'
  defaultStatus?: 'cleared' | 'pending' | 'estimated'
  open?: boolean
  onOpenChange?: (open: boolean) => void
  isReviewMode?: boolean
}

export function TransactionDialog({ 
  transaction, 
  trigger, 
  defaultType = 'expense', 
  defaultStatus = 'cleared', 
  open: controlledOpen, 
  onOpenChange: setControlledOpen,
  isReviewMode = false
}: TransactionDialogProps) {
  const [open, setOpen] = useState(false)
  const supabase = createClient()
  const queryClient = useQueryClient()

  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : open
  const onOpenChange = isControlled ? setControlledOpen : setOpen

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data
    }
  })

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      amount: transaction?.amount || 0,
      date: transaction?.date || new Date().toISOString().split('T')[0],
      description: transaction?.description || '',
      category_id: transaction?.category_id || '',
      type: transaction?.type || defaultType,
      status: transaction?.status || defaultStatus,
      reviewed: transaction?.reviewed || isReviewMode || false,
    },
  })

  // Reset form when transaction changes or dialog opens
  useEffect(() => {
    if (isOpen) {
        form.reset({
            amount: transaction?.amount || 0,
            date: transaction?.date || new Date().toISOString().split('T')[0],
            description: transaction?.description || '',
            category_id: transaction?.category_id || '',
            type: transaction?.type || defaultType,
            status: transaction?.status || defaultStatus,
            reviewed: transaction?.reviewed || isReviewMode || false,
        })
    }
  }, [transaction, isOpen, form, defaultType, defaultStatus, isReviewMode])

  const onSubmit = async (values: TransactionFormValues) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Find category name for denormalization (optional, but keeps existing table working)
    const selectedCategory = categories?.find(c => c.id === values.category_id)
    const categoryName = selectedCategory?.name || ''

    const payload = {
        ...values,
        category: categoryName, // Keep legacy field populated
        user_id: user.id
    }

    let error
    if (transaction) {
      // Update
      const { error: updateError } = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', transaction.id)
      error = updateError
    } else {
      // Insert
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(payload)
      error = insertError
    }

    if (error) {
      console.error(error)
      // You could add a toast here
    } else {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      onOpenChange?.(false)
      form.reset()
    }
  }

  const filteredCategories = categories?.filter(c => c.type === form.watch('type')) || []

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
          <DialogDescription>
            {transaction ? 'Make changes to your transaction here.' : 'Add a new transaction to your records.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                        <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Grocery run..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredCategories.map((category: any) => (
                        <SelectItem key={category.id} value={category.id}>
                          <span className="flex items-center">
                             {/* You could render the icon here if you had an icon component map */}
                             {category.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cleared">Cleared</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="estimated">Estimated</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="reviewed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Mark as Reviewed
                    </FormLabel>
                    <FormDescription>
                      This will remove it from your Inbox.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
