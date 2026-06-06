import 'server-only'

import { NextResponse } from 'next/server'

import { validateSession } from '@/lib/auth/validate-session'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface ComprarBody {
  numero?: unknown
  comprador_nombre?: unknown
  comprador_tel?: unknown
}

export async function POST(request: Request) {
  const vendor = await validateSession(request.headers.get('authorization'))
  if (!vendor) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: ComprarBody
  try {
    body = (await request.json()) as ComprarBody
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const numero = typeof body.numero === 'number' ? body.numero : Number(body.numero)
  const nombre =
    typeof body.comprador_nombre === 'string' ? body.comprador_nombre.trim() : ''
  const tel = typeof body.comprador_tel === 'string' ? body.comprador_tel.trim() : ''

  if (!Number.isInteger(numero) || numero < 1 || numero > 350) {
    return NextResponse.json({ error: 'Número inválido' }, { status: 400 })
  }
  if (nombre.length < 2) {
    return NextResponse.json({ error: 'Nombre demasiado corto' }, { status: 400 })
  }
  if (tel.length < 6) {
    return NextResponse.json({ error: 'Teléfono demasiado corto' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Atomic guard: solo actualiza si todavía está disponible.
  // Si rowCount=0 (data vacío), otro vendedor ganó la carrera.
  const { data, error } = await supabase
    .from('boletos')
    .update({
      status: 'comprado',
      comprador_nombre: nombre,
      comprador_tel: tel,
      vendedor_email: vendor.email,
      sold_at: new Date().toISOString(),
    })
    .eq('numero', numero)
    .eq('status', 'disponible')
    .select('numero, status, comprador_nombre, comprador_tel, vendedor_email, sold_at')

  if (error) {
    return NextResponse.json({ error: 'Error al registrar la venta' }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: 'Este número ya fue vendido' },
      { status: 409 },
    )
  }

  return NextResponse.json({ boleto: data[0] })
}
