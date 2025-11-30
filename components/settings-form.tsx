'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const settingsSchema = z.object({
  hourly_rate: z.coerce.number().min(0, "Hourly rate must be positive"),
  tax_rate_percent: z.coerce.number().min(0).max(100, "Tax rate must be between 0 and 100"),
  fixed_deductions: z.coerce.number().min(0, "Deductions must be positive"),
})

type SettingsFormValues = z.infer<typeof settingsSchema>

export function SettingsForm({ user }: { user: any }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema) as any,
    defaultValues: {
      hourly_rate: 0,
      tax_rate_percent: 0,
      fixed_deductions: 0,
    },
  })

  useEffect(() => {
    async function loadSettings() {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        form.reset({
          hourly_rate: data.hourly_rate || 0,
          tax_rate_percent: data.tax_rate_percent || 0,
          fixed_deductions: data.fixed_deductions || 0,
        })
      }
      setLoading(false)
    }
    loadSettings()
  }, [user.id, supabase, form])

  async function onSubmit(data: SettingsFormValues) {
    const { error } = await supabase
      .from('settings')
      .upsert({
        user_id: user.id,
        ...data,
      })

    if (error) {
      toast.error("Failed to update settings.")
    } else {
      toast.success("Settings updated successfully.")
    }
  }

  if (loading) return <div>Loading settings...</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wage & Tax Settings</CardTitle>
        <CardDescription>
          Configure your income details for accurate paycheck forecasting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="hourly_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hourly Rate ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormDescription>
                    Your gross hourly wage before taxes.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tax_rate_percent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Tax Rate (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} />
                  </FormControl>
                  <FormDescription>
                    Percentage of income withheld for taxes (e.g., 20).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fixed_deductions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fixed Deductions ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormDescription>
                    Total fixed amount deducted per paycheck (e.g., health insurance, 401k).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Save Settings</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
