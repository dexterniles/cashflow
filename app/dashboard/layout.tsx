import { TopNav } from '@/components/top-nav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="container mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  )
}
