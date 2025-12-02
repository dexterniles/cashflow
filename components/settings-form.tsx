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
  custom_payday: z.coerce.number().min(1).max(31).optional().or(z.literal(0)),
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
      custom_payday: 0,
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
          custom_payday: data.custom_payday || 0,
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
        custom_payday: data.custom_payday === 0 ? null : data.custom_payday,
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                name="custom_payday"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Custom Payday</FormLabel>
                    <FormControl>
                        <Input type="number" min={1} max={31} placeholder="e.g. 15" {...field} 
                        onChange={e => field.onChange(e.target.value === '' ? 0 : parseInt(e.target.value))}
                        value={field.value === 0 ? '' : field.value}
                        />
                    </FormControl>
                    <FormDescription>
                        Day of the month you usually get paid (1-31).
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
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
