import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Role check via admin client (bypasses RLS — we're reading any user's role)
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('users')
    .select('role, is_admin')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'administrator' || profile?.is_admin === true
  if (!isAdmin) redirect('/dashboard')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <AdminSidebar userEmail={user.email ?? ''} />
      <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
