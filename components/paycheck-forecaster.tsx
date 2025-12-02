'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const formSchema = z.object({
  hours: z.coerce.number().min(0),
  overtime: z.coerce.number().min(0),
  payDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date",
  }),
  category_id: z.string().min(1, "Category is required"),
})

export function PaycheckForecaster() {
  const supabase = createClient()
  const [estimatedPay, setEstimatedPay] = useState<number | null>(null)

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase.from('settings').select('*').eq('user_id', user.id).single()
      return data
    }
  })

  const { data: categories } = useQuery({
    queryKey: ['categories', 'income'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('type', 'income')
        .order('name')
      
      if (error) throw error
      return data
    }
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      hours: 40,
      overtime: 0,
      payDate: new Date().toISOString().split('T')[0],
      category_id: '',
    },
  })

  // Set default category when loaded
  useEffect(() => {
    if (categories && categories.length > 0 && !form.getValues('category_id')) {
        form.setValue('category_id', categories[0].id)
    }
  }, [categories, form])

  const calculatePay = (values: z.infer<typeof formSchema>) => {
    if (!settings) return 0
    const hourlyRate = Number(settings?.hourly_rate) || 0
    const taxRate = Number(settings?.tax_rate_percent) || 0
    const deductions = Number(settings?.fixed_deductions) || 0
    
    const regularPay = values.hours * hourlyRate
    const overtimePay = values.overtime * (hourlyRate * 1.5)
    const grossPay = regularPay + overtimePay
    const taxAmount = grossPay * (taxRate / 100)
    const netPay = grossPay - taxAmount - deductions
    
    return Math.max(0, netPay)
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const netPay = calculatePay(values)
    setEstimatedPay(netPay)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const category = categories?.find(c => c.id === values.category_id)

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      amount: netPay,
      date: values.payDate,
      description: `Wage: ${values.hours}h + ${values.overtime}h OT`,
      category: category?.name || 'Income',
      category_id: values.category_id,
      type: 'income',
      status: 'estimated',
    })

    if (error) {
        console.error(error)
    } else {
        // Reset form or show success
    }
  }

  if (!settings?.hourly_rate) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Wage Tracker</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                    Please configure your hourly rate in Settings to use the wage tracker.
                </p>
                <Button asChild variant="outline" className="w-full">
                    <Link href="/dashboard/settings">Go to Settings</Link>
                </Button>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wage Tracker</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Regular Hours</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="overtime"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Overtime (1.5x)</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select income category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((category: any) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
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
              name="payDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pay Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {estimatedPay !== null && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-md">
                    <div className="text-sm font-medium">Estimated Net Pay</div>
                    <div className="text-2xl font-bold">
                        ${estimatedPay.toFixed(2)}
                    </div>
                </div>
            )}

            <Button type="submit" className="w-full">Log Work Shift</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
