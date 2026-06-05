import 'server-only'

import { NextResponse } from 'next/server'

import { validateSession } from '@/lib/auth/validate-session'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface LiberarBody {
  numero?: unknown
}

export async function POST(request: Request) {
  const vendor = await validateSession(request.headers.get('authorization'))
  if (!vendor) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (vendor.role !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
  }

  let body: LiberarBody
  try {
    body = (await request.json()) as LiberarBody
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const numero = typeof body.numero === 'number' ? body.numero : Number(body.numero)
  if (!Number.isInteger(numero) || numero < 1 || numero > 300) {
    return NextResponse.json({ error: 'Número inválido' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('boletos')
    .update({
      status: 'disponible',
      comprador_nombre: null,
      comprador_tel: null,
      vendedor_email: null,
      sold_at: null,
    })
    .eq('numero', numero)
    .eq('status', 'comprado')
    .select('numero, status, comprador_nombre, comprador_tel, vendedor_email, sold_at')

  if (error) {
    return NextResponse.json({ error: 'Error al liberar el boleto' }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: 'Ese boleto no está vendido' },
      { status: 409 },
    )
  }

  return NextResponse.json({ boleto: data[0] })
}
