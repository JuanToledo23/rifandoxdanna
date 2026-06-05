import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/types'

export interface AuthenticatedVendor {
  id: string
  email: string
  name: string
  role: Role
}

export async function validateSession(
  authorizationHeader: string | null,
): Promise<AuthenticatedVendor | null> {
  if (!authorizationHeader) return null

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim()
  if (!token) return null

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('vendedores')
    .select('id, email, name, role')
    .eq('session_token', token)
    .maybeSingle()

  if (error || !data) return null

  return data as AuthenticatedVendor
}
