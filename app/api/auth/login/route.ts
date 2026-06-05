import 'server-only'

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !password) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data: vendor, error } = await supabase
    .from('vendedores')
    .select('id, email, name, role, password_hash')
    .eq('email', email)
    .maybeSingle()

  if (error || !vendor) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
  }

  const ok = await bcrypt.compare(password, vendor.password_hash)
  if (!ok) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
  }

  const token = crypto.randomUUID()
  const { error: updateError } = await supabase
    .from('vendedores')
    .update({ session_token: token })
    .eq('id', vendor.id)

  if (updateError) {
    return NextResponse.json({ error: 'Error al iniciar sesión' }, { status: 500 })
  }

  return NextResponse.json({
    token,
    email: vendor.email,
    name: vendor.name,
    role: vendor.role,
  })
}
