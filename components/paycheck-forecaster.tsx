'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useQuery } from '@tanstack/react-query'

const formSchema = z.object({
  hours: z.coerce.number().min(0),
  overtime: z.coerce.number().min(0),
  payDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date",
  }),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      hours: 40,
      overtime: 0,
      payDate: new Date().toISOString().split('T')[0],
    },
  })

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

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      amount: netPay,
      date: values.payDate,
      description: 'Estimated Paycheck',
      category: 'Income',
      type: 'income',
      status: 'estimated',
    })

    if (error) {
        console.error(error)
    } else {
        // Reset form or show success
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paycheck Forecaster</CardTitle>
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
                    <FormLabel>Hours</FormLabel>
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
                <div className="p-4 bg-green-50 text-green-700 rounded-md">
                    Estimated Net Pay: ${estimatedPay.toFixed(2)}
                </div>
            )}

            <Button type="submit" className="w-full">Save Estimate</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
