import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabase
    .from('boletos')
    .select('numero, status, comprador_nombre, comprador_tel, vendedor_email, sold_at')
    .order('numero', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ boletos: data })
}
