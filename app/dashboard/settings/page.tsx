import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <SettingsForm user={user} />
    </div>
  )
}
