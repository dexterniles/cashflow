import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export function useRealtimeSubscription(table: string, queryKey: string[]) {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
        },
        () => {
          queryClient.invalidateQueries({ queryKey })
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, queryClient, router, table, queryKey]) // Added dependencies for stability
}
