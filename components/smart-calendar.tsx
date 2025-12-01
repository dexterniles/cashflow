'use client'

import { Calendar, dateFnsLocalizer, Event } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

const DnDCalendar = withDragAndDrop(Calendar as any) as any

interface CalendarEvent extends Event {
    id: string
    type: 'income' | 'expense'
    status: string
}

export function SmartCalendar() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    const { data: transactions } = useQuery({
        queryKey: ['transactions'],
        queryFn: async () => {
            const { data, error } = await supabase.from('transactions').select('*')
            if (error) throw error
            return data
        }
    })

    const updateTransactionDate = useMutation({
        mutationFn: async ({ id, date }: { id: string, date: string }) => {
            const { error } = await supabase.from('transactions').update({ date }).eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
        }
    })

    const events: CalendarEvent[] = transactions?.map(t => ({
        id: t.id,
        title: t.description || 'Untitled',
        start: new Date(t.date),
        end: new Date(t.date),
        allDay: true,
        type: t.type,
        status: t.status,
        amount: Number(t.amount)
    })) || []

    // Calculate running balance per day
    const getRunningBalance = (date: Date) => {
        if (!transactions) return 0
        const dateStr = format(date, 'yyyy-MM-dd')
        // Filter transactions up to this date
        // Note: This is a simple client-side calculation. For large datasets, this should be optimized or server-side.
        // We assume "transactions" contains all history or enough history.
        // Ideally we start with a known balance at start of month, but here we sum everything.
        // Let's sum all "cleared" transactions + "pending" transactions up to this date.
        
        return transactions.reduce((acc, t) => {
            const tDate = new Date(t.date)
            if (tDate <= date) {
                const amount = Number(t.amount)
                if (t.type === 'income') return acc + amount
                return acc - amount
            }
            return acc
        }, 0)
    }

    const onEventDrop = ({ event, start }: { event: CalendarEvent, start: Date }) => {
        if (event.type === 'expense') { 
             updateTransactionDate.mutate({
                 id: event.id,
                 date: format(start, 'yyyy-MM-dd')
             })
        }
    }

    const eventStyleGetter = (event: CalendarEvent) => {
        let backgroundColor = '#3174ad'
        if (event.type === 'income') backgroundColor = '#10b981' // emerald-500
        if (event.type === 'expense') backgroundColor = '#ef4444' // red-500
        
        return {
            style: {
                backgroundColor,
                borderRadius: '4px',
                opacity: 0.9,
                color: 'white',
                border: '0px',
                display: 'block',
                fontSize: '0.8rem',
                padding: '2px 4px'
            }
        }
    }

    const DateCellWrapper = ({ children, value }: any) => {
        const balance = getRunningBalance(value)
        const isNegative = balance < 0
        
        return (
            <div className="h-full flex flex-col relative group">
                {children}
                <div className={`absolute bottom-1 right-1 text-xs font-semibold ${isNegative ? 'text-red-500' : 'text-slate-400 group-hover:text-slate-600'}`}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(balance)}
                </div>
            </div>
        )
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Smart Calendar</CardTitle>
            </CardHeader>
            <CardContent>
                <div style={{ height: 600 }}>
                    <DnDCalendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        onEventDrop={onEventDrop}
                        resizable={false}
                        style={{ height: '100%' }}
                        eventPropGetter={eventStyleGetter}
                        components={{
                            dateCellWrapper: DateCellWrapper
                        }}
                        views={['month']}
                    />
                </div>
            </CardContent>
        </Card>
    )
}
