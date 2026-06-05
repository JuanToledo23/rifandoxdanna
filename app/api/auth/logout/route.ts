import 'server-only'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateSession } from '@/lib/auth/validate-session'

export async function POST(request: Request) {
  const vendor = await validateSession(request.headers.get('authorization'))
  if (!vendor) {
    return NextResponse.json({ ok: true })
  }

  const supabase = createServiceClient()
  await supabase
    .from('vendedores')
    .update({ session_token: null })
    .eq('id', vendor.id)

  return NextResponse.json({ ok: true })
}
