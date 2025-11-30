'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Calendar, CreditCard, LogOut } from 'lucide-react'

export function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Calendar',
      href: '/dashboard/calendar',
      icon: Calendar,
    },
    {
      title: 'Transactions',
      href: '/dashboard/transactions',
      icon: CreditCard,
    },
  ]

  return (
    <nav className="border-b bg-card">
      <div className="flex h-16 items-center px-4 container mx-auto">
        <div className="mr-8 hidden md:flex">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block text-primary text-xl">
              CashFlow
            </span>
          </Link>
          <div className="flex gap-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 transition-colors hover:text-foreground/80",
                  pathname === item.href ? "text-foreground" : "text-foreground/60"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            ))}
          </div>
        </div>
        
        {/* Mobile Menu (Simplified) */}
        <div className="flex md:hidden flex-1 gap-4 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors",
                  pathname === item.href ? "text-foreground" : "text-foreground/60"
                )}
              >
                <item.icon className="h-4 w-4" />
              </Link>
            ))}
        </div>

        <div className="ml-auto flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Log out</span>
          </Button>
        </div>
      </div>
    </nav>
  )
}
