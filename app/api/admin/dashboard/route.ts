import 'server-only'

import { NextResponse } from 'next/server'

import { validateSession } from '@/lib/auth/validate-session'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const vendor = await validateSession(request.headers.get('authorization'))
  if (!vendor) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (vendor.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabase = createServiceClient()

  const [vendorsResult, boletosResult, vendedoresMapResult] = await Promise.all([
    supabase
      .from('vendedores')
      .select('id, email, name, password_plain')
      .eq('role', 'vendedor')
      .order('name', { ascending: true }),
    supabase
      .from('boletos')
      .select('numero, comprador_nombre, comprador_tel, vendedor_email, sold_at, status')
      .eq('status', 'comprado')
      .order('numero', { ascending: true }),
    supabase.from('vendedores').select('email, name'),
  ])

  if (vendorsResult.error || boletosResult.error || vendedoresMapResult.error) {
    return NextResponse.json(
      { error: 'Error al cargar el panel' },
      { status: 500 },
    )
  }

  const nameByEmail = new Map(
    (vendedoresMapResult.data ?? []).map((v) => [v.email, v.name]),
  )

  const ventas = (boletosResult.data ?? []).map((b) => ({
    numero: b.numero as number,
    comprador_nombre: b.comprador_nombre as string | null,
    comprador_tel: b.comprador_tel as string | null,
    vendedor_email: b.vendedor_email as string | null,
    vendedor_name: b.vendedor_email
      ? nameByEmail.get(b.vendedor_email) ?? null
      : null,
    sold_at: b.sold_at as string | null,
  }))

  return NextResponse.json({
    vendedores: vendorsResult.data ?? [],
    ventas,
    stats: {
      vendidos: ventas.length,
      disponibles: 300 - ventas.length,
      total_mxn: ventas.length * 100,
    },
  })
}
