import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if user is admin
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.is_admin === true

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <Sidebar userEmail={user.email ?? ''} isAdmin={isAdmin} />
      <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
