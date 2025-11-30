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
    })) || []

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
        if (event.type === 'income') backgroundColor = 'green'
        if (event.type === 'expense') backgroundColor = 'red' 
        
        return {
            style: {
                backgroundColor,
                borderRadius: '5px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block'
            }
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Smart Calendar</CardTitle>
            </CardHeader>
            <CardContent>
                <div style={{ height: 500 }}>
                    <DnDCalendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        onEventDrop={onEventDrop}
                        resizable={false}
                        style={{ height: '100%' }}
                        eventPropGetter={eventStyleGetter}
                    />
                </div>
            </CardContent>
        </Card>
    )
}
